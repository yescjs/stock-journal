"use client";

import { useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "framer-motion";

export interface MarketIndex {
    id: string;
    name: string;
    country: string;
    countryCode: string;
    ytdReturn: number;
    pltmEps: number | null;
    divYield: number;
    marketCap: number;
    volume: number;
    chartData: number[];
    price: number;
    dailyChange: number;
    dailyChangePercent: number;
}

interface FinancialTableProps {
    title?: string;
    indices?: MarketIndex[];
    onIndexSelect?: (indexId: string) => void;
    className?: string;
}

const defaultIndices: MarketIndex[] = [
    {
        id: "1", name: "Dow Jones USA", country: "USA", countryCode: "US",
        ytdReturn: 0.40, pltmEps: 18.74, divYield: 2.00, marketCap: 28.04, volume: 1.7,
        chartData: [330.5, 331.2, 330.8, 331.5, 332.1, 331.8, 332.4, 333.2, 333.9, 333.7],
        price: 333.90, dailyChange: -0.20, dailyChangePercent: -0.06
    },
    {
        id: "2", name: "S&P 500 USA", country: "USA", countryCode: "US",
        ytdReturn: 11.72, pltmEps: 7.42, divYield: 1.44, marketCap: 399.6, volume: 24.6,
        chartData: [425.1, 426.3, 427.8, 428.1, 429.2, 428.9, 429.5, 429.1, 428.7, 428.9],
        price: 428.72, dailyChange: -0.82, dailyChangePercent: -0.19
    },
    {
        id: "3", name: "Nasdaq USA", country: "USA", countryCode: "US",
        ytdReturn: 36.59, pltmEps: null, divYield: 0.54, marketCap: 199.9, volume: 18.9,
        chartData: [360.2, 361.8, 362.4, 363.1, 364.3, 363.8, 364.1, 363.5, 363.2, 362.97],
        price: 362.97, dailyChange: -1.73, dailyChangePercent: -0.47
    },
    {
        id: "4", name: "TSX Canada", country: "Canada", countryCode: "CA",
        ytdReturn: -0.78, pltmEps: 6.06, divYield: 2.56, marketCap: 3.67, volume: 771.5,
        chartData: [32.1, 32.3, 32.5, 32.4, 32.7, 32.8, 32.9, 33.0, 32.9, 32.96],
        price: 32.96, dailyChange: 0.19, dailyChangePercent: 0.58
    },
    {
        id: "5", name: "KOSPI Korea", country: "Korea", countryCode: "KR",
        ytdReturn: 4.15, pltmEps: 8.19, divYield: 2.34, marketCap: 1.22, volume: 1.1,
        chartData: [2620, 2635, 2641, 2658, 2672, 2665, 2680, 2694, 2688, 2701],
        price: 2701.0, dailyChange: 13.0, dailyChangePercent: 0.48
    },
    {
        id: "6", name: "KOSDAQ Korea", country: "Korea", countryCode: "KR",
        ytdReturn: 11.19, pltmEps: 6.23, divYield: 9.46, marketCap: 4.87, volume: 6.8,
        chartData: [840, 843, 838, 845, 849, 851, 847, 850, 855, 858],
        price: 858.0, dailyChange: 3.0, dailyChangePercent: 0.35
    }
];

function getCountryFlag(countryCode: string) {
    switch (countryCode) {
        case "US":
            return (
                <svg width="28" height="28" viewBox="0 0 130 120" fill="none">
                    <rect y="0" fill="#DC4437" width="130" height="13.3" />
                    <rect y="26.7" fill="#DC4437" width="130" height="13.3" />
                    <rect y="80" fill="#DC4437" width="130" height="13.3" />
                    <rect y="106.7" fill="#DC4437" width="130" height="13.3" />
                    <rect y="53.3" fill="#DC4437" width="130" height="13.3" />
                    <rect y="13.3" fill="#FFFFFF" width="130" height="13.3" />
                    <rect y="40" fill="#FFFFFF" width="130" height="13.3" />
                    <rect y="93.3" fill="#FFFFFF" width="130" height="13.3" />
                    <rect y="66.7" fill="#FFFFFF" width="130" height="13.3" />
                    <rect y="0" fill="#2A66B7" width="70" height="66.7" />
                    <polygon fill="#FFFFFF" points="13.5,4 15.8,8.9 21,9.7 17.2,13.6 18.1,19 13.5,16.4 8.9,19 9.8,13.6 6,9.7 11.2,8.9" />
                    <polygon fill="#FFFFFF" points="34,4 36.3,8.9 41.5,9.7 37.8,13.6 38.6,19 34,16.4 29.4,19 30.2,13.6 26.5,9.7 31.7,8.9" />
                    <polygon fill="#FFFFFF" points="54.5,4 56.8,8.9 62,9.7 58.2,13.6 59.1,19 54.5,16.4 49.9,19 50.8,13.6 47,9.7 52.2,8.9" />
                    <polygon fill="#FFFFFF" points="24,24 26.3,28.9 31.5,29.7 27.8,33.6 28.6,39 24,36.4 19.4,39 20.2,33.6 16.5,29.7 21.7,28.9" />
                    <polygon fill="#FFFFFF" points="44.5,24 46.8,28.9 52,29.7 48.2,33.6 49.1,39 44.5,36.4 39.9,39 40.8,33.6 37,29.7 42.2,28.9" />
                    <polygon fill="#FFFFFF" points="13.5,45.2 15.8,50.1 21,50.9 17.2,54.7 18.1,60.2 13.5,57.6 8.9,60.2 9.8,54.7 6,50.9 11.2,50.1" />
                    <polygon fill="#FFFFFF" points="34,45.2 36.3,50.1 41.5,50.9 37.8,54.7 38.6,60.2 34,57.6 29.4,60.2 30.2,54.7 26.5,50.9 31.7,50.1" />
                    <polygon fill="#FFFFFF" points="54.5,45.2 56.8,50.1 62,50.9 58.2,54.7 59.1,60.2 54.5,57.6 49.9,60.2 50.8,54.7 47,50.9 52.2,50.1" />
                </svg>
            );
        case "CA":
            return (
                <svg width="28" height="28" viewBox="0 0 90 60" fill="none">
                    <rect width="90" height="60" fill="#FF0000" />
                    <rect x="22.5" width="45" height="60" fill="#FFFFFF" />
                    <path d="M45 12 L49 22 L60 22 L51 29 L54 40 L45 33 L36 40 L39 29 L30 22 L41 22 Z" fill="#FF0000" />
                </svg>
            );
        case "KR":
            return (
                <svg width="28" height="28" viewBox="0 0 30 20" fill="none">
                    <rect width="30" height="20" fill="#FFFFFF" />
                    <rect width="30" height="20" fill="#fff" />
                    <circle cx="15" cy="10" r="5" fill="#003478" />
                    <path d="M15 5 A5 5 0 0 1 15 15 A2.5 2.5 0 0 1 15 10 A2.5 2.5 0 0 0 15 5Z" fill="#CD2E3A" />
                    <line x1="3" y1="2" x2="7" y2="9" stroke="#000" strokeWidth="0.8" />
                    <line x1="4.5" y1="1.5" x2="8.5" y2="8.5" stroke="#000" strokeWidth="0.8" />
                    <line x1="1.5" y1="2.5" x2="5.5" y2="9.5" stroke="#000" strokeWidth="0.8" />
                    <line x1="23" y1="11" x2="27" y2="18" stroke="#000" strokeWidth="0.8" />
                    <line x1="21.5" y1="11.5" x2="25.5" y2="18.5" stroke="#000" strokeWidth="0.8" />
                    <line x1="24.5" y1="10.5" x2="28.5" y2="17.5" stroke="#000" strokeWidth="0.8" />
                </svg>
            );
        default:
            return (
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <rect width="28" height="28" fill="#374151" rx="14" />
                    <text x="14" y="18" textAnchor="middle" fontSize="11" fill="#9CA3AF">?</text>
                </svg>
            );
    }
}

export function FinancialTable({
    title = "Index",
    indices: initialIndices = defaultIndices,
    onIndexSelect,
    className = ""
}: FinancialTableProps = {}) {
    const indices = initialIndices;
    const [selectedIndex, setSelectedIndex] = useState<string | null>("1");
    const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
    const shouldReduceMotion = useReducedMotion();
    const isDark = true; // forcedTheme="dark" - always dark mode

    const handleIndexSelect = (indexId: string) => {
        setSelectedIndex(indexId);
        onIndexSelect?.(indexId);
    };

    const formatPercentage = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

    const getPerformanceColor = (value: number) => {
        if (!mounted) {
            return {
                color: value >= 0 ? "#22c55e" : "#f87171",
                bgColor: value >= 0 ? "bg-green-500/10" : "bg-red-500/10",
                borderColor: value >= 0 ? "border-green-500/30" : "border-red-500/30",
                textColor: value >= 0 ? "text-green-400" : "text-red-400"
            };
        }
        return {
            color: value >= 0 ? (isDark ? "#22c55e" : "#16a34a") : (isDark ? "#f87171" : "#dc2626"),
            bgColor: value >= 0 ? (isDark ? "bg-green-500/10" : "bg-green-50") : (isDark ? "bg-red-500/10" : "bg-red-50"),
            borderColor: value >= 0 ? (isDark ? "border-green-500/30" : "border-green-200") : (isDark ? "border-red-500/30" : "border-red-200"),
            textColor: value >= 0 ? (isDark ? "text-green-400" : "text-green-600") : (isDark ? "text-red-400" : "text-red-600")
        };
    };

    const renderSparkline = (data: number[], isPositive: boolean) => {
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        const points = data.map((v, i) => `${(i / (data.length - 1)) * 60},${20 - ((v - min) / range) * 15}`).join(" ");
        const strokeColor = isPositive ? "#22c55e" : "#f87171";

        return (
            <div className="w-16 h-6 flex items-center">
                <motion.svg width="60" height="20" viewBox="0 0 60 20" className="overflow-visible"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}>
                    <motion.polyline points={points} fill="none" stroke={strokeColor} strokeWidth="1.5"
                        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                        transition={{ duration: shouldReduceMotion ? 0 : 0.8, ease: "easeOut", delay: 0.2 }} />
                </motion.svg>
            </div>
        );
    };

    const containerVariants = {
        visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } }
    };

    const rowVariants = {
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 400, damping: 28 } }
    };

    const GRID = "2fr 1fr 1fr 1fr 1fr 1fr 80px 1fr 1.5fr";

    return (
        <div className={`w-full ${className}`}>
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <div className="min-w-[900px]">
                        {/* 헤더 */}
                        <div className="px-6 py-3 border-b border-white/8 grid text-[11px] font-semibold text-white/40 uppercase tracking-widest"
                            style={{ gridTemplateColumns: GRID, gap: "6px" }}>
                            <div>{title}</div>
                            <div>YTD Return</div>
                            <div>P/LTM EPS</div>
                            <div>Div Yield</div>
                            <div>Mkt Cap</div>
                            <div>Volume</div>
                            <div>Chart</div>
                            <div>Price</div>
                            <div>Daily</div>
                        </div>

                        {/* 행 */}
                        <motion.div variants={containerVariants} initial="hidden" animate="visible">
                            {indices.map((index, i) => {
                                const isSelected = selectedIndex === index.id;
                                const isPositive = index.dailyChangePercent >= 0;
                                const { bgColor, borderColor, textColor } = getPerformanceColor(index.ytdReturn);
                                const dailyColors = getPerformanceColor(index.dailyChangePercent);

                                return (
                                    <motion.div key={index.id} variants={rowVariants}>
                                        <div
                                            className={`px-6 py-3.5 cursor-pointer transition-all duration-150 grid
                        ${isSelected ? "bg-white/8" : "hover:bg-white/5"}
                        ${i < indices.length - 1 ? "border-b border-white/6" : ""}
                      `}
                                            style={{ gridTemplateColumns: GRID, gap: "6px" }}
                                            onClick={() => handleIndexSelect(index.id)}
                                        >
                                            {/* 마켓 정보 */}
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 rounded-full overflow-hidden border border-white/10 flex items-center justify-center bg-white/5 flex-shrink-0">
                                                    {getCountryFlag(index.countryCode)}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-semibold text-white/90 truncate">{index.name}</div>
                                                    <div className="text-[11px] text-white/35">{index.country}</div>
                                                </div>
                                            </div>

                                            {/* YTD */}
                                            <div className="flex items-center">
                                                <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${bgColor} ${borderColor} ${textColor}`}>
                                                    {formatPercentage(index.ytdReturn)}
                                                </span>
                                            </div>

                                            {/* P/LTM EPS */}
                                            <div className="flex items-center">
                                                <span className="text-sm font-semibold text-white/80">
                                                    {index.pltmEps?.toFixed(2) ?? "N/A"}
                                                </span>
                                            </div>

                                            {/* Div Yield */}
                                            <div className="flex items-center">
                                                <span className="text-sm font-semibold text-amber-400">
                                                    {formatPercentage(index.divYield)}
                                                </span>
                                            </div>

                                            {/* Market Cap */}
                                            <div className="flex items-center">
                                                <span className="text-sm font-semibold text-white/80">
                                                    {index.marketCap >= 1000 ? `${(index.marketCap / 1000).toFixed(1)}T` : `${index.marketCap.toFixed(1)}B`}
                                                </span>
                                            </div>

                                            {/* Volume */}
                                            <div className="flex items-center">
                                                <span className="text-sm font-semibold text-white/80">
                                                    {index.volume >= 1 ? `${index.volume.toFixed(1)}M` : `${(index.volume * 1000).toFixed(0)}k`}
                                                </span>
                                            </div>

                                            {/* Sparkline */}
                                            <div className="flex items-center">
                                                {renderSparkline(index.chartData, isPositive)}
                                            </div>

                                            {/* Price */}
                                            <div className="flex items-center">
                                                <span className="text-sm font-bold text-white/90">
                                                    {index.price.toLocaleString()}
                                                </span>
                                            </div>

                                            {/* Daily */}
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-bold ${dailyColors.textColor}`}>
                                                    {index.dailyChange >= 0 ? "+" : ""}{index.dailyChange.toFixed(2)}
                                                </span>
                                                <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold border ${dailyColors.bgColor} ${dailyColors.borderColor} ${dailyColors.textColor}`}>
                                                    {formatPercentage(index.dailyChangePercent)}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
