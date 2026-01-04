import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabaseClient';
import { Strategy, DEFAULT_STRATEGIES } from '@/app/types/strategies';

const GUEST_STRATEGIES_KEY = 'stock-journal-guest-strategies-v1';

export function useStrategies(user: User | null) {
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize: Load strategies based on auth state
    useEffect(() => {
        let mounted = true;

        async function load() {
            setLoading(true);
            setError(null);

            if (user) {
                // Load User Strategies from Supabase
                const { data, error } = await supabase
                    .from('strategies')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: true });

                if (error) {
                    console.error('Error fetching strategies:', error);
                    if (mounted) setError('전략 목록을 불러오는데 실패했습니다.');
                    // Fallback to default strategies
                    if (mounted) setStrategies(DEFAULT_STRATEGIES.map((s, i) => ({
                        ...s,
                        id: `default-${i}`,
                    })));
                } else {
                    if (mounted) {
                        // If no strategies exist, initialize with defaults
                        if (!data || data.length === 0) {
                            // Insert default strategies into DB to generate real UUIDs
                            const strategiesToInsert = DEFAULT_STRATEGIES.map(s => ({
                                ...s,
                                user_id: user.id
                            }));

                            const { data: insertedData, error: insertError } = await supabase
                                .from('strategies')
                                .insert(strategiesToInsert)
                                .select();

                            if (insertError) {
                                console.error('Failed to initialize default strategies:', insertError);
                                // Fallback to client-side defaults if DB insert fails (though save will fail)
                                setStrategies(DEFAULT_STRATEGIES.map((s, i) => ({
                                    ...s,
                                    id: `default-${i}`,
                                })));
                            } else {
                                setStrategies(insertedData as Strategy[]);
                            }
                        } else {
                            setStrategies(data as Strategy[]);
                        }
                    }
                }
            } else {
                // Load Guest Strategies from LocalStorage
                const saved = localStorage.getItem(GUEST_STRATEGIES_KEY);
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved);
                        if (mounted) setStrategies(parsed);
                    } catch (err) {
                        console.error('Failed to parse guest strategies:', err);
                        // Initialize with defaults
                        if (mounted) setStrategies(DEFAULT_STRATEGIES.map((s, i) => ({
                            ...s,
                            id: `guest-strategy-${i}`,
                        })));
                    }
                } else {
                    // Initialize with default strategies for guest
                    if (mounted) {
                        const defaultGuest = DEFAULT_STRATEGIES.map((s, i) => ({
                            ...s,
                            id: `guest-strategy-${i}`,
                        }));
                        setStrategies(defaultGuest);
                        localStorage.setItem(GUEST_STRATEGIES_KEY, JSON.stringify(defaultGuest));
                    }
                }
            }
            if (mounted) setLoading(false);
        }

        load();

        return () => {
            mounted = false;
        };
    }, [user]);

    // Sync Guest Strategies to LocalStorage
    useEffect(() => {
        if (!user && !loading && strategies.length > 0) {
            localStorage.setItem(GUEST_STRATEGIES_KEY, JSON.stringify(strategies));
        }
    }, [strategies, user, loading]);

    const addStrategy = async (strategy: Omit<Strategy, 'id' | 'user_id' | 'created_at'>) => {
        try {
            if (user) {
                const { data: newStrategy, error: insertError } = await supabase
                    .from('strategies')
                    .insert([{ ...strategy, user_id: user.id }])
                    .select()
                    .single();

                if (insertError) throw insertError;
                setStrategies(prev => [...prev, newStrategy as Strategy]);
                return newStrategy as Strategy;
            } else {
                const newStrategy: Strategy = {
                    ...strategy,
                    id: `guest-strategy-${Date.now()}`,
                };
                setStrategies(prev => [...prev, newStrategy]);
                return newStrategy;
            }
        } catch (err) {
            console.error('Failed to add strategy:', err);
            throw err;
        }
    };

    const updateStrategy = async (id: string, updates: Partial<Strategy>) => {
        try {
            if (user) {
                const { error } = await supabase
                    .from('strategies')
                    .update(updates)
                    .eq('id', id)
                    .eq('user_id', user.id);

                if (error) throw error;
            }
            setStrategies(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
        } catch (err) {
            console.error('Failed to update strategy:', err);
            throw err;
        }
    };

    const removeStrategy = async (id: string) => {
        try {
            if (user) {
                const { error } = await supabase
                    .from('strategies')
                    .delete()
                    .eq('id', id)
                    .eq('user_id', user.id);

                if (error) throw error;
            }
            setStrategies(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            console.error('Failed to remove strategy:', err);
            throw err;
        }
    };

    const getStrategyById = useCallback((id: string | undefined): Strategy | undefined => {
        if (!id) return undefined;
        return strategies.find(s => s.id === id);
    }, [strategies]);

    const getStrategyName = useCallback((id: string | undefined): string => {
        if (!id) return '';
        const strategy = strategies.find(s => s.id === id);
        return strategy?.name || '';
    }, [strategies]);

    return {
        strategies,
        loading,
        error,
        addStrategy,
        updateStrategy,
        removeStrategy,
        getStrategyById,
        getStrategyName,
    };
}
