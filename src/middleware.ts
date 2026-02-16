import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protect chat routes
  if (req.nextUrl.pathname.startsWith('/chat') && !session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Redirect logged in users from auth pages
  if ((req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/register') && session) {
    return NextResponse.redirect(new URL('/chat', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/chat/:path*', '/login', '/register'],
};
