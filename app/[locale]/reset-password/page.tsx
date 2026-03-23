'use client';

import { useEffect, useState, FormEvent, useMemo } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

// Lazy client initialization to avoid build-time errors
function getSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [configError, setConfigError] = useState(false);

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<'error' | 'success' | null>(null);

  const router = useRouter();
  const t = useTranslations('resetPassword');

  // Memoize supabase client to avoid re-creating on each render
  const supabase = useMemo(() => getSupabaseClient(), []);

  useEffect(() => {
    const checkSession = async () => {
      if (!supabase) {
        setConfigError(true);
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        if (data.session && data.session.user) {
          setHasSession(true);
        } else {
          setHasSession(false);
        }
      } catch (err) {
        console.warn('check session error:', err);
        setHasSession(false);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, [supabase]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setMsgType(null);

    if (!supabase) {
      setMsgType('error');
      setMsg(t('supabaseError'));
      return;
    }

    const trimmedPw = password.trim();
    const trimmedConfirm = passwordConfirm.trim();

    if (!trimmedPw || trimmedPw.length < 6) {
      setMsgType('error');
      setMsg(t('minLength'));
      return;
    }
    if (trimmedPw !== trimmedConfirm) {
      setMsgType('error');
      setMsg(t('mismatch'));
      return;
    }

    try {
      setSending(true);
      const { error } = await supabase.auth.updateUser({
        password: trimmedPw,
      });

      if (error) {
        console.warn('update password error:', error);
        setMsgType('error');
        setMsg(t('updateError', { message: error.message }));
        return;
      }


      setMsgType('success');
      setMsg(t('success'));
      setPassword('');
      setPasswordConfirm('');

      setTimeout(() => {
        router.push('/');
      }, 1000);

    } catch (err) {
      console.warn('update password unknown error:', err);
      setMsgType('error');
      setMsg(t('unknownError'));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-xs text-slate-500">
          {t('checking')}
        </div>
      </main>
    );
  }

  if (configError) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
        <div className="max-w-sm w-full bg-white shadow-md rounded-xl p-5 text-xs space-y-2">
          <h1 className="text-sm font-semibold">{t('configErrorTitle')}</h1>
          <p className="text-slate-600">
            {t('configErrorDesc')}
          </p>
        </div>
      </main>
    );
  }

  if (!hasSession) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
        <div className="max-w-sm w-full bg-white shadow-md rounded-xl p-5 text-xs space-y-2">
          <h1 className="text-sm font-semibold">{t('invalidLinkTitle')}</h1>
          <p className="text-slate-600">
            {t('invalidLinkDesc')}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="max-w-sm w-full bg-white shadow-md rounded-xl p-5 text-xs space-y-3">
        <h1 className="text-base font-semibold">{t('title')}</h1>
        <p className="text-[11px] text-slate-500">
          {t('instruction')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-600">{t('newPasswordLabel')}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('newPasswordPlaceholder')}
              className="border rounded px-2 py-1 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-600">
              {t('confirmPasswordLabel')}
            </label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={e => setPasswordConfirm(e.target.value)}
              placeholder={t('confirmPasswordPlaceholder')}
              className="border rounded px-2 py-1 text-xs"
            />
          </div>

          {msg && (
            <div
              className={
                'mt-1 rounded-md border px-3 py-2 text-[11px] leading-snug ' +
                (msgType === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700')
              }
            >
              {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={sending || !password || !passwordConfirm}
            className={
              'w-full rounded-lg py-2 text-xs font-semibold mt-1 ' +
              (sending
                ? 'bg-slate-400 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700')
            }
          >
            {sending ? t('submitting') : t('submitButton')}
          </button>
        </form>

        <p className="text-[10px] text-slate-400">
          {t('footerNote')}
        </p>
      </div>
    </main>
  );
}
