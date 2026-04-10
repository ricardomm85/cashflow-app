import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for auth callback (must process without auth check)
  if (pathname.startsWith('/auth/callback')) {
    return NextResponse.next();
  }

  // Skip for static assets and API routes
  if (pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // For the landing page (/), just pass through without session check
  if (pathname === '/') {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);

  const publicRoutes = ['/login'];
  const isPublicRoute = publicRoutes.includes(pathname);

  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
