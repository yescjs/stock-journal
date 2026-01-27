import { NextRequest, NextResponse } from 'next/server';
import { getNaverAuthUrl } from '@/app/lib/naverAuth';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
    try {
        // CSRF 방지를 위한 state 생성 (타임스탬프 + 강력한 랜덤 값)
        const timestamp = Date.now();
        const randomValue = crypto.randomBytes(16).toString('hex');
        const state = `${timestamp}-${randomValue}`;

        // state를 쿠키에 저장 (콜백에서 검증용)
        const response = NextResponse.redirect(getNaverAuthUrl(state));
        response.cookies.set('naver_oauth_state', state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 10, // 10분
        });

        return response;
    } catch (error: any) {
        console.error('[네이버 로그인] 상세 에러:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });

        // 에러 타입 판별 후 사용자 친화적 메시지 전달
        let userMessage = '네이버 로그인에 실패했습니다.';

        // 환경변수 설정 오류
        if (error.message?.includes('환경변수')) {
            userMessage = '서버 설정 오류가 발생했습니다. 관리자에게 문의해주세요.';
        }

        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_BASE_URL}/?error=naver_login_failed&message=${encodeURIComponent(userMessage)}`
        );
    }
}
