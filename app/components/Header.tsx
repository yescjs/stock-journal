import React from 'react';
import { User } from '@supabase/supabase-js';
import { ActiveTab } from '@/app/types/ui';

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
    const tabs: { id: ActiveTab; label: string }[] = [
        { id: 'journal', label: '매매일지' },
        { id: 'stats', label: '통계' },
        { id: 'settings', label: '설정' },
    ];

    return (
        <div className="sticky top-0 z-30 pb-4">
            <header
                className={
                    'rounded-2xl border shadow-sm backdrop-blur-md px-4 py-3 transition-colors ' +
                    (darkMode
                        ? 'bg-slate-900/80 border-slate-800 shadow-slate-900/20'
                        : 'bg-white/80 border-slate-200 shadow-slate-200/50')
                }
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Brand & User Status */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg md:text-xl font-extrabold tracking-tight flex items-center gap-2">
                                <span className={darkMode ? 'text-blue-400' : 'text-blue-600'}>
                                    Stock
                                </span>
                                <span className={darkMode ? 'text-slate-100' : 'text-slate-900'}>
                                    Journal
                                </span>
                            </h1>
                            <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-0.5">
                                {currentUser ? (
                                    <span className="text-emerald-500">
                                        ● {currentUser.email?.split('@')[0]}
                                    </span>
                                ) : (
                                    <span className="text-amber-500">● 게스트 모드</span>
                                )}
                            </p>
                        </div>

                        {/* Mobile: Controls (Theme + Auth) */}
                        <div className="flex md:hidden items-center gap-2">
                            <button
                                onClick={() => setDarkMode(!darkMode)}
                                className={
                                    'p-2 rounded-full transition-colors ' +
                                    (darkMode
                                        ? 'hover:bg-slate-800 text-yellow-400'
                                        : 'hover:bg-slate-100 text-slate-600')
                                }
                            >
                                {darkMode ? '☀️' : '🌙'}
                            </button>
                            {currentUser ? (
                                <button
                                    onClick={onLogout}
                                    className="text-xs font-medium text-slate-500 hover:text-rose-500 transition-colors"
                                >
                                    로그아웃
                                </button>
                            ) : (
                                <button
                                    onClick={onShowLogin}
                                    className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm shadow-blue-500/20"
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
                                'flex p-1 rounded-xl w-full md:w-auto ' +
                                (darkMode ? 'bg-slate-800/50' : 'bg-slate-100/50')
                            }
                        >
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={
                                            'flex-1 md:flex-none px-4 md:px-6 py-1.5 text-xs md:text-sm font-semibold rounded-lg transition-all ' +
                                            (isActive
                                                ? darkMode
                                                    ? 'bg-slate-700 text-white shadow-sm'
                                                    : 'bg-white text-slate-900 shadow-sm'
                                                : darkMode
                                                    ? 'text-slate-400 hover:text-slate-200'
                                                    : 'text-slate-500 hover:text-slate-900')
                                        }
                                    >
                                        {tab.label}
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
                                'p-2 rounded-lg border transition-colors ' +
                                (darkMode
                                    ? 'border-slate-700 bg-slate-800 text-yellow-400 hover:bg-slate-700'
                                    : 'border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50')
                            }
                            title="Toggle Dark Mode"
                        >
                            {darkMode ? '☀️' : '🌙'}
                        </button>

                        {currentUser ? (
                            <button
                                onClick={onLogout}
                                className={
                                    'px-4 py-2 text-xs font-semibold rounded-lg border transition-colors ' +
                                    (darkMode
                                        ? 'border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-900/30'
                                        : 'border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50')
                                }
                            >
                                로그아웃
                            </button>
                        ) : (
                            <button
                                onClick={onShowLogin}
                                className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-500/20"
                            >
                                로그인
                            </button>
                        )}
                    </div>
                </div>
            </header>
        </div>
    );
}
