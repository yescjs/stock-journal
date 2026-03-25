'use client';

import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Trash2, CheckCircle, Search, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Trade } from '@/app/types/trade';
import { findDuplicateGroups, DuplicateGroup } from '@/app/utils/duplicateDetector';

interface DuplicateCleanupModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  onRemoveTrades: (ids: string[]) => Promise<void>;
}

export function DuplicateCleanupModal({ isOpen, onClose, trades, onRemoveTrades }: DuplicateCleanupModalProps) {
  const t = useTranslations('duplicateCleanup');
  const [keepIds, setKeepIds] = useState<Record<string, Set<string>>>({});
  const [deleting, setDeleting] = useState(false);
  const [done, setDone] = useState(false);
  const [deletedCount, setDeletedCount] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  const duplicateGroups = useMemo(() => findDuplicateGroups(trades), [trades]);

  // Initialize keepIds: by default, keep the first trade in each group
  const effectiveKeepIds = useMemo(() => {
    const result: Record<string, Set<string>> = {};
    for (const group of duplicateGroups) {
      if (keepIds[group.key]) {
        result[group.key] = keepIds[group.key];
      } else {
        result[group.key] = new Set([group.trades[0].id]);
      }
    }
    return result;
  }, [duplicateGroups, keepIds]);

  const totalToDelete = useMemo(() => {
    let count = 0;
    for (const group of duplicateGroups) {
      const kept = effectiveKeepIds[group.key];
      count += group.trades.filter(t => !kept?.has(t.id)).length;
    }
    return count;
  }, [duplicateGroups, effectiveKeepIds]);

  const toggleKeep = (groupKey: string, tradeId: string) => {
    setKeepIds(prev => {
      const current = effectiveKeepIds[groupKey] ?? new Set();
      const next = new Set(current);
      if (next.has(tradeId)) {
        // Don't allow un-keeping if it's the last one
        if (next.size > 1) next.delete(tradeId);
      } else {
        next.add(tradeId);
      }
      return { ...prev, [groupKey]: next };
    });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const idsToDelete: string[] = [];
      for (const group of duplicateGroups) {
        const kept = effectiveKeepIds[group.key];
        for (const trade of group.trades) {
          if (!kept?.has(trade.id)) {
            idsToDelete.push(trade.id);
          }
        }
      }
      await onRemoveTrades(idsToDelete);
      setDeletedCount(idsToDelete.length);
      setDone(true);
      setShowConfirm(false);
    } catch {
      // Error handled by parent
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    setKeepIds({});
    setDone(false);
    setDeletedCount(0);
    setShowConfirm(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className="fixed bottom-0 left-0 right-0 z-[70] max-h-[85vh] flex flex-col rounded-t-2xl bg-[#0e1420] border-t border-white/8 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/8 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Search size={15} className="text-amber-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">{t('title')}</h2>
                  {!done && duplicateGroups.length > 0 && (
                    <p className="text-sm text-white/40">
                      {t('groupsFound', { count: duplicateGroups.length })}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
              {/* Done state */}
              {done && (
                <div className="flex flex-col items-center gap-4 py-6">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle size={28} className="text-emerald-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-bold text-white mb-1">{t('cleanupComplete')}</p>
                    <p className="text-sm text-white/50">
                      <span className="text-emerald-400 font-semibold">{t('deletedCount', { count: deletedCount })}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* No duplicates */}
              {!done && duplicateGroups.length === 0 && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle size={28} className="text-emerald-400" />
                  </div>
                  <p className="text-base font-semibold text-white/60">{t('noDuplicates')}</p>
                </div>
              )}

              {/* Duplicate groups */}
              {!done && duplicateGroups.length > 0 && (
                <div className="flex flex-col gap-4">
                  {duplicateGroups.map((group) => (
                    <DuplicateGroupCard
                      key={group.key}
                      group={group}
                      keepIds={effectiveKeepIds[group.key] ?? new Set()}
                      onToggle={(id) => toggleKeep(group.key, id)}
                    />
                  ))}
                </div>
              )}

              {/* Confirm dialog */}
              {showConfirm && (
                <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <div className="flex items-start gap-2 mb-3">
                    <AlertTriangle size={16} className="text-rose-400 flex-none mt-0.5" />
                    <p className="text-sm text-rose-400 font-semibold">
                      {t('confirmDelete', { count: totalToDelete })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/40 bg-white/5 hover:bg-white/8 transition-colors"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all active:scale-95 disabled:opacity-50"
                    >
                      {deleting ? t('deleting') : t('confirmButton')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-white/8 flex-shrink-0">
              {done ? (
                <button
                  onClick={handleClose}
                  className="w-full py-3 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all active:scale-95"
                >
                  {t('doneButton')}
                </button>
              ) : duplicateGroups.length > 0 && !showConfirm ? (
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={totalToDelete === 0}
                  className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    totalToDelete === 0
                      ? 'bg-white/5 text-white/30 cursor-not-allowed'
                      : 'bg-rose-600 hover:bg-rose-500 text-white active:scale-95'
                  }`}
                >
                  <Trash2 size={15} />
                  {t('deleteButton', { count: totalToDelete })}
                </button>
              ) : !showConfirm ? (
                <button
                  onClick={handleClose}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white/40 hover:text-white/60 transition-colors"
                >
                  {t('closeButton')}
                </button>
              ) : null}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Sub-component: DuplicateGroupCard ──────────────────────────────────────

function DuplicateGroupCard({
  group,
  keepIds,
  onToggle,
}: {
  group: DuplicateGroup;
  keepIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const t = useTranslations('duplicateCleanup');
  const sample = group.trades[0];

  return (
    <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
      {/* Group header */}
      <div className="px-4 py-2.5 bg-white/3 border-b border-white/6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white/80">{sample.symbol_name || sample.symbol}</span>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
              sample.side === 'BUY' ? 'bg-rose-500/15 text-rose-400' : 'bg-blue-500/15 text-blue-400'
            }`}>
              {sample.side}
            </span>
          </div>
          <span className="text-xs text-white/30">{t('duplicateCount', { count: group.trades.length })}</span>
        </div>
        <p className="text-xs text-white/40 mt-0.5">
          {sample.date} · {sample.price.toLocaleString()}{t('priceUnit')} · {sample.quantity}{t('quantityUnit')}
        </p>
      </div>

      {/* Trade rows */}
      <div className="divide-y divide-white/5">
        {group.trades.map((trade) => {
          const isKept = keepIds.has(trade.id);
          return (
            <label
              key={trade.id}
              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                isKept ? 'bg-emerald-500/5' : 'bg-rose-500/5 opacity-60'
              }`}
            >
              <input
                type="checkbox"
                checked={isKept}
                onChange={() => onToggle(trade.id)}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/30"
              />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-white/50">
                  ID: {trade.id.slice(0, 8)}...
                  {trade.created_at && ` · ${new Date(trade.created_at).toLocaleDateString()}`}
                </span>
              </div>
              <span className={`text-xs font-semibold ${isKept ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isKept ? t('keep') : t('remove')}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
