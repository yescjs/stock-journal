import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabaseClient';

export function useSupabaseAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function getSession() {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;
                if (mounted) {
                    setUser(session?.user ?? null);
                }
            } catch (error) {
                console.error('Error getting session:', error);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) {
                setUser(session?.user ?? null);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    return { user, loading, logout };
}
