import { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabaseClient';
import { Trade, TradeSide } from '@/app/types/trade';

const GUEST_TRADES_KEY = 'stock-journal-guest-trades-v1';

export function useTrades(user: User | null) {
    const [trades, setTrades] = useState<Trade[]>([]); // Current active trades (DB or Guest)
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Track whether data has been properly loaded for the current auth state
    const dataLoadedForCurrentUser = useRef(false);

    // Initialize: Load trades based on auth state
    useEffect(() => {
        let mounted = true;
        // Reset flag and clear stale data immediately on user change
        dataLoadedForCurrentUser.current = false;
        setTrades([]);

        async function load() {
            setLoading(true);
            setError(null);

            if (user) {
                // Load User Trades from Supabase
                const { data, error } = await supabase
                    .from('trades')
                    .select('*, strategies (name)')
                    .eq('user_id', user.id)
                    .order('date', { ascending: false });

                if (error) {
                    console.error('Error fetching trades:', error);
                    const errorMsg = error.message || '매매 기록을 불러오는데 실패했습니다.';
                    if (mounted) setError(`데이터 로딩 실패: ${errorMsg}`);
                } else {
                    if (mounted) {
                        interface TradeWithStrategy extends Trade {
                            strategies?: { name: string };
                        }
                        const strategiesData = data as TradeWithStrategy[];
                        const mappedTrades = strategiesData.map(t => ({
                            ...t,
                            strategy_name: t.strategies?.name,
                            strategies: undefined // Clean up
                        }));
                        setTrades(mappedTrades as Trade[]);
                    }
                }
            } else {
                // Load Guest Trades from LocalStorage
                const saved = localStorage.getItem(GUEST_TRADES_KEY);
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved);
                        if (mounted) setTrades(parsed);
                    } catch (err) {
                        console.error('Failed to parse guest trades:', err);
                    }
                } else {
                    if (mounted) setTrades([]);
                }
            }
            if (mounted) {
                setLoading(false);
                dataLoadedForCurrentUser.current = true;
            }
        }

        load();

        return () => {
            mounted = false;
        };
    }, [user]);

    // Sync Guest Trades to LocalStorage
    // Only save to LS if user is NOT logged in and data has been properly loaded.
    useEffect(() => {
        if (!user && !loading && dataLoadedForCurrentUser.current) {
            localStorage.setItem(GUEST_TRADES_KEY, JSON.stringify(trades));
        }
    }, [trades, user, loading]);

    const addTrade = async (
        data: {
            date: string;
            symbol: string;
            symbol_name?: string;
            side: TradeSide;
            price: number;
            quantity: number;
            emotion_tag?: string;
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        imageFile: File | null
    ) => {
        const { date, symbol, symbol_name, side, price, quantity, emotion_tag } = data;

        try {
            if (user) {
                // DB Insert
                const { data: newTrade, error: insertError } = await supabase
                    .from('trades')
                    .insert([
                        {
                            user_id: user.id,
                            date,
                            symbol,
                            symbol_name: symbol_name || null,
                            side,
                            price,
                            quantity,
                            emotion_tag: emotion_tag || null,
                        },
                    ])
                    .select()
                    .single();

                if (insertError) throw insertError;
                setTrades((prev) => [newTrade as Trade, ...prev]);
            } else {
                // Guest Local Insert
                const newTrade: Trade = {
                    id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    date,
                    symbol,
                    symbol_name: symbol_name || undefined,
                    side,
                    price,
                    quantity,
                    emotion_tag: emotion_tag || undefined,
                };
                setTrades((prev) => [newTrade, ...prev]);
            }
        } catch (err) {
            console.error(err);
            throw err;
        }
    };


    const removeTrade = async (id: string) => {
        if (user) {
            const { error } = await supabase
                .from('trades')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;
        }
        setTrades(prev => prev.filter(t => t.id !== id));
    };

    const clearAllTrades = async () => {
        if (user) {
            const { error } = await supabase
                .from('trades')
                .delete()
                .eq('user_id', user.id);
            if (error) throw error;
        }
        setTrades([]);
        if (!user) {
            localStorage.removeItem(GUEST_TRADES_KEY);
        }
    };

    const importTrades = async (
        newTrades: Omit<Trade, 'id' | 'user_id' | 'created_at'>[]
    ): Promise<number> => {
        if (newTrades.length === 0) return 0;

        try {
            if (user) {
                // Supabase 벌크 인서트 (500건 청크 분할)
                const CHUNK_SIZE = 500;
                const inserted: Trade[] = [];
                for (let i = 0; i < newTrades.length; i += CHUNK_SIZE) {
                    const chunk = newTrades.slice(i, i + CHUNK_SIZE);
                    const rows = chunk.map(t => ({
                        user_id: user.id,
                        date: t.date,
                        symbol: t.symbol,
                        symbol_name: t.symbol_name || null,
                        side: t.side,
                        price: t.price,
                        quantity: t.quantity,
                    }));
                    const { data: insertedChunk, error } = await supabase
                        .from('trades')
                        .insert(rows)
                        .select();
                    if (error) throw error;
                    inserted.push(...(insertedChunk as Trade[]));
                }
                setTrades(prev => [...inserted, ...prev]);
                return inserted.length;
            } else {
                // Guest 모드: localStorage
                const guestTrades: Trade[] = newTrades.map(t => ({
                    ...t,
                    id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                }));
                setTrades(prev => [...guestTrades, ...prev]);
                return guestTrades.length;
            }
        } catch (err) {
            console.error('importTrades failed:', err);
            throw err;
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const updateTrade = async (id: string, data: Partial<Trade>, imageFile: File | null) => {
        try {
            if (user) {
                const { error } = await supabase
                    .from('trades')
                    .update({
                        date: data.date,
                        symbol: data.symbol,
                        symbol_name: data.symbol_name || null,
                        side: data.side,
                        price: data.price,
                        quantity: data.quantity,
                        emotion_tag: data.emotion_tag || null,
                    })
                    .eq('id', id)
                    .eq('user_id', user.id);
                if (error) throw error;
            }

            // Local State Update
            setTrades(prev => prev.map(t => {
                if (t.id === id) {
                    return { ...t, ...data, id }; // Ensure ID is preserved
                }
                return t;
            }));
        } catch (err) {
            console.error('Failed to update trade:', err);
            throw err;
        }
    };

    return { trades, loading, error, addTrade, removeTrade, updateTrade, clearAllTrades, setTrades, importTrades };
}
