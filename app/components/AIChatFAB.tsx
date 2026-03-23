'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Gem } from 'lucide-react';
import { BottomSheet } from '@/app/components/BottomSheet';
import { AIChatPanel } from '@/app/components/AIChatPanel';
import { Trade } from '@/app/types/trade';
import { TradeAnalysis } from '@/app/types/analysis';
import { analyzeTradesComplete } from '@/app/utils/tradeAnalysis';
import type { ChatMessage } from '@/app/hooks/useAIChat';

interface AIChatFABProps {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  onSend: (question: string, analysis: TradeAnalysis) => void;
  onClear: () => void;
  trades: Trade[];
  coinBalance: number;
  onChargeCoins: () => void;
}

export function AIChatFAB({
  messages,
  loading,
  error,
  onSend,
  onClear,
  trades,
  coinBalance,
  onChargeCoins,
}: AIChatFABProps) {
  const [isOpen, setIsOpen] = useState(false);

  const analysis = useMemo<TradeAnalysis | null>(() => {
    if (trades.length === 0) return null;
    return analyzeTradesComplete(trades);
  }, [trades]);

  const handleSend = (question: string) => {
    if (!analysis) return;
    onSend(question, analysis);
  };

  const hasUnread = messages.length > 0 && messages[messages.length - 1].role === 'assistant';

  return (
    <>
      {/* FAB Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            onClick={() => setIsOpen(true)}
            aria-label="AI Q&A 열기"
            className="fixed bottom-20 md:bottom-6 left-6 z-40 w-12 h-12 rounded-full bg-indigo-600 text-white shadow-2xl shadow-indigo-600/30 flex items-center justify-center hover:bg-indigo-500 hover:scale-105 active:scale-95 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2"
          >
            <MessageSquare size={20} />

            {/* Coin badge */}
            <span className="absolute -top-1 -right-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/90 text-[10px] font-bold text-white shadow-lg">
              <Gem size={8} />
              {coinBalance}
            </span>

            {/* Unread dot */}
            {hasUnread && (
              <span className="absolute top-0 left-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-indigo-600 animate-pulse" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat BottomSheet */}
      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="AI Q&A"
      >
        {!analysis ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare size={32} className="text-white/10 mb-3" />
            <p className="text-sm text-white/30 mb-1">분석할 데이터가 부족합니다.</p>
            <p className="text-xs text-white/20">매수 + 매도가 한 쌍 이상 있어야 AI Q&A를 이용할 수 있습니다.</p>
          </div>
        ) : (
          <AIChatPanel
            messages={messages}
            loading={loading}
            error={error}
            onSend={handleSend}
            onClear={onClear}
            isLoggedIn={true}
            coinBalance={coinBalance}
            onChargeCoins={onChargeCoins}
          />
        )}
      </BottomSheet>
    </>
  );
}
