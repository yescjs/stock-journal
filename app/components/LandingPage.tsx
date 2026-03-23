'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
    ArrowRight, LineChart, BookOpen, Shield, Zap,
    CheckCircle, ChevronDown, ChevronUp, BarChart2,
    Clock, Target, AlertCircle, Bot, Sparkles, Newspaper
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { FinancialTable, type MarketIndex } from '@/app/components/ui/financial-markets-table';
import { Footer } from '@/app/components/Footer';
import { LanguageSwitcher } from '@/app/components/ui/LanguageSwitcher';
import { useTranslations, useLocale } from 'next-intl';

interface LandingPageProps {
    onStart: () => void;
    onStartAsGuest: () => void;
    darkMode?: boolean;
}

function SectionLabel({ text }: { text: string }) {
    return <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-400/70 mb-3">{text}</p>;
}

// ─── 데이터 ───────────────────────────────────────────────────────────────
const LIVE_INDICES: MarketIndex[] = [
    { id: "1", name: "KOSPI Korea", country: "Korea", countryCode: "KR", ytdReturn: 4.82, pltmEps: 11.2, divYield: 2.15, marketCap: 1850, volume: 8.4, chartData: [2610, 2625, 2618, 2641, 2658, 2649, 2672, 2685, 2678, 2701], price: 2701, dailyChange: 23, dailyChangePercent: 0.86 },
    { id: "2", name: "KOSDAQ Korea", country: "Korea", countryCode: "KR", ytdReturn: 2.31, pltmEps: 8.4, divYield: 0.98, marketCap: 340, volume: 5.1, chartData: [835, 838, 834, 842, 847, 851, 848, 853, 857, 858], price: 858, dailyChange: 3, dailyChangePercent: 0.35 },
    { id: "3", name: "S&P 500 USA", country: "USA", countryCode: "US", ytdReturn: 11.72, pltmEps: 7.42, divYield: 1.44, marketCap: 399.6, volume: 24.6, chartData: [425.1, 426.3, 427.8, 428.1, 429.2, 428.9, 429.5, 429.1, 428.7, 428.9], price: 428.72, dailyChange: -0.82, dailyChangePercent: -0.19 },
    { id: "4", name: "Nasdaq USA", country: "USA", countryCode: "US", ytdReturn: 36.59, pltmEps: null, divYield: 0.54, marketCap: 199.9, volume: 18.9, chartData: [360.2, 361.8, 362.4, 363.1, 364.3, 363.8, 364.1, 363.5, 363.2, 362.97], price: 362.97, dailyChange: -1.73, dailyChangePercent: -0.47 },
    { id: "5", name: "Dow Jones USA", country: "USA", countryCode: "US", ytdReturn: 0.4, pltmEps: 18.74, divYield: 2.0, marketCap: 28.04, volume: 1.7, chartData: [330.5, 331.2, 330.8, 331.5, 332.1, 331.8, 332.4, 333.2, 333.9, 333.7], price: 333.9, dailyChange: -0.2, dailyChangePercent: -0.06 },
    { id: "6", name: "TSX Canada", country: "Canada", countryCode: "CA", ytdReturn: -0.78, pltmEps: 6.06, divYield: 2.56, marketCap: 3.67, volume: 771.5, chartData: [32.1, 32.3, 32.5, 32.4, 32.7, 32.8, 32.9, 33, 32.9, 32.96], price: 32.96, dailyChange: 0.19, dailyChangePercent: 0.58 },
];

const PAIN_POINT_ICONS = [AlertCircle, Clock, BarChart2, Target];

const BENEFIT_STYLES = [
    { icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { icon: Bot, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { icon: BarChart2, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
    { icon: Shield, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { icon: Zap, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    { icon: Target, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
];

const TESTIMONIAL_AVATARS = ['KM', 'LS', 'PJ'];

function ScrollIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.65, delay, ease: 'easeOut' }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export function LandingPage({ onStart, onStartAsGuest }: LandingPageProps) {
    const t = useTranslations('landing');
    const tn = useTranslations('nav');
    const tc = useTranslations('common');
    const locale = useLocale();
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: ref });
    const heroY = useTransform(scrollYProgress, [0, 0.25], [0, -50]);
    const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

    const [indices, setIndices] = useState<MarketIndex[]>(LIVE_INDICES);
    const [tick, setTick] = useState(0);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    useEffect(() => {
        const iv = setInterval(() => {
            setIndices(prev => prev.map(idx => {
                const last = idx.chartData[idx.chartData.length - 1];
                const d = (Math.random() - 0.5) * last * 0.003;
                const newP = Math.max(1, last + d);
                return { ...idx, chartData: [...idx.chartData.slice(1), newP], price: newP, dailyChange: +(newP - idx.chartData[0]).toFixed(2), dailyChangePercent: +((newP - idx.chartData[0]) / idx.chartData[0] * 100).toFixed(2) };
            }));
            setTick(t => t + 1);
        }, 2500);
        return () => clearInterval(iv);
    }, []);

    return (
        <div ref={ref} className="min-h-screen w-full bg-[#070a12] text-white overflow-x-hidden font-sans">

            {/* 배경 조명 */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120vw] h-[55vh] bg-blue-600/7 rounded-full blur-[150px]" />
                <div className="absolute top-1/2 right-[-5%] w-[35vw] h-[35vh] bg-violet-600/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-[15%] left-[-5%] w-[30vw] h-[30vh] bg-indigo-600/5 rounded-full blur-[100px]" />
                <div className="absolute inset-0 opacity-[0.022]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '80px 80px' }} />
            </div>

            {/* ═══════════════════════════════════ NAV */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#070a12]/85 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-6 md:px-10 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-600/30">
                            <LineChart size={15} className="text-white" strokeWidth={2.5} />
                        </div>
                        <span className="font-logo font-extrabold text-base tracking-tight"><span className="text-blue-400">Stock</span>Journal</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/news" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-white/40 hover:text-white/80 transition-colors px-3 py-2">
                            <Newspaper size={14} />
                            {tn('news')}
                        </Link>
                        <button onClick={onStartAsGuest} className="text-sm font-semibold text-white/40 hover:text-white/80 transition-colors px-3 py-2 hidden sm:block">{tc('guestStart')}</button>
                        <button onClick={onStart} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all shadow-lg shadow-blue-600/25 active:scale-95">
                            {tc('login')} <ArrowRight size={13} />
                        </button>
                        <LanguageSwitcher />
                    </div>
                </div>
            </nav>

            {/* ═══════════════════════════════════ 1. HERO */}
            <section className="relative w-full min-h-screen flex flex-col items-center justify-start pt-28 pb-12 px-6 md:px-10 z-10">
                <motion.div style={{ y: heroY, opacity: heroOpacity }} className="w-full max-w-6xl mx-auto flex flex-col items-center">
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 mb-7 px-4 py-1.5 rounded-full border border-white/10 bg-white/4 backdrop-blur-sm text-[11px] font-bold text-white/50 uppercase tracking-[0.12em]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {t('heroTagline')}
                    </motion.div>

                    <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.08 }}
                        className="text-5xl sm:text-6xl md:text-7xl xl:text-[5.25rem] font-extrabold leading-[1.06] tracking-[-0.03em] mb-5 text-center">
                        {t('heroTitle1')}<br />
                        <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-violet-400 bg-clip-text text-transparent">{t('heroTitle2')}</span>
                    </motion.h1>

                    <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.16 }}
                        className="text-base md:text-lg text-white/40 font-medium mb-9 text-center leading-relaxed max-w-lg">
                        {t('heroDesc')}
                    </motion.p>

                    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.24 }}
                        className="flex flex-col sm:flex-row items-center gap-3 mb-14">
                        <button onClick={onStart} className="group flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm md:text-base transition-all shadow-2xl shadow-blue-600/25 active:scale-[0.97]">
                            {t('startFree')} <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                        <button onClick={onStartAsGuest} className="px-7 py-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-bold text-sm md:text-base transition-all active:scale-[0.97]">
                            {t('browseWithoutLogin')}
                        </button>
                    </motion.div>

                    {/* 금융 테이블 쇼케이스 */}
                    <motion.div initial={{ opacity: 0, y: 40, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.9, delay: 0.38, ease: [0.22, 1, 0.36, 1] }} className="w-full relative">
                        <div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-white/8 to-transparent pointer-events-none z-10" />
                        <div className="absolute -inset-6 bg-blue-500/4 rounded-[3rem] blur-3xl pointer-events-none" />
                        <FinancialTable title={t('globalMarket')} indices={indices} className="relative z-0 rounded-2xl" />
                    </motion.div>

                    <AnimatePresence mode="wait">
                        <motion.p key={tick} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                            className="mt-4 text-[11px] text-white/18 font-medium">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse align-middle" />
                            {tc('simulation', { time: new Date().toLocaleTimeString('ko-KR') })}
                        </motion.p>
                    </AnimatePresence>
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/15 animate-bounce z-10">
                    <ChevronDown size={22} />
                </motion.div>
            </section>

            {/* ═══════════════════════════════════ 2. PAIN POINTS */}
            <section className="relative z-10 w-full py-24 px-6 md:px-10 border-t border-white/5">
                <div className="max-w-6xl mx-auto">
                    <ScrollIn className="text-center mb-12">
                        <SectionLabel text="Pain Points" />
                        <h2 className="text-3xl md:text-4xl xl:text-5xl font-extrabold tracking-tight">
                            {t('painPointsTitle1')}<br /><span className="text-white/35">{t('painPointsTitle2')}</span>
                        </h2>
                    </ScrollIn>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        {PAIN_POINT_ICONS.map((Icon, i) => {
                            return (
                                <ScrollIn key={i} delay={i * 0.07}>
                                    <div className="h-full p-6 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors">
                                        <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center bg-rose-500/10 border border-rose-500/20 text-rose-400">
                                            <Icon size={18} />
                                        </div>
                                        <p className="text-sm text-white/60 leading-relaxed font-medium">{t(`painPoint${i + 1}`)}</p>
                                    </div>
                                </ScrollIn>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════ 3. SOLUTION */}
            <section className="relative z-10 w-full py-24 px-6 md:px-10 border-t border-white/5">
                <div className="max-w-6xl mx-auto flex flex-col xl:flex-row items-center gap-12 xl:gap-20">
                    <ScrollIn className="xl:flex-1 text-center xl:text-left">
                        <SectionLabel text="Solution" />
                        <h2 className="text-3xl md:text-4xl xl:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
                            {t('solutionTitle1')}<br />
                            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">{t('solutionTitle2')}</span>{t('solutionTitle3')}
                        </h2>
                        <p className="text-white/45 text-base leading-relaxed mb-8 max-w-lg mx-auto xl:mx-0">
                            {t('solutionDesc')}
                        </p>
                        <button onClick={onStart} className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm md:text-base transition-all shadow-2xl shadow-blue-600/25 active:scale-[0.97]">
                            {t('startNow')} <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </ScrollIn>

                    <ScrollIn delay={0.15} className="xl:flex-1 w-full">
                        {/* 미니 대시보드 목업 */}
                        <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden shadow-2xl">
                            <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
                                <span className="text-sm font-bold text-white/70">{t('tradeRecords')}</span>
                                <span className="text-[11px] text-emerald-400 font-semibold">● {tc('synced')}</span>
                            </div>
                            {(locale === 'ko' ? [
                                { side: 'BUY', sym: '005930', name: '삼성전자', price: '74,200', qty: 10, pnl: null, date: '2025-02-21' },
                                { side: 'SELL', sym: '005930', name: '삼성전자', price: '78,500', qty: 10, pnl: '+43,000', date: '2025-02-23' },
                                { side: 'BUY', sym: 'AAPL', name: 'Apple', price: '$188.2', qty: 5, pnl: null, date: '2025-02-20' },
                                { side: 'BUY', sym: 'NVDA', name: 'NVIDIA', price: '$725.0', qty: 2, pnl: null, date: '2025-02-19' },
                            ] : [
                                { side: 'BUY', sym: 'AAPL', name: 'Apple', price: '$188.20', qty: 10, pnl: null, date: '2025-02-21' },
                                { side: 'SELL', sym: 'AAPL', name: 'Apple', price: '$195.50', qty: 10, pnl: '+$73.00', date: '2025-02-23' },
                                { side: 'BUY', sym: 'NVDA', name: 'NVIDIA', price: '$725.00', qty: 5, pnl: null, date: '2025-02-20' },
                                { side: 'BUY', sym: 'TSLA', name: 'Tesla', price: '$248.50', qty: 2, pnl: null, date: '2025-02-19' },
                            ]).map((tr, i) => (
                                <div key={i} className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between hover:bg-white/4 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tr.side === 'BUY' ? 'bg-rose-500/15 text-rose-400' : 'bg-blue-500/15 text-blue-400'}`}>{tr.side === 'BUY' ? tc('buy') : tc('sell')}</span>
                                        <div>
                                            <div className="text-sm font-bold text-white/90">{tr.name}</div>
                                            <div className="text-[10px] text-white/30 font-mono">{tr.sym}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-semibold text-white/80">{tr.price} × {tr.qty}</div>
                                        {tr.pnl ? <div className="text-[11px] text-emerald-400 font-bold">{tr.pnl}</div> : <div className="text-[10px] text-white/25">{tr.date}</div>}
                                    </div>
                                </div>
                            ))}
                            <div className="px-5 py-3 flex items-center justify-between">
                                <span className="text-xs text-white/30">{t('monthRealizedPnl')}</span>
                                <span className="text-base font-black text-emerald-400">{locale === 'ko' ? '+43,000원' : '+$73.00'}</span>
                            </div>
                        </div>
                    </ScrollIn>
                </div>
            </section>

            {/* ═══════════════════════════════════ 3.5 AI ANALYSIS */}
            <section className="relative z-10 w-full py-24 px-6 md:px-10 border-t border-white/5">
                <div className="max-w-6xl mx-auto flex flex-col xl:flex-row items-center gap-12 xl:gap-20">
                    {/* 좌: AI 리포트 목업 */}
                    <ScrollIn delay={0.1} className="xl:flex-1 w-full">
                        <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden shadow-2xl">
                            <div className="px-5 py-4 border-b border-white/8 flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                                    <Bot size={14} className="text-emerald-400" />
                                </div>
                                <span className="text-sm font-bold text-white/70">{t('aiWeeklyReport')}</span>
                                <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
                                    <Sparkles size={10} /> {t('aiAnalysis')}
                                </span>
                            </div>
                            <div className="px-5 py-4 space-y-3">
                                <div className="p-3 rounded-xl bg-white/4 border border-white/6">
                                    <p className="text-[11px] font-bold text-emerald-400 mb-1">{t('strengthFound')}</p>
                                    <p className="text-xs text-white/50 leading-relaxed">{t('strengthDesc')}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/4 border border-white/6">
                                    <p className="text-[11px] font-bold text-amber-400 mb-1">{t('improvementPoint')}</p>
                                    <p className="text-xs text-white/50 leading-relaxed">{t('improvementDesc')}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/4 border border-white/6">
                                    <p className="text-[11px] font-bold text-blue-400 mb-1">{t('weeklySummary')}</p>
                                    <p className="text-xs text-white/50 leading-relaxed">{t('weeklySummaryDesc')}</p>
                                </div>
                            </div>
                        </div>
                    </ScrollIn>

                    {/* 우: 설명 */}
                    <ScrollIn className="xl:flex-1 text-center xl:text-left">
                        <SectionLabel text="AI Analysis" />
                        <h2 className="text-3xl md:text-4xl xl:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
                            {t('aiCoachTitle1')}<br />
                            <span className="bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">{t('aiCoachTitle2')}</span>
                        </h2>
                        <p className="text-white/45 text-base leading-relaxed mb-8 max-w-lg mx-auto xl:mx-0">
                            {t('aiCoachDesc')}
                        </p>
                        <ul className="space-y-3 mb-8 text-left max-w-lg mx-auto xl:mx-0">
                            {[1, 2, 3].map((n) => (
                                <li key={n} className="flex items-start gap-3">
                                    <CheckCircle size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <span className="text-sm font-bold text-white/80">{t(`aiFeature${n}Title`)}</span>
                                        <span className="text-sm text-white/40 ml-1.5">— {t(`aiFeature${n}Desc`)}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <button onClick={onStart} className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm md:text-base transition-all shadow-2xl shadow-emerald-600/25 active:scale-[0.97]">
                            {t('tryAICoaching')} <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </ScrollIn>
                </div>
            </section>

            {/* ═══════════════════════════════════ 4. BENEFITS */}
            <section className="relative z-10 w-full py-24 px-6 md:px-10 border-t border-white/5">
                <div className="max-w-6xl mx-auto">
                <ScrollIn className="text-center mb-12">
                    <SectionLabel text="Benefits" />
                    <h2 className="text-3xl md:text-4xl xl:text-5xl font-extrabold tracking-tight">
                        {t('benefitsTitle1')}<span className="text-white/35">{t('benefitsTitle2')}</span>
                    </h2>
                </ScrollIn>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {BENEFIT_STYLES.map((b, i) => {
                        const Icon = b.icon;
                        const titleKey = `benefit${i + 1}Title`;
                        const descKey = `benefit${i + 1}Desc`;
                        return (
                            <ScrollIn key={i} delay={i * 0.06}>
                                <div className={`h-full p-6 rounded-2xl border bg-gradient-to-br from-white/3 to-transparent ${b.border} hover:scale-[1.015] transition-transform duration-200`}>
                                    <div className={`w-10 h-10 rounded-xl mb-4 flex items-center justify-center ${b.bg} border ${b.border} ${b.color}`}>
                                        <Icon size={19} />
                                    </div>
                                    <h3 className="text-sm font-bold text-white mb-1.5">{t(titleKey)}</h3>
                                    <p className="text-xs text-white/40 leading-relaxed">{t(descKey)}</p>
                                </div>
                            </ScrollIn>
                        );
                    })}
                </div>
                </div>
            </section>

            {/* ═══════════════════════════════════ 5. SOCIAL PROOF */}
            <section className="relative z-10 w-full py-24 px-6 md:px-10 border-t border-white/5">
                <div className="max-w-6xl mx-auto">
                <ScrollIn className="text-center mb-12">
                    <SectionLabel text="Social Proof" />
                    <h2 className="text-3xl md:text-4xl xl:text-5xl font-extrabold tracking-tight">
                        {t('socialProofTitle1')}<span className="text-white/35">{t('socialProofTitle2')}</span>
                    </h2>
                </ScrollIn>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {TESTIMONIAL_AVATARS.map((avatar, i) => (
                        <ScrollIn key={i} delay={i * 0.08}>
                            <div className="h-full p-6 rounded-2xl border border-white/10 bg-white/3 flex flex-col gap-4">
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: 5 }).map((_, j) => (
                                        <span key={j} className="text-amber-400 text-sm">★</span>
                                    ))}
                                </div>
                                <p className="text-white/60 text-sm leading-relaxed flex-1">&ldquo;{t(`testimonial${i + 1}Text`)}&rdquo;</p>
                                <div className="flex items-center gap-3 pt-2 border-t border-white/8">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 flex items-center justify-center text-xs font-black text-white/80">{avatar}</div>
                                    <div>
                                        <div className="text-sm font-bold text-white/80">{t(`testimonial${i + 1}Name`)}</div>
                                        <div className="text-[11px] text-white/30">{t(`testimonial${i + 1}Role`)}</div>
                                    </div>
                                </div>
                            </div>
                        </ScrollIn>
                    ))}
                </div>
                {/* 통계 배너 */}
                <ScrollIn delay={0.2}>
                    <div className="mt-8 grid grid-cols-3 divide-x divide-white/8 border border-white/8 rounded-2xl bg-white/3 overflow-hidden">
                        {[
                            [t('statFreeLabel'), t('statFreeValue')],
                            [t('statGuestLabel'), t('statGuestValue')],
                            [t('statSignupLabel'), t('statSignupValue')]
                        ].map(([label, value]) => (
                            <div key={label} className="py-6 text-center">
                                <div className="text-2xl md:text-3xl font-black text-white mb-1">{value}</div>
                                <div className="text-xs text-white/35 font-medium">{label}</div>
                            </div>
                        ))}
                    </div>
                </ScrollIn>
                </div>
            </section>

            {/* ═══════════════════════════════════ 6. FAQ */}
            <section className="relative z-10 w-full py-24 px-6 md:px-10 border-t border-white/5">
                <div className="max-w-6xl mx-auto">
                <ScrollIn className="text-center mb-12">
                    <SectionLabel text="FAQ" />
                    <h2 className="text-3xl md:text-4xl xl:text-5xl font-extrabold tracking-tight">
                        {t('faqTitle')}
                    </h2>
                </ScrollIn>
                <div className="w-full max-w-3xl mx-auto space-y-3">
                    {[1, 2, 3, 4, 5].map((n, i) => (
                        <ScrollIn key={i} delay={i * 0.05}>
                            <div className="border border-white/8 rounded-2xl overflow-hidden bg-white/3 hover:bg-white/5 transition-colors">
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-4"
                                >
                                    <span className="text-sm font-bold text-white/80">{t(`faq${n}Q`)}</span>
                                    {openFaq === i ? <ChevronUp size={16} className="text-white/30 flex-shrink-0" /> : <ChevronDown size={16} className="text-white/30 flex-shrink-0" />}
                                </button>
                                <AnimatePresence>
                                    {openFaq === i && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                                        >
                                            <div className="px-6 pb-5 text-sm text-white/45 leading-relaxed border-t border-white/5 pt-4">{t(`faq${n}A`)}</div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </ScrollIn>
                    ))}
                </div>
                </div>
            </section>

            {/* ═══════════════════════════════════ 7. CTA */}
            <section className="relative z-10 w-full py-32 px-6 md:px-10 text-center border-t border-white/5">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-600/4 to-transparent pointer-events-none" />
                <div className="max-w-6xl mx-auto relative">
                <ScrollIn>
                    <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/8 text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
                        <CheckCircle size={12} /> {t('ctaBadge')}
                    </div>
                    <h2 className="text-4xl md:text-5xl xl:text-6xl font-extrabold tracking-tight mb-5 leading-tight">
                        {t('ctaTitle1')}<br />
                        <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">{t('ctaTitle2')}</span>
                    </h2>
                    <p className="text-white/35 text-sm mb-10 max-w-sm mx-auto">{t('ctaDesc')}</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button onClick={onStart} className="group flex items-center gap-2 px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base transition-all shadow-2xl shadow-blue-600/25 active:scale-[0.97]">
                            {t('startFree')} <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                        <button onClick={onStartAsGuest} className="px-8 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-bold text-base transition-all active:scale-[0.97]">
                            {t('startWithoutLoginCta')}
                        </button>
                    </div>
                </ScrollIn>
                </div>
            </section>

            {/* ═══════════════════════════════════ FOOTER */}
            <div className="relative z-10">
                <Footer />
            </div>
        </div>
    );
}
