'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Share2, Download, Eye, EyeOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TradeAnalysis } from '@/app/types/analysis';

interface PerformanceShareCardProps {
  analysis: TradeAnalysis;
  isOpen: boolean;
  onClose: () => void;
}

export function PerformanceShareCard({ analysis, isOpen, onClose }: PerformanceShareCardProps) {
  const t = useTranslations('analysis.shareCard');
  const cardRef = useRef<HTMLDivElement>(null);
  const [maskAmounts, setMaskAmounts] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { roundTrips, profile, streaks } = analysis;

  const totalPnl = roundTrips.reduce((sum, rt) => sum + rt.pnl, 0);
  const winCount = roundTrips.filter(rt => rt.isWin).length;
  const bestTrade = roundTrips.reduce((best, rt) => rt.pnlPercent > best.pnlPercent ? rt : best, roundTrips[0]);

  const generateImage = useCallback(async (): Promise<HTMLCanvasElement | null> => {
    if (!cardRef.current) return null;
    setGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0a0d16',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      return canvas;
    } catch (err) {
      console.error('Failed to generate share card:', err);
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const handleDownload = useCallback(async () => {
    const canvas = await generateImage();
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `stock-journal-performance.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [generateImage]);

  const handleShare = useCallback(async () => {
    const canvas = await generateImage();
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'stock-journal-performance.png', { type: 'image/png' });
      try {
        await navigator.share({ files: [file] });
      } catch {
        // User cancelled or share failed — fallback to download
        handleDownload();
      }
    }, 'image/png');
  }, [generateImage, handleDownload]);

  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Controls */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMaskAmounts(!maskAmounts)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-xs font-bold text-white/60 hover:text-white transition-colors"
                >
                  {maskAmounts ? <EyeOff size={12} /> : <Eye size={12} />}
                  {maskAmounts ? t('showAmounts') : t('hideAmounts')}
                </button>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Share Card (rendered as image) */}
            <div
              ref={cardRef}
              className="rounded-2xl overflow-hidden border border-white/10"
              style={{ backgroundColor: '#0a0d16' }}
            >
              <div className="p-6 space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">{t('title')}</h3>
                    <p className="text-xs text-white/30 mt-0.5">Stock Journal</p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30">
                    <span className="text-xs font-bold text-indigo-400">{profile.overallGrade}</span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/8">
                    <p className="text-xs text-white/40">{t('winRate')}</p>
                    <p className="text-xl font-bold text-white mt-1">{profile.winRate.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/8">
                    <p className="text-xs text-white/40">{t('totalTrades')}</p>
                    <p className="text-xl font-bold text-white mt-1">{roundTrips.length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/8">
                    <p className="text-xs text-white/40">{t('totalPnl')}</p>
                    <p className={`text-xl font-bold mt-1 ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {maskAmounts
                        ? `${totalPnl >= 0 ? '+' : '-'}***`
                        : `${totalPnl >= 0 ? '+' : ''}${profile.avgReturn.toFixed(1)}%`}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/8">
                    <p className="text-xs text-white/40">{t('bestTrade')}</p>
                    <p className="text-sm font-bold text-white mt-1 truncate">
                      {bestTrade?.symbolName || bestTrade?.symbol || '-'}
                    </p>
                    <p className="text-xs text-emerald-400">
                      {maskAmounts ? '+***' : `+${bestTrade?.pnlPercent.toFixed(1)}%`}
                    </p>
                  </div>
                </div>

                {/* Bottom Stats */}
                <div className="flex items-center justify-between text-xs text-white/30 pt-2 border-t border-white/8">
                  <span>{t('wins')}: {winCount} / {t('losses')}: {roundTrips.length - winCount}</span>
                  <span>{t('maxWinStreak')}: {streaks.maxWin}</span>
                </div>

                {/* Watermark */}
                <div className="flex items-center justify-center pt-1">
                  <span className="text-[10px] text-white/15 tracking-wider">STOCK JOURNAL</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleDownload}
                disabled={generating}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-sm font-bold text-white hover:bg-white/15 transition-colors disabled:opacity-50"
              >
                <Download size={14} />
                {t('download')}
              </button>
              {canShare && (
                <button
                  onClick={handleShare}
                  disabled={generating}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-sm font-bold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
                >
                  <Share2 size={14} />
                  {t('share')}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
