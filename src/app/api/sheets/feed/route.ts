import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { loadSubmissions } from '@/lib/qms-data';
import { getDetailedSlaStatus, priorityLabels, statusLabels } from '@/lib/qms';

// This endpoint is a manual admin-only export, not a public Google IMPORTDATA feed.
// A private Sheets integration must authenticate server-to-server and scope data by tenant.
export async function GET() {
  const client = await getSupabaseServerClient();
  if (!client) return NextResponse.json({ error: 'Layanan database tidak tersedia.' }, { status: 503 });

  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Login diperlukan.' }, { status: 401 });

  const { data: profile, error: profileError } = await client
    .from('profiles').select('role,is_active').eq('id', user.id).maybeSingle();
  if (profileError || !profile || !profile.is_active || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Hanya admin aktif yang dapat mengekspor data.' }, { status: 403 });
  }

  try {
    // Use the user's cookie-scoped client and RLS, never a service-role secret.
    const documents = await loadSubmissions(client);
    const rows = [[
      'No', 'Nomor Pengajuan', 'Tanggal Pengajuan', 'Perusahaan', 'Kondisi Dokumen',
      'Departemen', 'Jenis Dokumen', 'Nomor Dokumen', 'Judul Dokumen', 'Revisi',
      'PIC / Requestor', 'Reviewer', 'Prioritas', 'SLA Hari', 'Tanggal Jatuh Tempo',
      'Status', 'Status SLA', 'Tanggal Persetujuan', 'Tanggal Ditutup', 'Catatan Reviewer Terakhir'
    ].map(escapeCsv).join(',')];

    documents.forEach((doc, idx) => {
      rows.push([
        idx + 1, doc.number, doc.requested, doc.company,
        doc.condition === 'new' ? 'Baru' : 'Lama', doc.department, doc.type,
        doc.docNo, doc.title, doc.revision, doc.pic, doc.reviewer || '—',
        priorityLabels[doc.priority], doc.sla, doc.due,
        statusLabels[doc.status], getDetailedSlaStatus(doc).badgeLabel,
        doc.approval || '—', doc.closed || '—',
        doc.history.filter(h => Boolean(h.note?.trim())).at(-1)?.note || '—'
      ].map(escapeCsv).join(','));
    });

    return new NextResponse(rows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="qms_document_export.csv"',
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Ekspor tidak tersedia. Coba kembali nanti.' }, { status: 503 });
  }
}

export function escapeCsv(value: unknown): string {
  let str = String(value ?? '');
  // Prevent spreadsheet formula execution when CSV cells are opened in Excel/Sheets.
  if (/^[\s\x00-\x1f]*[=+@-]/.test(str)) str = `\'${str}`;
  return `"${str.replace(/"/g, '""')}"`;
}
