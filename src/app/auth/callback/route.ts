import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const code = request.nextUrl.searchParams.get('code');
  const requestedNext = request.nextUrl.searchParams.get('next') || '/accept-invite';
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/accept-invite';
  if (!url || !key || !code) return NextResponse.redirect(new URL('/login?invite=invalid', request.url));

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(items) {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL('/login?invite=invalid', request.url));
  const redirect = NextResponse.redirect(new URL(next, request.url));
  response.cookies.getAll().forEach(({ name, value, ...options }) => redirect.cookies.set(name, value, options));
  return redirect;
}
