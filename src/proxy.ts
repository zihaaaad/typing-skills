import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function decodeJwtPayload(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Decode base64url payload
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// Note: this only decodes the JWT payload, it does not verify the signature —
// it exists purely to redirect unauthenticated/wrong-role page loads to the
// right place before render. Every API route independently verifies the
// signature via getUserFromRequest()/verifyToken() in src/lib/auth.ts, which
// is the actual authorization boundary.
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get('token')?.value;

  const isAuthPage = path === '/login' || path === '/register';
  const isAdminPage = path.startsWith('/admin');
  const isStudentPage = path.startsWith('/dashboard') || path.startsWith('/practice');

  if (!token) {
    // If not authenticated and trying to access protected page, redirect to
    // login, remembering where they were headed so they land there after.
    if (isAdminPage || isStudentPage) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', path);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    // Token is corrupt, clear it and redirect to login
    if (isAdminPage || isStudentPage) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', path);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('token');
      return response;
    }
    return NextResponse.next();
  }

  // Redirect authenticated users away from login/register
  if (isAuthPage) {
    if (payload.role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', request.url));
    } else {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Authorize Admin pages
  if (isAdminPage && payload.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Authorize Student/User pages — both STUDENT and USER roles are allowed
  if (isStudentPage && payload.role !== 'STUDENT' && payload.role !== 'USER') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Config to specify matching routes
export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/practice/:path*',
    '/login',
    '/register',
  ],
};
