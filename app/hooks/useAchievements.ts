import { useMemo } from 'react';
import { Trade } from '@/app/types/trade';
import { OverallStats, InsightData } from '@/app/types/stats';

// 업적 타입
export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    category: 'profit' | 'streak' | 'discipline' | 'milestone' | 'analysis';
    unlocked: boolean;
    unlockedAt?: string;
    progress: number; // 0-100
    maxProgress: number;
    reward?: string;
}

// 업적 카테고리별 색상
export const ACHIEVEMENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    profit: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    streak: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
    discipline: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
    milestone: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
    analysis: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
};

// 업적 정의
const ACHIEVEMENT_DEFINITIONS = [
    // 수익 관련 업적
    { id: 'first_profit', title: '첫 수익', description: '첫 번째 수익 거래를 완료하세요', icon: '🎯', category: 'profit' as const, maxProgress: 1 },
    { id: 'profit_10k', title: '만수르', description: '누적 수익 10,000원 달성', icon: '💰', category: 'profit' as const, maxProgress: 10000 },
    { id: 'profit_100k', title: '백만장자', description: '누적 수익 100,000원 달성', icon: '💵', category: 'profit' as const, maxProgress: 100000 },
    { id: 'profit_1m', title: '돈벼락', description: '누적 수익 1,000,000원 달성', icon: '🏦', category: 'profit' as const, maxProgress: 1000000 },
    { id: 'big_win', title: '대박!', description: '단일 거래에서 50,000원 이상 수익', icon: '🚀', category: 'profit' as const, maxProgress: 50000 },
    
    // 연승 관련 업적
    { id: 'streak_3', title: '불타오르는 3연승', description: '3연승 달성', icon: '🔥', category: 'streak' as const, maxProgress: 3 },
    { id: 'streak_5', title: '무적의 5연승', description: '5연승 달성', icon: '👑', category: 'streak' as const, maxProgress: 5 },
    { id: 'streak_10', title: '전설의 10연승', description: '10연승 달성', icon: '🏆', category: 'streak' as const, maxProgress: 10 },
    
    // 규율 관련 업적
    { id: 'journal_7', title: '꾸준함의 시작', description: '7일 연속 매매일지 작성', icon: '📝', category: 'discipline' as const, maxProgress: 7 },
    { id: 'journal_30', title: '한 달의 기록', description: '30일 연속 매매일지 작성', icon: '📚', category: 'discipline' as const, maxProgress: 30 },
    { id: 'strategy_user', title: '전략가', description: '전략을 지정하여 10회 거래', icon: '🎲', category: 'discipline' as const, maxProgress: 10 },
    
    // 마일스톤 업적
    { id: 'first_trade', title: '첫걸음', description: '첫 번째 거래 기록', icon: '👶', category: 'milestone' as const, maxProgress: 1 },
    { id: 'trades_10', title: '숙련자', description: '누적 10회 거래 완료', icon: '⚡', category: 'milestone' as const, maxProgress: 10 },
    { id: 'trades_50', title: '베테랑', description: '누적 50회 거래 완료', icon: '🎖️', category: 'milestone' as const, maxProgress: 50 },
    { id: 'trades_100', title: '마스터 트레이더', description: '누적 100회 거래 완료', icon: '👔', category: 'milestone' as const, maxProgress: 100 },
    
    // 분석 관련 업적
    { id: 'win_rate_50', title: '승률 50%', description: '승률 50% 달성', icon: '🎪', category: 'analysis' as const, maxProgress: 50 },
    { id: 'win_rate_60', title: '고수의 길', description: '승률 60% 달성', icon: '🥋', category: 'analysis' as const, maxProgress: 60 },
    { id: 'pf_2', title: '손익비 마스터', description: 'Profit Factor 2.0 달성', icon: '⚖️', category: 'analysis' as const, maxProgress: 2 },
    { id: 'positive_expectancy', title: '기대값 플러스', description: 'Expectancy > 0 달성', icon: '📈', category: 'analysis' as const, maxProgress: 1 },
];

export function useAchievements(
    trades: Trade[],
    overallStats: OverallStats,
    insights: InsightData,
    dailyTradeDates: string[] // 매매일지를 작성한 날짜 목록
) {
    const achievements = useMemo<Achievement[]>(() => {
        const now = new Date().toISOString();
        
        // 연속 거래일 계산
        const uniqueDates = [...new Set(dailyTradeDates)].sort();
        let currentJournalStreak = 0;
        let maxJournalStreak = 0;
        let tempStreak = 0;
        
        for (let i = 0; i < uniqueDates.length; i++) {
            if (i === 0) {
                tempStreak = 1;
            } else {
                const prevDate = new Date(uniqueDates[i - 1]);
                const currDate = new Date(uniqueDates[i]);
                const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
                
                if (diffDays === 1) {
                    tempStreak++;
                } else {
                    maxJournalStreak = Math.max(maxJournalStreak, tempStreak);
                    tempStreak = 1;
                }
            }
        }
        maxJournalStreak = Math.max(maxJournalStreak, tempStreak);
        
        // 오늘을 포함한 현재 연속일 계산
        const today = new Date().toISOString().split('T')[0];
        const hasTradeToday = uniqueDates.includes(today);
        if (hasTradeToday || uniqueDates.length > 0) {
            currentJournalStreak = tempStreak;
        }
        
        // 전략 사용 카운트
        const strategyTrades = trades.filter(t => t.strategy_id || t.strategy_name).length;
        
        // 승률 계산
        const winRate = overallStats.winRate || 0;
        
        return ACHIEVEMENT_DEFINITIONS.map(def => {
            let progress = 0;
            let unlocked = false;
            
            switch (def.id) {
                // 수익 관련
                case 'first_profit':
                    progress = overallStats.totalPnL > 0 ? 1 : 0;
                    unlocked = progress >= def.maxProgress;
                    break;
                case 'profit_10k':
                    progress = Math.min(overallStats.totalPnL, def.maxProgress);
                    unlocked = overallStats.totalPnL >= def.maxProgress;
                    break;
                case 'profit_100k':
                    progress = Math.min(overallStats.totalPnL, def.maxProgress);
                    unlocked = overallStats.totalPnL >= def.maxProgress;
                    break;
                case 'profit_1m':
                    progress = Math.min(overallStats.totalPnL, def.maxProgress);
                    unlocked = overallStats.totalPnL >= def.maxProgress;
                    break;
                case 'big_win':
                    progress = Math.min(insights.maxWin, def.maxProgress);
                    unlocked = insights.maxWin >= def.maxProgress;
                    break;
                    
                // 연승 관련
                case 'streak_3':
                    progress = Math.min(insights.maxWinStreak, def.maxProgress);
                    unlocked = insights.maxWinStreak >= def.maxProgress;
                    break;
                case 'streak_5':
                    progress = Math.min(insights.maxWinStreak, def.maxProgress);
                    unlocked = insights.maxWinStreak >= def.maxProgress;
                    break;
                case 'streak_10':
                    progress = Math.min(insights.maxWinStreak, def.maxProgress);
                    unlocked = insights.maxWinStreak >= def.maxProgress;
                    break;
                    
                // 규율 관련
                case 'journal_7':
                    progress = Math.min(currentJournalStreak, def.maxProgress);
                    unlocked = currentJournalStreak >= def.maxProgress;
                    break;
                case 'journal_30':
                    progress = Math.min(currentJournalStreak, def.maxProgress);
                    unlocked = currentJournalStreak >= def.maxProgress;
                    break;
                case 'strategy_user':
                    progress = Math.min(strategyTrades, def.maxProgress);
                    unlocked = strategyTrades >= def.maxProgress;
                    break;
                    
                // 마일스톤
                case 'first_trade':
                    progress = trades.length > 0 ? 1 : 0;
                    unlocked = trades.length >= 1;
                    break;
                case 'trades_10':
                    progress = Math.min(overallStats.totalTrades, def.maxProgress);
                    unlocked = overallStats.totalTrades >= def.maxProgress;
                    break;
                case 'trades_50':
                    progress = Math.min(overallStats.totalTrades, def.maxProgress);
                    unlocked = overallStats.totalTrades >= def.maxProgress;
                    break;
                case 'trades_100':
                    progress = Math.min(overallStats.totalTrades, def.maxProgress);
                    unlocked = overallStats.totalTrades >= def.maxProgress;
                    break;
                    
                // 분석 관련
                case 'win_rate_50':
                    progress = Math.min(winRate, def.maxProgress);
                    unlocked = winRate >= def.maxProgress;
                    break;
                case 'win_rate_60':
                    progress = Math.min(winRate, def.maxProgress);
                    unlocked = winRate >= def.maxProgress;
                    break;
                case 'pf_2':
                    progress = Math.min(overallStats.profitFactor, def.maxProgress);
                    unlocked = overallStats.profitFactor >= def.maxProgress;
                    break;
                case 'positive_expectancy':
                    progress = overallStats.expectancy > 0 ? 1 : 0;
                    unlocked = overallStats.expectancy > 0;
                    break;
            }
            
            return {
                ...def,
                progress,
                unlocked,
                unlockedAt: unlocked ? now : undefined,
            };
        });
    }, [trades, overallStats, insights, dailyTradeDates]);
    
    // 통계
    const stats = useMemo(() => {
        const unlocked = achievements.filter(a => a.unlocked);
        return {
            total: achievements.length,
            unlocked: unlocked.length,
            locked: achievements.length - unlocked.length,
            progress: Math.round((unlocked.length / achievements.length) * 100),
            byCategory: {
                profit: unlocked.filter(a => a.category === 'profit').length,
                streak: unlocked.filter(a => a.category === 'streak').length,
                discipline: unlocked.filter(a => a.category === 'discipline').length,
                milestone: unlocked.filter(a => a.category === 'milestone').length,
                analysis: unlocked.filter(a => a.category === 'analysis').length,
            }
        };
    }, [achievements]);
    
    return { achievements, stats };
}

// 새로운 업적 확인 함수
export function checkNewAchievements(
    previousAchievements: Achievement[],
    currentAchievements: Achievement[]
): Achievement[] {
    return currentAchievements.filter((current, index) => {
        const previous = previousAchievements[index];
        return current.unlocked && !previous.unlocked;
    });
}
