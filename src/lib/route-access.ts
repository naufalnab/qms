import 'server-only';

import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { AppRole } from '@/lib/qms';

const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL
  || !(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function requireRouteRoles(allowedRoles: readonly AppRole[]) {
  if (isDemoMode) return;
  const client = await getSupabaseServerClient();
  if (!client) redirect('/login');

  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('role,is_active')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError || !profile?.is_active) redirect('/login');
  if (!allowedRoles.includes(profile.role as AppRole)) redirect('/');
}
