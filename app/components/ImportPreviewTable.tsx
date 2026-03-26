'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, XCircle } from 'lucide-react';
import { Trade } from '@/app/types/trade';
import { ParsedTradeRow } from '@/app/utils/csvParsers';

interface ImportPreviewTableProps {
  parsedTrades: ParsedTradeRow[];
  existingTrades: Trade[];
  selectedRows: Set<number>;   // rowIndex 집합
  onToggleRow: (rowIndex: number) => void;
  onToggleAll: () => void;
  errors: { row: number; message: string }[];
}

/** 기존 거래와 중복 여부 체크 */
function isDuplicate(row: ParsedTradeRow, existingTrades: Trade[]): boolean {
  return existingTrades.some(
    t =>
      t.date === row.date &&
      t.symbol === row.symbol &&
      t.side === row.side &&
      t.price === row.price &&
      t.quantity === row.quantity,
  );
}

export function ImportPreviewTable({
  parsedTrades,
  existingTrades,
  selectedRows,
  onToggleRow,
  onToggleAll,
  errors,
}: ImportPreviewTableProps) {
  const t = useTranslations('import');
  const tc = useTranslations('common');

  const rowStates = useMemo(
    () =>
      parsedTrades.map(row => ({
        row,
        duplicate: isDuplicate(row, existingTrades),
      })),
    [parsedTrades, existingTrades],
  );

  const duplicateCount = rowStates.filter(r => r.duplicate).length;
  const errorCount = errors.length;
  const selectableRows = rowStates.filter(r => !r.duplicate);
  const allSelected = selectableRows.every(r => selectedRows.has(r.row.rowIndex));

  if (parsedTrades.length === 0 && errors.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* Summary */}
      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
        <span className="text-white/60">{t('totalCount', { count: parsedTrades.length })}</span>
        <span className="text-white/30">·</span>
        <span className="text-blue-400">{t('selectedCount', { count: selectedRows.size })}</span>
        {duplicateCount > 0 && (
          <>
            <span className="text-white/30">·</span>
            <span className="text-yellow-400 flex items-center gap-1">
              <AlertTriangle size={13} />
              {t('duplicateCount', { count: duplicateCount })}
            </span>
          </>
        )}
        {errorCount > 0 && (
          <>
            <span className="text-white/30">·</span>
            <span className="text-rose-400 flex items-center gap-1">
              <XCircle size={13} />
              {t('errorCount', { count: errorCount })}
            </span>
          </>
        )}
      </div>

      {/* Error list */}
      {errors.length > 0 && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 space-y-1">
          {errors.slice(0, 5).map((e, i) => (
            <p key={i} className="text-sm text-rose-400">
              {e.row > 0 ? t('rowError', { row: e.row, message: e.message }) : e.message}
            </p>
          ))}
          {errors.length > 5 && (
            <p className="text-sm text-rose-400/60">{t('moreErrors', { count: errors.length - 5 })}</p>
          )}
        </div>
      )}

      {/* Table */}
      {parsedTrades.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-white/8 bg-white/3">
                <th className="w-10 px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected && selectableRows.length > 0}
                    onChange={onToggleAll}
                    className="accent-blue-500 cursor-pointer"
                    aria-label={t('selectAll')}
                  />
                </th>
                <th className="px-3 py-3 text-left font-semibold text-white/40">{t('headerDate')}</th>
                <th className="px-3 py-3 text-left font-semibold text-white/40">{t('headerSymbol')}</th>
                <th className="px-3 py-3 text-left font-semibold text-white/40">{t('headerName')}</th>
                <th className="px-3 py-3 text-center font-semibold text-white/40">{t('headerSide')}</th>
                <th className="px-3 py-3 text-right font-semibold text-white/40">{t('headerQuantity')}</th>
                <th className="px-3 py-3 text-right font-semibold text-white/40">{t('headerPrice')}</th>
              </tr>
            </thead>
            <tbody>
              {rowStates.slice(0, 500).map(({ row, duplicate }) => {
                const isSelected = selectedRows.has(row.rowIndex);
                return (
                  <tr
                    key={row.rowIndex}
                    className={`border-b border-white/5 last:border-0 transition-colors ${
                      duplicate
                        ? 'bg-yellow-500/5 opacity-50'
                        : isSelected
                        ? 'bg-white/3 hover:bg-white/5'
                        : 'opacity-40 hover:opacity-60'
                    }`}
                  >
                    <td className="px-3 py-2.5 text-center">
                      {duplicate ? (
                        <AlertTriangle size={14} className="text-yellow-500 mx-auto" />
                      ) : (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleRow(row.rowIndex)}
                          className="accent-blue-500 cursor-pointer"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-white/50 whitespace-nowrap">{row.date}</td>
                    <td className="px-3 py-2.5 text-white/70 font-mono whitespace-nowrap">{row.symbol}</td>
                    <td className="px-3 py-2.5 text-white/70 whitespace-nowrap max-w-[120px] truncate">{row.symbol_name}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold ${
                          row.side === 'BUY'
                            ? 'bg-blue-500/15 text-blue-400'
                            : 'bg-rose-500/15 text-rose-400'
                        }`}
                      >
                        {row.side === 'BUY' ? tc('buy') : tc('sell')}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-white/60 whitespace-nowrap">
                      {row.quantity.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right text-white/60 whitespace-nowrap">
                      {row.price.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              {parsedTrades.length > 500 && (
                <tr>
                  <td colSpan={7} className="px-3 py-2.5 text-center text-white/30 text-sm">
                    {t('overflowRows', { count: parsedTrades.length - 500 })}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
