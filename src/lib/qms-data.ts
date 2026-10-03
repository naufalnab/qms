import type { SupabaseClient } from '@supabase/supabase-js';
import { departments as demoDepartments, documentTypes as demoTypes, statusLabels, type Submission, type Status, type Department, type DocumentType, type Reviewer } from '@/lib/qms';

const dateOnly = (value: string | null | undefined) => {
  if (!value) return undefined;
  if (!value.includes('T')) return value.slice(0, 10);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
};
const eventLabels: Record<string, string> = {
  document_created: 'Pengajuan dibuat', document_updated: 'Metadata diperbarui', submitted: statusLabels.submitted,
  review_started: statusLabels.under_review, need_revision: statusLabels.need_revision, resubmitted: statusLabels.resubmitted,
  approved: statusLabels.approved, rejected: statusLabels.rejected, closed: statusLabels.closed,
  follow_up_added: 'Follow-up dicatat', archived: 'Dokumen diarsipkan',
};

export async function loadSubmissions(client: SupabaseClient): Promise<Submission[]> {
  const [submissions, departmentRows, typeRows, profiles, historyRows, followupRows] = await Promise.all([
    client.from('document_submissions').select('*').is('archived_at', null).order('request_date', { ascending: false }),
    client.from('departments').select('id,name'),
    client.from('document_types').select('id,name'),
    client.from('profiles').select('id,full_name'),
    client.from('document_history').select('id,document_id,event_type,previous_status,new_status,notes,changed_by,reviewer_name,created_at').order('created_at', { ascending: true }),
    client.from('document_followups').select('id,document_id,follow_up_date,follow_up_result,next_action,created_by,created_at').order('follow_up_date', { ascending: true }),
  ]);
  for (const result of [submissions, departmentRows, typeRows, profiles, historyRows, followupRows]) if (result.error) throw result.error;

  const departmentMap = new Map((departmentRows.data ?? []).map(row => [row.id, row.name]));
  const typeMap = new Map((typeRows.data ?? []).map(row => [row.id, row.name]));
  const profileMap = new Map((profiles.data ?? []).map(row => [row.id, row.full_name]));
  const historyMap = new Map<string, Submission['history']>();
  for (const item of historyRows.data ?? []) {
    const events = historyMap.get(item.document_id) || [];
    events.push({ action: eventLabels[item.event_type] || item.event_type, note: item.notes || undefined, actor: item.reviewer_name || profileMap.get(item.changed_by) || 'Pengguna QMS', at: item.created_at });
    historyMap.set(item.document_id, events);
  }
  const followupMap = new Map<string, Submission['followups']>();
  for (const item of followupRows.data ?? []) {
    const events = followupMap.get(item.document_id) || [];
    events.push({ date: item.follow_up_date, result: item.follow_up_result, next: item.next_action, actor: profileMap.get(item.created_by) || 'Pengguna QMS' });
    followupMap.set(item.document_id, events);
  }
  return (submissions.data ?? []).map(row => ({
    id: row.id, number: row.submission_number, requested: row.request_date, condition: row.document_condition,
    department: departmentMap.get(row.department_id) || '—', type: typeMap.get(row.document_type_id) || '—',
    docNo: row.document_number, title: row.document_title, revision: row.revision, reason: row.change_reason,
    pic: row.requestor_name, reviewer: row.reviewer_id ? profileMap.get(row.reviewer_id) || '—' : '—',
    priority: row.priority, sla: row.sla_days, due: row.due_date, status: row.status as Status, createdBy: row.created_by,
    approval: dateOnly(row.approval_date), closed: dateOnly(row.closed_at), remarks: row.remarks || '',
    history: historyMap.get(row.id) || [], followups: followupMap.get(row.id) || [],
  }));
}

export async function loadMasterData(client: SupabaseClient) {
  const [departmentRows, typeRows, reviewerRows, profiles] = await Promise.all([
    client.from('departments').select('id,name').eq('is_active', true).order('name'),
    client.from('document_types').select('id,name,default_sla_days').eq('is_active', true).order('name'),
    client.from('reviewers').select('id').eq('is_active', true),
    client.from('profiles').select('id,full_name,role,is_active'),
  ]);
  for (const result of [departmentRows, typeRows, reviewerRows, profiles]) if (result.error) throw result.error;
  const names = new Map((profiles.data ?? []).map(profile => [profile.id, profile.full_name]));
  const activeReviewerIds = new Set((reviewerRows.data ?? []).map(row => row.id));
  const activeReviewerProfiles = (profiles.data ?? []).filter(profile => profile.role === 'reviewer' && profile.is_active);
  return {
    departments: (departmentRows.data ?? []) as Department[],
    documentTypes: (typeRows.data ?? []).map(row => ({ id: row.id, name: row.name, sla: row.default_sla_days })) as DocumentType[],
    reviewers: (reviewerRows.data ?? []).map(row => ({ id: row.id, name: names.get(row.id) })).filter((reviewer): reviewer is Reviewer => Boolean(reviewer.name)),
    availableReviewers: activeReviewerProfiles.filter(profile => !activeReviewerIds.has(profile.id)).map(profile => ({ id: profile.id, name: profile.full_name })) as Reviewer[],
  };
}

export const demoMasterData = {
  departments: demoDepartments,
  documentTypes: demoTypes,
  reviewers: [{ id: 'demo-reviewer-1', name: 'Andi QMSR' }, { id: 'demo-reviewer-2', name: 'Nina Putri' }, { id: 'demo-reviewer-3', name: 'Rizky Hidayat' }],
  availableReviewers: [],
};
