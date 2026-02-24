import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabaseClient';

export function useSupabaseAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        async function getSession() {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;
                if (mounted) {
                    const user = session?.user ?? null;
                    if (user && user.user_metadata?.deleted_account) {
                        await supabase.auth.signOut();
                        setUser(null);
                    } else {
                        setUser(user);
                        setAuthError(null); // Clear any previous errors
                    }
                }
            } catch (error: unknown) {
                console.error('Error getting session:', error);

                // Enhanced JWT error handling
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                const isJWTError = errorMessage.includes('JWT') ||
                    errorMessage.includes('json') ||
                    errorMessage.includes('token') ||
                    errorMessage.includes('Expected 3 parts');

                if (isJWTError) {
                    // Clear corrupted auth data from localStorage
                    try {
                        const keysToRemove: string[] = [];
                        for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i);
                            if (key && key.startsWith('sb-')) {
                                keysToRemove.push(key);
                            }
                        }
                        keysToRemove.forEach(key => localStorage.removeItem(key));
                        console.log('Cleared corrupted Supabase auth data from localStorage');
                    } catch (storageError) {
                        console.error('Failed to clear localStorage:', storageError);
                    }

                    // Sign out to reset auth state
                    await supabase.auth.signOut();
                    setUser(null);
                    setAuthError('인증 정보가 손상되었습니다. 다시 로그인해주세요.');
                } else {
                    setAuthError('인증 확인 중 오류가 발생했습니다.');
                }

                if (mounted) {
                    setUser(null);
                }
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
                if (session?.user) {
                    setAuthError(null); // Clear errors on successful auth
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const logout = async () => {
        // 1. Supabase 로그아웃
        await supabase.auth.signOut();
        
        // 2. localStorage 완전 정리 (세션 충돌 방지)
        try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('sb-')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));

            // Clear guest trade data to prevent data leakage across sessions
            localStorage.removeItem('stock-journal-guest-trades-v1');
            console.log('Cleared all Supabase session and guest trade data from localStorage');
        } catch (e) {
            console.error('Failed to clear localStorage:', e);
        }
        
        setUser(null);
        setAuthError(null);
    };

    return { user, loading, logout, authError };
}
