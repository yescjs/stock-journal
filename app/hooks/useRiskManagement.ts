'use client';

import { useState, useEffect, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabaseClient';
import { AccountBalance, RiskSettings, PositionRisk } from '@/app/types/stats';
import { SymbolSummary } from '@/app/types/stats';

const GUEST_BALANCE_KEY = 'stock-journal-account-balance-v1';
const GUEST_RISK_SETTINGS_KEY = 'stock-journal-risk-settings-v1';

const DEFAULT_RISK_SETTINGS: RiskSettings = {
    maxPositionPercent: 20,
    maxDailyLossPercent: 3,
    maxDailyLossAmount: 0,
    alertEnabled: true,
};

export function useRiskManagement(
    user: User | null,
    symbolSummaries: SymbolSummary[],
    currentPrices: Record<string, number>,
    dailyPnL: number
) {
    const [accountBalance, setAccountBalance] = useState<number>(0);
    const [balanceHistory, setBalanceHistory] = useState<AccountBalance[]>([]);
    const [riskSettings, setRiskSettings] = useState<RiskSettings>(DEFAULT_RISK_SETTINGS);
    const [loading, setLoading] = useState(true);

    // Load data
    useEffect(() => {
        let mounted = true;

        async function load() {
            setLoading(true);
            try {
                if (user) {
                    // Load from Supabase
                    const { data: balanceData, error: balanceError } = await supabase
                        .from('account_balances')
                        .select('*')
                        .eq('user_id', user.id)
                        .order('date', { ascending: false })
                        .limit(30);

                    const { data: settingsData, error: settingsError } = await supabase
                        .from('risk_settings')
                        .select('*')
                        .eq('user_id', user.id)
                        .single();

                    // If tables don't exist, fallback to localStorage
                    if (balanceError && balanceError.code !== 'PGRST116') { // PGRST116 is 'Row not found' which is fine
                        console.warn('Balance load error:', balanceError.message);
                    }

                    if (settingsError && settingsError.code !== 'PGRST116') {
                        console.warn('Settings load error:', settingsError.message);
                    }

                    if (mounted) {
                        setBalanceHistory(balanceData || []);
                        if (balanceData && balanceData.length > 0) {
                            setAccountBalance(balanceData[0].balance);
                        }
                        if (settingsData) {
                            // Map snake_case DB to camelCase State
                            setRiskSettings({
                                maxPositionPercent: settingsData.max_position_percent ?? 20,
                                maxDailyLossPercent: settingsData.max_daily_loss_percent ?? 3,
                                maxDailyLossAmount: settingsData.max_daily_loss_amount ?? 0,
                                alertEnabled: settingsData.alert_enabled ?? true,
                            });
                        }
                    }
                } else {
                    // Load from localStorage
                    const storedBalance = localStorage.getItem(GUEST_BALANCE_KEY);
                    const storedSettings = localStorage.getItem(GUEST_RISK_SETTINGS_KEY);

                    if (storedBalance && mounted) {
                        try {
                            const parsed = JSON.parse(storedBalance);
                            setAccountBalance(parsed.balance || 0);
                            setBalanceHistory(parsed.history || []);
                        } catch { /* ignore */ }
                    }
                    if (storedSettings && mounted) {
                        try {
                            setRiskSettings(JSON.parse(storedSettings));
                        } catch { /* ignore */ }
                    }
                }
            } catch (err) {
                console.warn('Failed to load risk data, using localStorage:', err);
                // Fallback to localStorage logic...
                // (Existing fallback logic kept for safety)
                const storedBalance = localStorage.getItem(GUEST_BALANCE_KEY);
                const storedSettings = localStorage.getItem(GUEST_RISK_SETTINGS_KEY);
                if (storedBalance && mounted) {
                    try {
                        const parsed = JSON.parse(storedBalance);
                        setAccountBalance(parsed.balance || 0);
                        setBalanceHistory(parsed.history || []);
                    } catch { /* ignore */ }
                }
                if (storedSettings && mounted) {
                    try {
                        setRiskSettings(JSON.parse(storedSettings));
                    } catch { /* ignore */ }
                }
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();

        return () => { mounted = false; };
    }, [user]);

    // Save to localStorage for guest
    useEffect(() => {
        if (!user && !loading) {
            localStorage.setItem(GUEST_BALANCE_KEY, JSON.stringify({
                balance: accountBalance,
                history: balanceHistory,
            }));
            localStorage.setItem(GUEST_RISK_SETTINGS_KEY, JSON.stringify(riskSettings));
        }
    }, [accountBalance, balanceHistory, riskSettings, user, loading]);

    // Update account balance
    const updateBalance = async (balance: number, deposit = 0, withdrawal = 0, notes = '') => {
        const today = new Date().toISOString().split('T')[0];

        // Helper function to save locally (Guest or Error fallback)
        const saveLocally = () => {
            const newEntry: AccountBalance = {
                id: `guest-${Date.now()}`,
                user_id: user?.id || 'guest',
                date: today,
                balance,
                deposit,
                withdrawal,
                notes,
            };

            setAccountBalance(balance);
            setBalanceHistory(prev => {
                const filtered = prev.filter(b => b.date !== today);
                return [newEntry, ...filtered].slice(0, 30);
            });
        };

        try {
            if (user) {
                const { data, error } = await supabase
                    .from('account_balances')
                    .upsert([{
                        user_id: user.id,
                        date: today,
                        balance,
                        deposit,
                        withdrawal,
                        notes,
                    }], { onConflict: 'user_id,date' })
                    .select()
                    .single();

                if (error) {
                    console.error('Supabase save failed:', error.message);
                    saveLocally();
                } else {
                    setAccountBalance(balance);
                    setBalanceHistory(prev => {
                        const filtered = prev.filter(b => b.date !== today);
                        return [data, ...filtered];
                    });
                }
            } else {
                saveLocally();
            }
        } catch (err) {
            console.error('Failed to update balance:', err);
            saveLocally();
        }
    };

    // Update risk settings
    const updateRiskSettings = async (settings: Partial<RiskSettings>) => {
        const newSettings = { ...riskSettings, ...settings };

        try {
            if (user) {
                // Map to snake_case for DB
                const dbPayload = {
                    user_id: user.id,
                    max_position_percent: newSettings.maxPositionPercent,
                    max_daily_loss_percent: newSettings.maxDailyLossPercent,
                    max_daily_loss_amount: newSettings.maxDailyLossAmount,
                    alert_enabled: newSettings.alertEnabled,
                };

                const { error } = await supabase
                    .from('risk_settings')
                    .upsert([dbPayload], { onConflict: 'user_id' });

                if (error) {
                    console.error('Supabase settings save failed:', error.message);
                }
            }
            // Always update local state immediately for UI responsiveness
            setRiskSettings(newSettings);
        } catch (err) {
            console.warn('Failed to update risk settings:', err);
            setRiskSettings(newSettings);
        }
    };

    // Calculate position risks
    const positionRisks = useMemo<PositionRisk[]>(() => {
        if (accountBalance <= 0) return [];

        return symbolSummaries
            .filter(s => s.positionQty > 0)
            .map(s => {
                const currentPrice = currentPrices[s.symbol] || s.avgCost;
                const positionValue = s.positionQty * currentPrice;
                const positionPercent = (positionValue / accountBalance) * 100;

                let riskLevel: PositionRisk['riskLevel'] = 'low';
                if (positionPercent >= riskSettings.maxPositionPercent * 1.5) {
                    riskLevel = 'critical';
                } else if (positionPercent >= riskSettings.maxPositionPercent) {
                    riskLevel = 'high';
                } else if (positionPercent >= riskSettings.maxPositionPercent * 0.7) {
                    riskLevel = 'medium';
                }

                return {
                    symbol: s.symbol,
                    symbolName: s.symbol_name,
                    positionValue,
                    positionPercent,
                    riskLevel,
                };
            })
            .sort((a, b) => b.positionPercent - a.positionPercent);
    }, [symbolSummaries, currentPrices, accountBalance, riskSettings]);

    // Check daily loss limit
    const dailyLossAlert = useMemo(() => {
        if (!riskSettings.alertEnabled || accountBalance <= 0) return null;

        const lossPercent = (Math.abs(dailyPnL) / accountBalance) * 100;
        const lossAmount = Math.abs(dailyPnL);

        if (dailyPnL < 0) {
            if (riskSettings.maxDailyLossPercent > 0 && lossPercent >= riskSettings.maxDailyLossPercent) {
                return {
                    type: 'percent' as const,
                    value: lossPercent,
                    limit: riskSettings.maxDailyLossPercent,
                    message: `일일 손실률 ${lossPercent.toFixed(1)}%가 한도 ${riskSettings.maxDailyLossPercent}%를 초과했습니다`,
                };
            }
            if (riskSettings.maxDailyLossAmount > 0 && lossAmount >= riskSettings.maxDailyLossAmount) {
                return {
                    type: 'amount' as const,
                    value: lossAmount,
                    limit: riskSettings.maxDailyLossAmount,
                    message: `일일 손실 금액이 한도를 초과했습니다`,
                };
            }
        }
        return null;
    }, [dailyPnL, accountBalance, riskSettings]);

    // High risk positions
    const highRiskPositions = positionRisks.filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical');

    return {
        accountBalance,
        balanceHistory,
        riskSettings,
        positionRisks,
        highRiskPositions,
        dailyLossAlert,
        loading,
        updateBalance,
        updateRiskSettings,
    };
}
