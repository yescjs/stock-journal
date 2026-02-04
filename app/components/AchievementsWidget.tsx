'use client';

import React, { useState } from 'react';
import { Achievement, ACHIEVEMENT_COLORS } from '@/app/hooks/useAchievements';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Trophy, Lock, Unlock, ChevronDown, ChevronUp, Medal, Target, Zap, BookOpen, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AchievementsWidgetProps {
    achievements: Achievement[];
    stats: {
        total: number;
        unlocked: number;
        locked: number;
        progress: number;
        byCategory: {
            profit: number;
            streak: number;
            discipline: number;
            milestone: number;
            analysis: number;
        };
    };
    darkMode: boolean;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    profit: <TrendingUp size={16} />,
    streak: <Zap size={16} />,
    discipline: <BookOpen size={16} />,
    milestone: <Medal size={16} />,
    analysis: <Target size={16} />,
};

const CATEGORY_LABELS: Record<string, string> = {
    profit: '수익',
    streak: '연승',
    discipline: '규율',
    milestone: '마일스톤',
    analysis: '분석',
};

export function AchievementsWidget({ achievements, stats, darkMode }: AchievementsWidgetProps) {
    const [showAll, setShowAll] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const filteredAchievements = selectedCategory
        ? achievements.filter(a => a.category === selectedCategory)
        : achievements;

    const displayAchievements = showAll ? filteredAchievements : filteredAchievements.slice(0, 8);
    const hasMore = filteredAchievements.length > 8;

    return (
        <Card className="p-6 mb-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                        <Trophy className={`w-6 h-6 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                    </div>
                    <div>
                        <h2 className={`text-lg font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                            업적 & 배지
                        </h2>
                        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {stats.unlocked} / {stats.total} 개 달성 ({stats.progress}%)
                        </p>
                    </div>
                </div>
                
                {/* Progress Ring */}
                <div className="relative w-16 h-16">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                            className={darkMode ? 'text-slate-700' : 'text-slate-200'}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                        />
                        <path
                            className={darkMode ? 'text-amber-400' : 'text-amber-500'}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeDasharray={`${stats.progress}, 100`}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-xs font-bold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                            {stats.progress}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 mb-6">
                <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedCategory === null
                            ? darkMode ? 'bg-slate-700 text-white' : 'bg-slate-800 text-white'
                            : darkMode ? 'bg-slate-800/50 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                    전체
                </button>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setSelectedCategory(key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            selectedCategory === key
                                ? `${ACHIEVEMENT_COLORS[key].bg} ${ACHIEVEMENT_COLORS[key].text}`
                                : darkMode ? 'bg-slate-800/50 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        {CATEGORY_ICONS[key]}
                        {label}
                        {stats.byCategory[key as keyof typeof stats.byCategory] > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${darkMode ? 'bg-slate-700' : 'bg-white'}`}>
                                {stats.byCategory[key as keyof typeof stats.byCategory]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Achievements Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <AnimatePresence mode="popLayout">
                    {displayAchievements.map((achievement) => {
                        const colors = ACHIEVEMENT_COLORS[achievement.category];
                        const isUnlocked = achievement.unlocked;
                        const progressPercent = (achievement.progress / achievement.maxProgress) * 100;

                        return (
                            <motion.div
                                key={achievement.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                                    isUnlocked
                                        ? `${colors.bg} ${colors.border} ${darkMode ? 'bg-opacity-30' : 'bg-opacity-50'}`
                                        : darkMode ? 'bg-slate-800/30 border-slate-700/30 opacity-60' : 'bg-slate-50 border-slate-200 opacity-60'
                                }`}
                            >
                                {/* Icon */}
                                <div className="flex items-start justify-between mb-3">
                                    <span className="text-3xl">{achievement.icon}</span>
                                    {isUnlocked ? (
                                        <Unlock className={`w-4 h-4 ${colors.text}`} />
                                    ) : (
                                        <Lock className={`w-4 h-4 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} />
                                    )}
                                </div>

                                {/* Title & Description */}
                                <h3 className={`font-bold text-sm mb-1 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                    {achievement.title}
                                </h3>
                                <p className={`text-xs mb-3 line-clamp-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {achievement.description}
                                </p>

                                {/* Progress Bar */}
                                <div className="relative">
                                    <div className={`h-1.5 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${colors.bg.replace('/20', '')}`}
                                            style={{ width: `${Math.min(progressPercent, 100)}%` }}
                                        />
                                    </div>
                                    <div className={`text-[10px] mt-1 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {isUnlocked ? (
                                            <span className={colors.text}>✓ 달성!</span>
                                        ) : (
                                            `${achievement.progress} / ${achievement.maxProgress}`
                                        )}
                                    </div>
                                </div>

                                {/* Shine Effect for Unlocked */}
                                {isUnlocked && (
                                    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                                            animate={{ x: ['-100%', '100%'] }}
                                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                                        />
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Show More Button */}
            {hasMore && (
                <div className="flex justify-center mt-6">
                    <Button
                        onClick={() => setShowAll(!showAll)}
                        variant="ghost"
                        className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition-all ${
                            darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                        {showAll ? (
                            <>
                                <ChevronUp size={18} />
                                접기
                            </>
                        ) : (
                            <>
                                <ChevronDown size={18} />
                                더 보기 ({filteredAchievements.length - 8}개)
                            </>
                        )}
                    </Button>
                </div>
            )}
        </Card>
    );
}
