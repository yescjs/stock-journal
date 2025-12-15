import React, { useState, FormEvent } from 'react';
import { supabase } from '@/app/lib/supabaseClient';

interface LoginFormProps {
    onDone?: () => void;
}

export function LoginForm({ onDone }: LoginFormProps) {
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

        // Common email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
            setMsgType('error');
            setMsg('Please enter a valid email address.');
            return;
        }

        if (mode !== 'resetPassword') {
            if (!trimmedPassword || trimmedPassword.length < 6) {
                setMsgType('error');
                setMsg('Password must be at least 6 characters.');
                return;
            }

            if (mode === 'signup' && trimmedPassword !== trimmedConfirm) {
                setMsgType('error');
                setMsg('Passwords do not match.');
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
                    console.warn('login error:', error);
                    setMsgType('error');
                    if (error.message.toLowerCase().includes('invalid login credentials')) {
                        setMsg('Invalid email or password.');
                    } else {
                        setMsg(`Login failed: ${error.message}`);
                    }
                    return;
                }

                setMsgType('success');
                setMsg('Logged in successfully.');
                onDone?.();
                return;
            }

            if (mode === 'signup') {
                const { data, error } = await supabase.auth.signUp({
                    email: trimmedEmail,
                    password: trimmedPassword,
                });

                if (error) {
                    console.warn('signup error:', error);
                    setMsgType('error');

                    if (error.message.toLowerCase().includes('password should be at least 6 characters')) {
                        setMsg('Password must be at least 6 characters.');
                    } else if (
                        error.message.toLowerCase().includes('email address') &&
                        error.message.toLowerCase().includes('is invalid')
                    ) {
                        setMsg('Invalid email format.');
                    } else if (
                        error.message.toLowerCase().includes('already registered') ||
                        error.message.toLowerCase().includes('user already registered')
                    ) {
                        setMsg('Email already registered. Please login.');
                    } else {
                        setMsg(`Signup failed: ${error.message}`);
                    }
                    return;
                }

                setMsgType('success');

                if (data?.session) {
                    setMsg('Signup successful! Logging you in...');
                    onDone?.();
                } else {
                    setMsg('Signup successful! Please check your email to confirm.');
                    setMode('login');
                }

                setPassword('');
                setConfirmPassword('');
                return;
            }

            if (mode === 'resetPassword') {
                const redirectTo =
                    typeof window !== 'undefined'
                        ? `${window.location.origin}/reset-password`
                        : undefined;

                const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
                    redirectTo,
                });

                if (error) {
                    console.warn('reset password error:', error);
                    setMsgType('error');
                    setMsg(`Failed to send reset email: ${error.message}`);
                    return;
                }

                setMsgType('success');
                setMsg('Reset email sent. Please check your inbox (and spam folder).');
                return;
            }
        } catch (err: any) {
            console.warn('auth unknown error:', err);
            setMsgType('error');
            setMsg('An unknown error occurred.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="max-w-md w-full mx-auto">
            {/* Tab Switcher */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
                <button
                    type="button"
                    onClick={() => {
                        setMode('login');
                        resetForm();
                    }}
                    className={
                        'flex-1 py-2 text-sm font-semibold rounded-lg transition-all ' +
                        (mode === 'login'
                            ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400')
                    }
                >
                    Login
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setMode('signup');
                        resetForm();
                    }}
                    className={
                        'flex-1 py-2 text-sm font-semibold rounded-lg transition-all ' +
                        (mode === 'signup'
                            ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400')
                    }
                >
                    Sign Up
                </button>
            </div>

            {mode === 'resetPassword' && (
                <div className="text-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Reset Password</h3>
                    <p className="text-xs text-slate-500">We'll send you an email to reset your password.</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-1">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                    />
                </div>

                {mode !== 'resetPassword' && (
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Min. 6 characters"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                            />
                        </div>

                        {mode === 'signup' && (
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-1">
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Enter password again"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                />
                            </div>
                        )}
                    </div>
                )}

                {msg && (
                    <div
                        className={
                            'p-3 rounded-lg text-sm font-medium flex items-start gap-2 ' +
                            (msgType === 'error'
                                ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
                                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400')
                        }
                    >
                        <span>{msgType === 'error' ? '⚠️' : '✅'}</span>
                        <p className="flex-1">{msg}</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={
                        sending ||
                        !email ||
                        (mode !== 'resetPassword' && !password) ||
                        (mode === 'signup' && !confirmPassword)
                    }
                    className={
                        'w-full py-3 rounded-xl font-bold text-sm text-white shadow-lg shadow-blue-500/30 transition-all transform active:scale-[0.98] ' +
                        (sending
                            ? 'bg-slate-400 cursor-not-allowed shadow-none'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500')
                    }
                >
                    {sending
                        ? 'Processing...'
                        : mode === 'login'
                            ? 'Login'
                            : mode === 'signup'
                                ? 'Create Account'
                                : 'Send Reset Link'}
                </button>
            </form>

            <div className="mt-6 flex flex-col items-center gap-2">
                <button
                    type="button"
                    onClick={() => {
                        setMode('resetPassword');
                        setPassword('');
                        setConfirmPassword('');
                        resetMsg();
                    }}
                    className="text-xs text-slate-500 hover:text-blue-600 transition-colors"
                >
                    Forgot your password?
                </button>

                <p className="text-[10px] text-slate-400 text-center max-w-xs mx-auto mt-4 px-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                    By logging in, you agree to our Terms of Service. sessions are valid for 7 days.
                </p>
            </div>
        </div>
    );
}
