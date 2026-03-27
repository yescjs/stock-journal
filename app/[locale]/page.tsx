'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { gtagEvent } from '@/app/lib/gtag';

// Hooks
import { useSupabaseAuth } from '@/app/hooks/useSupabaseAuth';

// Components
import { LoginForm } from '@/app/components/LoginForm';
import { LandingPage } from '@/app/components/LandingPage';

// Icons
import { BarChart3 } from 'lucide-react';

export default function Home() {
    const router = useRouter();
    const { user: currentUser, loading: authLoading } = useSupabaseAuth();
    const tc = useTranslations('common');
    const ta = useTranslations('auth');

    const [showLoginModal, setShowLoginModal] = useState(false);

    // If user is already logged in, redirect to /trade
    useEffect(() => {
        if (!authLoading && currentUser) {
            router.replace('/trade');
        }
    }, [currentUser, authLoading, router]);

    // --- Loading ---
    if (authLoading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#070a12]">
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl opacity-30 rounded-full animate-pulse"></div>
                <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center bg-primary shadow-toss-md">
                    <BarChart3 size={24} className="text-primary-foreground animate-pulse" />
                </div>
            </div>
            <p className="mt-4 text-white/40 text-sm font-medium">{tc('loading')}</p>
        </div>
    );

    // If logged in, show loading while redirecting
    if (currentUser) return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#070a12]">
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl opacity-30 rounded-full animate-pulse"></div>
                <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center bg-primary shadow-toss-md">
                    <BarChart3 size={24} className="text-primary-foreground animate-pulse" />
                </div>
            </div>
            <p className="mt-4 text-white/40 text-sm font-medium">{tc('redirecting')}</p>
        </div>
    );

    // --- Landing Page (not logged in) ---
    return (
        <>
            <LandingPage
                onStart={() => setShowLoginModal(true)}
                onStartAsGuest={() => {
                    gtagEvent('guest_start');
                    router.replace('/trade');
                }}
                darkMode={true}
            />
            {showLoginModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={(e) => e.target === e.currentTarget && setShowLoginModal(false)}
                >
                    <div className="relative w-full max-w-md rounded-3xl p-6 shadow-toss-lg bg-[#1C1C24] border border-white/10">
                        <button
                            onClick={() => setShowLoginModal(false)}
                            aria-label={tc('close')}
                            className="absolute right-4 top-4 p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            ✕
                        </button>
                        <div className="mb-6 text-center">
                            <h2 className="text-2xl font-bold text-white">{ta('loginModalTitle')}</h2>
                            <p className="text-sm mt-1 text-white/40">{ta('loginModalDesc')}</p>
                        </div>
                        <LoginForm onDone={() => setShowLoginModal(false)} />
                        <div className="mt-4 text-center">
                            <button
                                onClick={() => { setShowLoginModal(false); router.replace('/trade'); }}
                                className="text-sm font-medium text-white/40 hover:text-white transition-colors"
                            >
                                {ta('guestStartFromModal')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}