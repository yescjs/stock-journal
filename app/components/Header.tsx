import React from 'react';
import { User } from '@supabase/supabase-js';
import { ActiveTab } from '@/app/types/ui';
import { Sun, Moon, LogOut, LogIn, TrendingUp, BookOpen, FileText, BarChart3, Settings } from 'lucide-react';

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
    return (
        <div className="z-40">
            <header className="transition-all duration-300 py-3 text-foreground">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 group cursor-default">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 blur-xl opacity-30 group-hover:opacity-50 transition-opacity rounded-full"></div>
                            <div className="relative w-10 h-10 rounded-xl flex items-center justify-center text-primary-foreground shadow-toss bg-primary transform group-hover:scale-105 transition-transform duration-200">
                                <TrendingUp size={20} strokeWidth={2.5} />
                            </div>
                        </div>

                        <div>
                            <h1 className="text-lg font-bold tracking-tight">
                                <span className="text-primary">Stock</span>Journal
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDarkMode(!darkMode)}
                            className="w-10 h-10 p-0 rounded-xl"
                        >
                            {darkMode ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onShowGuide}
                            title="이용 가이드"
                            aria-label="이용 가이드"
                            className="w-10 h-10 p-0 rounded-xl"
                        >
                            <BookOpen size={18} strokeWidth={2} />
                        </Button>

                        {currentUser ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onLogout}
                                className="w-10 h-10 p-0 rounded-xl text-destructive hover:bg-destructive/10"
                            >
                                <LogOut size={18} strokeWidth={2} />
                            </Button>
                        ) : (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={onShowLogin}
                                className="h-9 px-4 rounded-xl text-xs font-bold"
                            >
                                로그인
                            </Button>
                        )}
                    </div>
                </div>
            </header>
        </div>
    );
}
