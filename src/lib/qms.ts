export type Status = 'draft' | 'submitted' | 'under_review' | 'qmsr_review' | 'need_revision' | 'resubmitted' | 'approved' | 'rejected' | 'closed';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Condition = 'new' | 'existing';
export type Company = 'PT. Baramuda Bahari' | 'PT. Mega Marine Pride';
export const companies: Company[] = ['PT. Baramuda Bahari', 'PT. Mega Marine Pride'];
export const defaultCompany: Company = 'PT. Baramuda Bahari';

export type Department = { id: string; name: string };
export type DocumentType = { id: string; name: string; sla: number };
export type Reviewer = { id: string; name: string };
export type ReviewerOption = Reviewer & { inactive: boolean };
export type HistoryEntry = { action: string; note?: string; actor: string; at: string; role?: string };
export type Followup = { date: string; result: string; next: string; actor: string };
export type AppRole = 'admin' | 'qms' | 'qms_section_head' | 'qmsr';
export type AppUser = { id: string; fullName: string; role: AppRole; email?: string };

export type Attachment = {
  id: string;
  documentId: string;
  fileName: string;
  storagePath: string;
  fileType: string;
  fileSize: number;
  uploadedBy?: string;
  uploadedByName?: string;
  createdAt: string;
  url?: string;
};

export type Submission = {
  id: string;
  number: string;
  requested: string;
  condition: Condition;
  company: Company;
  department: string;
  type: string;
  docNo: string;
  title: string;
  revision: string;
  reason: string;
  pic: string;
  reviewer: string;
  reviewerId?: string;
  priority: Priority;
  sla: number;
  due: string;
  status: Status;
  approval?: string;
  closed?: string;
  remarks: string;
  history: HistoryEntry[];
  followups: Followup[];
  attachments?: Attachment[];
  createdBy?: string;
};

export function extractCompany(remarks?: string, departmentName?: string): { company: Company; cleanRemarks: string } {
  const raw = remarks || '';
  if (raw.startsWith('[PT. Mega Marine Pride]')) {
    return { company: 'PT. Mega Marine Pride', cleanRemarks: raw.replace('[PT. Mega Marine Pride]', '').trim() };
  }
  if (raw.startsWith('[PT. Baramuda Bahari]')) {
    return { company: 'PT. Baramuda Bahari', cleanRemarks: raw.replace('[PT. Baramuda Bahari]', '').trim() };
  }
  if (departmentName && /shrimp/i.test(departmentName)) {
    return { company: 'PT. Mega Marine Pride', cleanRemarks: raw.trim() };
  }
  return { company: 'PT. Baramuda Bahari', cleanRemarks: raw.trim() };
}

export function formatRemarksWithCompany(company: Company, remarks?: string): string {
  const clean = (remarks || '').replace(/^\[(PT\. Baramuda Bahari|PT\. Mega Marine Pride)\]\s*/, '').trim();
  return clean ? `[${company}] ${clean}` : `[${company}]`;
}

export function canViewDocument(user: AppUser | null, document: Submission) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'qms') return document.createdBy === user.id;
  if (user.role === 'qmsr') return document.reviewerId === user.id;
  return document.status !== 'draft';
}

export function canSubmitDocument(user: AppUser | null) {
  return user?.role === 'admin' || user?.role === 'qms';
}

export function canManageMasterData(user: AppUser | null) {
  return user?.role === 'admin';
}

export function canReviewDocument(user: AppUser | null, document: Submission) {
  if (!user) return false;
  if (user.role === 'admin') return !['draft', 'approved', 'rejected', 'closed'].includes(document.status);
  if (user.role === 'qms_section_head') return ['submitted', 'resubmitted', 'under_review'].includes(document.status);
  return user.role === 'qmsr' && user.id === document.reviewerId && document.status === 'qmsr_review';
}

export function canEditSubmission(user: AppUser | null, document: Submission) {
  return user?.role === 'admin' || (user?.role === 'qms' && user.id === document.createdBy && ['draft', 'need_revision'].includes(document.status));
}

export function canPerformWorkflowAction(user: AppUser | null, document: Submission, next: Status) {
  if (!user || !canTransitionStatus(document.status, next, user.role)) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'qms') return document.createdBy === user.id;
  if (user.role === 'qmsr') return user.id === document.reviewerId && document.status === 'qmsr_review';
  return user.role === 'qms_section_head' && ['submitted', 'resubmitted', 'under_review'].includes(document.status);
}

export const departments: Department[] = [
  'QMS', 'QC', 'Production', 'Warehouse', 'Purchasing NRM', 'HRM', 'Maintenance', 'Finance', 'QA', 'PPIC',
  'RND', 'Purchasing RM', 'EXIM', 'Marketing', 'Spec', 'General Affair', 'House Keeping', 'Cold Storage',
  'Laboratorium', 'QC WHS', 'HSE', 'Engineering', 'IT', 'Security', 'Legal', 'Beacukai', 'Production Crab',
  'Production Shrimp', 'QC Crab', 'QC Shrimp'
].map((name, i) => ({ id: String(i + 1), name }));

export const documentTypes: DocumentType[] = [
  { id: 'form', name: 'Form', sla: 3 },
  { id: 'wi', name: 'WI', sla: 5 },
  { id: 'sop', name: 'SOP', sla: 7 },
  { id: 'policy', name: 'Policy', sla: 10 },
  { id: 'external', name: 'External Document', sla: 5 },
  { id: 'other', name: 'Other', sla: 7 }
];

export const statusLabels: Record<Status, string> = {
  draft: 'Draft',
  submitted: 'Diajukan',
  under_review: 'Review QMS Section Head',
  qmsr_review: 'Review QMSR',
  need_revision: 'Perlu Revisi',
  resubmitted: 'Diajukan Ulang',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  closed: 'Ditutup'
};

export const statusOrder: Status[] = ['draft', 'submitted', 'under_review', 'qmsr_review', 'need_revision', 'resubmitted', 'approved', 'rejected', 'closed'];
export const priorityLabels: Record<Priority, string> = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi', critical: 'Kritis' };
export const slaLabels = { on_time: 'Tepat Waktu', due_soon: 'Segera Jatuh Tempo', overdue: 'Terlambat', completed: 'Selesai' } as const;

export type TrackingStage = {
  step: number;
  id: string;
  name: string;
  roleRequired: string;
  description: string;
};

export const trackingStages: TrackingStage[] = [
  { step: 1, id: 'submitted', name: 'Pengajuan Awal', roleRequired: 'QMS', description: 'Dokumen dibuat dan diajukan oleh pengaju QMS.' },
  { step: 2, id: 'under_review', name: 'Under Review QMS Sec. Head', roleRequired: 'QMS Section Head', description: 'Review tahap 1 kelayakan format dan kesesuaian awal.' },
  { step: 3, id: 'need_revision', name: 'Perlu Revisi / Feedback', roleRequired: 'QMS / Submitter', description: 'Catatan perbaikan teknis diberikan dan ditindaklanjuti.' },
  { step: 4, id: 'resubmitted', name: 'Diajukan Ulang', roleRequired: 'QMS', description: 'Pengajuan kembali setelah revisi format atau substansi.' },
  { step: 5, id: 'qmsr_review', name: 'Review QMSR', roleRequired: 'QMSR', description: 'Review tahap 2 dan verifikasi kepatuhan sistem mutu oleh QMSR.' },
  { step: 6, id: 'approved', name: 'Approved & Final Pengesahan', roleRequired: 'QMSR / Admin', description: 'Dokumen disetujui, disahkan, dan siap ditutup atau didistribusikan.' },
];

// Indonesian National Holidays (2025 - 2027)
export const indonesianHolidays = new Set<string>([
  // 2025
  '2025-01-01', '2025-01-27', '2025-01-29', '2025-03-29', '2025-03-31', '2025-04-01',
  '2025-04-18', '2025-05-01', '2025-05-12', '2025-05-29', '2025-06-01', '2025-06-07',
  '2025-06-27', '2025-08-17', '2025-09-05', '2025-12-25',
  // 2026
  '2026-01-01', '2026-01-16', '2026-02-17', '2026-03-20', '2026-03-21', '2026-03-22',
  '2026-04-03', '2026-05-01', '2026-05-14', '2026-05-27', '2026-05-31', '2026-06-01',
  '2026-06-16', '2026-08-17', '2026-08-25', '2026-12-25',
  // 2027
  '2027-01-01', '2027-02-06', '2027-03-09', '2027-03-10', '2027-03-26', '2027-05-01',
  '2027-05-06', '2027-05-16', '2027-05-20', '2027-06-01', '2027-06-06', '2027-08-17',
  '2027-12-25'
]);

export function isBusinessDay(dateOrStr: Date | string): boolean {
  const date = typeof dateOrStr === 'string'
    ? (() => {
        const [y, m, d] = dateOrStr.slice(0, 10).split('-').map(Number);
        return new Date(Date.UTC(y, m - 1, d, 5));
      })()
    : dateOrStr;
  const day = date.getUTCDay(); // 0 is Sunday, 6 is Saturday in UTC (offset 5h corresponds to Asia/Jakarta noon)
  if (day === 0 || day === 6) return false;
  const iso = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  return !indonesianHolidays.has(iso);
}

export function getPriorityAdjustedSla(baseSla: number, priority: Priority = 'medium'): number {
  if (priority === 'critical') return Math.max(1, Math.floor(baseSla * 0.4));
  if (priority === 'high') return Math.max(2, baseSla - 1);
  if (priority === 'low') return baseSla + 1;
  return baseSla;
}

export function calculateBusinessDueDate(requested: string, slaDays: number, priority: Priority = 'medium'): string {
  const targetDays = getPriorityAdjustedSla(slaDays, priority);
  const [year, month, day] = requested.split('-').map(Number);
  const current = new Date(Date.UTC(year, month - 1, day, 5));
  let added = 0;
  while (added < targetDays) {
    current.setUTCDate(current.getUTCDate() + 1);
    if (isBusinessDay(current)) {
      added++;
    }
  }
  return current.toISOString().slice(0, 10);
}

export function calculateDueDate(requested: string, sla: number, priority: Priority = 'medium') {
  return calculateBusinessDueDate(requested, sla, priority);
}

export function calculateAging(doc: Submission, todayDate = new Date()) {
  const end = doc.closed
    ? new Date(`${doc.closed}T12:00:00+07:00`)
    : new Date(`${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(todayDate)}T12:00:00+07:00`);
  const start = new Date(`${doc.requested}T12:00:00+07:00`);
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
}

export type SlaDetail = {
  status: 'on_time' | 'due_soon' | 'overdue' | 'completed';
  badgeLabel: string;
  hoursRemaining: number;
  isOverdue: boolean;
  isCompleted: boolean;
  agingDays: number;
};

export function getDetailedSlaStatus(doc: Submission, now = new Date()): SlaDetail {
  if (doc.status === 'closed' || doc.status === 'approved') {
    const completionDate = doc.status === 'closed'
      ? (doc.closed || doc.approval || doc.requested)
      : (doc.approval || doc.requested);
    const isCompletedOnTime = !doc.due || completionDate <= doc.due;
    return {
      status: 'completed',
      badgeLabel: isCompletedOnTime ? 'Selesai Tepat Waktu' : 'Selesai (Terlambat)',
      hoursRemaining: 0,
      isOverdue: !isCompletedOnTime,
      isCompleted: true,
      agingDays: calculateAging(doc, now),
    };
  }

  // Get current Jakarta time
  const jakartaParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false
  }).formatToParts(now);

  const partMap: Record<string, number> = {};
  for (const p of jakartaParts) {
    if (p.type !== 'literal') partMap[p.type] = Number(p.value);
  }

  const y = partMap.year || now.getFullYear();
  const m = partMap.month || (now.getMonth() + 1);
  const d = partMap.day || now.getDate();
  const hh = partMap.hour ?? now.getHours();
  const mm = partMap.minute ?? now.getMinutes();

  // Target due date 17:00 WIB (10:00 UTC)
  const [dueY, dueM, dueD] = doc.due.split('-').map(Number);
  const dueTimestamp = Date.UTC(dueY, dueM - 1, dueD, 10);
  const currentTimestamp = Date.UTC(y, m - 1, d, hh - 7, mm);

  const diffHours = Math.round((dueTimestamp - currentTimestamp) / 3600000);

  if (diffHours < 0) {
    const overdueHours = Math.abs(diffHours);
    const overdueDays = Math.floor(overdueHours / 24);
    const badgeLabel = overdueHours < 24 ? `Terlambat ${overdueHours} jam` : `Terlambat ${overdueDays} hari`;
    return {
      status: 'overdue',
      badgeLabel,
      hoursRemaining: diffHours,
      isOverdue: true,
      isCompleted: false,
      agingDays: calculateAging(doc, now),
    };
  }

  if (diffHours <= 12) {
    return {
      status: 'due_soon',
      badgeLabel: `Kritis: ${diffHours} jam lagi`,
      hoursRemaining: diffHours,
      isOverdue: false,
      isCompleted: false,
      agingDays: calculateAging(doc, now),
    };
  }

  if (diffHours <= 36) {
    return {
      status: 'due_soon',
      badgeLabel: `Sisa ${diffHours} jam`,
      hoursRemaining: diffHours,
      isOverdue: false,
      isCompleted: false,
      agingDays: calculateAging(doc, now),
    };
  }

  const daysRemaining = Math.ceil(diffHours / 24);
  return {
    status: 'on_time',
    badgeLabel: `Aman (${daysRemaining} hari)`,
    hoursRemaining: diffHours,
    isOverdue: false,
    isCompleted: false,
    agingDays: calculateAging(doc, now),
  };
}

export function getSlaStatus(doc: Submission, todayDate = new Date()): keyof typeof slaLabels {
  return getDetailedSlaStatus(doc, todayDate).status;
}

export function getActionRequired(doc: Submission) {
  if (doc.status === 'closed' || doc.status === 'rejected') return 'Tidak ada tindakan';
  if (doc.status === 'need_revision') return 'Perbaiki dokumen';
  if (doc.status === 'approved') return 'Lengkapi dan tutup dokumen';
  if (getSlaStatus(doc) === 'overdue') return 'Follow up reviewer';
  if (getSlaStatus(doc) === 'due_soon') return 'Follow up sebelum deadline';
  if (doc.status === 'submitted' || doc.status === 'resubmitted') return 'Menunggu QMS Section Head';
  if (doc.status === 'under_review') return 'Menunggu keputusan QMS Section Head';
  if (doc.status === 'qmsr_review') return 'Menunggu QMSR';
  return 'Kirim pengajuan';
}

export const allowedTransitions: Record<Status, Status[]> = {
  draft: ['submitted'],
  submitted: ['under_review'],
  under_review: ['need_revision', 'qmsr_review'],
  qmsr_review: ['need_revision', 'approved', 'rejected'],
  need_revision: ['resubmitted'],
  resubmitted: ['under_review'],
  approved: ['closed'],
  rejected: [],
  closed: []
};

export function canTransitionStatus(from: Status, to: Status, role = 'admin') {
  if (!allowedTransitions[from].includes(to)) return false;
  if (role === 'admin') return true;
  if (role === 'qms') return (from === 'draft' && to === 'submitted') || (from === 'need_revision' && to === 'resubmitted') || (from === 'approved' && to === 'closed');
  if (role === 'qms_section_head') return (to === 'under_review' && (from === 'submitted' || from === 'resubmitted')) || (from === 'under_review' && (to === 'qmsr_review' || to === 'need_revision'));
  if (role === 'qmsr') return from === 'qmsr_review' && (to === 'approved' || to === 'need_revision' || to === 'rejected');
  return false;
}

export const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Jakarta'
      }).format(new Date(`${value.slice(0, 10)}T12:00:00+07:00`))
    : '—';

export const formatDateTime = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta'
      }).format(new Date(value))
    : '—';

export const currentMonthKey = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(date)
    .slice(0, 7);

export const todayLabel = () =>
  new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date());

export const todayISO = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

// Demo Seed Submissions for local/preview exploration
const jakartaDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const today = new Date(`${jakartaDate}T12:00:00+07:00`);
const iso = (offset: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

const make = (i: number, status: Status, requestOffset: number, opts: Partial<Submission> = {}): Submission => {
  const type = documentTypes[i % documentTypes.length];
  const requested = iso(requestOffset);
  const sla = type.sla;
  const company = i % 2 === 0 ? 'PT. Baramuda Bahari' : 'PT. Mega Marine Pride';
  const priority = (['medium', 'high', 'low', 'critical'] as Priority[])[i % 4];
  const dueDate = calculateBusinessDueDate(requested, sla, priority);

  return {
    id: `demo-${i}`,
    number: `QMS-${today.getFullYear()}-${String(i).padStart(4, '0')}`,
    requested,
    condition: i % 3 === 0 ? 'existing' : 'new',
    company,
    department: departments[i % departments.length].name,
    type: type.name,
    docNo: `${type.name.toUpperCase()}-${['IT', 'QA', 'PR', 'QC'][i % 4]}-${today.getFullYear()}-${String(10 + i).padStart(3, '0')}`,
    title: [
      'Perjanjian Kerjasama (MoU) Integrasi Layanan Multi-Cloud Enterprise',
      'Standar Operasional Penanganan Insiden Keamanan Informasi v2.4',
      'Surat Keputusan Kebijakan Kerja Fleksibel (Hybrid Work Policy)',
      'Proposal Proyek Digitalisasi Arsip & Dokumen Mutu Perusahaan',
      'Pemberian Izin Akses Khusus API Gateway Rekanan Perbankan',
      'Pemeriksaan Mutu Bahan Baku Masuk Standar Ekspor'
    ][i % 6],
    revision: `${String.fromCharCode(65 + (i % 4))}${i % 2 ? '.1' : ''}`,
    reason: i % 3 === 0 ? 'Pembaruan persyaratan tahunan' : 'Dokumen baru',
    pic: ['Rosalia Pratiwi', 'Dimas Pratama', 'Siti Rahma', 'Budi Santoso'][i % 4],
    reviewer: ['Junita Dwi Lia H.', 'Nina Putri', 'Rizky Hidayat'][i % 3],
    reviewerId: 'demo-reviewer-1',
    priority,
    sla,
    due: dueDate,
    status,
    remarks: formatRemarksWithCompany(company, i % 4 === 0 ? 'Mohon ditinjau sesuai prosedur terbaru.' : ''),
    history: [
      { action: 'Pengajuan Awal', actor: 'Rosalia Pratiwi', at: `${iso(requestOffset)}T08:30:00+07:00`, role: 'QMS' },
      ...(status !== 'submitted' && status !== 'draft'
        ? [{ action: 'Review QMS Section Head', actor: 'Ahmad Faisal', at: `${iso(requestOffset + 1)}T10:15:00+07:00`, role: 'QMS Section Head', note: 'Pemeriksaan format dan kelayakan awal dokumen.' }]
        : []),
      ...(status === 'need_revision'
        ? [{ action: 'Perlu Revisi', actor: 'Ahmad Faisal', at: `${iso(requestOffset + 2)}T14:00:00+07:00`, role: 'QMS Section Head', note: 'Terdapat ketidaksesuaian penomoran sub-alur 3.2 pada bab mitigasi SLA dan margin tabel.' }]
        : []),
      ...(status === 'approved' || status === 'closed'
        ? [
            { action: 'Review QMSR', actor: 'Junita Dwi Lia H.', at: `${iso(requestOffset + 2)}T11:00:00+07:00`, role: 'QMSR', note: 'Review kepatuhan sistem mutu.' },
            { action: 'Disetujui', actor: 'Junita Dwi Lia H.', at: `${iso(requestOffset + 3)}T15:00:00+07:00`, role: 'QMSR', note: 'Tinjauan mutu komprehensif disetujui tanpa catatan tambahan. Dokumen memenuhi seluruh klausul.' }
          ]
        : [])
    ],
    followups: [],
    attachments: [
      {
        id: `att-demo-${i}`,
        documentId: `demo-${i}`,
        fileName: `DOK-${type.name.toUpperCase()}-${String(10 + i).padStart(3, '0')}.pdf`,
        storagePath: `demo/dok-${i}.pdf`,
        fileType: 'application/pdf',
        fileSize: 1024 * 350,
        uploadedByName: 'Rosalia Pratiwi',
        createdAt: `${requested}T09:00:00+07:00`
      }
    ],
    ...opts
  };
};

export const demoSubmissions: Submission[] = [
  make(1, 'under_review', -4, {
    type: 'SOP',
    sla: 7,
    due: iso(1),
    company: 'PT. Baramuda Bahari',
    docNo: 'SOP/IT/2026/042',
    title: 'Perjanjian Kerjasama (MoU) Integrasi Layanan Multi-Cloud Enterprise',
    priority: 'high',
    pic: 'Rosalia Pratiwi',
    reviewer: 'Junita Dwi Lia H.',
    revision: 'Rev 01',
    reason: 'Pembaruan arsitektur cloud integrasi',
    history: [
      { action: 'Pengajuan Awal', actor: 'Rosalia Pratiwi', at: `${iso(-4)}T08:30:00+07:00`, role: 'QMS' },
      { action: 'Review QMS Section Head', actor: 'Ahmad Faisal', at: `${iso(-3)}T10:15:00+07:00`, role: 'QMS Section Head', note: 'Sedang direview QMS Sec. Head' },
      { action: 'Perlu Revisi', actor: 'Ahmad Faisal', at: `${iso(-2)}T14:00:00+07:00`, role: 'QMS Section Head', note: 'Terdapat ketidaksesuaian penomoran sub-alur 3.2 pada bab mitigasi SLA dan margin tabel.' },
      { action: 'Diajukan Ulang', actor: 'Rosalia Pratiwi', at: `${iso(-1)}T09:00:00+07:00`, role: 'QMS', note: 'Format telah disesuaikan sesuai arahan Section Head.' },
      { action: 'Review QMS Section Head', actor: 'Ahmad Faisal', at: `${iso(0)}T08:45:00+07:00`, role: 'QMS Section Head', note: 'Pemeriksaan ulang format dan kelayakan substansi.' }
    ],
    followups: [{ date: iso(-1), result: 'Reviewer sudah diingatkan.', next: 'Menunggu hasil verifikasi.', actor: 'Rosalia Pratiwi' }]
  }),
  make(2, 'need_revision', -5, {
    type: 'WI',
    sla: 5,
    due: iso(0),
    company: 'PT. Mega Marine Pride',
    docNo: 'LPI/FAT/2026/063',
    title: 'Laporan Realisasi Anggaran Pengadaan Perangkat Keras Tahap II',
    priority: 'high',
    pic: 'Dimas Pratama',
    reviewer: 'Junita Dwi Lia H.',
    reason: 'Pembaruan alur pengadaan',
    history: [
      { action: 'Pengajuan Awal', actor: 'Dimas Pratama', at: `${iso(-5)}T09:00:00+07:00`, role: 'QMS' },
      { action: 'Perlu Revisi', actor: 'Junita Dwi Lia H.', at: `${iso(-1)}T16:00:00+07:00`, role: 'QMSR', note: 'Tambahkan kriteria pemeriksaan dan lampiran bukti penawaran harga.' }
    ]
  }),
  make(3, 'approved', -7, {
    type: 'Policy',
    sla: 10,
    due: iso(3),
    company: 'PT. Baramuda Bahari',
    docNo: 'SK/HRM/2026/044',
    title: 'Surat Keputusan Kebijakan Kerja Fleksibel (Hybrid Work Policy)',
    approval: iso(-1),
    pic: 'Rosalia Pratiwi',
    reviewer: 'Junita Dwi Lia H.',
    priority: 'low'
  }),
  make(4, 'closed', -20, {
    company: 'PT. Mega Marine Pride',
    docNo: 'PROP/QMS/2026/081',
    title: 'Proposal Proyek Digitalisasi Arsip & Dokumen Mutu Perusahaan',
    approval: iso(-12),
    closed: iso(-10)
  }),
  make(5, 'submitted', -1, {
    company: 'PT. Baramuda Bahari',
    docNo: 'PERIZ/LEGAL/2026/046',
    title: 'Pemberian Izin Akses Khusus API Gateway Rekanan Perbankan',
    priority: 'critical'
  }),
  make(6, 'qmsr_review', -3, {
    company: 'PT. Mega Marine Pride',
    docNo: 'SOP/QA/2026/019',
    title: 'Standar Operasional Penanganan Insiden Keamanan Informasi v2.4',
    priority: 'high'
  }),
  make(7, 'resubmitted', -2, {
    company: 'PT. Baramuda Bahari',
    docNo: 'WI/WH/2026/005',
    title: 'Prosedur Penerimaan dan Penyimpanan Bahan Baku Cold Storage',
    priority: 'medium'
  }),
  make(8, 'approved', -3, {
    company: 'PT. Mega Marine Pride',
    docNo: 'FORM/QC/2026/012',
    title: 'Formulir Uji Sensori dan Organoleptik Produk Ekspor Udang',
    approval: iso(-1),
    priority: 'medium'
  })
];
