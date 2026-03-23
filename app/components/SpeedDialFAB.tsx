'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, PenLine, MessageSquare, Gem } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface SpeedDialFABProps {
  onAddTrade: () => void;
  onOpenChat: () => void;
  /** Whether chat panel is already open (hide the chat action) */
  isChatOpen: boolean;
  /** Show AI Q&A action only when user is logged in */
  showAIChat: boolean;
  /** Free Q&A remaining count */
  freeRemaining: number;
  /** Whether current usage is free tier */
  isFree: boolean;
  /** Coin balance for display */
  coinBalance: number;
  /** Whether there are unread AI messages */
  hasUnread: boolean;
}

export function SpeedDialFAB({
  onAddTrade,
  onOpenChat,
  isChatOpen,
  showAIChat,
  freeRemaining,
  isFree,
  coinBalance,
  hasUnread,
}: SpeedDialFABProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const t = useTranslations('trade');

  const toggle = useCallback(() => setIsExpanded(prev => !prev), []);
  const close = useCallback(() => setIsExpanded(false), []);

  const handleAddTrade = useCallback(() => {
    close();
    onAddTrade();
  }, [close, onAddTrade]);

  const handleOpenChat = useCallback(() => {
    close();
    onOpenChat();
  }, [close, onOpenChat]);

  return (
    <>
      {/* Backdrop overlay when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[45] bg-black/40 backdrop-blur-[2px]"
            onClick={close}
            aria-hidden
          />
        )}
      </AnimatePresence>

      {/* Speed Dial container */}
      <div className="fixed bottom-20 md:bottom-6 right-6 z-[46] flex flex-col-reverse items-end gap-3">
        {/* Main FAB toggle button */}
        <motion.button
          onClick={toggle}
          animate={{ rotate: isExpanded ? 45 : 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          aria-label={isExpanded ? t('fab.close') : t('fab.open')}
          className="relative h-12 w-12 rounded-full bg-blue-600 text-white shadow-2xl shadow-blue-600/30 flex items-center justify-center hover:bg-blue-500 active:scale-95 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
        >
          <Plus size={22} strokeWidth={2.5} />
          {/* Unread dot on main FAB when chat has unread messages */}
          {hasUnread && !isExpanded && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-blue-600 animate-pulse" />
          )}
        </motion.button>

        {/* Expanded action items */}
        <AnimatePresence>
          {isExpanded && (
            <>
              {/* Action 1: Add Trade */}
              <motion.button
                initial={{ opacity: 0, scale: 0.3, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.3, y: 20 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300, delay: 0.02 }}
                onClick={handleAddTrade}
                className="flex items-center gap-2.5 group"
              >
                <span className="px-3 py-1.5 rounded-lg bg-zinc-800/95 text-xs font-semibold text-white/90 shadow-lg border border-white/10 whitespace-nowrap">
                  {t('form.addTradeShort')}
                </span>
                <span className="h-10 w-10 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-500 active:scale-95 transition-all">
                  <PenLine size={16} />
                </span>
              </motion.button>

              {/* Action 2: AI Q&A (only when logged in & chat not already open) */}
              {showAIChat && !isChatOpen && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.3, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.3, y: 20 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300, delay: 0.06 }}
                  onClick={handleOpenChat}
                  className="flex items-center gap-2.5 group"
                >
                  <span className="px-3 py-1.5 rounded-lg bg-zinc-800/95 text-xs font-semibold text-white/90 shadow-lg border border-white/10 whitespace-nowrap flex items-center gap-1.5">
                    AI Q&A
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white ${
                      isFree ? 'bg-emerald-500/80' : 'bg-amber-500/80'
                    }`}>
                      {isFree ? freeRemaining : <><Gem size={8} />{coinBalance}</>}
                    </span>
                  </span>
                  <span className="relative h-10 w-10 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center hover:bg-indigo-500 active:scale-95 transition-all">
                    <MessageSquare size={16} />
                    {hasUnread && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-indigo-600 animate-pulse" />
                    )}
                  </span>
                </motion.button>
              )}
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
