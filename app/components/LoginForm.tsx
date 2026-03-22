'use client';

import React, { useState, FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { supabase } from '@/app/lib/supabaseClient';
import { Mail, Lock, ArrowRight, KeyRound, UserPlus, LogIn, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface LoginFormProps {
    onDone?: () => void;
}

export function LoginForm({ onDone }: LoginFormProps) {
    const locale = useLocale();
    const t = useTranslations('auth');
    const tc = useTranslations('common');
    type Mode = 'login' | 'signup' | 'resetPassword';

    const [mode, setMode] = useState<Mode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [sending, setSending] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [msgType, setMsgType] = useState<'error' | 'success' | null>(null);

    const resetMsg = () => {
        setMsg(null);
        setMsgType(null);
    };

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        resetMsg();
    };

    const [successState, setSuccessState] = useState(false);

    // Social Login Handler
    const handleSocialLogin = () => {
        setSending(true);
        resetMsg();
        window.location.href = '/api/auth/google/login';
    };


    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        resetMsg();

        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();
        const trimmedConfirm = confirmPassword.trim();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
            setMsgType('error');
            setMsg(t('invalidEmail'));
            return;
        }

        if (mode !== 'resetPassword') {
            if (!trimmedPassword || trimmedPassword.length < 6) {
                setMsgType('error');
                setMsg(t('passwordMinLength'));
                return;
            }

            if (mode === 'signup' && trimmedPassword !== trimmedConfirm) {
                setMsgType('error');
                setMsg(t('passwordMismatch'));
                return;
            }
        }

        try {
            setSending(true);

            if (mode === 'login') {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: trimmedEmail,
                    password: trimmedPassword,
                });

                if (error) {
                    setMsgType('error');
                    if (error.message.toLowerCase().includes('invalid login credentials')) {
                        setMsg(t('invalidCredentials'));
                    } else {
                        setMsg(t('loginFailed', { message: error.message }));
                    }
                    return;
                }

                if (data.user) {
                    // Check Soft Delete
                    if (data.user.user_metadata?.deleted_account) {
                        await supabase.auth.signOut();
                        setMsgType('error');
                        setMsg(t('deletedAccount'));
                        return;
                    }
                    setMsgType('success');
                    setMsg(t('loginSuccess'));
                    setTimeout(() => {
                        onDone?.();
                    }, 800);
                }
            } else if (mode === 'signup') {
                const { data, error } = await supabase.auth.signUp({
                    email: trimmedEmail,
                    password: trimmedPassword,
                });

                if (error) {
                    setMsgType('error');
                    setMsg(t('signupFailed', { message: error.message }));
                    return;
                }

                if (data.user) {
                    setSuccessState(true);
                    setMsgType('success');
                    setMsg(t('verificationEmailSent'));
                }
            } else if (mode === 'resetPassword') {
                const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
                    redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/${locale}/reset-password` : undefined,
                });

                if (error) {
                    setMsgType('error');
                    setMsg(t('errorGeneric', { message: error.message }));
                    return;
                }

                setSuccessState(true);
                setMsgType('success');
                setMsg(t('resetEmailSent'));
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : tc('unknownError');
            setMsgType('error');
            setMsg(t('errorOccurred', { message: errorMessage }));
        } finally {
            setSending(false);
        }
    };

    // Dark-mode-only input styling
    const inputClass = `w-full pl-11 pr-4 py-3.5 text-sm font-medium rounded-xl outline-none transition-all
        bg-[#1C1C24] text-white placeholder-slate-500 border border-[#2C2C34] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`;

    const iconClass = `absolute left-4 top-1/2 -translate-y-1/2 text-slate-500`;

    if (successState) {
        return (
            <div className="w-full max-w-sm mx-auto animate-scale-in text-center pt-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center bg-emerald-500/20">
                    <Mail size={40} className="text-emerald-400" />
                </div>
                <h3 className="text-2xl font-black mb-3 text-white">
                    {t('checkMailTitle')}
                </h3>
                <p className="text-sm mb-8 leading-relaxed text-slate-400">
                    <span className="font-bold text-indigo-500">{t('checkMailDesc1', { email })}</span><br />
                    {t('checkMailDesc2')}<br />
                    {t('checkMailDesc3')}
                </p>
                <div className="space-y-3">
                    <button
                        onClick={() => { setSuccessState(false); setMode('login'); resetForm(); }}
                        className="w-full py-3.5 rounded-xl text-sm font-bold transition-all bg-[#1C1C24] text-white hover:bg-[#2C2C34]"
                    >
                        {t('backToLoginButton')}
                    </button>
                    <p className="text-xs text-slate-500">
                        {t('checkSpam')}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-sm mx-auto animate-scale-in">
            {/* Tab Switcher */}
            {mode !== 'resetPassword' && (
                <div className="p-1.5 rounded-2xl mb-8 bg-[#1C1C24]">
                    <div className="grid grid-cols-2 gap-1">
                        <button
                            type="button"
                            onClick={() => { setMode('login'); resetForm(); }}
                            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${mode === 'login'
                                ? 'bg-[#2C2C34] text-white shadow-lg'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            <LogIn size={16} />
                            {t('loginTab')}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMode('signup'); resetForm(); }}
                            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${mode === 'signup'
                                ? 'bg-[#2C2C34] text-white shadow-lg'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            <UserPlus size={16} />
                            {t('signupTab')}
                        </button>
                    </div>
                </div>
            )}

            {mode === 'resetPassword' && (
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-[#1C1C24]">
                        <KeyRound size={28} className="text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white">
                        {t('resetPasswordTitle')}
                    </h3>
                    <p className="text-sm mt-2 text-slate-400">
                        {t('resetPasswordDesc')}
                    </p>
                </div>
            )}

            {/* Social Login Buttons - Only show in login/signup mode */}
            {mode !== 'resetPassword' && (
                <div className="mb-6 space-y-3">
                    {/* Google Login */}
                    <button
                        type="button"
                        onClick={() => handleSocialLogin()}
                        disabled={sending}
                        className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-3 ${sending
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:scale-[1.02] active:scale-[0.98]'
                            } bg-white text-slate-900 hover:bg-slate-50 shadow-lg`}
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        {t('continueWithGoogle')}
                    </button>

                    {/* Divider */}
                    <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center opacity-50">
                            <div className="w-full border-t border-slate-700"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="px-4 bg-card text-slate-500">
                                {mode === 'login' ? t('orEmailLogin') : t('orEmailSignup')}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div className="relative">
                    <label htmlFor="email" className="sr-only">{t('emailLabel')}</label>
                    <Mail size={18} className={iconClass} aria-hidden="true" />
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('emailPlaceholder')}
                        className={inputClass}
                        autoComplete="email"
                        required
                    />
                </div>

                {/* Password */}
                {mode !== 'resetPassword' && (
                    <div className="relative">
                        <label htmlFor="password" className="sr-only">{t('passwordLabel')}</label>
                        <Lock size={18} className={iconClass} aria-hidden="true" />
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('passwordPlaceholder')}
                            className={inputClass}
                            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                            minLength={6}
                            required
                        />
                    </div>
                )}

                {/* Confirm Password */}
                {mode === 'signup' && (
                    <div className="relative">
                        <label htmlFor="confirmPassword" className="sr-only">{t('confirmPasswordLabel')}</label>
                        <Lock size={18} className={iconClass} aria-hidden="true" />
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t('confirmPasswordPlaceholder')}
                            className={inputClass}
                            autoComplete="new-password"
                            minLength={6}
                            required
                        />
                    </div>
                )}

                {/* Message */}
                {msg && !successState && (
                    <div className={`p-4 rounded-xl text-sm font-medium flex items-start gap-3 animate-scale-in ${msgType === 'error'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                        <span className="flex-shrink-0">{msgType === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}</span>
                        <p className="flex-1 leading-relaxed">{msg}</p>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={sending}
                    className={`w-full py-4 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 ${sending
                        ? 'bg-slate-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/25 hover:shadow-blue-500/35 active:scale-[0.98]'
                        }`}
                >
                    {sending ? (
                        <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {tc('processing')}
                        </span>
                    ) : (
                        <>
                            {mode === 'login' && t('loginButton')}
                            {mode === 'signup' && t('signupButton')}
                            {mode === 'resetPassword' && t('resetButton')}
                            <ArrowRight size={16} />
                        </>
                    )}
                </button>

                {/* Forgot Password Link */}
                {mode === 'login' && (
                    <button
                        type="button"
                        onClick={() => { setMode('resetPassword'); resetMsg(); }}
                        className="w-full text-center text-sm font-medium py-2 transition-colors text-slate-400 hover:text-white"
                    >
                        {t('forgotPassword')}
                    </button>
                )}

                {/* Back to Login */}
                {mode === 'resetPassword' && (
                    <button
                        type="button"
                        onClick={() => { setMode('login'); resetForm(); }}
                        className="w-full text-center text-sm font-medium py-2 transition-colors text-slate-400 hover:text-white"
                    >
                        {t('backToLogin')}
                    </button>
                )}
            </form>
        </div>
    );
}
