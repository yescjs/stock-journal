'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Share2, Download, Eye, EyeOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TradeAnalysis } from '@/app/types/analysis';

// html2canvas 대신 html-to-image 사용 — Tailwind CSS 4의 oklab/CSS 변수를 안정적으로 처리
import { toPng } from 'html-to-image';

/**
 * html-to-image 캡처 영역에서 사용할 폰트 스택.
 * CSS 변수(var(--font-sans))는 html-to-image가 resolve하지 못할 수 있으므로
 * 실제 폰트명을 직접 명시한다.
 */
const CAPTURE_FONT = '"Noto Sans KR", "Inter", -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", sans-serif';

interface PerformanceShareCardProps {
  analysis: TradeAnalysis | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PerformanceShareCard({ analysis, isOpen, onClose }: PerformanceShareCardProps) {
  const t = useTranslations('analysis.shareCard');
  const cardRef = useRef<HTMLDivElement>(null);
  const [maskAmounts, setMaskAmounts] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generateImage = useCallback(async (): Promise<string | null> => {
    if (!cardRef.current) return null;
    setGenerating(true);
    try {
      // 웹폰트 로딩 완료 대기
      await document.fonts.ready;

      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: '#0a0d16',
      });
      return dataUrl;
    } catch (err) {
      console.error('Failed to generate share card:', err);
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const handleDownload = useCallback(async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.download = 'stock-journal-performance.png';
    link.href = dataUrl;
    link.click();
  }, [generateImage]);

  const handleShare = useCallback(async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;

    // dataURL → Blob → File
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], 'stock-journal-performance.png', { type: 'image/png' });
    try {
      await navigator.share({ files: [file] });
    } catch {
      handleDownload();
    }
  }, [generateImage, handleDownload]);

  // Guard: analysis가 null이거나 roundTrips가 비어있으면 렌더링하지 않음
  if (!isOpen || !analysis || analysis.roundTrips.length === 0) {
    return null;
  }

  const { roundTrips, profile, streaks } = analysis;

  const totalPnl = roundTrips.reduce((sum, rt) => sum + rt.pnl, 0);
  const winCount = roundTrips.filter(rt => rt.isWin).length;
  const bestTrade = roundTrips.reduce((best, rt) => rt.pnlPercent > best.pnlPercent ? rt : best, roundTrips[0]);
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <AnimatePresence>
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
                aria-label={maskAmounts ? t('showAmounts') : t('hideAmounts')}
              >
                {maskAmounts ? <EyeOff size={12} /> : <Eye size={12} />}
                {maskAmounts ? t('showAmounts') : t('hideAmounts')}
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Share Card — 캡처 영역: 인라인 스타일 + 명시적 폰트 (CSS 변수/oklab 회피) */}
          <div
            ref={cardRef}
            style={{
              backgroundColor: '#0a0d16',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: '16px',
              overflow: 'hidden',
              fontFamily: CAPTURE_FONT,
            }}
          >
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', margin: 0 }}>{t('title')}</h3>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.30)', marginTop: '2px', margin: 0 }}>Stock Journal</p>
                </div>
                <div style={{ padding: '4px 12px', borderRadius: '9999px', backgroundColor: 'rgba(99,102,241,0.20)', border: '1px solid rgba(99,102,241,0.30)' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8' }}>{profile.overallGrade}</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)', margin: 0 }}>{t('winRate')}</p>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginTop: '4px', margin: 0 }}>{profile.winRate.toFixed(1)}%</p>
                </div>
                <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)', margin: 0 }}>{t('totalTrades')}</p>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginTop: '4px', margin: 0 }}>{roundTrips.length}</p>
                </div>
                <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)', margin: 0 }}>{t('totalPnl')}</p>
                  <p style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', margin: 0, color: totalPnl >= 0 ? '#34d399' : '#f87171' }}>
                    {maskAmounts
                      ? `${totalPnl >= 0 ? '+' : '-'}***`
                      : `${totalPnl >= 0 ? '+' : ''}${profile.avgReturn.toFixed(1)}%`}
                  </p>
                </div>
                <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)', margin: 0 }}>{t('bestTrade')}</p>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginTop: '4px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {bestTrade?.symbolName || bestTrade?.symbol || '-'}
                  </p>
                  <p style={{ fontSize: '12px', color: '#34d399', margin: 0 }}>
                    {maskAmounts ? '+***' : `+${bestTrade?.pnlPercent.toFixed(1)}%`}
                  </p>
                </div>
              </div>

              {/* Bottom Stats */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.30)', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <span>{t('wins')}: {winCount} / {t('losses')}: {roundTrips.length - winCount}</span>
                <span>{t('maxWinStreak')}: {streaks.maxWin}</span>
              </div>

              {/* Watermark */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '4px' }}>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.05em' }}>STOCK JOURNAL</span>
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
    </AnimatePresence>
  );
}
