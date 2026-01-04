import { useState } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import { Trade } from '@/app/types/trade';

export function useDataCorrection(currentUser: User | null, onNotify: (type: 'success' | 'error' | 'info', message: string) => void) {
    const [isCorrecting, setIsCorrecting] = useState(false);

    const updateMissingSymbolNames = async () => {
        if (!currentUser) return;

        try {
            setIsCorrecting(true);
            onNotify('info', '종목명 업데이트를 시작합니다...');

            // 1. Fetch trades with missing symbol_name
            const { data: trades, error } = await supabase
                .from('trades')
                .select('*')
                .eq('user_id', currentUser.id);

            if (error) throw error;
            if (!trades || trades.length === 0) {
                onNotify('info', '업데이트할 데이터가 없습니다.');
                setIsCorrecting(false);
                return;
            }

            const missingTrades = trades.filter(t => !t.symbol_name || t.symbol_name.trim() === '');

            if (missingTrades.length === 0) {
                onNotify('success', '모든 데이터에 종목명이 존재합니다.');
                setIsCorrecting(false);
                return;
            }

            onNotify('info', `${missingTrades.length}개의 누락된 종목명을 찾았습니다. 업데이트 중...`);

            let updatedCount = 0;
            const uniqueSymbols = Array.from(new Set(missingTrades.map(t => t.symbol)));

            // 2. Process each unique symbol
            for (const symbol of uniqueSymbols) {
                // Search for symbol name via API
                try {
                    // Try to extract name from existing valid trades first (optimization)
                    const existingTrade = trades.find(t => t.symbol === symbol && t.symbol_name);
                    let name = existingTrade?.symbol_name;

                    if (!name) {
                        // Fetch from API
                        // We use the search API to find the name
                        // Extract just the code part for better search results
                        const code = symbol.split('.')[0];
                        const res = await fetch(`/api/stock-search?q=${encodeURIComponent(code)}`);
                        if (res.ok) {
                            const data = await res.json();
                            const match = data.results.find((r: any) =>
                                r.symbol === symbol ||
                                r.symbol.split('.')[0] === symbol.split('.')[0]
                            );
                            if (match) {
                                name = match.name;
                            }
                        }
                    }

                    if (name) {
                        // Batch update for this symbol
                        const { error: updateError } = await supabase
                            .from('trades')
                            .update({ symbol_name: name })
                            .eq('user_id', currentUser.id)
                            .eq('symbol', symbol)
                            .is('symbol_name', null); // Safety check

                        if (!updateError) {
                            updatedCount++;
                        }
                    }
                } catch (err) {
                    console.error(`Failed to update symbol: ${symbol}`, err);
                }
            }

            onNotify('success', `${updatedCount}개 종목의 이름을 업데이트했습니다. 새로고침 해주세요.`);
            setTimeout(() => window.location.reload(), 1500);

        } catch (err: any) {
            console.error('Data correction error:', err);
            onNotify('error', '데이터 업데이트 중 오류가 발생했습니다.');
        } finally {
            setIsCorrecting(false);
        }
    };

    return {
        updateMissingSymbolNames,
        isCorrecting
    };
}
