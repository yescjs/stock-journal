'use client';

import React, { useState } from 'react';
import { PositionRisk, RiskSettings, AccountBalance } from '@/app/types/stats';
import { formatNumber } from '@/app/utils/format';
import {
    Shield, AlertTriangle, Wallet, TrendingDown, TrendingUp, Settings,
    Plus, Save, X, ChevronDown, ChevronUp, AlertCircle, CheckCircle2,
    Lock, RefreshCw
} from 'lucide-react';

interface RiskManagementWidgetProps {
    accountBalance: number;
    balanceHistory: AccountBalance[];
    positionRisks: PositionRisk[];
    highRiskPositions: PositionRisk[];
    dailyLossAlert: { type: 'percent' | 'amount'; value: number; limit: number; message: string } | null;
    riskSettings: RiskSettings;
    dailyPnL: number;
    onUpdateBalance: (balance: number, deposit?: number, withdrawal?: number, notes?: string) => Promise<void>;
    onUpdateRiskSettings: (settings: Partial<RiskSettings>) => Promise<void>;
    darkMode: boolean;
}

export function RiskManagementWidget({
    accountBalance,
    balanceHistory,
    positionRisks,
    highRiskPositions,
    dailyLossAlert,
    riskSettings,
    dailyPnL,
    onUpdateBalance,
    onUpdateRiskSettings,
    darkMode,
}: RiskManagementWidgetProps) {
    const [showBalanceForm, setShowBalanceForm] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [expandedPositions, setExpandedPositions] = useState(false);
    const [balanceInput, setBalanceInput] = useState(accountBalance.toString());
    const [depositInput, setDepositInput] = useState('0');
    const [withdrawalInput, setWithdrawalInput] = useState('0');
    const [saving, setSaving] = useState(false);

    // Modern Styles
    const cardClass = `glass-card p-6 rounded-3xl ${darkMode ? 'bg-slate-900/40 border-slate-700/50' : 'bg-white/60 border-white/60 shadow-sm'}`;
    const labelClass = `text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`;
    const inputClass = `w-full px-4 py-2.5 text-sm font-medium rounded-xl outline-none transition-all ${
        darkMode
            ? 'bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:bg-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
            : 'bg-white/50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100'
    }`;
    
    // Risk Level Styles
    const getRiskColor = (level: PositionRisk['riskLevel']) => {
        switch (level) {
            case 'critical': return darkMode ? 'text-rose-400 bg-rose-500/20 border-rose-500/30' : 'text-rose-600 bg-rose-50 border-rose-200';
            case 'high': return darkMode ? 'text-orange-400 bg-orange-500/20 border-orange-500/30' : 'text-orange-600 bg-orange-50 border-orange-200';
            case 'medium': return darkMode ? 'text-amber-400 bg-amber-500/20 border-amber-500/30' : 'text-amber-600 bg-amber-50 border-amber-200';
            default: return darkMode ? 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30' : 'text-emerald-600 bg-emerald-50 border-emerald-200';
        }
    };

    const handleSaveBalance = async () => {
        setSaving(true);
        try {
            await onUpdateBalance(
                Number(balanceInput),
                Number(depositInput),
                Number(withdrawalInput)
            );
            setShowBalanceForm(false);
            setDepositInput('0');
            setWithdrawalInput('0');
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveSettings = async () => {
        // ... (implemented via direct onChange currently)
    };

    const dailyPnLPercent = accountBalance > 0 ? (dailyPnL / accountBalance) * 100 : 0;

    return (
        <div className={cardClass}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl ${darkMode ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-600'}`}>
                            <Shield size={22} strokeWidth={2.5} />
                        </div>
                        <span className={darkMode ? 'text-slate-100' : 'text-slate-800'}>리스크 매니저</span>
                    </h3>
                    <p className={`text-sm mt-1.5 ml-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        자산을 보호하고 최적의 포지션을 유지하세요
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`
                            p-2.5 rounded-xl transition-all btn-press
                            ${showSettings 
                                ? (darkMode ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800') 
                                : (darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-white text-slate-500 hover:shadow-sm shadow-inner bg-slate-100')}
                        `}
                        title="리스크 설정"
                    >
                        <Settings size={20} strokeWidth={2} />
                    </button>
                    <button
                         onClick={() => {
                            setBalanceInput(accountBalance.toString());
                            setShowBalanceForm(!showBalanceForm);
                        }}
                        className={`
                            flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all btn-press border
                            ${showBalanceForm 
                                ? (darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-200 text-slate-800')
                                : (darkMode 
                                    ? 'bg-slate-800/50 border-slate-700 text-cyan-400 hover:bg-slate-800 hover:text-cyan-300' 
                                    : 'bg-white border-slate-200 text-cyan-600 hover:bg-cyan-50 hover:border-cyan-200 shadow-sm')}
                        `}
                    >
                        <Wallet size={18} />
                        {showBalanceForm ? '닫기' : '자산 관리'}
                    </button>
                </div>
            </div>

            {/* Critical Alerts Area */}
            {(dailyLossAlert || highRiskPositions.length > 0) && (
                <div className="mb-6 space-y-3">
                    {dailyLossAlert && (
                        <div className={`flex items-start gap-3 p-4 rounded-2xl animate-pulse ${darkMode ? 'bg-rose-950/40 border-l-4 border-rose-500' : 'bg-rose-50 border-l-4 border-rose-500'}`}>
                            <AlertCircle size={20} className="text-rose-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-black text-rose-500">일일 손실 한도 초과!</h4>
                                <p className={`text-sm mt-0.5 ${darkMode ? 'text-rose-300' : 'text-rose-700'}`}>{dailyLossAlert.message}</p>
                            </div>
                        </div>
                    )}
                    {highRiskPositions.length > 0 && (
                        <div className={`flex items-start gap-3 p-4 rounded-2xl ${darkMode ? 'bg-orange-950/40 border-l-4 border-orange-500' : 'bg-orange-50 border-l-4 border-orange-500'}`}>
                            <AlertTriangle size={20} className="text-orange-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-black text-orange-500">포지션 비중 리스크</h4>
                                <p className={`text-sm mt-0.5 ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                                    {highRiskPositions.length}개 종목이 설정된 리스크 한도를 초과했습니다.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Left: Account Overview */}
                <div className={`rounded-2xl p-6 ${darkMode ? 'bg-slate-800/30' : 'bg-slate-50 border border-slate-100'}`}>
                    <div className="flex items-center justify-between mb-6">
                        <span className={labelClass}>현재 총 자산 (EQUITY)</span>
                        <div className={`px-2 py-1 rounded text-[10px] font-bold ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-500 border border-slate-200'}`}>
                            LAST SYNCED
                        </div>
                    </div>
                    
                    <div className={`text-4xl font-black tracking-tight mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {accountBalance > 0 ? formatNumber(accountBalance) : <span className="text-slate-400 text-2xl">자산을 입력해주세요</span>}
                    </div>

                    {accountBalance > 0 && (
                        <div className="flex items-center gap-3">
                            <span className={`flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-lg ${dailyPnL >= 0 
                                ? (darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700') 
                                : (darkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700')
                            }`}>
                                {dailyPnL >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                {dailyPnL >= 0 ? '+' : ''}{formatNumber(dailyPnL)}
                            </span>
                            <span className={`text-sm font-bold ${dailyPnLPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                ({dailyPnLPercent >= 0 ? '+' : ''}{dailyPnLPercent.toFixed(2)}%)
                            </span>
                        </div>
                    )}

                    {/* Balance Update Form (Collapsible) */}
                    {showBalanceForm && (
                        <div className={`mt-6 pt-6 border-t animate-slide-up ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                             <div className="space-y-4">
                                <div>
                                    <label className={labelClass + ' mb-2 block'}>총 자산 직접 수정</label>
                                    <input
                                        type="number"
                                        value={balanceInput}
                                        onChange={(e) => setBalanceInput(e.target.value)}
                                        className={inputClass + ' font-mono'}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass + ' mb-2 block flex items-center gap-1 text-emerald-500'}>
                                            <Plus size={12} /> 입금 (Deposit)
                                        </label>
                                        <input
                                            type="number"
                                            value={depositInput}
                                            onChange={(e) => setDepositInput(e.target.value)}
                                            className={inputClass + ' font-mono border-emerald-500/30 focus:border-emerald-500 focus:ring-emerald-500'}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass + ' mb-2 block flex items-center gap-1 text-rose-500'}>
                                            <TrendingDown size={12} /> 출금 (Withdrawal)
                                        </label>
                                        <input
                                            type="number"
                                            value={withdrawalInput}
                                            onChange={(e) => setWithdrawalInput(e.target.value)}
                                            className={inputClass + ' font-mono border-rose-500/30 focus:border-rose-500 focus:ring-rose-500'}
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleSaveBalance}
                                    disabled={saving}
                                    className={`w-full py-3 rounded-xl font-bold text-sm text-white transition-all btn-press shadow-lg ${saving ? 'bg-slate-400' : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/20'}`}
                                >
                                    {saving ? '저장 중...' : '자산 변동 사항 반영하기'}
                                </button>
                             </div>
                        </div>
                    )}
                </div>

                {/* Right: Position Risks & Settings */}
                <div className="flex flex-col gap-6">
                    {/* Position Allocation */}
                    <div className={`flex-1 rounded-2xl p-6 ${darkMode ? 'bg-slate-800/30' : 'bg-slate-50 border border-slate-100'}`}>
                         <div className="flex items-center justify-between mb-4">
                            <span className={labelClass}>포지션 비중 (POSITION SIZING)</span>
                            <button onClick={() => setExpandedPositions(!expandedPositions)} className="text-xs font-bold text-cyan-500 hover:underline">
                                {expandedPositions ? '접기' : '더 보기'}
                            </button>
                        </div>

                         <div className="space-y-3">
                            {positionRisks.length > 0 ? (
                                (expandedPositions ? positionRisks : positionRisks.slice(0, 3)).map((pos) => (
                                    <div
                                        key={pos.symbol}
                                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${getRiskColor(pos.riskLevel)} border-opacity-50 bg-opacity-10`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col">
                                                <span className={`text-sm font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                                    {pos.symbolName || pos.symbol}
                                                </span>
                                                <span className={`text-[10px] opacity-70 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                                    {formatNumber(pos.positionValue)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-lg font-black tabular-nums ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                                {pos.positionPercent.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 opacity-50">
                                    <CheckCircle2 size={24} className="mx-auto mb-2" />
                                    <p className="text-sm">현재 보유 중인 포지션이 없습니다</p>
                                </div>
                            )}
                         </div>
                    </div>

                    {/* Settings Panel (Inline) */}
                    {showSettings && (
                        <div className={`rounded-2xl p-6 border animate-fade-in ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                             <h4 className="flex items-center gap-2 font-bold mb-4 text-cyan-500">
                                 <Lock size={16} /> 리스크 한도 설정
                             </h4>
                             <div className="space-y-4">
                                 <div>
                                    <div className="flex justify-between mb-1.5">
                                        <label className={labelClass}>단일 종목 최대 비중</label>
                                        <span className={`text-xs font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                            {riskSettings.maxPositionPercent}% 권장
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="100"
                                        value={riskSettings.maxPositionPercent}
                                        onChange={(e) => onUpdateRiskSettings({ maxPositionPercent: Number(e.target.value) })}
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-cyan-500"
                                    />
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                     <div>
                                        <label className={labelClass + ' mb-1.5 block'}>일일 손실 한도 (%)</label>
                                        <input
                                            type="number"
                                            value={riskSettings.maxDailyLossPercent}
                                            onChange={(e) => onUpdateRiskSettings({ maxDailyLossPercent: Number(e.target.value) })}
                                            className={inputClass}
                                        />
                                     </div>
                                     <div>
                                        <label className={labelClass + ' mb-1.5 block'}>일일 손실 한도 (원)</label>
                                        <input
                                            type="number"
                                            value={riskSettings.maxDailyLossAmount}
                                            onChange={(e) => onUpdateRiskSettings({ maxDailyLossAmount: Number(e.target.value) })}
                                            className={inputClass}
                                        />
                                     </div>
                                 </div>
                                 <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-slate-200 dark:border-slate-700">
                                     <input
                                         type="checkbox"
                                         checked={riskSettings.alertEnabled}
                                         onChange={(e) => onUpdateRiskSettings({ alertEnabled: e.target.checked })}
                                         className="w-5 h-5 rounded text-cyan-500 focus:ring-cyan-500 border-gray-300"
                                     />
                                     <span className={`text-sm font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                         리스크 발생 시 경고 알림 받기
                                     </span>
                                 </label>
                             </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
