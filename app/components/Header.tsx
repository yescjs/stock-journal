import React from 'react';
import { User } from '@supabase/supabase-js';
import { ActiveTab } from '@/app/types/ui';
import { Sun, Moon, LogOut, LogIn } from 'lucide-react';

interface HeaderProps {
    darkMode: boolean;
    setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
    currentUser: User | null;
    onLogout: () => void;
    onShowLogin: () => void;
    activeTab: ActiveTab;
    setActiveTab: React.Dispatch<React.SetStateAction<ActiveTab>>;
}

export function Header({
    darkMode,
    setDarkMode,
    currentUser,
    onLogout,
    onShowLogin,
    activeTab,
    setActiveTab,
}: HeaderProps) {
    const tabs: { id: ActiveTab; label: string; icon: string }[] = [
        { id: 'journal', label: '매매일지', icon: '📝' },
        { id: 'stats', label: '통계', icon: '📊' },
        { id: 'settings', label: '설정', icon: '⚙️' },
    ];

    return (
        <div className="sticky top-0 z-30 pb-4">
            <header
                className={
                    'rounded-2xl border backdrop-blur-xl px-5 py-4 transition-all duration-300 ' +
                    (darkMode
                        ? 'bg-slate-900/90 border-slate-800 shadow-lg shadow-slate-900/20'
                        : 'bg-white/90 border-slate-200 shadow-lg shadow-slate-200/50')
                }
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Brand & User Status */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {/* Logo Icon */}
                            <div className={
                                'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg ' +
                                'bg-gradient-to-br from-indigo-500 to-indigo-600'
                            }>
                                <span className="text-lg">📈</span>
                            </div>
                            <div>
                                <h1 className="text-lg md:text-xl font-extrabold tracking-tight flex items-center gap-1.5">
                                    <span className={darkMode ? 'text-indigo-400' : 'text-indigo-600'}>
                                        Stock
                                    </span>
                                    <span className={darkMode ? 'text-slate-100' : 'text-slate-900'}>
                                        Journal
                                    </span>
                                </h1>
                                <p className="text-[10px] md:text-xs font-medium mt-0.5">
                                    {currentUser ? (
                                        <span className="flex items-center gap-1.5 text-emerald-500">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            {currentUser.email?.split('@')[0]}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-amber-500">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                            게스트 모드
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Mobile: Controls */}
                        <div className="flex md:hidden items-center gap-2">
                            <button
                                onClick={() => setDarkMode(!darkMode)}
                                className={
                                    'p-2.5 rounded-xl transition-all duration-200 btn-press ' +
                                    (darkMode
                                        ? 'bg-slate-800 hover:bg-slate-700 text-yellow-400'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600')
                                }
                            >
                                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                            </button>
                            {currentUser ? (
                                <button
                                    onClick={onLogout}
                                    className={
                                        'p-2.5 rounded-xl transition-all duration-200 btn-press ' +
                                        (darkMode
                                            ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                                            : 'text-slate-500 hover:text-rose-500 hover:bg-rose-50')
                                    }
                                >
                                    <LogOut size={18} />
                                </button>
                            ) : (
                                <button
                                    onClick={onShowLogin}
                                    className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-500/25 btn-press"
                                >
                                    로그인
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <nav className="flex items-center justify-center">
                        <div
                            className={
                                'flex p-1.5 rounded-2xl w-full md:w-auto gap-1 ' +
                                (darkMode ? 'bg-slate-800/60' : 'bg-slate-100/80')
                            }
                        >
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={
                                            'flex-1 md:flex-none flex items-center justify-center gap-2 px-5 md:px-6 py-2.5 text-xs md:text-sm font-bold rounded-xl transition-all duration-200 btn-press ' +
                                            (isActive
                                                ? darkMode
                                                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                                    : 'bg-white text-indigo-600 shadow-md'
                                                : darkMode
                                                    ? 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/50')
                                        }
                                    >
                                        <span className="text-sm">{tab.icon}</span>
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </nav>

                    {/* Desktop: Controls */}
                    <div className="hidden md:flex items-center gap-3">
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className={
                                'p-2.5 rounded-xl border transition-all duration-200 btn-press ' +
                                (darkMode
                                    ? 'border-slate-700 bg-slate-800 text-yellow-400 hover:bg-slate-700 hover:border-slate-600'
                                    : 'border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:bg-slate-50 hover:border-indigo-200')
                            }
                            title="Toggle Dark Mode"
                        >
                            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        {currentUser ? (
                            <button
                                onClick={onLogout}
                                className={
                                    'flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl border transition-all duration-200 btn-press ' +
                                    (darkMode
                                        ? 'border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-900/30 hover:bg-rose-500/10'
                                        : 'border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200')
                                }
                            >
                                <LogOut size={14} />
                                로그아웃
                            </button>
                        ) : (
                            <button
                                onClick={onShowLogin}
                                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-500/25 btn-press"
                            >
                                <LogIn size={14} />
                                로그인
                            </button>
                        )}
                    </div>
                </div>
            </header>
        </div>
    );
}
