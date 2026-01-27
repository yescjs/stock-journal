import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, Check, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { Trade, TradeSide } from '@/app/types/trade';
import { v4 as uuidv4 } from 'uuid';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (trades: any[]) => Promise<void>;
}

type TradeField = 'date' | 'symbol' | 'side' | 'price' | 'quantity' | 'fee' | 'memo';

const REQUIRED_FIELDS: TradeField[] = ['date', 'symbol', 'side', 'price', 'quantity'];
const FIELD_LABELS: Record<TradeField, string> = {
  date: 'Date (YYYY-MM-DD)',
  symbol: 'Symbol',
  side: 'Side (Buy/Sell)',
  price: 'Price',
  quantity: 'Quantity',
  fee: 'Fee (Optional)',
  memo: 'Memo (Optional)',
};

export function CsvImportModal({ isOpen, onClose, onImport }: CsvImportModalProps) {
  const [step, setStep] = useState<'input' | 'mapping'>('input');
  const [csvContent, setCsvContent] = useState('');
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<TradeField, number | -1>>({
    date: -1,
    symbol: -1,
    side: -1,
    price: -1,
    quantity: -1,
    fee: -1,
    memo: -1,
  });
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep('input');
      setCsvContent('');
      setParsedRows([]);
      setHeaders([]);
      setError(null);
      setMapping({
        date: -1,
        symbol: -1,
        side: -1,
        price: -1,
        quantity: -1,
        fee: -1,
        memo: -1,
      });
    }
  }, [isOpen]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = () => {
    if (!csvContent.trim()) {
      setError('Please enter CSV content or upload a file.');
      return;
    }

    try {
      const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) {
        setError('CSV must have a header row and at least one data row.');
        return;
      }

      const parseLine = (line: string) => line.split(',').map(cell => cell.trim());

      const headerRow = parseLine(lines[0]);
      const dataRows = lines.slice(1).map(parseLine);

      setHeaders(headerRow);
      setParsedRows(dataRows);
      autoMapColumns(headerRow);
      setStep('mapping');
      setError(null);
    } catch (err) {
      setError('Failed to parse CSV. Please check the format.');
    }
  };

  const autoMapColumns = (headerRow: string[]) => {
    const newMapping: Record<TradeField, number | -1> = { ...mapping };
    const lowerHeaders = headerRow.map(h => h.toLowerCase());

    const findIndex = (keywords: string[]) => 
      lowerHeaders.findIndex(h => keywords.some(k => h.includes(k)));

    newMapping.date = findIndex(['date', 'time', 'day']);
    newMapping.symbol = findIndex(['symbol', 'ticker', 'code', 'stock']);
    newMapping.side = findIndex(['side', 'type', 'direction', 'buy', 'sell']);
    newMapping.price = findIndex(['price', 'avg', 'cost', 'rate']);
    newMapping.quantity = findIndex(['qty', 'quantity', 'amount', 'vol']);
    newMapping.fee = findIndex(['fee', 'comm', 'tax']);
    newMapping.memo = findIndex(['memo', 'note', 'desc', 'remark']);

    setMapping(newMapping);
  };

  const handleMappingChange = (field: TradeField, index: number) => {
    setMapping(prev => ({ ...prev, [field]: index }));
  };

  const getPreviewData = () => {
    return parsedRows.slice(0, 5).map((row, i) => {
      const mappedRow: Record<string, any> = {};
      let isValid = true;
      let validationError = '';

      REQUIRED_FIELDS.forEach(field => {
        const colIndex = mapping[field];
        if (colIndex === -1 || colIndex >= row.length) {
          isValid = false;
          validationError = `Missing ${FIELD_LABELS[field]}`;
        } else {
          mappedRow[field] = row[colIndex];
        }
      });

      ['fee', 'memo'].forEach(f => {
        const field = f as TradeField;
        const colIndex = mapping[field];
        if (colIndex !== -1 && colIndex < row.length) {
          mappedRow[field] = row[colIndex];
        }
      });

      return { original: row, mapped: mappedRow, isValid, validationError, index: i };
    });
  };

  const handleImport = async () => {
    const missingFields = REQUIRED_FIELDS.filter(f => mapping[f] === -1);
    if (missingFields.length > 0) {
      setError(`Please map all required fields: ${missingFields.map(f => FIELD_LABELS[f]).join(', ')}`);
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const tradesToImport: any[] = [];
      
      for (const row of parsedRows) {
        if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

        const dateStr = row[mapping.date];
        const symbolStr = row[mapping.symbol];
        const sideStr = row[mapping.side];
        const priceStr = row[mapping.price];
        const qtyStr = row[mapping.quantity];
        
        if (!dateStr || !symbolStr || !sideStr || !priceStr || !qtyStr) continue;

        let side: TradeSide = 'BUY';
        const s = sideStr.toLowerCase();
        if (s.includes('sell') || s.includes('short') || s === 's') side = 'SELL';
        
        const price = parseFloat(priceStr.replace(/[^0-9.-]/g, ''));
        const quantity = parseFloat(qtyStr.replace(/[^0-9.-]/g, ''));
        
        if (isNaN(price) || isNaN(quantity)) continue;

        let date = dateStr;
        
        const trade = {
          id: `guest-${uuidv4()}`,
          date,
          symbol: symbolStr.toUpperCase(),
          side,
          price,
          quantity,
          memo: mapping.memo !== -1 ? row[mapping.memo] : '',
        };

        if (mapping.fee !== -1) {
            const fee = row[mapping.fee];
            if (fee) trade.memo = trade.memo ? `${trade.memo} (Fee: ${fee})` : `Fee: ${fee}`;
        }

        tradesToImport.push(trade);
      }

      if (tradesToImport.length === 0) {
        setError('No valid trades found to import.');
        setIsImporting(false);
        return;
      }

      await onImport(tradesToImport);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to import trades. Please check your data.');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  const previewData = step === 'mapping' ? getPreviewData() : [];
  const allValid = previewData.every(d => d.isValid);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-card/90 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-white/20 dark:border-slate-700/50 animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <Upload size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Import Trades</h2>
              <p className="text-sm text-muted-foreground">Bulk upload your trading history via CSV</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-muted-foreground"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 text-red-600 dark:text-red-400">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {step === 'input' ? (
            <div className="space-y-6">
              <div 
                className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer bg-slate-50/50 dark:bg-slate-800/50"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".csv,.txt" 
                  onChange={handleFileUpload}
                />
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500">
                  <FileText size={32} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                  Click to upload CSV
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  or drag and drop your file here
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-background text-muted-foreground">Or paste content</span>
                </div>
              </div>

              <textarea
                className="w-full h-48 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                placeholder="Date,Symbol,Side,Price,Quantity&#10;2023-01-01,AAPL,Buy,150.00,10..."
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(FIELD_LABELS).map(([field, label]) => (
                  <div key={field} className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {label} {REQUIRED_FIELDS.includes(field as TradeField) && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      className={`w-full p-2.5 rounded-lg border bg-white dark:bg-slate-800 text-sm ${
                        mapping[field as TradeField] === -1 && REQUIRED_FIELDS.includes(field as TradeField)
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'
                      }`}
                      value={mapping[field as TradeField]}
                      onChange={(e) => handleMappingChange(field as TradeField, parseInt(e.target.value))}
                    >
                      <option value={-1}>Select Column...</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>{h} (Col {i+1})</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText size={18} />
                    Preview (First 5 rows)
                  </h3>
                  <button 
                    onClick={() => setStep('input')}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <RefreshCw size={14} />
                    Reset
                  </button>
                </div>
                
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium">
                      <tr>
                        <th className="px-4 py-3">Status</th>
                        {Object.keys(FIELD_LABELS).map(f => (
                          <th key={f} className="px-4 py-3 whitespace-nowrap">{FIELD_LABELS[f as TradeField]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                      {previewData.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="px-4 py-3">
                            {row.isValid ? (
                              <Check size={18} className="text-green-500" />
                            ) : (
                              <div className="group relative">
                                <AlertCircle size={18} className="text-red-500 cursor-help" />
                                <div className="absolute left-6 top-0 w-48 p-2 bg-slate-900 text-white text-xs rounded shadow-lg hidden group-hover:block z-10">
                                  {row.validationError}
                                </div>
                              </div>
                            )}
                          </td>
                          {Object.keys(FIELD_LABELS).map(f => (
                            <td key={f} className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                              {row.mapped[f] || <span className="text-slate-300 dark:text-slate-600">-</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-500 text-center">
                  Showing {Math.min(5, parsedRows.length)} of {parsedRows.length} rows found.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          
          {step === 'input' ? (
            <button
              onClick={parseCSV}
              disabled={!csvContent.trim()}
              className="px-5 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Next Step <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleImport}
              disabled={isImporting || !allValid}
              className="px-5 py-2.5 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-lg shadow-green-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Importing...
                </>
              ) : (
                <>
                  <Check size={16} /> Import {parsedRows.length} Trades
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
