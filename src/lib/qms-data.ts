import type { SupabaseClient } from '@supabase/supabase-js';
import {
  departments as demoDepartments,
  documentTypes as demoTypes,
  statusLabels,
  extractCompany,
  type Submission,
  type Status,
  type Department,
  type DocumentType,
  type Reviewer,
  type ReviewerOption,
  type Attachment
} from '@/lib/qms';

const dateOnly = (value: string | null | undefined) => {
  if (!value) return undefined;
  if (!value.includes('T')) return value.slice(0, 10);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
};

const eventLabels: Record<string, string> = {
  document_created: 'Pengajuan dibuat',
  document_updated: 'Metadata diperbarui',
  submitted: statusLabels.submitted,
  review_started: statusLabels.under_review,
  qmsr_review_started: statusLabels.qmsr_review,
  need_revision: statusLabels.need_revision,
  resubmitted: statusLabels.resubmitted,
  approved: statusLabels.approved,
  rejected: statusLabels.rejected,
  closed: statusLabels.closed,
  follow_up_added: 'Follow-up dicatat',
  archived: 'Dokumen diarsipkan',
};

export async function loadSubmissions(client: SupabaseClient): Promise<Submission[]> {
  const [submissions, departmentRows, typeRows, profiles, historyRows, followupRows, attachmentRows] = await Promise.all([
    client.from('document_submissions').select('*').is('archived_at', null).order('request_date', { ascending: false }),
    client.from('departments').select('id,name'),
    client.from('document_types').select('id,name'),
    client.from('profiles').select('id,full_name'),
    client.from('document_history').select('id,document_id,event_type,previous_status,new_status,notes,changed_by,reviewer_name,created_at').order('created_at', { ascending: true }),
    client.from('document_followups').select('id,document_id,follow_up_date,follow_up_result,next_action,created_by,created_at').order('follow_up_date', { ascending: true }),
    client.from('document_attachments').select('id,document_id,file_name,storage_path,file_type,file_size,uploaded_by,created_at').order('created_at', { ascending: false }),
  ]);

  for (const result of [submissions, departmentRows, typeRows, profiles, historyRows, followupRows]) {
    if (result.error) throw result.error;
  }

  const departmentMap = new Map((departmentRows.data ?? []).map(row => [row.id, row.name]));
  const typeMap = new Map((typeRows.data ?? []).map(row => [row.id, row.name]));
  const profileMap = new Map((profiles.data ?? []).map(row => [row.id, row.full_name]));

  const historyMap = new Map<string, Submission['history']>();
  for (const item of historyRows.data ?? []) {
    const events = historyMap.get(item.document_id) || [];
    events.push({
      action: eventLabels[item.event_type] || item.event_type,
      note: item.notes || undefined,
      actor: item.reviewer_name || profileMap.get(item.changed_by) || 'Pengguna QMS',
      at: item.created_at
    });
    historyMap.set(item.document_id, events);
  }

  const followupMap = new Map<string, Submission['followups']>();
  for (const item of followupRows.data ?? []) {
    const events = followupMap.get(item.document_id) || [];
    events.push({
      date: item.follow_up_date,
      result: item.follow_up_result,
      next: item.next_action,
      actor: profileMap.get(item.created_by) || 'Pengguna QMS'
    });
    followupMap.set(item.document_id, events);
  }

  const attachmentMap = new Map<string, Attachment[]>();
  for (const item of attachmentRows.data ?? []) {
    const list = attachmentMap.get(item.document_id) || [];
    list.push({
      id: item.id,
      documentId: item.document_id,
      fileName: item.file_name,
      storagePath: item.storage_path,
      fileType: item.file_type,
      fileSize: Number(item.file_size),
      uploadedBy: item.uploaded_by,
      uploadedByName: profileMap.get(item.uploaded_by) || 'Pengguna QMS',
      createdAt: item.created_at,
    });
    attachmentMap.set(item.document_id, list);
  }

  return (submissions.data ?? []).map(row => {
    const deptName = departmentMap.get(row.department_id) || '—';
    const { company, cleanRemarks } = extractCompany(row.remarks, deptName);
    return {
      id: row.id,
      number: row.submission_number,
      requested: row.request_date,
      condition: row.document_condition,
      company,
      department: deptName,
      type: typeMap.get(row.document_type_id) || '—',
      docNo: row.document_number,
      title: row.document_title,
      revision: row.revision,
      reason: row.change_reason,
      pic: row.requestor_name,
      reviewer: row.reviewer_id ? profileMap.get(row.reviewer_id) || '—' : '—',
      reviewerId: row.reviewer_id || undefined,
      priority: row.priority,
      sla: row.sla_days,
      due: row.due_date,
      status: row.status as Status,
      createdBy: row.created_by,
      approval: dateOnly(row.approval_date),
      closed: dateOnly(row.closed_at),
      remarks: cleanRemarks,
      history: historyMap.get(row.id) || [],
      followups: followupMap.get(row.id) || [],
      attachments: attachmentMap.get(row.id) || [],
    };
  });
}

export async function uploadAttachment(
  client: SupabaseClient,
  documentId: string,
  file: File,
  userId: string
): Promise<Attachment> {
  const fileExt = file.name.split('.').pop() || 'bin';
  const cleanBase = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const storagePath = `${documentId}/${Date.now()}_${cleanBase}.${fileExt}`;

  // 1. Upload to Supabase Storage
  const { error: uploadError } = await client.storage
    .from('qms-attachments')
    .upload(storagePath, file, { cacheControl: '3600', upsert: false });
  if (uploadError) throw new Error(`Upload file gagal: ${uploadError.message}`);

  // 2. Insert record into document_attachments table
  const { data: inserted, error: insertError } = await client
    .from('document_attachments')
    .insert({
      document_id: documentId,
      file_name: file.name,
      storage_path: storagePath,
      file_type: file.type || 'application/octet-stream',
      file_size: file.size,
      uploaded_by: userId,
    })
    .select('id, document_id, file_name, storage_path, file_type, file_size, uploaded_by, created_at')
    .single();

  if (insertError) {
    // Attempt cleanup from storage
    await client.storage.from('qms-attachments').remove([storagePath]);
    throw new Error(`Penyimpanan metadata lampiran gagal: ${insertError.message}`);
  }

  return {
    id: inserted.id,
    documentId: inserted.document_id,
    fileName: inserted.file_name,
    storagePath: inserted.storage_path,
    fileType: inserted.file_type,
    fileSize: Number(inserted.file_size),
    uploadedBy: inserted.uploaded_by,
    createdAt: inserted.created_at,
  };
}

export async function getAttachmentDownloadUrl(
  client: SupabaseClient,
  storagePath: string
): Promise<string> {
  const { data, error } = await client.storage
    .from('qms-attachments')
    .createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Gagal membuat URL unduhan file.');
  }
  return data.signedUrl;
}

export async function deleteAttachment(
  client: SupabaseClient,
  attachmentId: string,
  storagePath: string
): Promise<void> {
  await client.from('document_attachments').delete().eq('id', attachmentId);
  await client.storage.from('qms-attachments').remove([storagePath]);
}

export async function loadMasterData(client: SupabaseClient) {
  const [departmentRows, typeRows, reviewerRows, profiles] = await Promise.all([
    client.from('departments').select('id,name').eq('is_active', true).order('name'),
    client.from('document_types').select('id,name,default_sla_days').eq('is_active', true).order('name'),
    client.from('reviewers').select('id,is_active'),
    client.from('profiles').select('id,full_name,role,is_active'),
  ]);

  for (const result of [departmentRows, typeRows, reviewerRows, profiles]) {
    if (result.error) throw result.error;
  }

  const names = new Map((profiles.data ?? []).map(profile => [profile.id, profile.full_name]));
  const reviewerById = new Map((reviewerRows.data ?? []).map(row => [row.id, row]));
  const activeReviewerIds = new Set((reviewerRows.data ?? []).filter(row => row.is_active).map(row => row.id));
  const activeReviewerProfiles = (profiles.data ?? []).filter(profile => (profile.role === 'qmsr' || profile.role === 'admin') && profile.is_active);

  return {
    departments: (departmentRows.data ?? []) as Department[],
    documentTypes: (typeRows.data ?? []).map(row => ({ id: row.id, name: row.name, sla: row.default_sla_days })) as DocumentType[],
    reviewers: (reviewerRows.data ?? []).filter(row => row.is_active).map(row => ({ id: row.id, name: names.get(row.id) })).filter((reviewer): reviewer is Reviewer => Boolean(reviewer.name)),
    availableReviewers: activeReviewerProfiles.filter(profile => !activeReviewerIds.has(profile.id)).map(profile => ({
      id: profile.id,
      name: profile.full_name,
      inactive: reviewerById.has(profile.id),
    })) as ReviewerOption[],
  };
}

export const demoMasterData = {
  departments: demoDepartments,
  documentTypes: demoTypes,
  reviewers: [
    { id: 'demo-reviewer-1', name: 'Junita Dwi Lia H.' },
    { id: 'demo-reviewer-2', name: 'Nina Putri' },
    { id: 'demo-reviewer-3', name: 'Rizky Hidayat' }
  ],
  availableReviewers: [],
};
