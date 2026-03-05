import { NextRequest, NextResponse } from 'next/server';
import { getNaverAccessToken, getNaverUserProfile } from '@/app/lib/naverAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // 에러 처리
        if (error) {
            console.error('[네이버 OAuth] 인증 거부:', {
                error: error,
                timestamp: new Date().toISOString()
            });
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_BASE_URL}/?error=naver_auth_failed&message=${encodeURIComponent('네이버 로그인 인증에 실패했습니다.')}`
            );
        }

        // 필수 파라미터 확인
        if (!code || !state) {
            console.error('[네이버 OAuth] 필수 파라미터 누락:', {
                hasCode: !!code,
                hasState: !!state,
                timestamp: new Date().toISOString()
            });
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_BASE_URL}/?error=missing_parameters&message=${encodeURIComponent('로그인 요청이 유효하지 않습니다. 다시 시도해주세요.')}`
            );
        }

        // State 검증 (CSRF 방지 + 만료 시간 체크)
        const savedState = request.cookies.get('naver_oauth_state')?.value;
        if (!savedState || savedState !== state) {
            console.error('[네이버 OAuth] State 검증 실패:', {
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
            console.error('[네이버 OAuth] State 형식 오류:', {
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
            console.error('[네이버 OAuth] State 만료:', {
                stateAge: stateAge,
                maxAge: TEN_MINUTES_MS,
                timestamp: new Date().toISOString()
            });
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_BASE_URL}/?error=state_expired&message=${encodeURIComponent('로그인 요청이 만료되었습니다. 다시 시도해주세요.')}`
            );
        }

        // 1. 액세스 토큰 교환
        const tokenData = await getNaverAccessToken(code, state);

        // 2. 사용자 프로필 조회
        const userProfile = await getNaverUserProfile(tokenData.access_token);

        if (userProfile.resultcode !== '00') {
            console.error('[네이버 OAuth] 프로필 조회 실패:', {
                resultcode: userProfile.resultcode,
                message: userProfile.message,
                timestamp: new Date().toISOString()
            });
            throw new Error('네이버 사용자 프로필 조회에 실패했습니다.');
        }

        const { response: profile } = userProfile;

        // 3. Supabase에 사용자 생성 또는 업데이트 (Admin API 사용)
        const email = profile.email || `naver_${profile.id}@naver-oauth.local`;

        // 최적화: 먼저 사용자 생성을 시도하고, 이미 존재하면 조회 및 업데이트

        // 1단계: 사용자 생성 시도 (대부분의 경우 한 번의 API 호출로 완료)
        const { error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            email_confirm: true,
            user_metadata: {
                provider: 'naver',
                naver_id: profile.id,
                name: profile.name,
                nickname: profile.nickname,
                profile_image: profile.profile_image,
                full_name: profile.name,
            }
        });

        if (createError) {
            // 2단계: 사용자가 이미 존재하는 경우 (에러 메시지로 판단)
            if (createError.message.includes('already registered') || createError.message.includes('duplicate')) {
                try {
                    // 이메일로 사용자 조회 (페이지네이션 없이 단일 쿼리)
                    const { data: usersByEmail, error: listError } = await supabaseAdmin.auth.admin.listUsers({
                        page: 1,
                        perPage: 1000, // 충분히 큰 값
                    });

                    if (listError) {
                        console.error('[네이버 OAuth] 사용자 목록 조회 실패:', {
                            error: listError.message,
                            code: listError.code,
                            timestamp: new Date().toISOString()
                        });
                        throw listError;
                    }

                    // 이메일 또는 네이버 ID로 사용자 찾기
                    const existingUser = usersByEmail.users.find(u =>
                        u.email === email ||
                        u.user_metadata?.naver_id === profile.id
                    );

                    if (!existingUser) {
                        console.error('[네이버 OAuth] 기존 사용자를 찾을 수 없음:', {
                            email: email,
                            naverId: profile.id,
                            timestamp: new Date().toISOString()
                        });
                        throw new Error('사용자를 찾을 수 없습니다.');
                    }

                    // 사용자 메타데이터 업데이트
                    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                        existingUser.id,
                        {
                            user_metadata: {
                                provider: 'naver',
                                naver_id: profile.id,
                                name: profile.name,
                                nickname: profile.nickname,
                                profile_image: profile.profile_image,
                                full_name: profile.name,
                            }
                        }
                    );

                    if (updateError) {
                        console.error('[네이버 OAuth] 사용자 정보 업데이트 실패:', {
                            error: updateError.message,
                            code: updateError.code,
                            userId: existingUser.id,
                            timestamp: new Date().toISOString()
                        });
                        throw updateError;
                    }
                    // user updated successfully
                } catch (fallbackError: unknown) {
                    const errorMessage = fallbackError instanceof Error ? fallbackError.message : '알 수 없는 오류';
                    const errorStack = fallbackError instanceof Error ? fallbackError.stack : undefined;
                    console.error('[네이버 OAuth] 기존 사용자 처리 실패:', {
                        error: errorMessage,
                        stack: errorStack,
                        timestamp: new Date().toISOString()
                    });
                    throw fallbackError;
                }
            } else {
                // 다른 종류의 생성 에러는 그대로 throw
                console.error('[네이버 OAuth] 사용자 생성 실패:', {
                    error: createError.message,
                    code: createError.code,
                    timestamp: new Date().toISOString()
                });
                throw createError;
            }
        } else {
            // 신규 사용자 생성 성공
        }

        // 4. 세션 생성 (OTP 방식 with Retry)
        //
        // OTP 방식의 복잡도 분석:
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //
        // 1. 서버 측 (현재 위치):
        //    - Admin API로 `generateLink({type: 'magiclink'})` 호출
        //    - 반환되는 `hashed_token`을 HTML 응답에 포함
        //    ⚠️  문제점: hashed_token은 일회용이며 약 60초 유효기간
        //
        // 2. 클라이언트 측 (HTML <script> 내):
        //    - Supabase Client로 `verifyOtp({type: 'email', token_hash})` 호출
        //    - 성공 시 localStorage에 세션 토큰 자동 저장
        //    ⚠️  문제점: 네트워크 지연, 브라우저 차단 시 실패 가능
        //
        // 3. 왜 이 방식을 사용하는가?
        //    - Supabase Admin API는 서버 측 세션을 직접 생성하는 메서드 미제공
        //    - `admin.createUser()`는 세션을 반환하지 않음
        //    - 클라이언트 측에서 세션을 설정해야만 localStorage 동기화 가능
        //    - Magic Link OTP는 이를 우회하는 공식 패턴
        //
        // 4. 대안 검토:
        //    ✗ signInWithPassword: 비밀번호 생성 필요 (보안 위험, 복잡도 증가)
        //    ✗ Admin API JWT 직접 생성: 공식 미지원, 토큰 갱신 로직 필요
        //    ✓ OTP 방식: 공식 권장, 비밀번호 불필요, 일회용 보안
        //
        // 5. 개선 방향:
        //    - 재시도 로직 추가로 네트워크 일시 장애 대응
        //    - 타임아웃 증가 (30초 → 60초) OTP 유효기간 대응
        //    - 상세 에러 로깅으로 실패 원인 추적
        //
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        let otpData;
        let otpError;

        // 재시도 로직: 최대 3회 시도
        const MAX_RETRIES = 3;
        const RETRY_DELAY_MS = 1000; // 재시도 간 1초 대기

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            const result = await supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email: email,
            });

            otpData = result.data;
            otpError = result.error;

            // 성공 조건: error가 없고 properties.hashed_token이 존재
            if (!otpError && otpData?.properties?.hashed_token) {
                break;
            }

            // 실패 로깅
            console.warn(`[네이버 OAuth] OTP 생성 실패 (시도 ${attempt}/${MAX_RETRIES})`, {
                error: otpError?.message,
                code: otpError?.code,
                hasData: !!otpData,
                hasProperties: !!otpData?.properties,
                hasHashedToken: !!otpData?.properties?.hashed_token,
                timestamp: new Date().toISOString()
            });

            // 마지막 시도가 아니면 대기 후 재시도
            if (attempt < MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            }
        }

        // 최종 실패 처리
        if (otpError || !otpData?.properties?.hashed_token) {
            console.error('[네이버 OAuth] OTP 생성 최종 실패 (재시도 모두 소진)', {
                error: otpError?.message,
                code: otpError?.code,
                attemptsUsed: MAX_RETRIES,
                timestamp: new Date().toISOString()
            });
            throw otpError || new Error('세션 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
        }

        // 5. 클라이언트에서 세션을 설정할 수 있도록 토큰을 localStorage에 저장하는 스크립트 포함
        const htmlResponse = `
<!DOCTYPE html>
<html>
<head>
    <title>로그인 중...</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', sans-serif;
            color: white;
            padding: 20px;
        }
        .container {
            text-align: center;
            max-width: 400px;
            width: 100%;
        }
        .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 30px;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .logo svg {
            width: 45px;
            height: 45px;
        }
        .title {
            font-size: 28px;
            font-weight: 800;
            margin-bottom: 12px;
            letter-spacing: -0.5px;
        }
        .step-text {
            font-size: 16px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 40px;
            min-height: 24px;
        }
        .progress-container {
            width: 100%;
            height: 6px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 40px;
            position: relative;
        }
        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #fff 0%, #f0f0f0 100%);
            border-radius: 10px;
            transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
        }
        .steps-indicator {
            display: flex;
            justify-content: space-between;
            margin-bottom: 50px;
        }
        .step {
            flex: 1;
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .step::before {
            content: '';
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 8px;
            transition: all 0.3s ease;
            position: relative;
            z-index: 1;
        }
        .step.active::before {
            background: white;
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.6);
            transform: scale(1.1);
        }
        .step.completed::before {
            background: #10b981;
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.6);
        }
        .step-label {
            font-size: 12px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.7);
            text-align: center;
            margin-top: 8px;
        }
        .step.active .step-label {
            color: white;
        }
        .spinner {
            border: 4px solid rgba(255, 255, 255, 0.2);
            border-top: 4px solid white;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .timeout-notice {
            display: none;
            margin-top: 30px;
            padding: 16px;
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 12px;
            font-size: 14px;
            line-height: 1.6;
        }
        @media (max-width: 480px) {
            .title {
                font-size: 24px;
            }
            .step-text {
                font-size: 14px;
            }
            .step-label {
                font-size: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <svg viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.477 2 2 5.582 2 10c0 2.895 1.959 5.455 4.888 7.047l-1.726 6.343c-.117.432.277.794.688.632L12 20.8c.337.013.677.02 1.019.02 5.523 0 9.981-3.582 9.981-8S18.542 2 12 2z" />
            </svg>
        </div>
        <h1 class="title">네이버 로그인</h1>
        <p class="step-text" id="step-text">로그인 정보 확인 중...</p>

        <div class="steps-indicator">
            <div class="step active" id="step-1">
                <div class="step-label">정보 확인</div>
            </div>
            <div class="step" id="step-2">
                <div class="step-label">사용자 인증</div>
            </div>
            <div class="step" id="step-3">
                <div class="step-label">완료</div>
            </div>
        </div>

        <div class="progress-container">
            <div class="progress-bar" id="progress-bar" style="width: 33%"></div>
        </div>

        <div class="spinner"></div>

        <div class="timeout-notice" id="timeout-notice">
            ⚠️ 로그인 처리 시간이 초과되었습니다.<br>
            잠시 후 메인 페이지로 이동합니다...
        </div>
    </div>
    <script type="module">
        import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

        let currentStep = 1;
        const steps = [
            '로그인 정보 확인 중...',
            '사용자 정보 처리 중...',
            '완료! 이동 중...'
        ];

        function updateStep(step) {
            currentStep = step;

            // 텍스트 업데이트
            document.getElementById('step-text').textContent = steps[step - 1];

            // 프로그레스바 업데이트
            const progressBar = document.getElementById('progress-bar');
            progressBar.style.width = (step * 33.33) + '%';

            // 스텝 인디케이터 업데이트
            for (let i = 1; i <= 3; i++) {
                const stepEl = document.getElementById('step-' + i);
                stepEl.classList.remove('active', 'completed');
                if (i < step) {
                    stepEl.classList.add('completed');
                } else if (i === step) {
                    stepEl.classList.add('active');
                }
            }
        }

        // 타임아웃 설정 (60초로 증가 - OTP 유효기간 고려)
        // OTP 생성부터 검증까지의 전체 과정을 포함하므로 여유있게 설정
        const timeoutId = setTimeout(() => {
            if (currentStep < 3) {
                document.getElementById('timeout-notice').style.display = 'block';
                document.querySelector('.spinner').style.display = 'none';

                setTimeout(() => {
                    window.location.href = '${process.env.NEXT_PUBLIC_BASE_URL}/?error=login_timeout&message=' +
                        encodeURIComponent('로그인 처리 시간이 초과되었습니다. 다시 시도해주세요.');
                }, 3000);
            }
        }, 60000); // 30초 → 60초로 증가

        (async function() {
            try {
                // 1. 기존 세션 완전 정리 (세션 충돌 방지)
                try {
                    const keysToRemove = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && key.startsWith('sb-')) {
                            keysToRemove.push(key);
                        }
                    }
                    keysToRemove.forEach(key => localStorage.removeItem(key));
                    // previous session cleared
                } catch (storageError) {
                    // ignore storage errors
                }

                // 2단계로 이동
                updateStep(2);

                // 2. 새 세션 생성
                // Supabase Client 생성
                const supabase = createClient(
                    '${process.env.NEXT_PUBLIC_SUPABASE_URL}',
                    '${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}'
                );

                // OTP 검증으로 세션 생성 (재시도 로직 포함)
                // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                // verifyOtp() 단계 설명:
                // 1. 서버에서 전달받은 hashed_token을 Supabase로 검증 요청
                // 2. 유효한 토큰이면 Supabase가 새로운 세션(access_token, refresh_token) 생성
                // 3. Supabase Client가 자동으로 localStorage에 세션 저장
                // 4. 이후 모든 API 요청에서 이 세션 사용
                //
                // 실패 가능 케이스:
                // - 네트워크 타임아웃 (느린 연결, CDN 지연)
                // - OTP 토큰 만료 (서버 생성 후 60초 경과)
                // - 브라우저 localStorage 차단 (시크릿 모드, 쿠키 차단 설정)
                // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                const MAX_OTP_RETRIES = 3;
                const OTP_RETRY_DELAY_MS = 2000; // OTP 검증은 2초 간격으로 재시도
                let verifyData, verifyError;

                for (let attempt = 1; attempt <= MAX_OTP_RETRIES; attempt++) {
                    const result = await supabase.auth.verifyOtp({
                        type: 'email',
                        token_hash: '${otpData.properties.hashed_token}'
                    });

                    verifyData = result.data;
                    verifyError = result.error;

                    // 성공 조건: error가 없고 session이 존재
                    if (!verifyError && verifyData?.session) {
                        break;
                    }

                    // 마지막 시도가 아니면 대기 후 재시도
                    if (attempt < MAX_OTP_RETRIES) {
                        await new Promise(resolve => setTimeout(resolve, OTP_RETRY_DELAY_MS));
                    }
                }

                // 최종 실패 처리
                if (verifyError || !verifyData?.session) {
                    throw verifyError || new Error('세션 생성 검증 실패');
                }

                // 3단계로 이동 (완료)
                updateStep(3);

                // 타임아웃 클리어
                clearTimeout(timeoutId);

                // 약간의 지연 후 리다이렉트 (사용자가 완료 상태를 볼 수 있도록)
                setTimeout(() => {
                    window.location.href = '${process.env.NEXT_PUBLIC_BASE_URL}/';
                }, 500);
            } catch (error) {
                // login error
                clearTimeout(timeoutId);
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

        response.cookies.delete('naver_oauth_state');

        return response;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        const errorStack = error instanceof Error ? error.stack : undefined;
        const errorName = error instanceof Error ? error.name : 'Unknown';

        console.error('[네이버 OAuth] 콜백 처리 실패:', {
            message: errorMessage,
            stack: errorStack,
            name: errorName,
            timestamp: new Date().toISOString()
        });

        // 에러 타입 판별 후 사용자 친화적 메시지 전달
        let userMessage = '네이버 로그인에 실패했습니다.';

        // 네트워크 오류
        if (errorName === 'TypeError' || errorMessage?.includes('fetch') || errorMessage?.includes('network')) {
            userMessage = '네이버 서버와 통신할 수 없습니다. 잠시 후 다시 시도해주세요.';
        }
        // 프로필 조회 실패
        else if (errorMessage?.includes('프로필')) {
            userMessage = '네이버 사용자 정보를 가져올 수 없습니다. 다시 시도해주세요.';
        }
        // 사용자 생성/업데이트 실패
        else if (errorMessage?.includes('사용자')) {
            userMessage = '사용자 정보 처리 중 오류가 발생했습니다. 다시 시도해주세요.';
        }
        // 세션 생성 실패
        else if (errorMessage?.includes('세션')) {
            userMessage = '로그인 세션 생성에 실패했습니다. 다시 시도해주세요.';
        }

        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_BASE_URL}/?error=naver_callback_failed&message=${encodeURIComponent(userMessage)}`
        );
    }
}
