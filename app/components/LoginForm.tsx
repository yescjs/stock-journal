'use client';

import React, { useState, FormEvent } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import { Mail, Lock, ArrowRight, KeyRound, UserPlus, LogIn } from 'lucide-react';

interface LoginFormProps {
    onDone?: () => void;
    darkMode?: boolean;
}

export function LoginForm({ onDone, darkMode = false }: LoginFormProps) {
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
    const handleSocialLogin = async (provider: 'google') => {
        try {
            setSending(true);
            resetMsg();

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
                }
            });

            if (error) throw error;

            // OAuth will redirect, so no further action needed here
        } catch (error: any) {
            setMsgType('error');
            setMsg(`Google 로그인 실패: ${error.message}`);
            setSending(false);
        }
    };

    // Naver Login Handler
    const handleNaverLogin = () => {
        setSending(true);
        resetMsg();
        // 네이버 로그인 API 라우트로 리다이렉트
        window.location.href = '/api/auth/naver/login';
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
            setMsg('유효한 이메일 주소를 입력해주세요.');
            return;
        }

        if (mode !== 'resetPassword') {
            if (!trimmedPassword || trimmedPassword.length < 6) {
                setMsgType('error');
                setMsg('비밀번호는 6자 이상이어야 합니다.');
                return;
            }

            if (mode === 'signup' && trimmedPassword !== trimmedConfirm) {
                setMsgType('error');
                setMsg('비밀번호가 일치하지 않습니다.');
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
                        setMsg('이메일 또는 비밀번호가 올바르지 않습니다.');
                    } else {
                        setMsg(`로그인 실패: ${error.message}`);
                    }
                    return;
                }

                if (data.user) {
                    // Check Soft Delete
                    if (data.user.user_metadata?.deleted_account) {
                        await supabase.auth.signOut();
                        setMsgType('error');
                        setMsg('탈퇴한 계정입니다. 입장이 불가능합니다.');
                        return;
                    }
                    setMsgType('success');
                    setMsg('로그인 성공!');
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
                    setMsg(`회원가입 실패: ${error.message}`);
                    return;
                }

                if (data.user) {
                    setSuccessState(true);
                    setMsgType('success');
                    setMsg('인증 메일이 발송되었습니다.');
                }
            } else if (mode === 'resetPassword') {
                const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
                    redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
                });

                if (error) {
                    setMsgType('error');
                    setMsg(`오류: ${error.message}`);
                    return;
                }

                setSuccessState(true);
                setMsgType('success');
                setMsg('비밀번호 재설정 이메일을 발송했습니다.');
            }
        } catch (err: any) {
            setMsgType('error');
            setMsg(`오류가 발생했습니다: ${err.message || '알 수 없는 오류'}`);
        } finally {
            setSending(false);
        }
    };

    const inputClass = `w-full pl-11 pr-4 py-3.5 text-sm font-medium rounded-xl outline-none transition-all ${darkMode
        ? 'bg-slate-800/80 text-white placeholder-slate-500 border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
        : 'bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
        }`;

    const iconClass = `absolute left-4 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-slate-400'
        }`;

    if (successState) {
        return (
            <div className="w-full max-w-sm mx-auto animate-scale-in text-center pt-8">
                <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${darkMode ? 'bg-emerald-500/20' : 'bg-emerald-50'}`}>
                    <Mail size={40} className={darkMode ? 'text-emerald-400' : 'text-emerald-600'} />
                </div>
                <h3 className={`text-2xl font-black mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    메일함을 확인해주세요
                </h3>
                <p className={`text-sm mb-8 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span className="font-bold text-indigo-500">{email}</span> 주소로<br />
                    인증 메일을 발송했습니다.<br />
                    메일의 링크를 클릭하여 인증을 완료해주세요.
                </p>
                <div className="space-y-3">
                    <button
                        onClick={() => { setSuccessState(false); setMode('login'); resetForm(); }}
                        className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all ${darkMode
                            ? 'bg-slate-800 text-white hover:bg-slate-700'
                            : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
                    >
                        로그인으로 돌아가기
                    </button>
                    <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        메일이 오지 않았나요? 스팸함도 확인해주세요.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-sm mx-auto animate-scale-in">
            {/* Tab Switcher */}
            {mode !== 'resetPassword' && (
                <div className={`p-1.5 rounded-2xl mb-8 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <div className="grid grid-cols-2 gap-1">
                        <button
                            type="button"
                            onClick={() => { setMode('login'); resetForm(); }}
                            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${mode === 'login'
                                ? darkMode
                                    ? 'bg-slate-700 text-white shadow-lg'
                                    : 'bg-white text-slate-900 shadow-md'
                                : darkMode
                                    ? 'text-slate-400 hover:text-white'
                                    : 'text-slate-500 hover:text-slate-900'
                                }`}
                        >
                            <LogIn size={16} />
                            로그인
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMode('signup'); resetForm(); }}
                            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${mode === 'signup'
                                ? darkMode
                                    ? 'bg-slate-700 text-white shadow-lg'
                                    : 'bg-white text-slate-900 shadow-md'
                                : darkMode
                                    ? 'text-slate-400 hover:text-white'
                                    : 'text-slate-500 hover:text-slate-900'
                                }`}
                        >
                            <UserPlus size={16} />
                            회원가입
                        </button>
                    </div>
                </div>
            )}

            {mode === 'resetPassword' && (
                <div className="text-center mb-8">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-100'
                        }`}>
                        <KeyRound size={28} className={darkMode ? 'text-blue-400' : 'text-blue-600'} />
                    </div>
                    <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        비밀번호 재설정
                    </h3>
                    <p className={`text-sm mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        가입한 이메일로 재설정 링크를 보내드립니다.
                    </p>
                </div>
            )}

            {/* Social Login Buttons - Only show in login/signup mode */}
            {mode !== 'resetPassword' && (
                <div className="mb-6 space-y-3">
                    {/* Google Login */}
                    <button
                        type="button"
                        onClick={() => handleSocialLogin('google')}
                        disabled={sending}
                        className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-3 ${sending
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:scale-[1.02] active:scale-[0.98]'
                            } ${darkMode
                                ? 'bg-white text-slate-900 hover:bg-slate-50 shadow-lg'
                                : 'bg-white text-slate-900 hover:bg-slate-50 border-2 border-slate-200 shadow-md'
                            }`}
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Google로 계속하기
                    </button>

                    {/* Naver Login */}
                    <button
                        type="button"
                        onClick={handleNaverLogin}
                        disabled={sending}
                        className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-3 ${sending
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:scale-[1.02] active:scale-[0.98]'
                            } bg-[#03C75A] text-white hover:bg-[#02B350] shadow-md`}
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.477 2 2 5.582 2 10c0 2.895 1.959 5.455 4.888 7.047l-1.726 6.343c-.117.432.277.794.688.632L12 20.8c.337.013.677.02 1.019.02 5.523 0 9.981-3.582 9.981-8S18.542 2 12 2z" />
                        </svg>
                        네이버로 계속하기
                    </button>


                    {/* Divider */}
                    <div className="relative py-4">
                        <div className={`absolute inset-0 flex items-center ${darkMode ? 'opacity-50' : ''}`}>
                            <div className={`w-full border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className={`px-4 ${darkMode ? 'bg-slate-900 text-slate-500' : 'bg-white text-slate-400'}`}>
                                또는 이메일로 {mode === 'login' ? '로그인' : '가입'}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div className="relative">
                    <label htmlFor="email" className="sr-only">이메일 주소</label>
                    <Mail size={18} className={iconClass} aria-hidden="true" />
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="이메일 주소"
                        className={inputClass}
                        autoComplete="email"
                        required
                    />
                </div>

                {/* Password */}
                {mode !== 'resetPassword' && (
                    <div className="relative">
                        <label htmlFor="password" className="sr-only">비밀번호</label>
                        <Lock size={18} className={iconClass} aria-hidden="true" />
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="비밀번호 (6자 이상)"
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
                        <label htmlFor="confirmPassword" className="sr-only">비밀번호 확인</label>
                        <Lock size={18} className={iconClass} aria-hidden="true" />
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="비밀번호 확인"
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
                        ? darkMode
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-rose-50 text-rose-600 border border-rose-100'
                        : darkMode
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}>
                        <span className="text-lg">{msgType === 'error' ? '⚠️' : '✅'}</span>
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
                            처리 중...
                        </span>
                    ) : (
                        <>
                            {mode === 'login' && '로그인'}
                            {mode === 'signup' && '인증 메일 받기'}
                            {mode === 'resetPassword' && '재설정 이메일 보내기'}
                            <ArrowRight size={16} />
                        </>
                    )}
                </button>

                {/* Forgot Password Link */}
                {mode === 'login' && (
                    <button
                        type="button"
                        onClick={() => { setMode('resetPassword'); resetMsg(); }}
                        className={`w-full text-center text-sm font-medium py-2 transition-colors ${darkMode
                            ? 'text-slate-400 hover:text-white'
                            : 'text-slate-500 hover:text-slate-900'
                            }`}
                    >
                        비밀번호를 잊으셨나요?
                    </button>
                )}

                {/* Back to Login */}
                {mode === 'resetPassword' && (
                    <button
                        type="button"
                        onClick={() => { setMode('login'); resetForm(); }}
                        className={`w-full text-center text-sm font-medium py-2 transition-colors ${darkMode
                            ? 'text-slate-400 hover:text-white'
                            : 'text-slate-500 hover:text-slate-900'
                            }`}
                    >
                        ← 로그인으로 돌아가기
                    </button>
                )}
            </form>
        </div>
    );
}
