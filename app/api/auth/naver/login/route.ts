import { NextRequest, NextResponse } from 'next/server';
import { getNaverAuthUrl } from '@/app/lib/naverAuth';

export async function GET(request: NextRequest) {
    try {
        // CSRF 방지를 위한 state 생성
        const state = Math.random().toString(36).substring(7);

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
        console.error('Naver login error:', error);
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_BASE_URL}/?error=naver_login_failed`
        );
    }
}
