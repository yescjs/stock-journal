'use client';

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Gem, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
  /** Controlled open state from parent (SpeedDialFAB) */
  isOpen: boolean;
  /** Called when panel wants to close */
  onClose: () => void;
  // Streaming props
  isStreaming?: boolean;
  onStopStreaming?: () => void;
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
  isOpen,
  onClose,
  isStreaming = false,
  onStopStreaming,
}: AIChatFABProps) {
  const t = useTranslations('trade.chat');
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

  // Notify parent of open state changes (for desktop side panel layout shift)
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

  const emptyState = (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <MessageSquare size={32} className="text-white/10 mb-3" />
      <p className="text-sm text-white/30 mb-1">{t('emptyTitle')}</p>
      <p className="text-xs text-white/20">{t('emptyDesc')}</p>
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
      isStreaming={isStreaming}
      onStopStreaming={onStopStreaming}
    />
  );

  return (
    <>
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
                    <h4 className="text-sm font-bold text-white">{t('title')}</h4>
                    <p className="text-xs text-white/30">{t('dataQuestion')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`flex items-center gap-0.5 text-xs mr-1 ${isFree ? 'text-emerald-400/60' : 'text-amber-400/60'}`}>
                    {isFree ? t('freeCount', { count: freeRemaining }) : <><Gem size={9} /> {coinBalance}</>}
                  </span>
                  <button
                    onClick={onClose}
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
          onClose={onClose}
          title={t('title')}
        >
          {chatContent}
        </BottomSheet>
      )}
    </>
  );
}

/** Width of the side panel, exported for layout adjustments */
export { SIDE_PANEL_WIDTH };
