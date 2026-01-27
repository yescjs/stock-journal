/**
 * 네이버 OAuth 인증 관련 함수들
 * - getNaverAuthUrl: OAuth 인증 URL 생성
 * - getNaverAccessToken: 액세스 토큰 교환
 * - getNaverUserProfile: 사용자 프로필 조회
 */

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
 * 네이버 OAuth 인증에 필요한 환경변수 검증
 *
 * 검증 항목:
 * - NEXT_PUBLIC_NAVER_CLIENT_ID: 네이버 OAuth 앱 ID
 * - NAVER_CLIENT_SECRET: 네이버 OAuth 앱 비밀키 (서버 환경변수)
 * - NEXT_PUBLIC_BASE_URL: 콜백 URL 생성에 사용할 기본 URL
 *
 * @throws {Error} 필수 환경변수가 누락된 경우
 * @returns {NaverEnvConfig} 검증된 환경변수 설정 객체
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
 *
 * 사용자를 네이버 로그인 페이지로 리다이렉트하기 위한 URL을 생성합니다.
 * CSRF 방지를 위해 state 파라미터를 포함합니다.
 *
 * @param {string} state - CSRF 방지용 state 값 (타임스탬프-난수 형식)
 * @returns {string} 네이버 OAuth 인증 URL
 * @example
 * const state = `${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
 * const url = getNaverAuthUrl(state);
 * // https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=...&redirect_uri=...&state=...
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
 * 네이버 OAuth 인증 코드를 액세스 토큰으로 교환
 *
 * 네이버 로그인 완료 후 받은 인증 코드를 사용하여
 * 실제 API 호출에 필요한 액세스 토큰을 받아옵니다.
 *
 * 에러 처리:
 * - 네트워크 오류: 사용자 친화적 메시지 제공
 * - API 오류: 상세한 로그 기록
 *
 * @param {string} code - 네이버에서 받은 인증 코드
 * @param {string} state - CSRF 방지용 state 값
 * @returns {Promise<NaverTokenResponse>} access_token, refresh_token 등 포함
 * @throws {Error} 토큰 교환 실패 시
 */
export async function getNaverAccessToken(code: string, state: string): Promise<NaverTokenResponse> {
    const { clientId, clientSecret } = validateNaverEnv();

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
    } catch (error: unknown) {
        // 네트워크 오류와 기타 오류 구분
        const err = error instanceof Error ? error : new Error(String(error));
        if (err.name === 'TypeError' || err.message?.includes('fetch')) {
            console.error('[네이버 토큰 교환] 네트워크 오류:', {
                message: err.message,
                timestamp: new Date().toISOString()
            });
            throw new Error('네이버 서버와 통신할 수 없습니다. 잠시 후 다시 시도해주세요.');
        }
        throw error;
    }
}

/**
 * 네이버 사용자 프로필 조회
 *
 * 액세스 토큰을 사용하여 네이버에서 로그인한 사용자의
 * 기본 정보(ID, 이메일, 이름, 닉네임 등)를 조회합니다.
 *
 * 에러 처리:
 * - 네트워크 오류: 사용자 친화적 메시지 제공
 * - API 오류: 상세한 로그 기록
 *
 * @param {string} accessToken - 네이버에서 받은 액세스 토큰
 * @returns {Promise<NaverUserProfile>} resultcode와 사용자 프로필 정보
 * @throws {Error} 프로필 조회 실패 시
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
    } catch (error: unknown) {
        // 네트워크 오류와 기타 오류 구분
        const err = error instanceof Error ? error : new Error(String(error));
        if (err.name === 'TypeError' || err.message?.includes('fetch')) {
            console.error('[네이버 프로필 조회] 네트워크 오류:', {
                message: err.message,
                timestamp: new Date().toISOString()
            });
            throw new Error('네이버 서버와 통신할 수 없습니다. 잠시 후 다시 시도해주세요.');
        }
        throw error;
    }
}

