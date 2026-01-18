import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Backend URL (server-side only, not exposed to browser)
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// BFF exchange secret (server-side only, shared with backend)
const BFF_EXCHANGE_SECRET =
  process.env.BFF_EXCHANGE_SECRET || 'dev-bff-secret-change-in-production';

// Google OAuth configuration (server-side only)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

// Cookie configuration
const COOKIE_NAME = 'token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Returns cookie options with proper security configuration.
 * Following secure-coding guidelines: explicit security attributes.
 */
function getAuthCookieOptions(maxAge: number = COOKIE_MAX_AGE) {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true, // Prevents XSS access
    secure: isProduction, // HTTPS only in production
    sameSite: 'lax' as const, // CSRF protection (Lax needed for OAuth redirect)
    path: '/', // Explicit scope
    maxAge, // Explicit expiration
  };
}

/**
 * Builds the Google OAuth authorization URL.
 * Following secure-coding guidelines: explicit OAuth parameters.
 */
function buildGoogleAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'profile email',
    access_type: 'offline',
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchanges Google auth code for tokens with Google directly,
 * then calls backend to create/find user and get JWT.
 */
async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ token: string; user: { id: string; email: string; displayName: string } } | null> {
  try {
    // Exchange code for tokens with Google
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Failed to exchange code for token:', await tokenResponse.text());
      return null;
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('Failed to get user info:', await userInfoResponse.text());
      return null;
    }

    const googleUser = await userInfoResponse.json();

    // Call backend to find or create user and get JWT
    // Include BFF secret to authenticate this server-to-server request
    const backendResponse = await fetch(`${BACKEND_URL}/api/auth/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BFF-Secret': BFF_EXCHANGE_SECRET,
      },
      body: JSON.stringify({
        googleId: googleUser.id,
        email: googleUser.email,
        displayName: googleUser.name || googleUser.email,
      }),
    });

    if (!backendResponse.ok) {
      console.error('Backend exchange failed:', await backendResponse.text());
      return null;
    }

    const result = await backendResponse.json();
    return result.data;
  } catch (error) {
    console.error('Token exchange error:', error);
    return null;
  }
}

/**
 * Hardcoded redirect paths for OAuth flow.
 * Following secure-coding guidelines: explicit paths prevent open redirect attacks.
 * Using relative paths ensures same-origin redirects.
 */
const REDIRECT_PATHS = {
  authCallback: '/auth/callback',
  authError: '/auth/error',
  apiAuthCallback: '/api/auth/callback',
} as const;

/**
 * Constructs a safe redirect URL using only the origin and hardcoded paths.
 * Following secure-coding guidelines: never use user input in redirect destinations.
 */
function getSafeRedirectUrl(
  origin: string,
  path: keyof typeof REDIRECT_PATHS,
  queryParams?: Record<string, string>
): string {
  const url = new URL(REDIRECT_PATHS[path], origin);
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

/**
 * GET handler for auth routes.
 * - /api/auth/google - Redirect to Google OAuth
 * - /api/auth/callback - Handle OAuth callback
 * - /api/auth/me - Return current user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await params;
  const pathStr = path.join('/');
  const origin = request.nextUrl.origin;

  // GET /api/auth/google - Redirect to Google OAuth consent
  if (pathStr === 'google') {
    if (!GOOGLE_CLIENT_ID) {
      return NextResponse.json(
        { success: false, error: 'Google OAuth not configured' },
        { status: 500 }
      );
    }

    const redirectUri = getSafeRedirectUrl(origin, 'apiAuthCallback');
    const authUrl = buildGoogleAuthUrl(redirectUri);
    return NextResponse.redirect(authUrl);
  }

  // GET /api/auth/callback - Handle OAuth callback
  if (pathStr === 'callback') {
    const code = request.nextUrl.searchParams.get('code');
    const error = request.nextUrl.searchParams.get('error');

    if (error) {
      return NextResponse.redirect(getSafeRedirectUrl(origin, 'authError', { error }));
    }

    if (!code) {
      return NextResponse.redirect(getSafeRedirectUrl(origin, 'authError', { error: 'no_code' }));
    }

    const redirectUri = getSafeRedirectUrl(origin, 'apiAuthCallback');
    const result = await exchangeCodeForToken(code, redirectUri);

    if (!result) {
      return NextResponse.redirect(
        getSafeRedirectUrl(origin, 'authError', { error: 'token_exchange_failed' })
      );
    }

    // Create response with redirect to frontend callback page (hardcoded path)
    const response = NextResponse.redirect(getSafeRedirectUrl(origin, 'authCallback'));

    // Set the JWT as an HttpOnly cookie
    response.cookies.set(COOKIE_NAME, result.token, getAuthCookieOptions());

    return response;
  }

  // GET /api/auth/me - Return current user
  if (pathStr === 'me') {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Call backend to get user info (backend validates JWT)
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Token is invalid or expired - clear the cookie
        const jsonResponse = NextResponse.json(
          { success: false, error: 'Invalid token' },
          { status: 401 }
        );
        jsonResponse.cookies.set(COOKIE_NAME, '', getAuthCookieOptions(0));
        return jsonResponse;
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      console.error('Failed to get current user:', error);
      return NextResponse.json({ success: false, error: 'Failed to get user' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
}

/**
 * POST handler for auth routes.
 * - /api/auth/logout - Clear auth cookie
 * - /api/auth/logout-all - Clear cookie and invalidate all tokens on backend
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await params;
  const pathStr = path.join('/');

  // POST /api/auth/logout - Clear auth cookie
  if (pathStr === 'logout') {
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    response.cookies.set(COOKIE_NAME, '', getAuthCookieOptions(0));
    return response;
  }

  // POST /api/auth/logout-all - Invalidate all tokens
  if (pathStr === 'logout-all') {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (token) {
      try {
        // Call backend to invalidate all tokens
        await fetch(`${BACKEND_URL}/api/auth/logout-all`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Failed to invalidate tokens on backend:', error);
        // Continue with logout even if backend call fails
      }
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out from all devices',
    });
    response.cookies.set(COOKIE_NAME, '', getAuthCookieOptions(0));
    return response;
  }

  return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
}
