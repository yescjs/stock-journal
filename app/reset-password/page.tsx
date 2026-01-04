'use client';

import { useEffect, useState, FormEvent } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

// 👉 Home 페이지와 같은 키 사용
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<'error' | 'success' | null>(null);

  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
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
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setMsgType(null);

    const trimmedPw = password.trim();
    const trimmedConfirm = passwordConfirm.trim();

    if (!trimmedPw || trimmedPw.length < 6) {
      setMsgType('error');
      setMsg('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }
    if (trimmedPw !== trimmedConfirm) {
      setMsgType('error');
      setMsg('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    try {
      setSending(true);
      const { data, error } = await supabase.auth.updateUser({
        password: trimmedPw,
      });

      if (error) {
        console.warn('update password error:', error);
        setMsgType('error');
        setMsg(
          `비밀번호 변경 중 오류가 발생했습니다. (${error.message})`,
        );
        return;
      }


      setMsgType('success');
      setMsg(
        '비밀번호가 변경되었습니다. 앞으로는 새 비밀번호로 로그인해 주세요.',
      );
      setPassword('');
      setPasswordConfirm('');

      // 비밀번호 변경 완료 후 첫 페이지로 이동
      setTimeout(() => {
        router.push('/');
      }, 1000);

    } catch (err) {
      console.warn('update password unknown error:', err);
      setMsgType('error');
      setMsg('비밀번호 변경 중 알 수 없는 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-xs text-slate-500">
          비밀번호 재설정 링크를 확인하는 중입니다…
        </div>
      </main>
    );
  }

  if (!hasSession) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
        <div className="max-w-sm w-full bg-white shadow-md rounded-xl p-5 text-xs space-y-2">
          <h1 className="text-sm font-semibold">유효하지 않은 링크</h1>
          <p className="text-slate-600">
            비밀번호 재설정 링크가 만료되었거나 잘못된 주소입니다.
            다시 비밀번호 찾기를 시도해 주세요.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="max-w-sm w-full bg-white shadow-md rounded-xl p-5 text-xs space-y-3">
        <h1 className="text-base font-semibold">비밀번호 재설정</h1>
        <p className="text-[11px] text-slate-500">
          새로 사용할 비밀번호를 입력해 주세요.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-600">새 비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="6자 이상 입력"
              className="border rounded px-2 py-1 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-600">
              새 비밀번호 확인
            </label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={e => setPasswordConfirm(e.target.value)}
              placeholder="비밀번호를 한 번 더 입력"
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
            {sending ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>

        <p className="text-[10px] text-slate-400">
          이 페이지는 비밀번호 재설정 메일의 링크를 통해서만 접근할 수 있습니다.
        </p>
      </div>
    </main>
  );
}
