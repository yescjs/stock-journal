'use client';

import React, { useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { X, Pencil, Trash2 } from 'lucide-react';
import { Trade } from '@/app/types/trade';
import { formatPrice } from '@/app/utils/format';

const EMOTION_LABELS: Record<string, { label: string; className: string }> = {
  PLANNED: { label: '계획된', className: 'text-emerald-400 bg-emerald-500/10' },
  FOMO: { label: 'FOMO', className: 'text-yellow-400 bg-yellow-500/10' },
  FEAR: { label: '공포', className: 'text-blue-400 bg-blue-500/10' },
  GREED: { label: '탐욕', className: 'text-red-400 bg-red-500/10' },
  REVENGE: { label: '복수매매', className: 'text-orange-400 bg-orange-500/10' },
  IMPULSE: { label: '충동', className: 'text-purple-400 bg-purple-500/10' },
};

export interface CalendarDayPanelContentProps {
  dateStr: string;
  trades: Trade[];
  dailyPnL?: { krw: number; usd: number };
  onClose: () => void;
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  showConverted: boolean;
  exchangeRate: number;
}

export function CalendarDayPanelContent({
  dateStr,
  trades,
  dailyPnL,
  onClose,
  onEdit,
  onDelete,
  showConverted,
  exchangeRate,
}: CalendarDayPanelContentProps) {
  const dateObj = parseISO(dateStr);
  const formatted = format(dateObj, 'M월 d일 (EEE)', { locale: ko });

  const krwPnL = dailyPnL?.krw ?? 0;
  const usdPnL = dailyPnL?.usd ?? 0;
  // When showConverted: all values are in KRW (krwValue includes converted USD)
  // When !showConverted: krwValue = KRW trades P&L, usdValue = USD trades P&L (separate units)
  const totalPnLForColor = showConverted
    ? krwPnL
    : (krwPnL !== 0 ? krwPnL : usdPnL);
  const hasPnL = krwPnL !== 0 || usdPnL !== 0;

  // ESC key handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 flex-none">
        <div>
          <div className="text-sm font-bold text-white">{formatted}</div>
          <div className="text-xs text-white/40 mt-0.5 flex items-center gap-1.5">
            <span>거래 {trades.length}건</span>
            {hasPnL && (
              <span className={`font-bold ${totalPnLForColor > 0 ? 'text-rose-400' : 'text-blue-400'}`}>
                {showConverted
                  ? `${krwPnL > 0 ? '+' : ''}${Math.round(krwPnL).toLocaleString('ko-KR')}원`
                  : <>
                      {krwPnL !== 0 && `${krwPnL > 0 ? '+' : ''}${Math.round(krwPnL).toLocaleString('ko-KR')}원`}
                      {krwPnL !== 0 && usdPnL !== 0 && ' '}
                      {usdPnL !== 0 && `${usdPnL > 0 ? '+' : ''}$${Math.abs(usdPnL).toFixed(0)}`}
                    </>
                }
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/8 transition-colors"
          aria-label="닫기"
        >
          <X size={16} />
        </button>
      </div>

      {/* Trade List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-28 text-center">
            <div className="text-2xl mb-2">📭</div>
            <p className="text-xs text-white/30">이 날은 거래가 없어요</p>
          </div>
        ) : (
          trades.map(trade => {
            const emotionInfo = trade.emotion_tag ? EMOTION_LABELS[trade.emotion_tag] : null;
            return (
              <div
                key={trade.id}
                className="p-3 rounded-xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-start gap-2">
                  {/* Side badge */}
                  <div className={`flex-none px-2 py-0.5 rounded-lg text-xs font-bold mt-0.5 ${
                    trade.side === 'BUY'
                      ? 'bg-color-up/10 text-color-up'
                      : 'bg-color-down/10 text-color-down'
                  }`}>
                    {trade.side === 'BUY' ? '매수' : '매도'}
                  </div>

                  {/* Trade info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-white truncate">
                        {trade.symbol_name || trade.symbol}
                      </span>
                      {trade.symbol_name && (
                        <span className="text-[10px] text-white/30 flex-none">{trade.symbol}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-white/40 mt-0.5">
                      {formatPrice(trade.price, trade.symbol)} × {trade.quantity.toLocaleString()}주
                    </div>
                    {emotionInfo && (
                      <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${emotionInfo.className}`}>
                        {emotionInfo.label}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 flex-none">
                    <button
                      onClick={() => onEdit(trade)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/8 transition-colors"
                      title="편집"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => onDelete(trade.id)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="삭제"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
