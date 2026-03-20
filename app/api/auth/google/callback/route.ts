import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAccessToken, getGoogleUserProfile } from '@/app/lib/googleAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // 에러 처리
        if (error) {
            // 사용자가 직접 취소한 경우 — 조용히 홈으로 리다이렉트
            if (error === 'access_denied') {
                return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/`);
            }
            console.error('[구글 OAuth] 인증 거부:', {
                error: error,
                timestamp: new Date().toISOString()
            });
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_BASE_URL}/?error=google_auth_failed&message=${encodeURIComponent('구글 로그인 인증에 실패했습니다.')}`
            );
        }

        // 필수 파라미터 확인
        if (!code || !state) {
            console.error('[구글 OAuth] 필수 파라미터 누락:', {
                hasCode: !!code,
                hasState: !!state,
                timestamp: new Date().toISOString()
            });
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_BASE_URL}/?error=missing_parameters&message=${encodeURIComponent('로그인 요청이 유효하지 않습니다. 다시 시도해주세요.')}`
            );
        }

        // State 검증 (CSRF 방지 + 만료 시간 체크)
        const savedState = request.cookies.get('google_oauth_state')?.value;
        if (!savedState || savedState !== state) {
            console.error('[구글 OAuth] State 검증 실패:', {
                hasSavedState: !!savedState,
                stateMatch: savedState === state,
                timestamp: new Date().toISOString()
            });
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_BASE_URL}/?error=invalid_state&message=${encodeURIComponent('로그인 요청이 유효하지 않습니다. 다시 시도해주세요.')}`
            );
        }

        // State 만료 시간 검증 (10분)
        const [timestamp, randomValue] = state.split('-');
        if (!timestamp || !randomValue) {
            console.error('[구글 OAuth] State 형식 오류:', {
                state: state,
                timestamp: new Date().toISOString()
            });
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_BASE_URL}/?error=invalid_state_format&message=${encodeURIComponent('로그인 요청이 유효하지 않습니다. 다시 시도해주세요.')}`
            );
        }

        const stateAge = Date.now() - parseInt(timestamp, 10);
        const TEN_MINUTES_MS = 10 * 60 * 1000;
        if (stateAge > TEN_MINUTES_MS || stateAge < 0) {
            console.error('[구글 OAuth] State 만료:', {
                stateAge: stateAge,
                maxAge: TEN_MINUTES_MS,
                timestamp: new Date().toISOString()
            });
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_BASE_URL}/?error=state_expired&message=${encodeURIComponent('로그인 요청이 만료되었습니다. 다시 시도해주세요.')}`
            );
        }

        // 1. 액세스 토큰 교환
        const tokenData = await getGoogleAccessToken(code);

        // 2. 사용자 프로필 조회
        const profile = await getGoogleUserProfile(tokenData.access_token);

        // 3. Supabase에 사용자 생성 또는 업데이트 (Admin API 사용)
        const email = profile.email;

        // 1단계: 사용자 생성 시도
        const { error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            email_confirm: true,
            user_metadata: {
                provider: 'google',
                google_id: profile.sub,
                name: profile.name,
                full_name: profile.name,
                avatar_url: profile.picture,
            }
        });

        if (createError) {
            // 2단계: 사용자가 이미 존재하는 경우
            if (createError.code === 'email_exists' || createError.message.includes('already registered') || createError.message.includes('already been registered') || createError.message.includes('duplicate')) {
                try {
                    const { data: usersByEmail, error: listError } = await supabaseAdmin.auth.admin.listUsers({
                        page: 1,
                        perPage: 1000,
                    });

                    if (listError) {
                        console.error('[구글 OAuth] 사용자 목록 조회 실패:', {
                            error: listError.message,
                            code: listError.code,
                            timestamp: new Date().toISOString()
                        });
                        throw listError;
                    }

                    const existingUser = usersByEmail.users.find(u =>
                        u.email === email ||
                        u.user_metadata?.google_id === profile.sub
                    );

                    if (!existingUser) {
                        console.error('[구글 OAuth] 기존 사용자를 찾을 수 없음:', {
                            email: email,
                            googleId: profile.sub,
                            timestamp: new Date().toISOString()
                        });
                        throw new Error('사용자를 찾을 수 없습니다.');
                    }

                    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                        existingUser.id,
                        {
                            user_metadata: {
                                provider: 'google',
                                google_id: profile.sub,
                                name: profile.name,
                                full_name: profile.name,
                                avatar_url: profile.picture,
                            }
                        }
                    );

                    if (updateError) {
                        console.error('[구글 OAuth] 사용자 정보 업데이트 실패:', {
                            error: updateError.message,
                            code: updateError.code,
                            userId: existingUser.id,
                            timestamp: new Date().toISOString()
                        });
                        throw updateError;
                    }
                } catch (fallbackError: unknown) {
                    const errorMessage = fallbackError instanceof Error ? fallbackError.message : '알 수 없는 오류';
                    const errorStack = fallbackError instanceof Error ? fallbackError.stack : undefined;
                    console.error('[구글 OAuth] 기존 사용자 처리 실패:', {
                        error: errorMessage,
                        stack: errorStack,
                        timestamp: new Date().toISOString()
                    });
                    throw fallbackError;
                }
            } else {
                console.error('[구글 OAuth] 사용자 생성 실패:', {
                    error: createError.message,
                    code: createError.code,
                    timestamp: new Date().toISOString()
                });
                throw createError;
            }
        }

        // 4. 세션 생성 (OTP 방식 with Retry)
        let otpData;
        let otpError;

        const MAX_RETRIES = 3;
        const RETRY_DELAY_MS = 1000;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            const result = await supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email: email,
            });

            otpData = result.data;
            otpError = result.error;

            if (!otpError && otpData?.properties?.hashed_token) {
                break;
            }

            console.warn(`[구글 OAuth] OTP 생성 실패 (시도 ${attempt}/${MAX_RETRIES})`, {
                error: otpError?.message,
                code: otpError?.code,
                hasData: !!otpData,
                hasProperties: !!otpData?.properties,
                hasHashedToken: !!otpData?.properties?.hashed_token,
                timestamp: new Date().toISOString()
            });

            if (attempt < MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            }
        }

        if (otpError || !otpData?.properties?.hashed_token) {
            console.error('[구글 OAuth] OTP 생성 최종 실패 (재시도 모두 소진)', {
                error: otpError?.message,
                code: otpError?.code,
                attemptsUsed: MAX_RETRIES,
                timestamp: new Date().toISOString()
            });
            throw otpError || new Error('세션 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
        }

        // 5. 클라이언트에서 세션을 설정하는 HTML 응답 (UI 없음 - 즉시 리다이렉트)
        const htmlResponse = `
<!DOCTYPE html>
<html>
<head>
    <title>로그인 중...</title>
    <style>html,body{margin:0;padding:0;background:#09090b;}</style>
</head>
<body>
    <script type="module">
        import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

        (async function() {
            try {
                // 1. 기존 세션 완전 정리
                try {
                    const keysToRemove = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && key.startsWith('sb-')) {
                            keysToRemove.push(key);
                        }
                    }
                    keysToRemove.forEach(key => localStorage.removeItem(key));
                } catch (storageError) {
                    // ignore storage errors
                }

                // 2. 새 세션 생성
                const supabase = createClient(
                    '${process.env.NEXT_PUBLIC_SUPABASE_URL}',
                    '${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}'
                );

                const MAX_OTP_RETRIES = 3;
                const OTP_RETRY_DELAY_MS = 2000;
                let verifyData, verifyError;

                for (let attempt = 1; attempt <= MAX_OTP_RETRIES; attempt++) {
                    const result = await supabase.auth.verifyOtp({
                        type: 'email',
                        token_hash: '${otpData.properties.hashed_token}'
                    });

                    verifyData = result.data;
                    verifyError = result.error;

                    if (!verifyError && verifyData?.session) {
                        break;
                    }

                    if (attempt < MAX_OTP_RETRIES) {
                        await new Promise(resolve => setTimeout(resolve, OTP_RETRY_DELAY_MS));
                    }
                }

                if (verifyError || !verifyData?.session) {
                    throw verifyError || new Error('세션 생성 검증 실패');
                }

                window.location.href = '${process.env.NEXT_PUBLIC_BASE_URL}/';
            } catch (error) {
                window.location.href = '${process.env.NEXT_PUBLIC_BASE_URL}/?error=login_failed&details=' + encodeURIComponent(error.message);
            }
        })();
    </script>
</body>
</html>
        `;

        // state 쿠키 삭제
        const response = new NextResponse(htmlResponse, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
            },
        });

        response.cookies.delete('google_oauth_state');

        return response;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        const errorStack = error instanceof Error ? error.stack : undefined;
        const errorName = error instanceof Error ? error.name : 'Unknown';

        console.error('[구글 OAuth] 콜백 처리 실패:', {
            message: errorMessage,
            stack: errorStack,
            name: errorName,
            timestamp: new Date().toISOString()
        });

        let userMessage = '구글 로그인에 실패했습니다.';

        if (errorName === 'TypeError' || errorMessage?.includes('fetch') || errorMessage?.includes('network')) {
            userMessage = '구글 서버와 통신할 수 없습니다. 잠시 후 다시 시도해주세요.';
        } else if (errorMessage?.includes('프로필')) {
            userMessage = '구글 사용자 정보를 가져올 수 없습니다. 다시 시도해주세요.';
        } else if (errorMessage?.includes('사용자')) {
            userMessage = '사용자 정보 처리 중 오류가 발생했습니다. 다시 시도해주세요.';
        } else if (errorMessage?.includes('세션')) {
            userMessage = '로그인 세션 생성에 실패했습니다. 다시 시도해주세요.';
        }

        const debugInfo = process.env.NODE_ENV === 'development'
            ? `&debug=${encodeURIComponent(errorMessage)}`
            : '';

        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_BASE_URL}/?error=google_callback_failed&message=${encodeURIComponent(userMessage)}${debugInfo}`
        );
    }
}
