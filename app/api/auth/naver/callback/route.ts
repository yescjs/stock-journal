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
            console.error('Naver OAuth error:', error);
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_BASE_URL}/?error=naver_auth_failed`
            );
        }

        // 필수 파라미터 확인
        if (!code || !state) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_BASE_URL}/?error=missing_parameters`
            );
        }

        // State 검증 (CSRF 방지)
        const savedState = request.cookies.get('naver_oauth_state')?.value;
        if (!savedState || savedState !== state) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_BASE_URL}/?error=invalid_state`
            );
        }

        // 1. 액세스 토큰 교환
        const tokenData = await getNaverAccessToken(code, state);

        // 2. 사용자 프로필 조회
        const userProfile = await getNaverUserProfile(tokenData.access_token);

        if (userProfile.resultcode !== '00') {
            throw new Error('Failed to get user profile');
        }

        const { response: profile } = userProfile;

        // 3. Supabase에 사용자 생성 또는 업데이트 (Admin API 사용)
        const email = profile.email || `naver_${profile.id}@naver-oauth.local`;

        // 이메일로 기존 사용자 찾기 (필터링된 쿼리로 속도 개선)
        let existingUser = null;
        
        try {
            // 먼저 이메일로 검색
            const { data: usersByEmail, error: emailError } = await supabaseAdmin.auth.admin.listUsers();
            
            if (!emailError && usersByEmail?.users) {
                // 이메일 또는 네이버 ID로 사용자 찾기
                existingUser = usersByEmail.users.find(u =>
                    u.email === email ||
                    u.user_metadata?.naver_id === profile.id
                );
            }
        } catch (searchError) {
            console.error('Error searching for user:', searchError);
            // 검색 실패 시 새 사용자로 처리
            existingUser = null;
        }

        if (!existingUser) {
            // 사용자가 없으면 생성 (ID는 자동 생성)
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
                console.error('Error creating user:', createError);
                throw createError;
            }
        } else {
            // 사용자가 있으면 메타데이터 업데이트
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
                console.error('Error updating user:', updateError);
                throw updateError;
            }
        }

        // 4. OTP 생성 및 자동 검증으로 세션 생성
        // Admin API로 OTP 생성
        const { data: otpData, error: otpError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: email,
        });

        if (otpError || !otpData.properties) {
            console.error('Error generating OTP:', otpError);
            throw otpError || new Error('Failed to generate OTP');
        }

        // 5. 클라이언트에서 세션을 설정할 수 있도록 토큰을 localStorage에 저장하는 스크립트 포함
        const htmlResponse = `
<!DOCTYPE html>
<html>
<head>
    <title>로그인 중...</title>
    <style>
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0f172a;
            color: white;
        }
        .loader {
            text-align: center;
        }
        .spinner {
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top: 3px solid white;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="loader">
        <div class="spinner"></div>
        <p>네이버 로그인 처리 중...</p>
    </div>
    <script type="module">
        import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
        
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
                    console.log('Cleared previous session data');
                } catch (storageError) {
                    console.warn('Failed to clear localStorage:', storageError);
                }

                // 2. 새 세션 생성
                const supabase = createClient(
                    '${process.env.NEXT_PUBLIC_SUPABASE_URL}',
                    '${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}'
                );

                const { data, error } = await supabase.auth.verifyOtp({
                    type: 'email',
                    token_hash: '${otpData.properties.hashed_token}'
                });

                if (error) {
                    console.error('OTP verification error:', error);
                    throw error;
                }

                // 세션이 자동으로 설정됨
                window.location.href = '${process.env.NEXT_PUBLIC_BASE_URL}/';
            } catch (error) {
                console.error('Login error:', error);
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
        console.error('Naver callback error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_BASE_URL}/?error=naver_callback_failed&message=${encodeURIComponent(errorMessage)}`
        );
    }
}
