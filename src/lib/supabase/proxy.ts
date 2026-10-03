import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const isLogin = request.nextUrl.pathname === '/login';
  const isAuthCallback = request.nextUrl.pathname === '/auth/callback';
  if ((error || !claims) && !isLogin && !isAuthCallback) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (claims && isLogin) {
    const destination = request.nextUrl.searchParams.get('next');
    const safePath = destination?.startsWith('/') && !destination.startsWith('//') ? destination : '/';
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = safePath;
    homeUrl.search = '';
    return NextResponse.redirect(homeUrl);
  }
  return response;
}
