import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabaseClient';
import { Trade, TradeSide } from '@/app/types/trade';
import { fileToDataUrl } from '@/app/utils/file';

const GUEST_TRADES_KEY = 'stock-journal-guest-trades-v1';

export function useTrades(user: User | null) {
    const [trades, setTrades] = useState<Trade[]>([]); // Current active trades (DB or Guest)
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize: Load trades based on auth state
    useEffect(() => {
        let mounted = true;

        async function load() {
            setLoading(true);
            setError(null);

            if (user) {
                // Load User Trades from Supabase
                const { data, error } = await supabase
                    .from('trades')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('date', { ascending: false });

                if (error) {
                    console.error('Error fetching trades:', error);
                    if (mounted) setError('매매 기록을 불러오는데 실패했습니다.');
                } else {
                    if (mounted) setTrades((data as Trade[]) || []);
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
            if (mounted) setLoading(false);
        }

        load();

        return () => {
            mounted = false;
        };
    }, [user]);

    // Sync Guest Trades to LocalStorage
    // We only save to LS if user is NOT logged in.
    // Warning: If we setTrades when logged in, we shouldn't overwrite guest LS.
    useEffect(() => {
        if (!user && !loading) {
            // Only save if not loading to avoid overwriting with empty array on initial render
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
            memo: string;
            tags: string[];
        },
        imageFile: File | null
    ) => {
        let imageUrl: string | null = null;
        const { date, symbol, symbol_name, side, price, quantity, memo, tags } = data;

        try {
            // 1. Image Upload / Processing
            if (imageFile) {
                if (user) {
                    // Upload to Supabase Storage
                    const fileExt = imageFile.name.split('.').pop()?.toLowerCase() || 'png';
                    const fileName = `${Date.now()}.${fileExt}`;
                    const filePath = `${user.id}/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('trade-images')
                        .upload(filePath, imageFile, {
                            contentType: imageFile.type,
                            upsert: false,
                        });

                    if (uploadError) {
                        console.error('Image upload failed:', uploadError);
                        throw new Error('이미지 업로드 실패');
                    }

                    const { data: publicUrlData } = supabase.storage
                        .from('trade-images')
                        .getPublicUrl(filePath);
                    imageUrl = publicUrlData.publicUrl;
                } else {
                    // Guest: Convert to Base64
                    imageUrl = await fileToDataUrl(imageFile);
                }
            }

            // 2. Save Trade
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
                            memo,
                            tags: tags, // Supabase handles array correctly if column is text[] or jsonb
                            image: imageUrl,
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
                    memo,
                    tags,
                    image: imageUrl ?? undefined,
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

    const updateTrade = async (date: string, trade: Trade) => {
        // Note: date is passed for sorting if needed, but trade.date is also there.
        // In this app, we usually update the trade object itself.

        try {
            if (user) {
                const { error } = await supabase
                    .from('trades')
                    .update({
                        date: trade.date,
                        symbol: trade.symbol,
                        symbol_name: trade.symbol_name || null,
                        side: trade.side,
                        price: trade.price,
                        quantity: trade.quantity,
                        memo: trade.memo,
                        tags: trade.tags,
                        image: trade.image,
                    })
                    .eq('id', trade.id)
                    .eq('user_id', user.id);
                if (error) throw error;
            }

            setTrades(prev => prev.map(t => (t.id === trade.id ? trade : t)));
        } catch (err) {
            console.error('Failed to update trade:', err);
            throw err;
        }
    };

    return { trades, loading, error, addTrade, removeTrade, updateTrade, clearAllTrades, setTrades };
}
