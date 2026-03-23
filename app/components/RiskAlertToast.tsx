'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldAlert, X, BellOff } from 'lucide-react';
import type { RiskAlert } from '@/app/hooks/useRiskAlert';

interface RiskAlertToastProps {
  alerts: RiskAlert[];
  onAcknowledge: () => void;
  onDismissToday: () => void;
}

export function RiskAlertToast({ alerts, onAcknowledge, onDismissToday }: RiskAlertToastProps) {
  if (alerts.length === 0) return null;

  // Show the most severe alert first
  const sorted = [...alerts].sort((a, b) => {
    const order = { critical: 0, warning: 1 };
    return order[a.severity] - order[b.severity];
  });
  const primary = sorted[0];
  const isCritical = primary.severity === 'critical';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed z-50 left-4 right-4 bottom-36 md:bottom-24 md:left-auto md:right-6 md:max-w-sm"
      >
        <div className={`rounded-2xl border shadow-2xl backdrop-blur-sm ${
          isCritical
            ? 'border-red-500/30 bg-red-950/90 shadow-red-500/10'
            : 'border-amber-500/30 bg-amber-950/90 shadow-amber-500/10'
        }`}>
          {/* Header */}
          <div className="flex items-start gap-3 p-4 pb-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-none ${
              isCritical ? 'bg-red-500/20' : 'bg-amber-500/20'
            }`}>
              {isCritical
                ? <ShieldAlert size={18} className="text-red-400" />
                : <AlertTriangle size={18} className="text-amber-400" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`text-sm font-bold ${
                isCritical ? 'text-red-300' : 'text-amber-300'
              }`}>
                {isCritical ? '위험 경고' : '주의 알림'}
              </h4>
              <p className="text-xs text-white/60 mt-1 leading-relaxed">
                {primary.message}
              </p>
            </div>
            <button
              onClick={onAcknowledge}
              className="p-1 rounded-lg text-white/30 hover:text-white/60 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Additional alerts */}
          {sorted.length > 1 && (
            <div className="px-4 pb-2 space-y-1">
              {sorted.slice(1).map((alert, i) => (
                <p key={i} className="text-xs text-white/40 pl-12 leading-relaxed">
                  {alert.message}
                </p>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 px-4 pb-4 pt-2">
            <button
              onClick={onDismissToday}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors"
            >
              <BellOff size={12} />
              오늘 알림 끄기
            </button>
            <button
              onClick={onAcknowledge}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                isCritical
                  ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                  : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
              }`}
            >
              확인
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
