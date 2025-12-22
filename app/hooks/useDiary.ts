import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabaseClient';
import { MarketDiary } from '@/app/types/diary';

const GUEST_DIARY_KEY = 'stock-journal-guest-diary-v1';

export function useDiary(user: User | null) {
    const [diaries, setDiaries] = useState<MarketDiary[]>([]);
    const [loading, setLoading] = useState(true);

    // Load
    useEffect(() => {
        let mounted = true;
        async function load() {
            setLoading(true);
            if (user) {
                const { data, error } = await supabase
                    .from('market_diaries')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('date', { ascending: false });
                
                if (!error && mounted) {
                    setDiaries(data as MarketDiary[]);
                }
            } else {
                const saved = localStorage.getItem(GUEST_DIARY_KEY);
                if (saved && mounted) {
                    try { setDiaries(JSON.parse(saved)); } catch {}
                }
            }
            if (mounted) setLoading(false);
        }
        load();
        return () => { mounted = false; };
    }, [user]);

    // Save Guest Logic
    useEffect(() => {
        if (!user && !loading) {
            localStorage.setItem(GUEST_DIARY_KEY, JSON.stringify(diaries));
        }
    }, [diaries, user, loading]);

    const saveDiary = async (diary: Omit<MarketDiary, 'id' | 'created_at' | 'user_id'> & { id?: string }) => {
        const date = diary.date;

        if (user) {
            // 1. Try UPDATE first (by user_id and date)
            const { data: updatedData, error: updateError } = await supabase
                .from('market_diaries')
                .update({ 
                    ...diary, 
                    user_id: user.id 
                })
                .eq('user_id', user.id)
                .eq('date', date)
                .select()
                .maybeSingle();

            if (updateError) throw updateError;

            if (updatedData) {
                // Update successful
                setDiaries(prev => prev.map(d => d.id === updatedData.id ? updatedData : d));
                return;
            }

            // 2. If update returned nothing, INSERT
            const { data: insertedData, error: insertError } = await supabase
                .from('market_diaries')
                .insert({ 
                    ...diary, 
                    user_id: user.id 
                })
                .select()
                .single();
            
            if (insertError) throw insertError;
            
            setDiaries(prev => [insertedData, ...prev]);
        } else {
            // Guest mode logic
            const id = diary.id || `guest-${Date.now()}`;
            setDiaries(prev => {
                const existingIndex = prev.findIndex(d => d.date === date);
                if (existingIndex >= 0) {
                    const next = [...prev];
                    next[existingIndex] = { ...prev[existingIndex], ...diary, id: prev[existingIndex].id }; // Keep existing ID
                    return next;
                }
                return [{ ...diary, id, user_id: undefined }, ...prev];
            });
        }
    };

    const deleteDiary = async (id: string) => {
        if (user) {
            await supabase.from('market_diaries').delete().eq('id', id);
        }
        setDiaries(prev => prev.filter(d => d.id !== id));
    };

    return { diaries, saveDiary, deleteDiary, loading };
}
