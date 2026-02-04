'use client';

import React from 'react';
import { StockAnalysisResponse, BBANDSPosition } from '@/app/types/stock';
import { formatNumber } from '@/app/utils/format';
import { Activity, TrendingUp, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

interface StockAnalysisCardProps {
    analysis: StockAnalysisResponse | null;
    loading: boolean;
    error: string | null;
    darkMode: boolean;
    currentPrice?: number;
}

function getBBandsPosition(currentPrice: number | undefined, lower: number, upper: number): BBANDSPosition | null {
    if (currentPrice == null) return null;
    if (currentPrice > upper) return 'above';
    if (currentPrice < lower) return 'below';
    return 'inside';
}

function formatPositionLabel(position: BBANDSPosition | null) {
    if (position === 'above') return '상단 돌파';
    if (position === 'below') return '하단 이탈';
    if (position === 'inside') return '밴드 내';
    return '현재가 없음';
}

function formatIntervalLabel(interval: string) {
    if (interval === '60min') return '60분';
    if (interval === 'daily') return '일봉';
    return interval;
}

export function StockAnalysisCard({ analysis, loading, error, darkMode, currentPrice }: StockAnalysisCardProps) {
    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className={`rounded-2xl p-4 border ${darkMode ? 'bg-slate-900/50 border-slate-700/60' : 'bg-white/70 border-white/60'}`}
            >
                <div className="flex items-center gap-2 mb-3">
                    <Activity className={`w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                    <span className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>분석 로딩 중</span>
                </div>
                <div className={`h-16 rounded-xl animate-pulse ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`} />
            </motion.div>
        );
    }

    if (error) {
        const isRateLimit = error.toLowerCase().includes('rate limit');
        const errorTitle = isRateLimit ? '호출 제한' : '분석 불가';
        const errorBody = isRateLimit
            ? 'API 호출 제한에 도달했습니다. 잠시 후 다시 시도해주세요.'
            : error;
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className={`rounded-2xl p-4 border ${darkMode ? 'bg-slate-900/50 border-slate-700/60' : 'bg-white/70 border-white/60'}`}
            >
                <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{errorTitle}</span>
                </div>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{errorBody}</p>
            </motion.div>
        );
    }

    if (!analysis) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className={`rounded-2xl p-4 border ${darkMode ? 'bg-slate-900/50 border-slate-700/60' : 'bg-white/70 border-white/60'}`}
            >
                <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>분석 데이터 없음</span>
                </div>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    데이터를 받지 못했습니다. 잠시 후 다시 시도해주세요.
                </p>
            </motion.div>
        );
    }

    const rsi = analysis.rsi;
    const bbands = analysis.bbands;
    const bbandsPosition = bbands ? getBBandsPosition(currentPrice, bbands.lower, bbands.upper) : null;
    const summaryItems: string[] = [];

    if (rsi?.status === 'overbought') summaryItems.push('RSI 과매수');
    if (rsi?.status === 'oversold') summaryItems.push('RSI 과매도');
    if (bbandsPosition === 'above') summaryItems.push('밴드 상단 돌파');
    if (bbandsPosition === 'below') summaryItems.push('밴드 하단 이탈');

    const summaryText = summaryItems.length ? summaryItems.join(' · ') : '중립/관망';
    const asOfLabel = analysis.asOf ? format(new Date(analysis.asOf), 'yyyy-MM-dd') : '-';
    const errorEntries = analysis.errors ? Object.values(analysis.errors).filter(Boolean) : [];

    return (
        <motion.div
            initial="hidden"
            animate="show"
            variants={{
                hidden: { opacity: 0, y: 12 },
                show: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.5, ease: 'easeOut', staggerChildren: 0.08 },
                },
            }}
            className={`rounded-2xl p-4 border space-y-3 ${darkMode ? 'bg-slate-900/50 border-slate-700/60' : 'bg-white/70 border-white/60'}`}
        >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="flex items-center gap-2">
                    <TrendingUp className={`w-4 h-4 ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`} />
                    <span className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>기술지표 분석</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                        {formatIntervalLabel(analysis.interval)} 기준
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                        기준일 {asOfLabel}
                    </span>
                    {analysis.stale && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${darkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-600'}`}>
                            캐시 데이터
                        </span>
                    )}
                    {analysis.partial && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${darkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-600'}`}>
                            일부 지표만 제공
                        </span>
                    )}
                </div>
            </div>

            <div className={`rounded-xl px-3 py-2 text-xs font-medium ${darkMode ? 'bg-slate-800/50 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                신호 요약: {summaryText}
            </div>

            {analysis.noData && (
                <div className={`rounded-xl px-3 py-2 text-xs font-medium ${darkMode ? 'bg-rose-500/10 text-rose-300' : 'bg-rose-50 text-rose-600'}`}>
                    지표 데이터를 찾지 못했습니다. API 응답 오류가 있을 수 있습니다.
                </div>
            )}

            {errorEntries.length > 0 && (
                <div className={`rounded-xl px-3 py-2 text-[11px] ${darkMode ? 'bg-slate-800/40 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                    오류 상세: {errorEntries.join(' · ')}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className={`rounded-xl p-3 border ${darkMode ? 'border-slate-700/60 bg-slate-900/40' : 'border-slate-200/60 bg-white/70'}`}>
                    <div className={`text-[10px] font-bold uppercase tracking-wide ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>RSI</div>
                    {rsi ? (
                        <div className="mt-2 space-y-1">
                            <div className={`text-lg font-bold ${rsi.status === 'overbought' ? 'text-rose-500' : rsi.status === 'oversold' ? 'text-emerald-500' : darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                {rsi.value.toFixed(2)}
                            </div>
                            <div className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {rsi.status === 'overbought' ? '과매수' : rsi.status === 'oversold' ? '과매도' : '중립'}
                            </div>
                        </div>
                    ) : (
                        <div className={`text-xs mt-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>데이터 없음</div>
                    )}
                </div>

                <div className={`rounded-xl p-3 border ${darkMode ? 'border-slate-700/60 bg-slate-900/40' : 'border-slate-200/60 bg-white/70'}`}>
                    <div className={`text-[10px] font-bold uppercase tracking-wide ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>볼린저 밴드</div>
                    {bbands ? (
                        <div className="mt-2 space-y-1">
                            <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                상단 {formatNumber(bbands.upper)}
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                중단 {formatNumber(bbands.middle)}
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                하단 {formatNumber(bbands.lower)}
                            </div>
                            <div className={`text-xs font-bold ${bbandsPosition === 'above' ? 'text-rose-500' : bbandsPosition === 'below' ? 'text-emerald-500' : darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                {formatPositionLabel(bbandsPosition)}
                            </div>
                        </div>
                    ) : (
                        <div className={`text-xs mt-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>데이터 없음</div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
