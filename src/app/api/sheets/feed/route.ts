import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { demoSubmissions, extractCompany, getDetailedSlaStatus, priorityLabels, statusLabels } from '@/lib/qms';

interface SheetRowData {
  number: string;
  requested: string;
  company: string;
  condition: string;
  department: string;
  type: string;
  docNo: string;
  title: string;
  revision: string | number;
  pic: string;
  reviewer: string;
  priority: string;
  sla: number;
  due: string;
  status: string;
  slaStatus: string;
  approval: string;
  closed: string;
  latestNote: string;
}

function mapSubmissionToSheetRow(doc: (typeof demoSubmissions)[number]): SheetRowData {
  return {
    number: doc.number,
    requested: doc.requested,
    company: doc.company,
    condition: doc.condition === 'new' ? 'Baru' : 'Lama',
    department: doc.department,
    type: doc.type,
    docNo: doc.docNo,
    title: doc.title,
    revision: doc.revision,
    pic: doc.pic,
    reviewer: doc.reviewer || '—',
    priority: priorityLabels[doc.priority] || doc.priority,
    sla: doc.sla,
    due: doc.due,
    status: statusLabels[doc.status] || doc.status,
    slaStatus: getDetailedSlaStatus(doc).badgeLabel,
    approval: doc.approval || '—',
    closed: doc.closed || '—',
    latestNote: doc.history.filter(h => Boolean(h.note?.trim())).pop()?.note || '—',
  };
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let records: SheetRowData[] = [];

  if (!url || !key) {
    records = demoSubmissions.map(mapSubmissionToSheetRow);
  } else {
    try {
      const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
      const [submissions, departmentRows, typeRows, profiles, historyRows] = await Promise.all([
        client.from('document_submissions').select('*').is('archived_at', null).order('request_date', { ascending: false }),
        client.from('departments').select('id,name'),
        client.from('document_types').select('id,name'),
        client.from('profiles').select('id,full_name'),
        client.from('document_history').select('document_id,notes,created_at').order('created_at', { ascending: false }),
      ]);

      const deptMap = new Map((departmentRows.data ?? []).map(r => [r.id, r.name]));
      const typeMap = new Map((typeRows.data ?? []).map(r => [r.id, r.name]));
      const profileMap = new Map((profiles.data ?? []).map(r => [r.id, r.full_name]));
      const latestNoteMap = new Map<string, string>();
      for (const h of historyRows.data ?? []) {
        if (h.notes && !latestNoteMap.has(h.document_id)) {
          latestNoteMap.set(h.document_id, h.notes);
        }
      }

      records = (submissions.data ?? []).map((row): SheetRowData => {
        const deptName = deptMap.get(row.department_id) || '—';
        const { company } = extractCompany(row.remarks, deptName);
        return {
          number: row.submission_number,
          requested: row.request_date,
          company,
          condition: row.document_condition === 'new' ? 'Baru' : 'Lama',
          department: deptName,
          type: typeMap.get(row.document_type_id) || '—',
          docNo: row.document_number,
          title: row.document_title,
          revision: row.revision,
          pic: row.requestor_name,
          reviewer: row.reviewer_id ? profileMap.get(row.reviewer_id) || '—' : '—',
          priority: priorityLabels[row.priority as keyof typeof priorityLabels] || row.priority,
          sla: row.sla_days,
          due: row.due_date,
          status: statusLabels[row.status as keyof typeof statusLabels] || row.status,
          slaStatus: getDetailedSlaStatus({
            ...row,
            company,
            department: deptName,
            type: typeMap.get(row.document_type_id) || '—',
            docNo: row.document_number,
            title: row.document_title,
            pic: row.requestor_name,
            reviewer: '',
            sla: row.sla_days,
            due: row.due_date,
            remarks: '',
            reason: '',
            history: [],
            followups: []
          }).badgeLabel,
          approval: row.approval_date || '—',
          closed: row.closed_at ? row.closed_at.slice(0, 10) : '—',
          latestNote: latestNoteMap.get(row.id) || '—',
        };
      });
    } catch {
      records = demoSubmissions.map(mapSubmissionToSheetRow);
    }
  }

  const csvRows: string[] = [
    [
      'No',
      'Nomor Pengajuan',
      'Tanggal Pengajuan',
      'Perusahaan',
      'Kondisi Dokumen',
      'Departemen',
      'Jenis Dokumen',
      'Nomor Dokumen',
      'Judul Dokumen',
      'Revisi',
      'PIC / Requestor',
      'Reviewer',
      'Prioritas',
      'SLA Hari',
      'Tanggal Jatuh Tempo',
      'Status',
      'Status SLA',
      'Tanggal Persetujuan',
      'Tanggal Ditutup',
      'Catatan Reviewer Terakhir'
    ].map(escapeCsv).join(',')
  ];

  records.forEach((doc, idx) => {
    csvRows.push([
      idx + 1,
      doc.number,
      doc.requested,
      doc.company,
      doc.condition === 'new' ? 'Baru' : 'Lama',
      doc.department,
      doc.type,
      doc.docNo,
      doc.title,
      doc.revision,
      doc.pic,
      doc.reviewer,
      doc.priority,
      doc.sla,
      doc.due,
      doc.status,
      doc.slaStatus || '—',
      doc.approval || '—',
      doc.closed || '—',
      doc.latestNote || '—'
    ].map(escapeCsv).join(','));
  });

  return new NextResponse(csvRows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'inline; filename="qms_document_database.csv"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}
