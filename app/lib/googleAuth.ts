/**
 * 구글 OAuth 인증 관련 함수들
 * - getGoogleAuthUrl: OAuth 인증 URL 생성
 * - getGoogleAccessToken: 액세스 토큰 교환
 * - getGoogleUserProfile: 사용자 프로필 조회
 */

interface GoogleTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    id_token: string;
}

interface GoogleUserProfile {
    sub: string;
    email: string;
    email_verified: boolean;
    name: string;
    picture?: string;
    given_name?: string;
    family_name?: string;
}

interface GoogleEnvConfig {
    clientId: string;
    clientSecret: string;
    baseUrl: string;
}

/**
 * 구글 OAuth 인증에 필요한 환경변수 검증
 *
 * @throws {Error} 필수 환경변수가 누락된 경우
 * @returns {GoogleEnvConfig} 검증된 환경변수 설정 객체
 */
function validateGoogleEnv(): GoogleEnvConfig {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    if (!clientId) {
        throw new Error('GOOGLE_CLIENT_ID 환경변수가 설정되지 않았습니다.');
    }

    if (!clientSecret) {
        throw new Error('GOOGLE_CLIENT_SECRET 환경변수가 설정되지 않았습니다.');
    }

    if (!baseUrl) {
        throw new Error('NEXT_PUBLIC_BASE_URL 환경변수가 설정되지 않았습니다.');
    }

    return { clientId, clientSecret, baseUrl };
}

/**
 * 구글 OAuth 인증 URL 생성
 *
 * @param {string} state - CSRF 방지용 state 값 (타임스탬프-난수 형식)
 * @returns {string} 구글 OAuth 인증 URL
 */
export function getGoogleAuthUrl(state: string): string {
    const { clientId, baseUrl } = validateGoogleEnv();
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'openid email profile',
        state: state,
        access_type: 'offline',
        prompt: 'select_account',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * 구글 OAuth 인증 코드를 액세스 토큰으로 교환
 *
 * @param {string} code - 구글에서 받은 인증 코드
 * @returns {Promise<GoogleTokenResponse>} access_token 등 포함
 * @throws {Error} 토큰 교환 실패 시
 */
export async function getGoogleAccessToken(code: string): Promise<GoogleTokenResponse> {
    const { clientId, clientSecret, baseUrl } = validateGoogleEnv();
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
    });

    try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[구글 토큰 교환] 실패:', {
                status: response.status,
                statusText: response.statusText,
                errorData: errorData,
                timestamp: new Date().toISOString()
            });
            throw new Error('구글 액세스 토큰을 가져올 수 없습니다.');
        }

        return response.json();
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        if (err.name === 'TypeError' || err.message?.includes('fetch')) {
            console.error('[구글 토큰 교환] 네트워크 오류:', {
                message: err.message,
                timestamp: new Date().toISOString()
            });
            throw new Error('구글 서버와 통신할 수 없습니다. 잠시 후 다시 시도해주세요.');
        }
        throw error;
    }
}

/**
 * 구글 사용자 프로필 조회
 *
 * @param {string} accessToken - 구글에서 받은 액세스 토큰
 * @returns {Promise<GoogleUserProfile>} 사용자 프로필 정보
 * @throws {Error} 프로필 조회 실패 시
 */
export async function getGoogleUserProfile(accessToken: string): Promise<GoogleUserProfile> {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[구글 프로필 조회] 실패:', {
                status: response.status,
                statusText: response.statusText,
                errorData: errorData,
                timestamp: new Date().toISOString()
            });
            throw new Error('구글 사용자 프로필을 가져올 수 없습니다.');
        }

        return response.json();
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        if (err.name === 'TypeError' || err.message?.includes('fetch')) {
            console.error('[구글 프로필 조회] 네트워크 오류:', {
                message: err.message,
                timestamp: new Date().toISOString()
            });
            throw new Error('구글 서버와 통신할 수 없습니다. 잠시 후 다시 시도해주세요.');
        }
        throw error;
    }
}
