import { supabase } from './supabaseClient';

interface NaverTokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
}

interface NaverUserProfile {
    resultcode: string;
    message: string;
    response: {
        id: string;
        email: string;
        name: string;
        nickname?: string;
        profile_image?: string;
        age?: string;
        gender?: string;
        birthday?: string;
        birthyear?: string;
        mobile?: string;
    };
}

/**
 * 네이버 OAuth 인증 URL 생성
 */
export function getNaverAuthUrl(state: string): string {
    const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/naver/callback`;

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId || '',
        redirect_uri: redirectUri,
        state: state,
    });

    return `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`;
}

/**
 * 네이버 액세스 토큰 교환
 */
export async function getNaverAccessToken(code: string, state: string): Promise<NaverTokenResponse> {
    const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/naver/callback`;

    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId || '',
        client_secret: clientSecret || '',
        code: code,
        state: state,
    });

    const response = await fetch(`https://nid.naver.com/oauth2.0/token?${params.toString()}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });

    if (!response.ok) {
        throw new Error('Failed to get access token from Naver');
    }

    return response.json();
}

/**
 * 네이버 사용자 프로필 조회
 */
export async function getNaverUserProfile(accessToken: string): Promise<NaverUserProfile> {
    const response = await fetch('https://openapi.naver.com/v1/nid/me', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to get user profile from Naver');
    }

    return response.json();
}

/**
 * Supabase에 네이버 사용자 생성 또는 업데이트
 */
export async function createOrUpdateSupabaseUser(
    naverProfile: NaverUserProfile,
    accessToken: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { response: profile } = naverProfile;

        // 네이버 ID를 기반으로 고유한 이메일 생성 (이메일이 없는 경우)
        const email = profile.email || `naver_${profile.id}@naver-oauth.local`;

        // Supabase Auth에 사용자 생성/업데이트
        // 네이버 OAuth는 Supabase에서 공식 지원하지 않으므로,
        // 사용자 메타데이터에 네이버 정보를 저장
        const { data: existingUser, error: checkError } = await supabase.auth.getUser();

        if (existingUser?.user) {
            // 이미 로그인된 사용자가 있으면 메타데이터 업데이트
            const { error: updateError } = await supabase.auth.updateUser({
                data: {
                    provider: 'naver',
                    naver_id: profile.id,
                    name: profile.name,
                    nickname: profile.nickname,
                    profile_image: profile.profile_image,
                    email: email,
                },
            });

            if (updateError) {
                return { success: false, error: updateError.message };
            }
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * 네이버 사용자 정보로 커스텀 세션 생성
 */
export function createNaverSession(naverProfile: NaverUserProfile, accessToken: string) {
    const { response: profile } = naverProfile;

    return {
        user: {
            id: profile.id,
            email: profile.email || `naver_${profile.id}@naver-oauth.local`,
            user_metadata: {
                provider: 'naver',
                naver_id: profile.id,
                name: profile.name,
                nickname: profile.nickname,
                profile_image: profile.profile_image,
                full_name: profile.name,
            },
        },
        access_token: accessToken,
        provider: 'naver',
    };
}
