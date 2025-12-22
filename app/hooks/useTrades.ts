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
                    .select('*, strategies (name)')
                    .eq('user_id', user.id)
                    .order('date', { ascending: false });

                if (error) {
                    console.error('Error fetching trades:', error);
                    if (mounted) setError('매매 기록을 불러오는데 실패했습니다.');
                } else {
                    if (mounted) {
                        const strategiesData = data as any[];
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
            strategy_id?: string;
            strategy_name?: string;
            entry_reason?: string;
            exit_reason?: string;
            emotion_tag?: string;
        },
        imageFile: File | null
    ) => {
        let imageUrl: string | null = null;
        const { date, symbol, symbol_name, side, price, quantity, memo, tags, strategy_id, strategy_name, entry_reason, exit_reason, emotion_tag } = data;

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
                            // Strategy ID Validation: Supabase expects UUID.
                            // If strategy_id is "default-..." or "guest-...", it's a local/guest ID and cannot be saved to DB as UUID.
                            // We should set it to null for DB insert.
                            strategy_id: (strategy_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(strategy_id)) ? strategy_id : null,
                            entry_reason: entry_reason || null,
                            exit_reason: exit_reason || null,
                            emotion_tag: emotion_tag || null,
                        },
                    ])
                    .select()
                    .single();

                if (insertError) throw insertError;
                // Add strategy_name to the returned trade for UI display
                const tradeWithStrategyName = { ...newTrade, strategy_name } as Trade;
                setTrades((prev) => [tradeWithStrategyName, ...prev]);
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
                    strategy_id: strategy_id || undefined,
                    strategy_name: strategy_name || undefined,
                    entry_reason: entry_reason || undefined,
                    exit_reason: exit_reason || undefined,
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

    const updateTrade = async (id: string, data: Partial<Trade>, imageFile: File | null) => {
        let imageUrl: string | null | undefined = data.image;

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

            // 2. Database Update
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
                        memo: data.memo,
                        tags: data.tags,
                        image: imageUrl,
                        strategy_id: (data.strategy_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.strategy_id)) ? data.strategy_id : null,
                        entry_reason: data.entry_reason || null,
                        exit_reason: data.exit_reason || null,
                        emotion_tag: data.emotion_tag || null,
                    })
                    .eq('id', id)
                    .eq('user_id', user.id);
                if (error) throw error;
            }

            // 3. Local State Update
            setTrades(prev => prev.map(t => {
                if (t.id === id) {
                    return { ...t, ...data, image: imageUrl ?? undefined, id }; // Ensure ID is preserved
                }
                return t;
            }));
        } catch (err) {
            console.error('Failed to update trade:', err);
            throw err;
        }
    };

    return { trades, loading, error, addTrade, removeTrade, updateTrade, clearAllTrades, setTrades };
}
