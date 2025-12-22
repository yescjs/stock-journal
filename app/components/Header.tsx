import React from 'react';
import { User } from '@supabase/supabase-js';
import { ActiveTab } from '@/app/types/ui';
import { Sun, Moon, LogOut, LogIn, TrendingUp } from 'lucide-react';

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
        { id: 'diary', label: '시장복기', icon: '📖' },
        { id: 'stats', label: '통계', icon: '📊' },
        { id: 'settings', label: '설정', icon: '⚙️' },
    ];

    return (
        <div className="sticky top-4 z-40 mb-6">
            <header className={`rounded-2xl glass-panel px-6 py-4 transition-all duration-300 ${darkMode ? 'bg-slate-900/80 border-slate-700/50' : 'bg-white/80 border-white/50'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* Brand & Identity */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 group cursor-default">
                            {/* Logo Icon with Gradient & Glow */}
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
                                <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 transform group-hover:scale-105 transition-transform duration-300">
                                    <TrendingUp size={24} strokeWidth={2.5} />
                                </div>
                            </div>
                            
                            <div>
                                <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-1.5 font-sans">
                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-indigo-600 dark:from-indigo-400 dark:to-indigo-300">
                                        Stock
                                    </span>
                                    <span className={darkMode ? 'text-slate-100' : 'text-slate-900'}>
                                        Journal
                                    </span>
                                </h1>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-0.5">
                                    {currentUser ? (
                                        <>
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
                                            PRO TRADER
                                        </>
                                    ) : (
                                        <>
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
                                            GUEST MODE
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Mobile Controls */}
                        <div className="flex md:hidden items-center gap-2">
                             <button
                                onClick={() => setDarkMode(!darkMode)}
                                className={`p-2.5 rounded-xl transition-all active:scale-95 ${
                                    darkMode ? 'bg-slate-800 text-yellow-400' : 'bg-slate-100 text-slate-600'
                                }`}
                            >
                                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Navigation Tabs - Floating Island Style */}
                    <nav className="flex-1 max-w-lg mx-auto md:mx-0">
                        <div className={`flex p-1.5 rounded-2xl w-full gap-1 shadow-inner ${darkMode ? 'bg-slate-950/50' : 'bg-slate-100/80'}`}>
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`
                                            relative flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs md:text-sm font-bold rounded-xl transition-all duration-300
                                            ${isActive 
                                                ? (darkMode 
                                                    ? 'bg-slate-800 text-white shadow-lg shadow-black/20 ring-1 ring-white/10' 
                                                    : 'bg-white text-indigo-600 shadow-md ring-1 ring-black/5') 
                                                : (darkMode
                                                    ? 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                                    : 'text-slate-500 hover:text-slate-800 hover:bg-black/5')}
                                        `}
                                    >
                                        <span className={`text-base transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100 grayscale opacity-70'}`}>{tab.icon}</span>
                                        <span className="hidden sm:inline">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </nav>

                    {/* Right Action Area */}
                    <div className="hidden md:flex items-center gap-3">
                        <div className={`h-8 w-px mx-2 ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                        
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className={`
                                p-3 rounded-2xl border transition-all duration-200 active:scale-95
                                ${darkMode
                                    ? 'border-slate-800 bg-slate-900/50 text-yellow-400 hover:bg-slate-800 hover:border-slate-700'
                                    : 'border-slate-200 bg-white/50 text-slate-500 hover:text-indigo-600 hover:bg-white hover:border-slate-300 shadow-sm'}
                            `}
                        >
                            {darkMode ? <Sun size={18} strokeWidth={2.5} /> : <Moon size={18} strokeWidth={2.5} />}
                        </button>

                        {currentUser ? (
                            <button
                                onClick={onLogout}
                                className={`
                                    group flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-2xl border transition-all duration-200 active:scale-95
                                    ${darkMode
                                        ? 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-rose-400 hover:border-rose-900/50 hover:bg-rose-900/10'
                                        : 'border-slate-200 bg-white/50 text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 shadow-sm'}
                                `}
                            >
                                <LogOut size={16} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform" />
                                <span>로그아웃</span>
                            </button>
                        ) : (
                            <button
                                onClick={onShowLogin}
                                className="flex items-center gap-2 px-6 py-3 text-xs font-bold bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-2xl hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all active:scale-95 active:translate-y-0"
                            >
                                <LogIn size={16} strokeWidth={2.5} />
                                <span>로그인</span>
                            </button>
                        )}
                    </div>
                </div>
            </header>
        </div>
    );
}
