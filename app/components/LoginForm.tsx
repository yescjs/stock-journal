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
                    setMsgType('success');
                    setMsg('회원가입 완료! 이메일을 확인해주세요.');
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

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div className="relative">
                    <Mail size={18} className={iconClass} />
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="이메일 주소"
                        className={inputClass}
                    />
                </div>

                {/* Password */}
                {mode !== 'resetPassword' && (
                    <div className="relative">
                        <Lock size={18} className={iconClass} />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="비밀번호 (6자 이상)"
                            className={inputClass}
                        />
                    </div>
                )}

                {/* Confirm Password */}
                {mode === 'signup' && (
                    <div className="relative">
                        <Lock size={18} className={iconClass} />
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="비밀번호 확인"
                            className={inputClass}
                        />
                    </div>
                )}

                {/* Message */}
                {msg && (
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
                            {mode === 'signup' && '계정 만들기'}
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
