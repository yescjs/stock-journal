'use client';

import React, { useState } from 'react';
import { PositionRisk, RiskSettings, AccountBalance } from '@/app/types/stats';
import { formatNumber } from '@/app/utils/format';
import {
    Shield, AlertTriangle, Wallet, TrendingDown, Settings,
    Plus, Save, X, ChevronDown, ChevronUp, AlertCircle
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

    const cardClass = 'rounded-2xl border ' + (darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm');
    const labelClass = 'text-[10px] font-bold uppercase tracking-wider ' + (darkMode ? 'text-slate-500' : 'text-slate-400');
    const inputClass = 'w-full px-3 py-2 text-sm font-medium rounded-lg outline-none transition-all ' +
        (darkMode
            ? 'bg-slate-800 text-white placeholder-slate-500 focus:bg-slate-700 focus:ring-1 focus:ring-slate-600'
            : 'bg-slate-100 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-100');

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
        setSaving(true);
        try {
            await onUpdateRiskSettings(riskSettings);
            setShowSettings(false);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const getRiskColor = (level: PositionRisk['riskLevel']) => {
        switch (level) {
            case 'critical': return 'text-rose-500 bg-rose-500/10';
            case 'high': return 'text-orange-500 bg-orange-500/10';
            case 'medium': return 'text-yellow-500 bg-yellow-500/10';
            default: return 'text-emerald-500 bg-emerald-500/10';
        }
    };

    // 일일 손익 비율 계산
    const dailyPnLPercent = accountBalance > 0 ? (dailyPnL / accountBalance) * 100 : 0;

    return (
        <div className={cardClass + ' p-6'}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className={'text-lg font-bold flex items-center gap-2 ' + (darkMode ? 'text-slate-100' : 'text-slate-900')}>
                        <Shield size={20} className={darkMode ? 'text-cyan-400' : 'text-cyan-600'} />
                        리스크 관리
                    </h3>
                    <p className={'text-xs mt-1 ' + (darkMode ? 'text-slate-500' : 'text-slate-400')}>
                        계좌 자산과 포지션 비중을 관리합니다
                    </p>
                </div>

                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={'p-2 rounded-lg transition-all ' +
                        (darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500')}
                >
                    <Settings size={18} />
                </button>
            </div>

            {/* Alerts */}
            {(dailyLossAlert || highRiskPositions.length > 0) && (
                <div className="mb-4 space-y-2">
                    {dailyLossAlert && (
                        <div className={'flex items-center gap-2 p-3 rounded-xl ' + (darkMode ? 'bg-rose-500/10' : 'bg-rose-50')}>
                            <AlertCircle size={16} className="text-rose-500 flex-shrink-0" />
                            <span className="text-sm font-medium text-rose-500">{dailyLossAlert.message}</span>
                        </div>
                    )}
                    {highRiskPositions.length > 0 && (
                        <div className={'flex items-center gap-2 p-3 rounded-xl ' + (darkMode ? 'bg-orange-500/10' : 'bg-orange-50')}>
                            <AlertTriangle size={16} className="text-orange-500 flex-shrink-0" />
                            <span className="text-sm font-medium text-orange-500">
                                {highRiskPositions.length}개 종목 비중 경고: {highRiskPositions.map(p => p.symbolName || p.symbol).join(', ')}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Account Balance */}
            <div className={'p-4 rounded-xl mb-4 ' + (darkMode ? 'bg-slate-800/50' : 'bg-slate-50')}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Wallet size={16} className={darkMode ? 'text-slate-400' : 'text-slate-500'} />
                        <span className={labelClass}>총 자산</span>
                    </div>
                    <button
                        onClick={() => {
                            setBalanceInput(accountBalance.toString());
                            setShowBalanceForm(!showBalanceForm);
                        }}
                        className={'text-xs font-bold px-2 py-1 rounded-lg transition-all ' +
                            (darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-white text-slate-600 hover:bg-slate-200')}
                    >
                        {showBalanceForm ? <X size={12} /> : <Plus size={12} />}
                    </button>
                </div>

                <div className={'text-2xl font-black mb-2 ' + (darkMode ? 'text-slate-100' : 'text-slate-900')}>
                    {accountBalance > 0 ? formatNumber(accountBalance) : '자산을 입력하세요'}
                </div>

                {accountBalance > 0 && (
                    <div className="flex items-center gap-2">
                        <span className={labelClass}>오늘 손익</span>
                        <span className={`text-sm font-bold ${dailyPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {dailyPnL >= 0 ? '+' : ''}{formatNumber(dailyPnL)} ({dailyPnLPercent >= 0 ? '+' : ''}{dailyPnLPercent.toFixed(2)}%)
                        </span>
                    </div>
                )}

                {/* Balance Form */}
                {showBalanceForm && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                        <div>
                            <label className={labelClass}>총 자산 (원)</label>
                            <input
                                type="number"
                                value={balanceInput}
                                onChange={(e) => setBalanceInput(e.target.value)}
                                className={inputClass}
                                placeholder="10000000"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>입금액</label>
                                <input
                                    type="number"
                                    value={depositInput}
                                    onChange={(e) => setDepositInput(e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>출금액</label>
                                <input
                                    type="number"
                                    value={withdrawalInput}
                                    onChange={(e) => setWithdrawalInput(e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleSaveBalance}
                            disabled={saving}
                            className={'w-full py-2 rounded-lg font-bold text-sm text-white transition-all ' +
                                (saving ? 'bg-slate-400 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-500')}
                        >
                            {saving ? '저장 중...' : '자산 저장'}
                        </button>
                    </div>
                )}
            </div>

            {/* Position Risks */}
            {positionRisks.length > 0 && (
                <div>
                    <button
                        onClick={() => setExpandedPositions(!expandedPositions)}
                        className="flex items-center justify-between w-full mb-3"
                    >
                        <span className={labelClass}>포지션 비중</span>
                        {expandedPositions ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </button>

                    <div className="space-y-2">
                        {(expandedPositions ? positionRisks : positionRisks.slice(0, 3)).map((pos) => (
                            <div
                                key={pos.symbol}
                                className={'flex items-center justify-between p-3 rounded-xl ' + (darkMode ? 'bg-slate-800/50' : 'bg-slate-50')}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getRiskColor(pos.riskLevel)}`}>
                                        {pos.riskLevel.toUpperCase()}
                                    </span>
                                    <div>
                                        <div className={'text-sm font-bold ' + (darkMode ? 'text-slate-200' : 'text-slate-700')}>
                                            {pos.symbolName || pos.symbol}
                                        </div>
                                        <div className={labelClass}>{formatNumber(pos.positionValue)}</div>
                                    </div>
                                </div>
                                <div className={'text-lg font-black ' + (pos.riskLevel !== 'low' ? 'text-orange-500' : (darkMode ? 'text-slate-200' : 'text-slate-700'))}>
                                    {pos.positionPercent.toFixed(1)}%
                                </div>
                            </div>
                        ))}
                    </div>

                    {!expandedPositions && positionRisks.length > 3 && (
                        <button
                            onClick={() => setExpandedPositions(true)}
                            className={'w-full mt-2 py-2 text-xs font-bold rounded-lg ' +
                                (darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100')}
                        >
                            +{positionRisks.length - 3}개 더 보기
                        </button>
                    )}
                </div>
            )}

            {/* Settings Panel */}
            {showSettings && (
                <div className={'mt-4 pt-4 border-t ' + (darkMode ? 'border-slate-800' : 'border-slate-100')}>
                    <h4 className={'text-sm font-bold mb-3 ' + (darkMode ? 'text-slate-200' : 'text-slate-700')}>
                        리스크 설정
                    </h4>
                    <div className="space-y-3">
                        <div>
                            <label className={labelClass}>최대 종목 비중 (%)</label>
                            <input
                                type="number"
                                value={riskSettings.maxPositionPercent}
                                onChange={(e) => onUpdateRiskSettings({ maxPositionPercent: Number(e.target.value) })}
                                className={inputClass}
                                min={1}
                                max={100}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>일일 최대 손실률 (%)</label>
                            <input
                                type="number"
                                value={riskSettings.maxDailyLossPercent}
                                onChange={(e) => onUpdateRiskSettings({ maxDailyLossPercent: Number(e.target.value) })}
                                className={inputClass}
                                min={0}
                                max={100}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>일일 최대 손실 금액 (원)</label>
                            <input
                                type="number"
                                value={riskSettings.maxDailyLossAmount}
                                onChange={(e) => onUpdateRiskSettings({ maxDailyLossAmount: Number(e.target.value) })}
                                className={inputClass}
                            />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={riskSettings.alertEnabled}
                                onChange={(e) => onUpdateRiskSettings({ alertEnabled: e.target.checked })}
                                className="w-4 h-4 rounded"
                            />
                            <span className={'text-sm ' + (darkMode ? 'text-slate-300' : 'text-slate-600')}>
                                경고 알림 활성화
                            </span>
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
}
