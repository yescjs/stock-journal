'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Gem, X } from 'lucide-react';
import { BottomSheet } from '@/app/components/BottomSheet';
import { AIChatPanel } from '@/app/components/AIChatPanel';
import { Trade } from '@/app/types/trade';
import { TradeAnalysis } from '@/app/types/analysis';
import { analyzeTradesComplete } from '@/app/utils/tradeAnalysis';
import type { ChatMessage } from '@/app/hooks/useAIChat';

const SIDE_PANEL_WIDTH = 360;

interface AIChatFABProps {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  onSend: (question: string, analysis: TradeAnalysis) => void;
  onClear: () => void;
  trades: Trade[];
  coinBalance: number;
  onChargeCoins: () => void;
  onOpenChange?: (isOpen: boolean) => void;
  freeRemaining: number;
  isFree: boolean;
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
  onOpenChange,
  freeRemaining,
  isFree,
}: AIChatFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [lastReadCount, setLastReadCount] = useState(0);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : false
  );

  // Listen for viewport changes
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Notify parent of open state changes
  useEffect(() => {
    onOpenChange?.(isOpen && isDesktop);
  }, [isOpen, isDesktop, onOpenChange]);

  const analysis = useMemo<TradeAnalysis | null>(() => {
    if (trades.length === 0) return null;
    return analyzeTradesComplete(trades);
  }, [trades]);

  const handleSend = useCallback((question: string) => {
    if (!analysis) return;
    onSend(question, analysis);
  }, [analysis, onSend]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setLastReadCount(messages.length);
  }, [messages.length]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const lastMsg = messages[messages.length - 1];
  const hasUnread = messages.length > lastReadCount && lastMsg?.role === 'assistant';

  const emptyState = (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <MessageSquare size={32} className="text-white/10 mb-3" />
      <p className="text-sm text-white/30 mb-1">분석할 데이터가 부족합니다.</p>
      <p className="text-xs text-white/20">매수 + 매도가 한 쌍 이상 있어야 AI Q&A를 이용할 수 있습니다.</p>
    </div>
  );

  const chatContent = !analysis ? emptyState : (
    <AIChatPanel
      messages={messages}
      loading={loading}
      error={error}
      onSend={handleSend}
      onClear={onClear}
      isLoggedIn={true}
      coinBalance={coinBalance}
      onChargeCoins={onChargeCoins}
      hideHeader={isDesktop}
      freeRemaining={freeRemaining}
      isFree={isFree}
    />
  );

  return (
    <>
      {/* FAB Button — right side, above the "+" FAB */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            onClick={handleOpen}
            aria-label="AI Q&A 열기"
            className="fixed bottom-36 md:bottom-20 right-6 z-40 w-12 h-12 rounded-full bg-indigo-600 text-white shadow-2xl shadow-indigo-600/30 flex items-center justify-center hover:bg-indigo-500 hover:scale-105 active:scale-95 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2"
          >
            <MessageSquare size={20} />
            {/* Free remaining / coin badge */}
            <span className={`absolute -top-1 -right-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-lg ${
              isFree ? 'bg-emerald-500/90' : 'bg-amber-500/90'
            }`}>
              {isFree ? freeRemaining : <><Gem size={8} />{coinBalance}</>}
            </span>
            {/* Unread dot */}
            {hasUnread && (
              <span className="absolute top-0 left-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-indigo-600 animate-pulse" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Desktop: Overlay Side Panel (right side, NO backdrop — content stays interactive) */}
      {isDesktop && (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ x: SIDE_PANEL_WIDTH + 20 }}
              animate={{ x: 0 }}
              exit={{ x: SIDE_PANEL_WIDTH + 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-14 bottom-0 right-0 z-[55] flex flex-col bg-card border-l border-white/10 shadow-2xl"
              style={{ width: SIDE_PANEL_WIDTH }}
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                    <MessageSquare size={16} className="text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">AI Q&A</h4>
                    <p className="text-xs text-white/30">매매 데이터 질문</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`flex items-center gap-0.5 text-xs mr-1 ${isFree ? 'text-emerald-400/60' : 'text-amber-400/60'}`}>
                    {isFree ? `무료 ${freeRemaining}회` : <><Gem size={9} /> {coinBalance}</>}
                  </span>
                  <button
                    onClick={handleClose}
                    className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Panel Body */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {chatContent}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Mobile: BottomSheet (existing pattern) */}
      {!isDesktop && (
        <BottomSheet
          isOpen={isOpen}
          onClose={handleClose}
          title="AI Q&A"
        >
          {chatContent}
        </BottomSheet>
      )}
    </>
  );
}

/** Width of the side panel, exported for layout adjustments */
export { SIDE_PANEL_WIDTH };
