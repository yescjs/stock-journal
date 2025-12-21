'use client';

import { useState, useEffect, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabaseClient';
import { MonthlyGoal } from '@/app/types/stats';

const GUEST_GOALS_KEY = 'stock-journal-monthly-goals-v1';

export function useMonthlyGoals(user: User | null) {
    const [goals, setGoals] = useState<MonthlyGoal[]>([]);
    const [loading, setLoading] = useState(true);

    // Load goals
    useEffect(() => {
        let mounted = true;

        async function load() {
            setLoading(true);
            try {
                if (user) {
                    // Load from Supabase
                    const { data, error } = await supabase
                        .from('monthly_goals')
                        .select('*')
                        .eq('user_id', user.id)
                        .order('year', { ascending: false })
                        .order('month', { ascending: false });

                    if (error) {
                        // Table doesn't exist or other DB error - fallback to localStorage
                        console.warn('Monthly goals table not available, using localStorage:', error.message);
                        const stored = localStorage.getItem(GUEST_GOALS_KEY);
                        if (stored && mounted) {
                            setGoals(JSON.parse(stored));
                        }
                    } else {
                        if (mounted) setGoals(data || []);
                    }
                } else {
                    // Load from localStorage
                    const stored = localStorage.getItem(GUEST_GOALS_KEY);
                    if (stored && mounted) {
                        setGoals(JSON.parse(stored));
                    }
                }
            } catch (err) {
                console.warn('Failed to load monthly goals, using localStorage:', err);
                // Fallback to localStorage
                const stored = localStorage.getItem(GUEST_GOALS_KEY);
                if (stored && mounted) {
                    try {
                        setGoals(JSON.parse(stored));
                    } catch {
                        // Ignore parse errors
                    }
                }
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();

        return () => {
            mounted = false;
        };
    }, [user]);

    // Sync guest goals to localStorage
    useEffect(() => {
        if (!user && !loading) {
            localStorage.setItem(GUEST_GOALS_KEY, JSON.stringify(goals));
        }
    }, [goals, user, loading]);

    // Add or update goal
    const setGoal = async (goal: Omit<MonthlyGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
        // Helper function to save locally
        const saveLocally = () => {
            const existing = goals.find(g => g.year === goal.year && g.month === goal.month);
            if (existing) {
                setGoals(prev => prev.map(g =>
                    g.id === existing.id
                        ? { ...g, ...goal, updated_at: new Date().toISOString() }
                        : g
                ));
            } else {
                const newGoal: MonthlyGoal = {
                    id: `guest-goal-${Date.now()}`,
                    user_id: user?.id || 'guest',
                    ...goal,
                    created_at: new Date().toISOString(),
                };
                setGoals(prev => [newGoal, ...prev]);
            }
        };

        try {
            if (user) {
                // Check if goal exists for this month
                const existing = goals.find(g => g.year === goal.year && g.month === goal.month);

                if (existing) {
                    // Update
                    const { data, error } = await supabase
                        .from('monthly_goals')
                        .update({
                            target_pnl: goal.target_pnl,
                            target_trades: goal.target_trades,
                            target_win_rate: goal.target_win_rate,
                            notes: goal.notes,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', existing.id)
                        .select()
                        .single();

                    if (error) {
                        console.warn('Supabase save failed, saving locally:', error.message);
                        saveLocally();
                    } else {
                        setGoals(prev => prev.map(g => g.id === existing.id ? data : g));
                    }
                } else {
                    // Insert
                    const { data, error } = await supabase
                        .from('monthly_goals')
                        .insert([{
                            user_id: user.id,
                            ...goal,
                        }])
                        .select()
                        .single();

                    if (error) {
                        console.warn('Supabase save failed, saving locally:', error.message);
                        saveLocally();
                    } else {
                        setGoals(prev => [data, ...prev]);
                    }
                }
            } else {
                // Guest mode - save locally
                saveLocally();
            }
        } catch (err) {
            console.warn('Failed to save goal, saving locally:', err);
            saveLocally();
        }
    };

    // Remove goal
    const removeGoal = async (id: string) => {
        try {
            if (user) {
                const { error } = await supabase
                    .from('monthly_goals')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
            }
            setGoals(prev => prev.filter(g => g.id !== id));
        } catch (err) {
            console.error('Failed to remove goal:', err);
            throw err;
        }
    };

    // Get goal for specific month
    const getGoalForMonth = (year: number, month: number): MonthlyGoal | undefined => {
        return goals.find(g => g.year === year && g.month === month);
    };

    return {
        goals,
        loading,
        setGoal,
        removeGoal,
        getGoalForMonth,
    };
}
