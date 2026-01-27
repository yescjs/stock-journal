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

interface NaverEnvConfig {
    clientId: string;
    clientSecret: string;
    baseUrl: string;
}

/**
 * 네이버 인증에 필요한 환경변수 검증
 * @throws {Error} 필수 환경변수가 누락된 경우
 */
function validateNaverEnv(): NaverEnvConfig {
    const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    if (!clientId) {
        throw new Error('NEXT_PUBLIC_NAVER_CLIENT_ID 환경변수가 설정되지 않았습니다.');
    }

    if (!clientSecret) {
        throw new Error('NAVER_CLIENT_SECRET 환경변수가 설정되지 않았습니다.');
    }

    if (!baseUrl) {
        throw new Error('NEXT_PUBLIC_BASE_URL 환경변수가 설정되지 않았습니다.');
    }

    return { clientId, clientSecret, baseUrl };
}

/**
 * 네이버 OAuth 인증 URL 생성
 */
export function getNaverAuthUrl(state: string): string {
    const { clientId, baseUrl } = validateNaverEnv();
    const redirectUri = `${baseUrl}/api/auth/naver/callback`;

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        state: state,
    });

    return `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`;
}

/**
 * 네이버 액세스 토큰 교환
 */
export async function getNaverAccessToken(code: string, state: string): Promise<NaverTokenResponse> {
    const { clientId, clientSecret, baseUrl } = validateNaverEnv();
    const redirectUri = `${baseUrl}/api/auth/naver/callback`;

    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        state: state,
    });

    try {
        const response = await fetch(`https://nid.naver.com/oauth2.0/token?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[네이버 토큰 교환] 실패:', {
                status: response.status,
                statusText: response.statusText,
                errorData: errorData,
                timestamp: new Date().toISOString()
            });
            throw new Error('네이버 액세스 토큰을 가져올 수 없습니다.');
        }

        return response.json();
    } catch (error: any) {
        // 네트워크 오류와 기타 오류 구분
        if (error.name === 'TypeError' || error.message?.includes('fetch')) {
            console.error('[네이버 토큰 교환] 네트워크 오류:', {
                message: error.message,
                timestamp: new Date().toISOString()
            });
            throw new Error('네이버 서버와 통신할 수 없습니다. 잠시 후 다시 시도해주세요.');
        }
        throw error;
    }
}

/**
 * 네이버 사용자 프로필 조회
 */
export async function getNaverUserProfile(accessToken: string): Promise<NaverUserProfile> {
    try {
        const response = await fetch('https://openapi.naver.com/v1/nid/me', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[네이버 프로필 조회] 실패:', {
                status: response.status,
                statusText: response.statusText,
                errorData: errorData,
                timestamp: new Date().toISOString()
            });
            throw new Error('네이버 사용자 프로필을 가져올 수 없습니다.');
        }

        return response.json();
    } catch (error: any) {
        // 네트워크 오류와 기타 오류 구분
        if (error.name === 'TypeError' || error.message?.includes('fetch')) {
            console.error('[네이버 프로필 조회] 네트워크 오류:', {
                message: error.message,
                timestamp: new Date().toISOString()
            });
            throw new Error('네이버 서버와 통신할 수 없습니다. 잠시 후 다시 시도해주세요.');
        }
        throw error;
    }
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
