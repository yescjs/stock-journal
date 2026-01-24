'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ChevronDown, Activity, Shield, TrendingUp } from 'lucide-react';

interface LandingPageProps {
    onStart: () => void;
    onStartAsGuest: () => void;
}

export function LandingPage({ onStart, onStartAsGuest }: LandingPageProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: scrollRef });

    // Parallax & Opacity transforms for hero
    const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
    const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

    return (
        <div ref={scrollRef} className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100 overflow-x-hidden">

            {/* Nav */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 transition-all">
                <div className="max-w-[1080px] mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="font-bold text-xl tracking-tighter text-slate-900 flex items-center gap-1.5">
                        <span className="text-blue-600">Stock</span>Journal
                    </div>
                    <button
                        onClick={onStart}
                        className="px-4 py-2 rounded-lg bg-blue-50 text-blue-600 font-bold text-sm hover:bg-blue-100 transition-colors"
                    >
                        로그인
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative h-screen flex flex-col items-center justify-center pt-20 overflow-hidden">
                <motion.div
                    style={{ opacity: heroOpacity, scale: heroScale }}
                    className="text-center px-6 relative z-10"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        <h1 className="text-6xl md:text-[5.5rem] font-bold leading-[1.1] tracking-tighter mb-8 text-slate-900">
                            금융이 <br className="md:hidden" />
                            쉬워진다.
                        </h1>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                        className="text-xl md:text-2xl text-slate-500 font-medium mb-12 leading-relaxed"
                    >
                        복잡한 주식 투자, <br className="md:hidden" />
                        이제 직관적인 매매일지로 시작하세요.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                        className="flex flex-col sm:flex-row items-center gap-4"
                    >
                        <button
                            onClick={onStart}
                            className="group inline-flex items-center gap-2 px-8 py-4 rounded-3xl bg-blue-600 text-white font-bold text-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                        >
                            로그인하고 시작하기
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button
                            onClick={onStartAsGuest}
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-3xl bg-white text-slate-700 font-bold text-xl hover:bg-slate-50 transition-all border-2 border-slate-200 active:scale-95"
                        >
                            게스트로 둘러보기
                        </button>
                    </motion.div>
                </motion.div>

                {/* Abstract 3D-like Background Elements */}
                <div className="absolute inset-0 pointer-events-none z-0">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.5, ease: "circOut" }}
                        className="absolute top-1/4 -right-20 w-[500px] h-[500px] bg-gradient-to-br from-blue-100 to-blue-50 rounded-full blur-3xl opacity-60"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.5, delay: 0.5, ease: "circOut" }}
                        className="absolute bottom-1/4 -left-20 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-100 to-purple-50 rounded-full blur-3xl opacity-60"
                    />
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2, duration: 1 }}
                    className="absolute bottom-10 animate-bounce text-slate-300"
                >
                    <ChevronDown size={32} />
                </motion.div>
            </section>

            {/* Feature 1: Analytics */}
            <section className="py-32 px-6 bg-slate-50">
                <div className="max-w-[1080px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
                    <ScrollAnimationWrapper>
                        <h2 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
                            내 자산의 흐름, <br />
                            <span className="text-blue-600">한눈에 파악</span>
                        </h2>
                        <p className="text-xl text-slate-500 leading-relaxed font-medium">
                            매일매일 변하는 승률과 수익금을 <br />
                            실시간 차트로 확인하세요.
                        </p>
                    </ScrollAnimationWrapper>
                    <ScrollAnimationWrapper delay={0.2} className="relative">
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50 border border-slate-100 rotate-2 hover:rotate-0 transition-transform duration-500">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                    <TrendingUp size={24} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-400">이번 달 수익률</div>
                                    <div className="text-2xl font-black text-slate-900">+24.5%</div>
                                </div>
                            </div>
                            <div className="h-32 bg-slate-50 rounded-2xl flex items-end justify-between p-4 px-6 gap-2">
                                {[40, 60, 45, 70, 85, 65, 90].map((h, i) => (
                                    <div key={i} className="w-full bg-blue-500 rounded-t-lg opacity-80" style={{ height: `${h}%` }}></div>
                                ))}
                            </div>
                        </div>
                    </ScrollAnimationWrapper>
                </div>
            </section>

            {/* Feature 2: Risk Management */}
            <section className="py-32 px-6 bg-white overflow-hidden">
                <div className="max-w-[1080px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
                    <ScrollAnimationWrapper className="order-2 md:order-1 relative">
                        {/* Blob */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-rose-50 rounded-full blur-3xl z-0" />

                        <div className="relative z-10 bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/50 border border-slate-100 flex flex-col gap-6 max-w-sm mx-auto md:mr-auto">
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-rose-50 border border-rose-100">
                                <Activity className="text-rose-500" />
                                <span className="font-bold text-rose-600">손실 한도 도달 알림</span>
                            </div>
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                                <Shield className="text-emerald-500" />
                                <span className="font-bold text-emerald-600">원칙 준수 성공</span>
                            </div>
                        </div>
                    </ScrollAnimationWrapper>

                    <ScrollAnimationWrapper delay={0.2} className="order-1 md:order-2">
                        <h2 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
                            리스크는 막고, <br />
                            <span className="text-rose-500">원칙은 지키고</span>
                        </h2>
                        <p className="text-xl text-slate-500 leading-relaxed font-medium">
                            뇌동매매를 방지하는 리스크 관리 시스템으로 <br />
                            계좌를 안전하게 보호하세요.
                        </p>
                    </ScrollAnimationWrapper>
                </div>
            </section>

            {/* Feature 3: Dark Mode (Simple) */}
            <section className="py-32 px-6 bg-slate-900 text-white text-center">
                <ScrollAnimationWrapper>
                    <h2 className="text-4xl md:text-6xl font-bold leading-tight mb-8">
                        밤에도 편안하게
                    </h2>
                    <p className="text-xl text-slate-400 mb-12">
                        다크 모드로 눈의 피로를 줄이세요.
                    </p>
                    <div className="inline-flex rounded-full bg-slate-800 p-2 border border-slate-700">
                        <div className="px-6 py-2 rounded-full bg-slate-700 text-white font-bold text-sm">Dark</div>
                        <div className="px-6 py-2 rounded-full text-slate-500 font-bold text-sm">Light</div>
                    </div>
                </ScrollAnimationWrapper>
            </section>


            {/* CTA */}
            <section className="py-40 px-6 bg-slate-50 text-center">
                <ScrollAnimationWrapper>
                    <h2 className="text-5xl md:text-7xl font-bold tracking-tighter text-slate-900 mb-10">
                        이제, 기록할 시간입니다.
                    </h2>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                        <button
                            onClick={onStart}
                            className="inline-flex items-center justify-center px-10 py-5 rounded-3xl bg-blue-600 text-white font-bold text-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 active:scale-95"
                        >
                            로그인하고 시작하기
                        </button>
                        <button
                            onClick={onStartAsGuest}
                            className="inline-flex items-center justify-center px-10 py-5 rounded-3xl bg-white text-slate-700 font-bold text-2xl hover:bg-slate-50 transition-all border-2 border-slate-200 active:scale-95"
                        >
                            게스트로 둘러보기
                        </button>
                    </div>
                    <p className="mt-6 text-slate-500 font-medium">
                        로그인 없이도 바로 시작할 수 있습니다.
                    </p>
                </ScrollAnimationWrapper>
            </section>

            <footer className="py-12 text-center text-slate-400 text-sm bg-white border-t border-slate-100">
                <div className="max-w-[1080px] mx-auto px-6">
                    © {new Date().getFullYear()} Stock Journal. All rights reserved.
                </div>
            </footer>
        </div>
    );
}

// Minimal scroll animation wrapper
function ScrollAnimationWrapper({ children, className, delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
