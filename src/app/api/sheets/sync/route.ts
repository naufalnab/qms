import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

// This is a database connectivity check; it must not claim Google Sheets sync succeeded.
export async function GET() {
  const client = await getSupabaseServerClient();
  if (!client) return NextResponse.json({ status: 'unavailable', verified: false, message: 'Database belum dikonfigurasi.' }, { status: 503 });
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Login diperlukan.' }, { status: 401 });
  const { data: profile, error: profileError } = await client
    .from('profiles').select('role,is_active').eq('id', user.id).maybeSingle();
  if (profileError || !profile || !profile.is_active || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Akses hanya untuk admin aktif.' }, { status: 403 });
  }

  const { count, error } = await client.from('document_submissions')
    .select('id', { count: 'exact', head: true }).is('archived_at', null);
  if (error) return NextResponse.json({ status: 'error', verified: false, message: 'Pemeriksaan database gagal.' }, { status: 503 });

  return NextResponse.json({
    status: 'not_configured',
    verified: false,
    databaseConnected: true,
    sheetSynced: false,
    recordsInDatabase: count ?? 0,
    message: 'Database terhubung, tetapi sinkronisasi privat ke Google Sheets belum dikonfigurasi.'
  }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}
