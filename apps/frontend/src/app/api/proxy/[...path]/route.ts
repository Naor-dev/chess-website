import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Backend URL (server-side only, not exposed to browser)
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Cookie name must match auth route
const COOKIE_NAME = 'token';

/**
 * Allowed API path prefixes.
 * Only these paths can be proxied to prevent SSRF attacks.
 * Following secure-coding guidelines: explicit allowlist over implicit allow-all.
 */
const ALLOWED_PATH_PREFIXES = ['games', 'users', 'auth'] as const;

/**
 * Validates and sanitizes the proxy path.
 * Following secure-coding guidelines: validate at system boundaries.
 *
 * @returns Sanitized path or null if invalid
 */
function validateProxyPath(path: string): string | null {
  // Reject empty paths
  if (!path || path.trim() === '') {
    return null;
  }

  // Normalize path: remove leading/trailing slashes, collapse multiple slashes
  const normalized = path
    .replace(/^\/+/, '') // Remove leading slashes
    .replace(/\/+$/, '') // Remove trailing slashes
    .replace(/\/+/g, '/'); // Collapse multiple slashes

  // Block path traversal attempts (both encoded and decoded)
  const traversalPatterns = [
    '..', // Direct traversal
    '%2e%2e', // URL encoded
    '%252e%252e', // Double encoded
    '.%2e', // Mixed encoding
    '%2e.', // Mixed encoding
  ];

  const lowerPath = normalized.toLowerCase();
  for (const pattern of traversalPatterns) {
    if (lowerPath.includes(pattern.toLowerCase())) {
      return null;
    }
  }

  // Block null bytes and other dangerous characters
  if (/[\x00-\x1f\x7f]/.test(normalized)) {
    return null;
  }

  // Check against allowlist - path must start with an allowed prefix
  const firstSegment = normalized.split('/')[0];
  if (!ALLOWED_PATH_PREFIXES.includes(firstSegment as (typeof ALLOWED_PATH_PREFIXES)[number])) {
    return null;
  }

  return normalized;
}

/**
 * Forwards a request to the backend API with JWT authentication.
 * Reads token from HttpOnly cookie and adds as Authorization header.
 */
async function proxyRequest(
  request: NextRequest,
  path: string,
  method: string
): Promise<NextResponse> {
  // Validate path before proxying
  const validatedPath = validateProxyPath(path);
  if (!validatedPath) {
    return NextResponse.json(
      { success: false, error: 'Invalid API path', code: 'INVALID_PATH' },
      { status: 400 }
    );
  }
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  // Build headers for backend request
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Prepare request options
  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  // Add body for non-GET requests
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      const body = await request.text();
      if (body) {
        fetchOptions.body = body;
      }
    } catch {
      // No body, which is fine for some requests
    }
  }

  try {
    // Forward request to backend (using validated path)
    const backendUrl = `${BACKEND_URL}/api/${validatedPath}`;
    const response = await fetch(backendUrl, fetchOptions);

    // Get response body
    const data = await response.json().catch(() => null);

    // Create response with same status code
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        // Preserve any relevant headers from backend
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error(`Proxy error for ${method} /api/${validatedPath}:`, error);
    return NextResponse.json({ success: false, error: 'Backend request failed' }, { status: 502 });
  }
}

/**
 * GET /api/proxy/[...path]
 * Proxies GET requests to backend API
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await params;
  const pathStr = path.join('/');

  // Append query string if present
  const searchParams = request.nextUrl.searchParams.toString();
  const fullPath = searchParams ? `${pathStr}?${searchParams}` : pathStr;

  return proxyRequest(request, fullPath, 'GET');
}

/**
 * POST /api/proxy/[...path]
 * Proxies POST requests to backend API
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await params;
  return proxyRequest(request, path.join('/'), 'POST');
}

/**
 * PUT /api/proxy/[...path]
 * Proxies PUT requests to backend API
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await params;
  return proxyRequest(request, path.join('/'), 'PUT');
}

/**
 * PATCH /api/proxy/[...path]
 * Proxies PATCH requests to backend API
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await params;
  return proxyRequest(request, path.join('/'), 'PATCH');
}

/**
 * DELETE /api/proxy/[...path]
 * Proxies DELETE requests to backend API
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await params;
  return proxyRequest(request, path.join('/'), 'DELETE');
}
