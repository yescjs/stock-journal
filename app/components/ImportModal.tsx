'use client';

import React, { useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Upload, FileSpreadsheet, CheckCircle, X, ChevronRight, AlertTriangle, Monitor, Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Trade } from '@/app/types/trade';
import { parseCSV, ParseResult, BrokerType } from '@/app/utils/csvParsers';
import { ImportPreviewTable } from '@/app/components/ImportPreviewTable';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingTrades: Trade[];
  onImport: (trades: Omit<Trade, 'id' | 'user_id' | 'created_at'>[]) => Promise<number>;
}

// Helper function to render text with <b> tags as React elements
function renderBoldText(text: string) {
    return text.split(/(<b>.*?<\/b>)/g).map((part, i) =>
        part.startsWith('<b>') ? (
            <strong key={i} className="text-white/85 font-semibold">
                {part.slice(3, -4)}
            </strong>
        ) : part
    );
}

const BROKER_LABEL_KEYS: Record<BrokerType, string> = {
  kiwoom: 'brokerKiwoom',
  mirae: 'brokerMirae',
  nh: 'brokerNH',
  samsung: 'brokerSamsung',
  hankook: 'brokerHankook',
  unknown: 'brokerUnknown',
};

type ImportStep = 'upload' | 'preview' | 'result';

// ─── 증권사별 다운로드 가이드 ────────────────────────────────────────────────

interface BrokerGuide {
  id: string;
  nameKey: string;
  color: string;
  channelKey: string;
  channelIcon: 'monitor' | 'globe';
  stepKeys: string[];
  tipKey?: string;
  fileFormat: string;
}

const BROKER_GUIDES: BrokerGuide[] = [
  {
    id: 'kiwoom',
    nameKey: 'brokerKiwoom',
    color: 'text-red-400',
    channelKey: 'kiwoomChannel',
    channelIcon: 'monitor',
    stepKeys: ['kiwoomStep1', 'kiwoomStep2', 'kiwoomStep3', 'kiwoomStep4', 'kiwoomStep5'],
    tipKey: 'kiwoomTip',
    fileFormat: 'xlsx / csv',
  },
  {
    id: 'mirae',
    nameKey: 'brokerMirae',
    color: 'text-orange-400',
    channelKey: 'miraeChannel',
    channelIcon: 'monitor',
    stepKeys: ['miraeStep1', 'miraeStep2', 'miraeStep3', 'miraeStep4', 'miraeStep5'],
    tipKey: 'miraeTip',
    fileFormat: 'xlsx',
  },
  {
    id: 'nh',
    nameKey: 'brokerNH',
    color: 'text-yellow-400',
    channelKey: 'nhChannel',
    channelIcon: 'globe',
    stepKeys: ['nhStep1', 'nhStep2', 'nhStep3', 'nhStep4', 'nhStep5'],
    tipKey: 'nhTip',
    fileFormat: 'xlsx',
  },
  {
    id: 'samsung',
    nameKey: 'brokerSamsung',
    color: 'text-blue-400',
    channelKey: 'samsungChannel',
    channelIcon: 'monitor',
    stepKeys: ['samsungStep1', 'samsungStep2', 'samsungStep3', 'samsungStep4', 'samsungStep5'],
    tipKey: 'samsungTip',
    fileFormat: 'xlsx / csv',
  },
  {
    id: 'hankook',
    nameKey: 'brokerHankook',
    color: 'text-emerald-400',
    channelKey: 'hankookChannel',
    channelIcon: 'monitor',
    stepKeys: ['hankookStep1', 'hankookStep2', 'hankookStep3', 'hankookStep4', 'hankookStep5'],
    tipKey: 'hankookTip',
    fileFormat: 'xlsx / csv',
  },
];

export function ImportModal({ isOpen, onClose, existingTrades, onImport }: ImportModalProps) {
  const t = useTranslations('import');
  const [step, setStep] = useState<ImportStep>('upload');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep('upload');
    setParseResult(null);
    setSelectedRows(new Set());
    setImporting(false);
    setImportCount(0);
    setSkippedCount(0);
    setParseError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const processFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(csv|txt)$/i)) {
      setParseError(t('csvOnly'));
      return;
    }

    setParseError(null);
    try {
      const result = await parseCSV(file);

      if (result.broker === 'unknown' || (result.trades.length === 0 && result.errors.length > 0)) {
        setParseError(result.errors[0]?.message ?? t('parseError'));
        return;
      }

      setParseResult(result);

      // 중복이 아닌 행을 기본 선택
      const initialSelected = new Set<number>();
      result.trades.forEach(row => {
        const isDup = existingTrades.some(
          t =>
            t.date === row.date &&
            t.symbol === row.symbol &&
            t.side === row.side &&
            t.price === row.price &&
            t.quantity === row.quantity,
        );
        if (!isDup) initialSelected.add(row.rowIndex);
      });
      setSelectedRows(initialSelected);
      setStep('preview');
    } catch (err) {
      setParseError(err instanceof Error ? err.message : t('fileProcessError'));
    }
  }, [existingTrades, t]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleToggleRow = (rowIndex: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  };

  const handleToggleAll = () => {
    if (!parseResult) return;
    const duplicateSet = new Set(
      existingTrades.flatMap(t =>
        parseResult.trades
          .filter(r => r.date === t.date && r.symbol === t.symbol && r.side === t.side && r.price === t.price && r.quantity === t.quantity)
          .map(r => r.rowIndex),
      ),
    );
    const selectableIndices = parseResult.trades
      .filter(r => !duplicateSet.has(r.rowIndex))
      .map(r => r.rowIndex);

    const allSelected = selectableIndices.every(idx => selectedRows.has(idx));
    if (allSelected) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(selectableIndices));
    }
  };

  const handleImport = async () => {
    if (!parseResult || selectedRows.size === 0) return;
    setImporting(true);
    try {
      const toImport = parseResult.trades
        .filter(r => selectedRows.has(r.rowIndex))
        .map(r => ({
          date: r.date,
          symbol: r.symbol,
          symbol_name: r.symbol_name || undefined,
          side: r.side,
          price: r.price,
          quantity: r.quantity,
        }));

      const count = await onImport(toImport);
      setImportCount(count);
      setSkippedCount(parseResult.trades.length - selectedRows.size);
      setStep('result');
    } catch (err) {
      setParseError(err instanceof Error ? err.message : t('saveError'));
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
          />

          {/* Modal Sheet */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className="fixed bottom-0 left-0 right-0 z-[70] max-h-[90vh] flex flex-col rounded-t-2xl bg-[#0e1420] border-t border-white/8 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/8 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Upload size={15} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">{t('title')}</h2>
                  {parseResult && step === 'preview' && (
                    <p className="text-sm text-white/40">{t('brokerDetected', { broker: t(BROKER_LABEL_KEYS[parseResult.broker]) })}</p>
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
              {/* Step 1: 파일 업로드 */}
              {step === 'upload' && (
                <div className="flex flex-col gap-4">
                  {/* 드래그앤드롭 영역 */}
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                      dragOver
                        ? 'border-blue-400 bg-blue-500/10'
                        : 'border-white/10 bg-white/3 hover:bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                      <FileSpreadsheet size={22} className="text-blue-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-base font-semibold text-white/80">{t('dragDropPrompt')}</p>
                      <p className="text-sm text-white/30 mt-1">{t('supportedFormats')}</p>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {/* 오류 메시지 */}
                  {parseError && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                      <AlertTriangle size={15} className="text-rose-400 flex-none mt-0.5" />
                      <p className="text-sm text-rose-400">{parseError}</p>
                    </div>
                  )}

                  {/* 증권사별 다운로드 가이드 — 3열 그리드 */}
                  <div>
                    <p className="text-sm font-semibold text-white/40 mb-2.5">{t('downloadGuideTitle')}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {BROKER_GUIDES.map(guide => (
                        <div
                          key={guide.id}
                          className="rounded-xl border border-white/8 bg-white/3 p-3 flex flex-col gap-2.5"
                        >
                          {/* 카드 헤더 */}
                          <div>
                            <p className={`text-sm font-bold ${guide.color}`}>{t(guide.nameKey)}</p>
                            <p className="flex items-center gap-1 text-xs text-white/30 mt-0.5">
                              {guide.channelIcon === 'monitor'
                                ? <Monitor size={11} />
                                : <Globe size={11} />}
                              {t(guide.channelKey)}
                            </p>
                          </div>

                          {/* 단계 */}
                          <ol className="space-y-1.5">
                            {guide.stepKeys.map((stepKey, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="flex-none w-5 h-5 rounded-full bg-white/8 text-white/40 text-xs font-bold flex items-center justify-center mt-0.5">
                                  {i + 1}
                                </span>
                                <span className="text-xs text-white/60 leading-relaxed">
                                  {renderBoldText(t(stepKey) as string)}
                                </span>
                              </li>
                            ))}
                          </ol>

                          {/* 팁 */}
                          {guide.tipKey && (
                            <p className="text-xs text-white/40 bg-white/3 rounded-lg px-2.5 py-1.5 leading-relaxed">
                              {t(guide.tipKey)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: 미리보기 */}
              {step === 'preview' && parseResult && (
                <div className="flex flex-col gap-4">
                  {parseError && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                      <AlertTriangle size={15} className="text-rose-400 flex-none mt-0.5" />
                      <p className="text-sm text-rose-400">{parseError}</p>
                    </div>
                  )}
                  <ImportPreviewTable
                    parsedTrades={parseResult.trades}
                    existingTrades={existingTrades}
                    selectedRows={selectedRows}
                    onToggleRow={handleToggleRow}
                    onToggleAll={handleToggleAll}
                    errors={parseResult.errors}
                  />
                </div>
              )}

              {/* Step 3: 완료 */}
              {step === 'result' && (
                <div className="flex flex-col items-center gap-4 py-6">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle size={28} className="text-emerald-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-bold text-white mb-1">{t('importComplete')}</p>
                    <p className="text-sm text-white/50">
                      <span className="text-emerald-400 font-semibold">{t('importedCount', { count: importCount })}</span> {t('importedSaved')}
                      {skippedCount > 0 && (
                        <span className="ml-1 text-white/30">/ {t('importedSkipped', { count: skippedCount })}</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-white/8 flex-shrink-0">
              {step === 'upload' && (
                <button
                  onClick={handleClose}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white/40 hover:text-white/60 transition-colors"
                >
                  {t('cancelButton')}
                </button>
              )}

              {step === 'preview' && (
                <div className="flex gap-2">
                  <button
                    onClick={resetState}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold text-white/40 bg-white/5 hover:bg-white/8 transition-colors"
                  >
                    {t('reselect')}
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importing || selectedRows.size === 0}
                    className={`flex-[2] py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                      importing || selectedRows.size === 0
                        ? 'bg-blue-600/40 text-white/30 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
                    }`}
                  >
                    {importing ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        {t('saving')}
                      </>
                    ) : (
                      <>
                        <ChevronRight size={15} />
                        {t('importButton', { count: selectedRows.size })}
                      </>
                    )}
                  </button>
                </div>
              )}

              {step === 'result' && (
                <button
                  onClick={handleClose}
                  className="w-full py-3 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all active:scale-95"
                >
                  {t('doneButton')}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
