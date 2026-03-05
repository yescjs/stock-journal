'use client';

import React, { useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Upload, FileSpreadsheet, CheckCircle, X, ChevronRight, AlertTriangle, Monitor, Globe } from 'lucide-react';
import { Trade } from '@/app/types/trade';
import { parseCSV, ParseResult, BrokerType } from '@/app/utils/csvParsers';
import { ImportPreviewTable } from '@/app/components/ImportPreviewTable';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingTrades: Trade[];
  onImport: (trades: Omit<Trade, 'id' | 'user_id' | 'created_at'>[]) => Promise<number>;
}

const BROKER_LABELS: Record<BrokerType, string> = {
  kiwoom: '키움증권',
  mirae: '미래에셋증권',
  nh: 'NH투자증권',
  unknown: '알 수 없는 형식',
};

type ImportStep = 'upload' | 'preview' | 'result';

// ─── 증권사별 다운로드 가이드 ────────────────────────────────────────────────

interface BrokerGuide {
  id: string;
  name: string;
  color: string;
  channel: string;
  channelIcon: 'monitor' | 'globe';
  steps: string[];
  tip?: string;
  fileFormat: string;
}

const BROKER_GUIDES: BrokerGuide[] = [
  {
    id: 'kiwoom',
    name: '키움증권',
    color: 'text-red-400',
    channel: '영웅문4 HTS (PC)',
    channelIcon: 'monitor',
    steps: [
      '영웅문4 HTS 실행 후 로그인',
      '상단 화면번호 입력란에 <b>0343</b> 입력 후 Enter',
      '계좌 선택 → 조회 기간 설정 → [조회] 클릭',
      '결과 목록에서 <b>마우스 우클릭</b>',
      '<b>[Excel로 저장(S)]</b> 클릭 → CSV 또는 xlsx로 저장',
    ],
    tip: '화면번호 0343: 기간별 주문체결상세 (최대 5년)',
    fileFormat: 'xlsx / csv',
  },
  {
    id: 'mirae',
    name: '미래에셋증권',
    color: 'text-orange-400',
    channel: 'KAIROS HTS (PC)',
    channelIcon: 'monitor',
    steps: [
      'KAIROS HTS 실행 후 로그인',
      '화면번호 입력란에 <b>0650</b> 입력 후 Enter',
      '조회기간 설정 → 거래구분: <b>매매</b> → [조회] 클릭',
      '결과 목록에서 <b>마우스 우클릭</b>',
      '<b>[Excel 파일로 저장]</b> 클릭 → 저장 위치 선택',
    ],
    tip: '화면번호 0650: 거래내역 조회',
    fileFormat: 'xlsx',
  },
  {
    id: 'nh',
    name: 'NH투자증권',
    color: 'text-yellow-400',
    channel: '나무 홈페이지 (웹)',
    channelIcon: 'globe',
    steps: [
      '<b>mynamuh.com</b> 접속 후 로그인',
      '상단 메뉴 → <b>뱅킹/계좌정보</b> → <b>거래내역</b>',
      '<b>종합거래내역</b> 클릭',
      '조회기간 설정 → 상품구분: <b>주식</b> → [조회]',
      '하단 <b>[엑셀 저장]</b> 버튼 클릭',
    ],
    tip: 'HTS보다 웹이 파일 저장이 더 편리합니다',
    fileFormat: 'xlsx',
  },
];

export function ImportModal({ isOpen, onClose, existingTrades, onImport }: ImportModalProps) {
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
      setParseError('CSV 또는 TXT 파일만 업로드할 수 있습니다.');
      return;
    }

    setParseError(null);
    try {
      const result = await parseCSV(file);

      if (result.broker === 'unknown' || (result.trades.length === 0 && result.errors.length > 0)) {
        setParseError(result.errors[0]?.message ?? '파일을 파싱할 수 없습니다.');
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
      setParseError(err instanceof Error ? err.message : '파일 처리 중 오류가 발생했습니다.');
    }
  }, [existingTrades]);

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
      setParseError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
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
                  <h2 className="text-base font-bold text-white">거래내역 가져오기</h2>
                  {parseResult && step === 'preview' && (
                    <p className="text-sm text-white/40">{BROKER_LABELS[parseResult.broker]} 파일 인식됨</p>
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
                      <p className="text-base font-semibold text-white/80">CSV 파일을 드래그하거나 클릭하세요</p>
                      <p className="text-sm text-white/30 mt-1">지원 형식: .csv, .txt</p>
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
                    <p className="text-sm font-semibold text-white/40 mb-2.5">📋 거래내역 다운로드 방법</p>
                    <div className="grid grid-cols-3 gap-3">
                      {BROKER_GUIDES.map(guide => (
                        <div
                          key={guide.id}
                          className="rounded-xl border border-white/8 bg-white/3 p-3 flex flex-col gap-2.5"
                        >
                          {/* 카드 헤더 */}
                          <div>
                            <p className={`text-sm font-bold ${guide.color}`}>{guide.name}</p>
                            <p className="flex items-center gap-1 text-xs text-white/30 mt-0.5">
                              {guide.channelIcon === 'monitor'
                                ? <Monitor size={11} />
                                : <Globe size={11} />}
                              {guide.channel}
                            </p>
                          </div>

                          {/* 단계 */}
                          <ol className="space-y-1.5">
                            {guide.steps.map((step, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="flex-none w-5 h-5 rounded-full bg-white/8 text-white/40 text-xs font-bold flex items-center justify-center mt-0.5">
                                  {i + 1}
                                </span>
                                <span
                                  className="text-xs text-white/60 leading-relaxed"
                                  dangerouslySetInnerHTML={{ __html: step.replace(/<b>/g, '<strong class="text-white/85 font-semibold">').replace(/<\/b>/g, '</strong>') }}
                                />
                              </li>
                            ))}
                          </ol>

                          {/* 팁 */}
                          {guide.tip && (
                            <p className="text-xs text-white/40 bg-white/3 rounded-lg px-2.5 py-1.5 leading-relaxed">
                              💡 {guide.tip}
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
                    <p className="text-base font-bold text-white mb-1">가져오기 완료</p>
                    <p className="text-sm text-white/50">
                      <span className="text-emerald-400 font-semibold">{importCount}건</span> 저장됨
                      {skippedCount > 0 && (
                        <span className="ml-1 text-white/30">/ {skippedCount}건 스킵</span>
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
                  취소
                </button>
              )}

              {step === 'preview' && (
                <div className="flex gap-2">
                  <button
                    onClick={resetState}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold text-white/40 bg-white/5 hover:bg-white/8 transition-colors"
                  >
                    다시 선택
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
                        저장 중...
                      </>
                    ) : (
                      <>
                        <ChevronRight size={15} />
                        {selectedRows.size}건 가져오기
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
                  완료
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
