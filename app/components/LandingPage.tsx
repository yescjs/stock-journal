'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
    ArrowRight, LineChart, BookOpen, Shield, Zap,
    CheckCircle, ChevronDown, ChevronUp, BarChart2,
    Clock, Target, AlertCircle
} from 'lucide-react';
import { FinancialTable, type MarketIndex } from '@/app/components/ui/financial-markets-table';

interface LandingPageProps {
    onStart: () => void;
    onStartAsGuest: () => void;
    darkMode?: boolean;
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

const PAIN_POINTS = [
    { icon: AlertCircle, text: '매매 후 왜 그 결정을 내렸는지 기억이 안 남' },
    { icon: Clock, text: '엑셀로 기록하다 포기 — 유지가 너무 번거로움' },
    { icon: BarChart2, text: '내 승률과 수익률을 정확히 모름' },
    { icon: Target, text: '같은 실수를 반복하지만 원인을 찾지 못함' },
];

const BENEFITS = [
    { icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', title: '30초 기록', desc: '날짜·종목·가격·수량만 입력하면 끝. 메모와 태그로 컨텍스트 보완.' },
    { icon: LineChart, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', title: '패턴 발견', desc: '월별·종목별 분류로 반복 실수를 한눈에 파악. 승률 자동 계산.' },
    { icon: BarChart2, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', title: '차트 즉시 확인', desc: '종목 클릭 한 번으로 캔들차트와 실현/미실현 손익 즉시 확인.' },
    { icon: Shield, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', title: '클라우드 동기화', desc: 'Supabase 기반 실시간 동기화. 어디서든 접근, 데이터 유실 없음.' },
    { icon: Zap, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', title: '게스트 시작', desc: '회원가입 없이 즉시 시작. 준비되면 계정 연결로 데이터 유지.' },
    { icon: Target, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', title: '캘린더 뷰', desc: '달력 형태로 매매 흐름 조회. 특정 날짜의 매매를 직관적으로 파악.' },
];

const TESTIMONIALS = [
    { name: '김민준', role: '주식 투자 2년차', avatar: 'KM', text: '엑셀로 기록하다 포기했는데 StockJournal은 3개월째 매일 기록 중입니다. 패턴을 발견하고 나서 승률이 눈에 띄게 올랐어요.', stars: 5 },
    { name: '이서연', role: '직장인 투자자', avatar: 'LS', text: '출근 전에 30초로 전날 매매를 정리합니다. 월말에 분석하면 내가 어떤 종목에서 약한지 바로 보여요.', stars: 5 },
    { name: '박재현', role: '장기 투자자', avatar: 'PJ', text: '차트와 매매 기록이 한 화면에 나와서 복기가 훨씬 쉬워졌습니다. 게스트로 시작해서 지금은 클라우드로 동기화해서 씁니다.', stars: 5 },
];

const FAQS = [
    { q: '무료로 사용할 수 있나요?', a: '네, 완전 무료입니다. 계정 없이 게스트 모드로도 이용 가능하며, 가입 후 클라우드 동기화 기능을 사용할 수 있습니다.' },
    { q: '데이터는 안전한가요?', a: 'Supabase(PostgreSQL 기반) 클라우드에 암호화 저장됩니다. Google OAuth 로그인을 지원하여 별도 비밀번호 없이도 안전하게 이용할 수 있습니다.' },
    { q: '게스트 모드와 계정 로그인의 차이는?', a: '게스트 모드는 브라우저(localStorage)에만 저장되어 기기 변경 시 데이터가 유지되지 않습니다. 계정을 연결하면 클라우드에 동기화되어 어디서든 접근 가능합니다.' },
    { q: '미국 주식과 한국 주식 모두 기록 가능한가요?', a: '네, 모든 종목을 티커 심볼로 기록할 수 있습니다. KOSPI/KOSDAQ/US 종목 모두 지원하며, USD→KRW 환율 변환 기능도 제공합니다.' },
];

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

    const SectionLabel = ({ text }: { text: string }) => (
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-400/70 mb-3">{text}</p>
    );

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
                        <button onClick={onStartAsGuest} className="text-sm font-semibold text-white/40 hover:text-white/80 transition-colors px-3 py-2 hidden sm:block">게스트로 시작</button>
                        <button onClick={onStart} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all shadow-lg shadow-blue-600/25 active:scale-95">
                            로그인 <ArrowRight size={13} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* ═══════════════════════════════════ 1. HERO */}
            <section className="relative w-full min-h-screen flex flex-col items-center justify-start pt-28 pb-12 px-6 md:px-10 z-10">
                <motion.div style={{ y: heroY, opacity: heroOpacity }} className="w-full max-w-6xl mx-auto flex flex-col items-center">
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 mb-7 px-4 py-1.5 rounded-full border border-white/10 bg-white/4 backdrop-blur-sm text-[11px] font-bold text-white/50 uppercase tracking-[0.12em]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        매매 일지 · 차트 분석 · 클라우드 동기화 · 무료
                    </motion.div>

                    <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.08 }}
                        className="text-5xl sm:text-6xl md:text-7xl xl:text-[5.25rem] font-extrabold leading-[1.06] tracking-[-0.03em] mb-5 text-center">
                        투자 기록이<br />
                        <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-violet-400 bg-clip-text text-transparent">실력이 됩니다.</span>
                    </motion.h1>

                    <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.16 }}
                        className="text-base md:text-lg text-white/40 font-medium mb-9 text-center leading-relaxed max-w-lg">
                        매매 일지를 30초만 쓰세요. StockJournal이 패턴을 분석하고,<br className="hidden md:block" />
                        같은 실수를 반복하지 않도록 도와드립니다.
                    </motion.p>

                    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.24 }}
                        className="flex flex-col sm:flex-row items-center gap-3 mb-14">
                        <button onClick={onStart} className="group flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm md:text-base transition-all shadow-2xl shadow-blue-600/25 active:scale-[0.97]">
                            무료로 시작하기 <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                        <button onClick={onStartAsGuest} className="px-7 py-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-bold text-sm md:text-base transition-all active:scale-[0.97]">
                            로그인 없이 둘러보기
                        </button>
                    </motion.div>

                    {/* 금융 테이블 쇼케이스 */}
                    <motion.div initial={{ opacity: 0, y: 40, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.9, delay: 0.38, ease: [0.22, 1, 0.36, 1] }} className="w-full relative">
                        <div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-white/8 to-transparent pointer-events-none z-10" />
                        <div className="absolute -inset-6 bg-blue-500/4 rounded-[3rem] blur-3xl pointer-events-none" />
                        <FinancialTable title="글로벌 시장" indices={indices} className="relative z-0 rounded-2xl" />
                    </motion.div>

                    <AnimatePresence mode="wait">
                        <motion.p key={tick} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                            className="mt-4 text-[11px] text-white/18 font-medium">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse align-middle" />
                            {new Date().toLocaleTimeString('ko-KR')} 기준 시뮬레이션 · 2.5초 갱신
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
                            혹시 이런 경험,<br /><span className="text-white/35">있지 않으신가요?</span>
                        </h2>
                    </ScrollIn>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        {PAIN_POINTS.map((p, i) => {
                            const Icon = p.icon;
                            return (
                                <ScrollIn key={i} delay={i * 0.07}>
                                    <div className="h-full p-6 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors">
                                        <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center bg-rose-500/10 border border-rose-500/20 text-rose-400">
                                            <Icon size={18} />
                                        </div>
                                        <p className="text-sm text-white/60 leading-relaxed font-medium">{p.text}</p>
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
                            30초 기록으로<br />
                            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">복기의 힘</span>을 경험하세요.
                        </h2>
                        <p className="text-white/45 text-base leading-relaxed mb-8 max-w-lg mx-auto xl:mx-0">
                            StockJournal은 매매 직후 30초면 기록이 완료됩니다. 캘린더와 차트로 흐름을 보고, 종목별로 나만의 패턴을 발견하세요. 기록이 쌓일수록 투자 판단이 선명해집니다.
                        </p>
                        <button onClick={onStart} className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm md:text-base transition-all shadow-2xl shadow-blue-600/25 active:scale-[0.97]">
                            지금 바로 시작 <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </ScrollIn>

                    <ScrollIn delay={0.15} className="xl:flex-1 w-full">
                        {/* 미니 대시보드 목업 */}
                        <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden shadow-2xl">
                            <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
                                <span className="text-sm font-bold text-white/70">매매 기록</span>
                                <span className="text-[11px] text-emerald-400 font-semibold">● 동기화됨</span>
                            </div>
                            {[
                                { side: 'BUY', sym: '005930', name: '삼성전자', price: '74,200', qty: 10, pnl: null, date: '2025-02-21' },
                                { side: 'SELL', sym: '005930', name: '삼성전자', price: '78,500', qty: 10, pnl: '+43,000', date: '2025-02-23' },
                                { side: 'BUY', sym: 'AAPL', name: 'Apple', price: '$188.2', qty: 5, pnl: null, date: '2025-02-20' },
                                { side: 'BUY', sym: 'NVDA', name: 'NVIDIA', price: '$725.0', qty: 2, pnl: null, date: '2025-02-19' },
                            ].map((t, i) => (
                                <div key={i} className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between hover:bg-white/4 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.side === 'BUY' ? 'bg-rose-500/15 text-rose-400' : 'bg-blue-500/15 text-blue-400'}`}>{t.side === 'BUY' ? '매수' : '매도'}</span>
                                        <div>
                                            <div className="text-sm font-bold text-white/90">{t.name}</div>
                                            <div className="text-[10px] text-white/30 font-mono">{t.sym}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-semibold text-white/80">{t.price} × {t.qty}</div>
                                        {t.pnl ? <div className="text-[11px] text-emerald-400 font-bold">{t.pnl}</div> : <div className="text-[10px] text-white/25">{t.date}</div>}
                                    </div>
                                </div>
                            ))}
                            <div className="px-5 py-3 flex items-center justify-between">
                                <span className="text-xs text-white/30">이번 달 실현 손익</span>
                                <span className="text-base font-black text-emerald-400">+43,000원</span>
                            </div>
                        </div>
                    </ScrollIn>
                </div>
            </section>

            {/* ═══════════════════════════════════ 4. BENEFITS */}
            <section className="relative z-10 w-full py-24 px-6 md:px-10 border-t border-white/5">
                <div className="max-w-6xl mx-auto">
                <ScrollIn className="text-center mb-12">
                    <SectionLabel text="Benefits" />
                    <h2 className="text-3xl md:text-4xl xl:text-5xl font-extrabold tracking-tight">
                        기능보다 <span className="text-white/35">결과에 집중합니다.</span>
                    </h2>
                </ScrollIn>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {BENEFITS.map((b, i) => {
                        const Icon = b.icon;
                        return (
                            <ScrollIn key={b.title} delay={i * 0.06}>
                                <div className={`h-full p-6 rounded-2xl border bg-gradient-to-br from-white/3 to-transparent ${b.border} hover:scale-[1.015] transition-transform duration-200`}>
                                    <div className={`w-10 h-10 rounded-xl mb-4 flex items-center justify-center ${b.bg} border ${b.border} ${b.color}`}>
                                        <Icon size={19} />
                                    </div>
                                    <h3 className="text-sm font-bold text-white mb-1.5">{b.title}</h3>
                                    <p className="text-xs text-white/40 leading-relaxed">{b.desc}</p>
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
                        이미 기록을 시작한 <span className="text-white/35">투자자들</span>
                    </h2>
                </ScrollIn>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {TESTIMONIALS.map((t, i) => (
                        <ScrollIn key={t.name} delay={i * 0.08}>
                            <div className="h-full p-6 rounded-2xl border border-white/10 bg-white/3 flex flex-col gap-4">
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: t.stars }).map((_, j) => (
                                        <span key={j} className="text-amber-400 text-sm">★</span>
                                    ))}
                                </div>
                                <p className="text-white/60 text-sm leading-relaxed flex-1">&ldquo;{t.text}&rdquo;</p>
                                <div className="flex items-center gap-3 pt-2 border-t border-white/8">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 flex items-center justify-center text-xs font-black text-white/80">{t.avatar}</div>
                                    <div>
                                        <div className="text-sm font-bold text-white/80">{t.name}</div>
                                        <div className="text-[11px] text-white/30">{t.role}</div>
                                    </div>
                                </div>
                            </div>
                        </ScrollIn>
                    ))}
                </div>
                {/* 통계 배너 */}
                <ScrollIn delay={0.2}>
                    <div className="mt-8 grid grid-cols-3 divide-x divide-white/8 border border-white/8 rounded-2xl bg-white/3 overflow-hidden">
                        {[['무료', '100%'], ['게스트 모드', '지원'], ['가입 소요시간', '30초']].map(([label, value]) => (
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
                        자주 묻는 질문
                    </h2>
                </ScrollIn>
                <div className="w-full max-w-3xl mx-auto space-y-3">
                    {FAQS.map((faq, i) => (
                        <ScrollIn key={i} delay={i * 0.05}>
                            <div className="border border-white/8 rounded-2xl overflow-hidden bg-white/3 hover:bg-white/5 transition-colors">
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-4"
                                >
                                    <span className="text-sm font-bold text-white/80">{faq.q}</span>
                                    {openFaq === i ? <ChevronUp size={16} className="text-white/30 flex-shrink-0" /> : <ChevronDown size={16} className="text-white/30 flex-shrink-0" />}
                                </button>
                                <AnimatePresence>
                                    {openFaq === i && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                                        >
                                            <div className="px-6 pb-5 text-sm text-white/45 leading-relaxed border-t border-white/5 pt-4">{faq.a}</div>
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
                        <CheckCircle size={12} /> 무료 · 회원가입 선택 · 즉시 시작
                    </div>
                    <h2 className="text-4xl md:text-5xl xl:text-6xl font-extrabold tracking-tight mb-5 leading-tight">
                        오늘 매매,<br />
                        <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">지금 기록하세요.</span>
                    </h2>
                    <p className="text-white/35 text-sm mb-10 max-w-sm mx-auto">기록하지 않으면 성장하지 않습니다. 30초면 충분합니다.</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button onClick={onStart} className="group flex items-center gap-2 px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base transition-all shadow-2xl shadow-blue-600/25 active:scale-[0.97]">
                            무료로 시작하기 <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                        <button onClick={onStartAsGuest} className="px-8 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-bold text-base transition-all active:scale-[0.97]">
                            로그인 없이 시작
                        </button>
                    </div>
                </ScrollIn>
                </div>
            </section>

            {/* ═══════════════════════════════════ FOOTER */}
            <footer className="relative z-10 w-full border-t border-white/5 py-8 text-center">
                <div className="max-w-6xl mx-auto px-6 md:px-10">
                <p className="text-[11px] text-white/18">© {new Date().getFullYear()} StockJournal · 투자 권유 아님 · 시뮬레이션 데이터 포함</p>
                </div>
            </footer>
        </div>
    );
}
