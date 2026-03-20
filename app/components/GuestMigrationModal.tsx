'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, X } from 'lucide-react';

interface GuestMigrationModalProps {
    isOpen: boolean;
    tradeCount: number;
    loading: boolean;
    onMigrate: () => void;
    onSkip: () => void;
}

export function GuestMigrationModal({
    isOpen,
    tradeCount,
    loading,
    onMigrate,
    onSkip,
}: GuestMigrationModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        onClick={!loading ? onSkip : undefined}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm px-4"
                    >
                        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                                        <Download size={18} className="text-blue-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-white font-bold text-base">게스트 데이터 가져오기</h2>
                                        <p className="text-white/40 text-xs mt-0.5">로그인 전 기록한 거래 내역</p>
                                    </div>
                                </div>
                                <button
                                    onClick={!loading ? onSkip : undefined}
                                    disabled={loading}
                                    className="text-white/30 hover:text-white/60 transition-colors disabled:opacity-40 shrink-0 ml-2"
                                    aria-label="닫기"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl px-4 py-3 mb-5">
                                <p className="text-white/80 text-sm leading-relaxed">
                                    로그인 전 기록한{' '}
                                    <span className="text-blue-400 font-bold">{tradeCount}개</span>의 거래 내역을
                                    계정에 저장할까요?
                                </p>
                                <p className="text-white/40 text-xs mt-1.5">
                                    가져오지 않으면 게스트 데이터는 삭제됩니다.
                                </p>
                            </div>

                            <div className="flex gap-2.5">
                                <button
                                    onClick={onSkip}
                                    disabled={loading}
                                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    건너뜀
                                </button>
                                <button
                                    onClick={onMigrate}
                                    disabled={loading}
                                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>가져오는 중...</span>
                                        </>
                                    ) : (
                                        <span>가져오기 ({tradeCount}건)</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
