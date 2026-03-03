// Trade Checklist — pre-trade confirmation dialog with emotion detection
// Shown before submitting a new trade to enforce trading discipline
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Trade } from '@/app/types/trade';
import {
  EmotionWarning,
  ChecklistItem,
  DEFAULT_CHECKLIST,
  detectEmotionPatterns,
  calcDisciplineScore,
} from '@/app/utils/emotionDetector';
import {
  ShieldCheck, AlertTriangle, XCircle, ChevronRight,
  CheckCircle, Circle, X, Brain, Flame,
} from 'lucide-react';

interface TradeChecklistProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (disciplineScore: number, emotionTag?: string) => void;
  side: 'BUY' | 'SELL';
  symbol: string;
  symbolName?: string;
  price: number;
  quantity: number;
  existingTrades: Trade[];
}

const EMOTION_OPTIONS = [
  { value: 'PLANNED', label: '📋 계획된 매매', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { value: 'FOMO', label: '😰 FOMO', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  { value: 'FEAR', label: '😨 공포', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  { value: 'GREED', label: '🤑 탐욕', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  { value: 'REVENGE', label: '😤 복수', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  { value: 'IMPULSE', label: '⚡ 충동', color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
];

export function TradeChecklist({
  isOpen,
  onClose,
  onConfirm,
  side,
  symbol,
  symbolName,
  price,
  quantity,
  existingTrades,
}: TradeChecklistProps) {
  // Checklist state
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    DEFAULT_CHECKLIST.map(item => ({ ...item, checked: false }))
  );
  const [selectedEmotion, setSelectedEmotion] = useState<string>('PLANNED');

  // Detect warnings
  const warnings = useMemo<EmotionWarning[]>(
    () => detectEmotionPatterns(existingTrades, side, symbol, price * quantity),
    [existingTrades, side, symbol, price, quantity]
  );

  // Discipline score
  const disciplineScore = useMemo(() => calcDisciplineScore(checklist), [checklist]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setChecklist(DEFAULT_CHECKLIST.map(item => ({ ...item, checked: false })));
      setSelectedEmotion('PLANNED');
    }
  }, [isOpen]);

  const toggleItem = (id: string) => {
    setChecklist(prev =>
      prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item)
    );
  };

  const handleConfirm = () => {
    onConfirm(disciplineScore, selectedEmotion);
  };

  if (!isOpen) return null;

  const amount = price * quantity;
  const allChecked = checklist.every(c => c.checked);
  const hasCritical = warnings.some(w => w.severity === 'critical');

  const content = (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-[#0f0f1e] border border-white/10 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0f0f1e] border-b border-white/5 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              hasCritical ? 'bg-red-500/15' : 'bg-indigo-500/15'
            }`}>
              {hasCritical
                ? <Flame size={18} className="text-red-400" />
                : <ShieldCheck size={18} className="text-indigo-400" />
              }
            </div>
            <div>
              <h3 className="text-base font-bold text-white">매매 전 점검</h3>
              <p className="text-xs text-white/40">원칙을 지키는 매매가 수익을 만듭니다</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Trade Summary */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
            <div className={`px-3 py-1.5 rounded-lg text-sm font-black ${
              side === 'BUY' ? 'bg-red-500/15 text-red-400' : 'bg-blue-500/15 text-blue-400'
            }`}>
              {side === 'BUY' ? '매수' : '매도'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">
                {symbolName || symbol}
              </div>
              <div className="text-xs text-white/40">
                {price.toLocaleString()} × {quantity}주 = {amount.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-yellow-400" />
                <span className="text-sm font-bold text-yellow-400">감지된 패턴</span>
              </div>
              {warnings.map((w, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border text-sm leading-relaxed ${
                    w.severity === 'critical'
                      ? 'bg-red-500/5 border-red-500/15 text-red-300'
                      : w.severity === 'warning'
                        ? 'bg-yellow-500/5 border-yellow-500/15 text-yellow-300'
                        : 'bg-blue-500/5 border-blue-500/15 text-blue-300'
                  }`}
                >
                  <span className="font-bold">{w.icon} {w.title}</span>
                  <p className="text-white/40 mt-1">{w.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain size={15} className="text-indigo-400" />
                <span className="text-sm font-bold text-white">체크리스트</span>
              </div>
              <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                disciplineScore >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
                disciplineScore >= 60 ? 'bg-yellow-500/10 text-yellow-400' :
                'bg-red-500/10 text-red-400'
              }`}>
                규율 점수: {disciplineScore}점
              </div>
            </div>
            {checklist.map(item => (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                  item.checked
                    ? 'bg-emerald-500/5 border-emerald-500/15'
                    : 'bg-white/2 border-white/5 hover:border-white/10'
                }`}
              >
                {item.checked
                  ? <CheckCircle size={16} className="text-emerald-400 flex-none mt-0.5" />
                  : <Circle size={16} className="text-white/15 flex-none mt-0.5" />
                }
                <div className="min-w-0">
                  <div className={`text-sm font-bold ${item.checked ? 'text-emerald-400' : 'text-white/60'}`}>
                    {item.label}
                  </div>
                  <p className="text-xs text-white/35 mt-0.5 leading-relaxed">{item.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Emotion Tag Selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">진입 심리 태그</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {EMOTION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedEmotion(opt.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                    selectedEmotion === opt.value
                      ? opt.color + ' ring-1 ring-current'
                      : 'text-white/30 bg-white/3 border-white/5 hover:border-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#0f0f1e] border-t border-white/5 px-5 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-12 rounded-xl text-sm font-bold text-white/40 bg-white/5 border border-white/8 hover:bg-white/8 transition-all"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              allChecked
                ? 'bg-indigo-500 text-white hover:bg-indigo-400 shadow-lg shadow-indigo-500/25'
                : hasCritical
                  ? 'bg-red-500/80 text-white hover:bg-red-500 shadow-lg shadow-red-500/25'
                  : 'bg-yellow-500/80 text-white hover:bg-yellow-500 shadow-lg shadow-yellow-500/25'
            }`}
          >
            {!allChecked && <AlertTriangle size={13} />}
            {allChecked ? '매매 실행' : '그래도 실행'}
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(content, document.body)
    : null;
}
