'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Sparkles, X, PartyPopper } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';

// CSS 기반 컨페티 컴포넌트
function CSSConfetti() {
    const colors = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];
    
    // useMemo로 안정적인 랜덤 값 생성
    const particles = React.useMemo(() => {
        return [...Array(30)].map((_, i) => ({
            id: i,
            color: colors[i % colors.length],
            left: (i * 3.33) % 100, // 안정적인 위치
            xOffset: ((i % 5) - 2) * 40, // -80 ~ 80 범위
            rotate: (i % 7) * 103, // 0 ~ 720 범위
            duration: 2 + (i % 3),
            delay: (i % 10) * 0.2,
        }));
    }, [colors]);
    
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    className="absolute w-2 h-2 rounded-sm"
                    style={{
                        backgroundColor: p.color,
                        left: `${p.left}%`,
                        top: -10,
                    }}
                    animate={{
                        y: ['0vh', '100vh'],
                        x: [0, p.xOffset],
                        rotate: [0, p.rotate],
                    }}
                    transition={{
                        duration: p.duration,
                        repeat: Infinity,
                        delay: p.delay,
                        ease: 'linear',
                    }}
                />
            ))}
        </div>
    );
}

interface CelebrationEvent {
    id: string;
    type: 'achievement' | 'goal' | 'milestone' | 'streak';
    title: string;
    description: string;
    reward?: string;
}

interface CelebrationEffectsProps {
    events: CelebrationEvent[];
    darkMode: boolean;
    onComplete?: () => void;
}

export function CelebrationEffects({ events, darkMode, onComplete }: CelebrationEffectsProps) {
    const [currentEvent, setCurrentEvent] = useState<CelebrationEvent | null>(null);
    const [queue, setQueue] = useState<CelebrationEvent[]>([]);
    const [isShowing, setIsShowing] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

        const triggerConfetti = React.useCallback(() => {

            setShowConfetti(true);

            setTimeout(() => setShowConfetti(false), 4000);

        }, []);

    

            // 큐 관리 및 다음 이벤트 설정 통합

    

            useEffect(() => {

    

                // 새 이벤트가 들어왔을 때

    

                if (events.length > 0 && !isShowing && queue.length === 0) {

    

                    // eslint-disable-next-line react-hooks/set-state-in-effect

    

                    setQueue(events);

    

                    return;

    

                }

    

        

    

                // 큐에 이벤트가 있고 현재 보여주는 것이 없을 때

    

                if (queue.length > 0 && !isShowing && !currentEvent) {

    

                    const [next, ...rest] = queue;

    

                    // eslint-disable-next-line react-hooks/set-state-in-effect

    

                    setCurrentEvent(next);

    

                    // eslint-disable-next-line react-hooks/set-state-in-effect

    

                    setQueue(rest);

    

                    // eslint-disable-next-line react-hooks/set-state-in-effect

    

                    setIsShowing(true);

    

                    triggerConfetti();

    

                }

    

            }, [events, queue, isShowing, currentEvent, triggerConfetti]);

    

        const handleDismiss = () => {
        setIsShowing(false);
        setCurrentEvent(null);
        
        if (queue.length === 0) {
            onComplete?.();
        }
    };

    if (!currentEvent || !isShowing) return null;

    const getIcon = () => {
        switch (currentEvent.type) {
            case 'achievement':
                return <Trophy className="w-12 h-12 text-amber-400" />;
            case 'goal':
                return <Star className="w-12 h-12 text-purple-400" />;
            case 'milestone':
                return <PartyPopper className="w-12 h-12 text-pink-400" />;
            case 'streak':
                return <Sparkles className="w-12 h-12 text-orange-400" />;
            default:
                return <Trophy className="w-12 h-12 text-amber-400" />;
        }
    };

    const getGradient = () => {
        switch (currentEvent.type) {
            case 'achievement':
                return 'from-amber-500/20 to-orange-500/20';
            case 'goal':
                return 'from-purple-500/20 to-pink-500/20';
            case 'milestone':
                return 'from-pink-500/20 to-rose-500/20';
            case 'streak':
                return 'from-orange-500/20 to-red-500/20';
            default:
                return 'from-amber-500/20 to-orange-500/20';
        }
    };

    return (
        <AnimatePresence>
            {showConfetti && <CSSConfetti />}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                onClick={handleDismiss}
            >
                <motion.div
                    initial={{ scale: 0.5, opacity: 0, y: 50 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.5, opacity: 0, y: 50 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className={`relative w-full max-w-md p-8 rounded-3xl border shadow-2xl bg-gradient-to-br ${getGradient()} ${
                        darkMode ? 'border-slate-700 bg-slate-900/90' : 'border-white/50 bg-white/90'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close Button */}
                    <button
                        onClick={handleDismiss}
                        className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
                            darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-400'
                        }`}
                    >
                        <X size={20} />
                    </button>

                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <motion.div
                            initial={{ rotate: -180, scale: 0 }}
                            animate={{ rotate: 0, scale: 1 }}
                            transition={{ type: 'spring', damping: 10, delay: 0.1 }}
                            className={`p-4 rounded-2xl ${
                                darkMode ? 'bg-slate-800/80' : 'bg-white/80'
                            } shadow-lg`}
                        >
                            {getIcon()}
                        </motion.div>
                    </div>

                    {/* Title */}
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className={`text-2xl font-black text-center mb-2 ${
                            darkMode ? 'text-white' : 'text-slate-900'
                        }`}
                    >
                        {currentEvent.title}
                    </motion.h2>

                    {/* Description */}
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className={`text-center mb-6 ${
                            darkMode ? 'text-slate-300' : 'text-slate-600'
                        }`}
                    >
                        {currentEvent.description}
                    </motion.p>

                    {/* Reward */}
                    {currentEvent.reward && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 }}
                            className={`p-4 rounded-xl mb-6 text-center ${
                                darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-slate-50 border border-slate-200'
                            }`}
                        >
                            <span className={`text-sm font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                획득 보상
                            </span>
                            <div className={`text-lg font-bold mt-1 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                                {currentEvent.reward}
                            </div>
                        </motion.div>
                    )}

                    {/* Button */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <Button
                            onClick={handleDismiss}
                            className={`w-full py-3 rounded-xl font-bold text-lg transition-transform active:scale-95 ${
                                currentEvent.type === 'achievement'
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
                                    : currentEvent.type === 'goal'
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600'
                            }`}
                        >
                            {queue.length > 0 ? `다음 (${queue.length}개 남음)` : '완료!'}
                        </Button>
                    </motion.div>

                    {/* Decorative Elements */}
                    <div className="absolute -top-2 -left-2 w-20 h-20 bg-gradient-to-br from-amber-400/20 to-transparent rounded-full blur-xl" />
                    <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-gradient-to-tr from-orange-400/20 to-transparent rounded-full blur-xl" />
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// 간단한 성공 알림 (toast)
interface SuccessToastProps {
    message: string;
    subMessage?: string;
    icon?: 'check' | 'star' | 'fire' | 'trophy';
    darkMode: boolean;
    onDismiss: () => void;
}

export function SuccessToast({ message, subMessage, icon = 'check', darkMode, onDismiss }: SuccessToastProps) {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 3000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    const getIcon = () => {
        switch (icon) {
            case 'star':
                return <Star className="w-5 h-5 text-amber-400" />;
            case 'fire':
                return <Sparkles className="w-5 h-5 text-orange-400" />;
            case 'trophy':
                return <Trophy className="w-5 h-5 text-amber-400" />;
            default:
                return <PartyPopper className="w-5 h-5 text-emerald-400" />;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-24 left-1/2 z-50 px-6 py-3 rounded-full shadow-lg border backdrop-blur-xl flex items-center gap-3 ${
                darkMode 
                    ? 'bg-slate-900/90 border-slate-700 text-slate-100' 
                    : 'bg-white/90 border-slate-200 text-slate-900'
            }`}
        >
            {getIcon()}
            <div>
                <div className="font-bold text-sm">{message}</div>
                {subMessage && (
                    <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {subMessage}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
