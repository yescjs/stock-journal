'use client';

import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { StockSearchResult } from '@/app/types/search';
import { useDebounce } from '@/app/hooks/useDebounce';
import { Search, Loader2, TrendingUp } from 'lucide-react';

interface StockSymbolInputProps {
    value: string;
    onChange: (symbol: string, symbolName?: string) => void;
    darkMode: boolean;
    placeholder?: string;
    disabled?: boolean;
}

export function StockSymbolInput({
    value,
    onChange,
    darkMode,
    placeholder = '종목명 또는 코드 검색 (예: 삼성전자, AAPL)',
    disabled = false
}: StockSymbolInputProps) {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<StockSearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isSelected, setIsSelected] = useState(false); // 종목 선택 완료 여부

    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const debouncedQuery = useDebounce(query, 300);

    // Search API call - combines local Korean search + Yahoo Finance API
    useEffect(() => {
        const searchStocks = async () => {
            // 선택 완료 상태면 검색 건너뛰기
            if (isSelected) {
                return;
            }

            if (!debouncedQuery || debouncedQuery.trim().length === 0) {
                setResults([]);
                setIsOpen(false);
                return;
            }

            setLoading(true);
            try {
                // 1. Search local Korean stocks first
                const { searchKoreanStocks } = await import('@/app/utils/koreanStocks');
                const koreanResults = searchKoreanStocks(debouncedQuery, 5);

                const localResults: StockSearchResult[] = koreanResults.map(stock => ({
                    symbol: stock.symbol,
                    name: stock.name,
                    exchange: stock.exchange,
                }));

                // 2. Also search Yahoo Finance API (for English queries and global stocks)
                let apiResults: StockSearchResult[] = [];
                try {
                    const response = await fetch(`/api/stock-search?q=${encodeURIComponent(debouncedQuery)}`);
                    if (response.ok) {
                        const data = await response.json();
                        apiResults = data.results || [];
                    }
                } catch (apiError) {
                    console.error('Yahoo Finance API error:', apiError);
                }

                // 3. Combine and deduplicate results (prioritize local Korean stocks)
                const combinedResults = [...localResults];
                const existingSymbols = new Set(localResults.map(r => r.symbol));

                for (const apiResult of apiResults) {
                    if (!existingSymbols.has(apiResult.symbol)) {
                        combinedResults.push(apiResult);
                    }
                }

                setResults(combinedResults.slice(0, 10));
                setIsOpen(true);
                setSelectedIndex(-1);
            } catch (error) {
                console.error('Stock search error:', error);
                setResults([]);
            } finally {
                setLoading(false);
            }
        };

        searchStocks();
    }, [debouncedQuery, isSelected]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle keyboard navigation
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen || results.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && results[selectedIndex]) {
                    selectResult(results[selectedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                setSelectedIndex(-1);
                break;
        }
    };

    const selectResult = (result: StockSearchResult) => {
        setIsSelected(true); // 선택 완료 표시
        setQuery(result.name); // Display Korean name in input
        onChange(result.symbol, result.name); // Pass both to parent
        setIsOpen(false);
        setSelectedIndex(-1);
        setResults([]); // 결과 목록 초기화
        inputRef.current?.blur();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setQuery(newValue);
        setIsSelected(false); // 사용자가 입력 시작하면 선택 상태 해제
        onChange(newValue); // Clear symbol when typing
    };

    // Sync query with initial value
    useEffect(() => {
        if (value && !query) {
            setQuery(value);
        }
    }, [value]);

    return (
        <div ref={wrapperRef} className="relative">
            {/* Input */}
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {loading ? (
                        <Loader2 className={`w-4 h-4 animate-spin ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                    ) : (
                        <Search className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                    )}
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (results.length > 0) setIsOpen(true);
                    }}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`w-full pl-10 pr-3 py-2 rounded-xl text-sm font-medium outline-none transition-all ${darkMode
                        ? 'bg-slate-800 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500'
                        : 'bg-slate-100 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-label="종목 검색"
                    aria-autocomplete="list"
                    aria-controls="stock-search-results"
                    aria-expanded={isOpen}
                />
            </div>

            {/* Dropdown */}
            {isOpen && results.length > 0 && (
                <div
                    id="stock-search-results"
                    role="listbox"
                    className={`absolute z-50 w-full mt-2 rounded-xl border shadow-xl max-h-64 overflow-y-auto ${darkMode
                        ? 'bg-slate-800 border-slate-700'
                        : 'bg-white border-slate-200'
                        }`}
                >
                    {results.map((result, index) => (
                        <button
                            key={`${result.symbol}-${index}`}
                            role="option"
                            aria-selected={index === selectedIndex}
                            onClick={() => selectResult(result)}
                            onMouseEnter={() => setSelectedIndex(index)}
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${index === selectedIndex
                                ? darkMode
                                    ? 'bg-indigo-600/20 text-white'
                                    : 'bg-indigo-50 text-indigo-900'
                                : darkMode
                                    ? 'text-slate-200 hover:bg-slate-700/50'
                                    : 'text-slate-900 hover:bg-slate-50'
                                } ${index !== results.length - 1 ? 'border-b border-slate-700/50' : ''}`}
                        >
                            <TrendingUp className={`w-4 h-4 flex-shrink-0 ${index === selectedIndex
                                ? 'text-indigo-500'
                                : darkMode
                                    ? 'text-slate-400'
                                    : 'text-slate-500'
                                }`} />
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-sm truncate">
                                    {result.name}
                                </div>
                                <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'
                                    }`}>
                                    {result.symbol} · {result.exchange}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* No Results */}
            {isOpen && !loading && results.length === 0 && debouncedQuery && (
                <div
                    className={`absolute z-50 w-full mt-2 rounded-xl border shadow-xl p-4 text-center ${darkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-400'
                        : 'bg-white border-slate-200 text-slate-500'
                        }`}
                >
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">'{debouncedQuery}'에 대한 검색 결과가 없습니다</p>
                    <p className="text-xs mt-1">종목명 또는 종목 코드를 입력해주세요</p>
                </div>
            )}
        </div>
    );
}
