import React from 'react';
import { User } from '@supabase/supabase-js';
import { ActiveTab } from '@/app/types/ui';
import { Sun, Moon, LogOut, LogIn, TrendingUp, BookOpen } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';

interface HeaderProps {
    darkMode: boolean;
    setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
    currentUser: User | null;
    onLogout: () => void;
    onShowLogin: () => void;
    activeTab: ActiveTab;
    setActiveTab: React.Dispatch<React.SetStateAction<ActiveTab>>;
    onShowGuide: () => void;
}

export function Header({
    darkMode,
    setDarkMode,
    currentUser,
    onLogout,
    onShowLogin,
    activeTab,
    setActiveTab,
    onShowGuide,
}: HeaderProps) {
    const tabs: { id: ActiveTab; label: string; icon: string }[] = [
        { id: 'journal', label: '매매일지', icon: '📝' },
        { id: 'diary', label: '시장복기', icon: '📖' },
        { id: 'reports', label: 'AI 일보', icon: '📰' },
        { id: 'stats', label: '통계', icon: '📊' },
        { id: 'settings', label: '설정', icon: '⚙️' },
    ];

    return (
        <div className="z-40">
            <header className="transition-all duration-300 py-4 text-foreground">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 group cursor-default">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 blur-xl opacity-30 group-hover:opacity-50 transition-opacity rounded-full"></div>
                                <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center text-primary-foreground shadow-toss bg-primary transform group-hover:scale-105 transition-transform duration-200">
                                    <TrendingUp size={24} strokeWidth={2} />
                                </div>
                            </div>

                            <div>
                                <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-1.5">
                                    <span className="text-primary">Stock</span>
                                    <span className="text-foreground">Journal</span>
                                </h1>
                                <p className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 mt-0.5">
                                    {currentUser ? (
                                        <>
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                            <span className="text-muted-foreground">프로 트레이더</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                            <span className="text-amber-600 dark:text-amber-500">게스트 모드</span>
                                            <span className="text-muted-foreground">•</span>
                                            <span className="text-muted-foreground text-xs normal-case">로그인하여 데이터 보관하세요</span>
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="flex md:hidden items-center gap-2">
                            {currentUser ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onLogout}
                                    title="로그아웃"
                                    className="text-destructive hover:bg-destructive/10"
                                >
                                    <LogOut size={18} />
                                </Button>
                            ) : (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={onShowLogin}
                                    title="로그인"
                                    aria-label="로그인"
                                >
                                    <LogIn size={18} />
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDarkMode(!darkMode)}
                            >
                                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                            </Button>
                        </div>
                    </div>

                    <nav className="flex-1 max-w-lg mx-auto md:mx-0">
                        <div className={`flex p-1.5 rounded-2xl w-full gap-1 ${darkMode ? 'bg-muted/30' : 'bg-muted/50'}`}>
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <Button
                                        key={tab.id}
                                        variant={isActive ? 'secondary' : 'ghost'}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex-1 gap-2 text-xs md:text-sm font-semibold ${isActive ? 'shadow-toss-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                        size="sm"
                                    >
                                        <span className={`text-sm md:text-base transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100 opacity-60'}`} aria-hidden="true">{tab.icon}</span>
                                        <span className="hidden leading-none sm:inline">{tab.label}</span>
                                    </Button>
                                );
                            })}
                        </div>
                    </nav>

                    <div className="hidden md:flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDarkMode(!darkMode)}
                        >
                            {darkMode ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onShowGuide}
                            title="이용 가이드"
                            aria-label="이용 가이드"
                        >
                            <BookOpen size={18} strokeWidth={2} />
                        </Button>

                        <div className="h-6 w-px bg-border mx-1"></div>

                        {currentUser ? (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={onLogout}
                                className="gap-2 hover:text-destructive hover:bg-destructive/10"
                            >
                                <LogOut size={16} strokeWidth={2} />
                                <span>로그아웃</span>
                            </Button>
                        ) : (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={onShowLogin}
                                className="gap-2"
                            >
                                <LogIn size={16} strokeWidth={2} />
                                <span>로그인</span>
                            </Button>
                        )}
                    </div>
                </div>
            </header>
        </div>
    );
}
