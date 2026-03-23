'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ShieldCheck, Loader2, AlertCircle, X, Gem } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { markdownComponents } from '@/app/components/AIReportHistory';

interface PreTradeChecklistProps {
  isOpen: boolean;
  checklist: string | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onGenerate: () => void;
  isLoggedIn: boolean;
  coinBalance?: number;
  onChargeCoins?: () => void;
}

export function PreTradeChecklist({
  isOpen,
  checklist,
  loading,
  error,
  onClose,
  onGenerate,
  isLoggedIn,
  coinBalance = 0,
  onChargeCoins,
}: PreTradeChecklistProps) {
  const t = useTranslations('trade.preCoach');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-indigo-500/5 to-transparent p-4 mb-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                <ShieldCheck size={16} className="text-indigo-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{t('title')}</h4>
                <p className="text-xs text-white/30">{t('subtitle')}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 transition-colors">
              <X size={14} />
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="text-indigo-400 animate-spin" />
              <span className="text-sm text-white/40 ml-2">{t('generating')}</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle size={14} className="text-red-400 flex-none" />
              <span className="text-xs text-red-300">{error}</span>
              {error === 'COIN_SHORTAGE' && onChargeCoins && (
                <button onClick={onChargeCoins} className="ml-auto flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300">
                  <Gem size={12} /> {t('charge')}
                </button>
              )}
            </div>
          ) : checklist ? (
            <div className="prose prose-invert prose-sm max-w-none text-white/70">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {checklist}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="text-center py-4">
              {!isLoggedIn ? (
                <p className="text-xs text-white/30">{t('loginRequired')}</p>
              ) : (
                <>
                  <p className="text-xs text-white/40 mb-3">
                    {t('description')}
                  </p>
                  <button
                    onClick={onGenerate}
                    disabled={coinBalance < 1 && isLoggedIn}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-300 text-sm font-bold hover:bg-indigo-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ShieldCheck size={14} />
                    {t('generateButton')}
                    <span className="flex items-center gap-0.5 text-xs text-amber-400">
                      <Gem size={10} /> 1
                    </span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* Footer hint */}
          {checklist && (
            <p className="text-xs text-white/20 mt-3 text-center">
              {t('footerHint')}
            </p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
