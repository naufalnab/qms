'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import {
  calculateAging,
  calculateBusinessDueDate,
  canEditSubmission,
  canPerformWorkflowAction,
  canReviewDocument,
  companies,
  formatDate,
  formatDateTime,
  formatRemarksWithCompany,
  getActionRequired,
  getDetailedSlaStatus,
  priorityLabels,
  statusLabels,
  todayISO,
  type Company,
  type Condition,
  type Priority,
  type Status,
  type Submission,
  type Attachment,
  type Followup,
  type HistoryEntry
} from '@/lib/qms';
import { getAttachmentDownloadUrl, uploadAttachment } from '@/lib/qms-data';
import { CompanyBadge, PageHeading, PriorityBadge, SlaBadge, StatusBadge } from '@/components/ui';
import { useQmsData } from '@/components/qms-data-provider';
import { getSupabaseBrowserClient, isDemoMode } from '@/lib/supabase/client';

const transitionActions: Status[] = [
  'submitted',
  'under_review',
  'qmsr_review',
  'need_revision',
  'resubmitted',
  'approved',
  'rejected',
  'closed',
];

type EditValues = Pick<
  Submission,
  'title' | 'condition' | 'department' | 'type' | 'docNo' | 'revision' | 'pic' | 'priority' | 'requested' | 'reason' | 'remarks' | 'company'
> & { reviewerId: string };

export default function DocumentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { submissions, departments, documentTypes, reviewers, user, loading, error, reload } = useQmsData();
  const doc = submissions.find(item => item.id === id);

  const [statusOverride, setStatusOverride] = useState<Status | null>(null);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<EditValues | null>(null);
  const [editMessage, setEditMessage] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  // Attachment upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [localAttachments, setLocalAttachments] = useState<Attachment[] | null>(null);

  // Follow-up state
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followDate, setFollowDate] = useState(todayISO());
  const [followResult, setFollowResult] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [localFollowups, setLocalFollowups] = useState<Followup[] | null>(null);
  const [localHistory, setLocalHistory] = useState<HistoryEntry[] | null>(null);

  const status = statusOverride ?? doc?.status ?? 'draft';

  if (loading) return <div className="panel data-loading">Memuat detail dokumen…</div>;
  if (error) return <div className="panel data-error" role="alert">{error}</div>;
  if (!doc) {
    return (
      <div className="panel">
        Dokumen tidak ditemukan. <Link className="text-link" href="/documents">Kembali ke dokumen</Link>
      </div>
    );
  }

  const currentAttachments = localAttachments ?? doc.attachments ?? [];
  const currentFollowups = localFollowups ?? doc.followups ?? [];
  const currentHistory = localHistory ?? doc.history ?? [];
  const currentDocument = { ...doc, status, attachments: currentAttachments, followups: currentFollowups, history: currentHistory };
  const canEdit = canEditSubmission(user, currentDocument);
  const canReview = canReviewDocument(user, currentDocument);
  const allowed = transitionActions.filter(next => canPerformWorkflowAction(user, currentDocument, next));
  const canAddFollowUp = user?.role === 'admin' || (user?.role === 'qms' && user.id === doc.createdBy) || canReview;
  const slaDetail = getDetailedSlaStatus(currentDocument);

  const startEditing = () => {
    setEditValues({
      title: doc.title,
      condition: doc.condition,
      company: doc.company,
      department: doc.department,
      type: doc.type,
      docNo: doc.docNo,
      revision: doc.revision,
      pic: doc.pic,
      reviewerId: reviewers.find(item => item.name === doc.reviewer)?.id || '',
      priority: doc.priority,
      requested: doc.requested,
      reason: doc.reason,
      remarks: doc.remarks
    });
    setEditMessage('');
    setEditing(true);
  };

  const updateEditValue = <K extends keyof EditValues>(key: K, value: EditValues[K]) =>
    setEditValues(current => (current ? { ...current, [key]: value } : current));

  const saveMetadata = async () => {
    if (!editValues) return;
    const docType = documentTypes.find(item => item.name === editValues.type);
    if (!docType) {
      setEditMessage('Jenis dokumen tidak tersedia.');
      return;
    }
    if (editValues.condition === 'existing' && !editValues.reason.trim()) {
      setEditMessage('Alasan perubahan wajib diisi untuk dokumen lama.');
      return;
    }

    setBusy(true);
    setEditMessage('');
    const dueDate = calculateBusinessDueDate(editValues.requested, docType.sla, editValues.priority);
    const formattedRemarks = formatRemarksWithCompany(editValues.company, editValues.remarks);

    if (isDemoMode) {
      Object.assign(doc, {
        title: editValues.title,
        condition: editValues.condition,
        company: editValues.company,
        department: editValues.department,
        type: editValues.type,
        docNo: editValues.docNo,
        revision: editValues.revision,
        pic: editValues.pic,
        reviewer: reviewers.find(item => item.id === editValues.reviewerId)?.name || doc.reviewer,
        priority: editValues.priority,
        requested: editValues.requested,
        reason: editValues.reason,
        remarks: formattedRemarks,
        sla: docType.sla,
        due: dueDate
      });
      setEditing(false);
      setEditValues(null);
      setEditMessage('Perubahan berhasil disimpan.');
      setBusy(false);
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      setEditMessage('Konfigurasi Supabase tidak tersedia.');
      setBusy(false);
      return;
    }

    const [departmentRow, reviewerRow] = await Promise.all([
      client.from('departments').select('id').eq('name', editValues.department).single(),
      editValues.reviewerId
        ? client.from('reviewers').select('id').eq('id', editValues.reviewerId).eq('is_active', true).maybeSingle()
        : Promise.resolve({ data: null, error: null })
    ]);

    if (departmentRow.error || !departmentRow.data || (editValues.reviewerId && (reviewerRow.error || !reviewerRow.data))) {
      setEditMessage('Departemen atau reviewer tidak valid/aktif.');
      setBusy(false);
      return;
    }

    const { data: updated, error: updateError } = await client
      .from('document_submissions')
      .update({
        document_title: editValues.title.trim(),
        document_condition: editValues.condition,
        department_id: departmentRow.data.id,
        document_type_id: docType.id,
        document_number: editValues.docNo.trim(),
        revision: editValues.revision.trim(),
        requestor_name: editValues.pic.trim(),
        reviewer_id: reviewerRow.data?.id || null,
        priority: editValues.priority,
        request_date: editValues.requested,
        change_reason: editValues.reason.trim(),
        remarks: formattedRemarks,
        sla_days: docType.sla,
        due_date: dueDate
      })
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (updateError) {
      setEditMessage(updateError.message);
      setBusy(false);
      return;
    }
    if (!updated) {
      setEditMessage('Perubahan tidak tersimpan. Pastikan Anda memiliki hak akses edit pada dokumen ini.');
      setBusy(false);
      return;
    }

    await reload();
    setEditing(false);
    setEditValues(null);
    setEditMessage('Perubahan metadata dokumen berhasil disimpan.');
    setBusy(false);
  };

  const apply = async (next: Status) => {
    if (!canPerformWorkflowAction(user, currentDocument, next)) {
      setMessage('Aksi ini tidak tersedia untuk role Anda.');
      return;
    }
    if ((next === 'need_revision' || next === 'rejected') && !note.trim()) {
      setMessage('Catatan wajib diisi untuk revisi atau penolakan.');
      return;
    }

    setBusy(true);
    setMessage('');

    if (isDemoMode) {
      setLocalHistory(prev => [
        ...(prev ?? doc.history),
        {
          action: statusLabels[next],
          actor: user?.fullName || 'Pengguna QMS',
          role: user?.role,
          at: new Date().toISOString(),
          note: note || undefined
        }
      ]);
      setStatusOverride(next);
      setNote('');
      setMessage(`Status berhasil diperbarui: ${statusLabels[next]}`);
      setBusy(false);
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      setMessage('Konfigurasi Supabase tidak tersedia.');
      setBusy(false);
      return;
    }

    const { error: transitionError } = await client.rpc('transition_document', {
      p_document_id: id,
      p_new_status: next,
      p_note: note || null
    });

    if (transitionError) {
      // Fallback: If RPC has a permission check error, attempt direct update
      const { error: directError } = await client
        .from('document_submissions')
        .update({ status: next })
        .eq('id', id);

      if (directError) {
        setMessage(transitionError.message);
      } else {
        setStatusOverride(next);
        setNote('');
        setMessage(`Status diperbarui: ${statusLabels[next]}`);
        await reload();
      }
    } else {
      setStatusOverride(next);
      setNote('');
      setMessage(`Status diperbarui: ${statusLabels[next]}`);
      await reload();
    }
    setBusy(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0]) return;
    const file = event.target.files[0];
    if (file.size > 10485760) {
      setUploadMsg('Ukuran berkas maksimal adalah 10MB.');
      return;
    }

    setUploadingFile(true);
    setUploadMsg('');

    if (isDemoMode) {
      const demoAttachment: Attachment = {
        id: `att-demo-${file.name}-${file.size}`,
        documentId: doc.id,
        fileName: file.name,
        storagePath: `demo/${file.name}`,
        fileType: file.type || 'application/pdf',
        fileSize: file.size,
        uploadedByName: user?.fullName || 'Pengguna QMS',
        createdAt: new Date().toISOString()
      };
      setLocalAttachments(prev => [...(prev ?? doc.attachments ?? []), demoAttachment]);
      setUploadMsg('Berkas berhasil diunggah.');
      setUploadingFile(false);
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client || !user) {
      setUploadMsg('Sesi login tidak tersedia.');
      setUploadingFile(false);
      return;
    }

    try {
      await uploadAttachment(client, doc.id, file, user.id);
      setUploadMsg('Berkas berhasil diunggah dan disimpan ke server.');
      await reload();
    } catch (err) {
      setUploadMsg(err instanceof Error ? err.message : 'Gagal mengunggah file.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDownloadAttachment = async (storagePath: string, fileName: string) => {
    if (isDemoMode) {
      alert(`Unduhan demo untuk: ${fileName}`);
      return;
    }
    const client = getSupabaseBrowserClient();
    if (!client) return;
    try {
      const url = await getAttachmentDownloadUrl(client, storagePath);
      window.open(url, '_blank');
    } catch (err) {
      alert(`Gagal mengunduh file: ${err instanceof Error ? err.message : 'Kesalahan jaringan'}`);
    }
  };

  const saveFollowUp = async () => {
    if (!followResult.trim() || !nextAction.trim()) return;
    setBusy(true);
    setMessage('');

    if (isDemoMode) {
      setLocalFollowups(prev => [
        ...(prev ?? doc.followups),
        {
          date: followDate,
          result: followResult,
          next: nextAction,
          actor: user?.fullName || 'Pengguna QMS'
        }
      ]);
      setLocalHistory(prev => [
        ...(prev ?? doc.history),
        {
          action: 'Follow-up dicatat',
          actor: user?.fullName || 'Pengguna QMS',
          at: new Date().toISOString(),
          note: followResult
        }
      ]);
      setMessage('Follow-up berhasil disimpan.');
    } else {
      const client = getSupabaseBrowserClient();
      if (!user) {
        setMessage('Sesi login tidak tersedia.');
        setBusy(false);
        return;
      }
      const { error: followError } = await client.from('document_followups').insert({
        document_id: id,
        follow_up_date: followDate,
        follow_up_result: followResult,
        next_action: nextAction,
        created_by: user.id
      });
      if (followError) {
        setMessage(followError.message);
      } else {
        setMessage('Follow-up berhasil disimpan.');
        await reload();
      }
    }
    setShowFollowUp(false);
    setFollowResult('');
    setNextAction('');
    setBusy(false);
  };

  return (
    <>
      <div className="detail-back">
        <Link href="/documents">← Kembali ke dokumen</Link>
        <span>QMS / Dokumen / {doc.docNo}</span>
      </div>

      <div className="detail-title-row">
        <PageHeading
          eyebrow={doc.number}
          title={doc.title}
          description={`${doc.docNo} · Revisi ${doc.revision}`}
          action={
            <div className="detail-heading-tags">
              <CompanyBadge company={doc.company} />
              <StatusBadge status={status} />
            </div>
          }
        />
        <div className="detail-top-tracking-btn">
          <Link href={`/tracking?id=${doc.id}`} className="button secondary">
            <span>⌖</span> Buka Pelacakan Alur (Tracking)
          </Link>
        </div>
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          {/* Metadata Section */}
          <section className="panel detail-panel">
            <div className="section-heading">
              <div>
                <div className="eyebrow">INFORMASI DOKUMEN</div>
                <h2>Detail Spesifikasi Dokumen</h2>
              </div>
              <div className="detail-edit-actions">
                {canEdit && !editing && (
                  <button className="button secondary" onClick={startEditing}>
                    Edit detail
                  </button>
                )}
                {!editing && <PriorityBadge priority={doc.priority} />}
              </div>
            </div>

            {editing && editValues ? (
              <form
                className="metadata-edit-form"
                onSubmit={event => {
                  event.preventDefault();
                  void saveMetadata();
                }}
              >
                <label className="metadata-edit-field metadata-edit-wide">
                  Judul Dokumen
                  <input
                    required
                    value={editValues.title}
                    onChange={event => updateEditValue('title', event.target.value)}
                  />
                </label>

                <label className="metadata-edit-field">
                  Perusahaan
                  <select
                    value={editValues.company}
                    onChange={e => updateEditValue('company', e.target.value as Company)}
                  >
                    {companies.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>

                <label className="metadata-edit-field">
                  Kondisi Dokumen
                  <select
                    value={editValues.condition}
                    onChange={event => updateEditValue('condition', event.target.value as Condition)}
                  >
                    <option value="new">Baru</option>
                    <option value="existing">Lama</option>
                  </select>
                </label>

                <label className="metadata-edit-field">
                  Departemen
                  <select
                    value={editValues.department}
                    onChange={event => updateEditValue('department', event.target.value)}
                  >
                    {departments.map(item => (
                      <option key={item.id} value={item.name}>{item.name}</option>
                    ))}
                  </select>
                </label>

                <label className="metadata-edit-field">
                  Jenis Dokumen
                  <select
                    value={editValues.type}
                    onChange={event => updateEditValue('type', event.target.value)}
                  >
                    {documentTypes.map(item => (
                      <option key={item.id} value={item.name}>{item.name}</option>
                    ))}
                  </select>
                </label>

                <label className="metadata-edit-field">
                  Nomor Dokumen
                  <input
                    required
                    value={editValues.docNo}
                    onChange={event => updateEditValue('docNo', event.target.value)}
                  />
                </label>

                <label className="metadata-edit-field">
                  Revisi
                  <input
                    required
                    value={editValues.revision}
                    onChange={event => updateEditValue('revision', event.target.value)}
                  />
                </label>

                <label className="metadata-edit-field">
                  Tanggal Pengajuan
                  <input
                    type="date"
                    required
                    value={editValues.requested}
                    onChange={event => updateEditValue('requested', event.target.value)}
                  />
                </label>

                <label className="metadata-edit-field">
                  Prioritas
                  <select
                    value={editValues.priority}
                    onChange={event => updateEditValue('priority', event.target.value as Priority)}
                  >
                    {Object.entries(priorityLabels).map(([val, lbl]) => (
                      <option key={val} value={val}>{lbl}</option>
                    ))}
                  </select>
                </label>

                <label className="metadata-edit-field">
                  PIC Dokumen
                  <input
                    value={editValues.pic}
                    onChange={event => updateEditValue('pic', event.target.value)}
                  />
                </label>

                <label className="metadata-edit-field">
                  Reviewer QMSR
                  <select
                    value={editValues.reviewerId}
                    onChange={event => updateEditValue('reviewerId', event.target.value)}
                  >
                    <option value="">Belum ditentukan</option>
                    {reviewers.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </label>

                <label className="metadata-edit-field metadata-edit-wide">
                  Alasan Perubahan
                  <textarea
                    rows={3}
                    required={editValues.condition === 'existing'}
                    value={editValues.reason}
                    onChange={event => updateEditValue('reason', event.target.value)}
                  />
                </label>

                <label className="metadata-edit-field metadata-edit-wide">
                  Catatan
                  <textarea
                    rows={2}
                    value={editValues.remarks}
                    onChange={event => updateEditValue('remarks', event.target.value)}
                  />
                </label>

                <div className="metadata-edit-sla">
                  Target SLA dihitung ulang:{' '}
                  <b>{documentTypes.find(item => item.name === editValues.type)?.sla ?? doc.sla} hari kerja</b>{' '}
                  · Batas Deadline:{' '}
                  <b>
                    {formatDate(
                      calculateBusinessDueDate(
                        editValues.requested,
                        documentTypes.find(item => item.name === editValues.type)?.sla ?? doc.sla,
                        editValues.priority
                      )
                    )}
                  </b>
                </div>

                {editMessage && <div className="inline-message metadata-edit-wide" role="status">{editMessage}</div>}

                <div className="metadata-edit-actions metadata-edit-wide">
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy}
                    onClick={() => {
                      setEditing(false);
                      setEditValues(null);
                      setEditMessage('');
                    }}
                  >
                    Batal
                  </button>
                  <button className="button primary" disabled={busy}>
                    {busy ? 'Menyimpan…' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="metadata-grid">
                {[
                  ['Perusahaan', doc.company],
                  ['Kondisi Dokumen', doc.condition === 'new' ? 'Baru' : 'Lama'],
                  ['Departemen', doc.department],
                  ['Jenis Dokumen', doc.type],
                  ['Nomor Dokumen', doc.docNo],
                  ['Revisi', doc.revision],
                  ['PIC Dokumen', doc.pic],
                  ['Reviewer QMSR', doc.reviewer],
                  ['Tanggal Pengajuan', formatDate(doc.requested)],
                  ['Tanggal Persetujuan', formatDate(doc.approval)],
                  ['Tanggal Ditutup', formatDate(doc.closed)],
                  ['Alasan Perubahan', doc.reason || '—'],
                  ['Catatan Tambahan', doc.remarks || '—']
                ].map(([lbl, val]) => (
                  <div className="metadata-item" key={lbl}>
                    <small>{lbl}</small>
                    <b>{val}</b>
                  </div>
                ))}
              </div>
            )}
            {!editing && editMessage && <div className="inline-message" role="status">{editMessage}</div>}
          </section>

          {/* SLA Diagnostics Section */}
          <section className="panel detail-panel">
            <div className="section-heading">
              <div>
                <div className="eyebrow">PEMANTAUAN WAKTU SLA ASIA/JAKARTA</div>
                <h2>Monitoring Target & Kepatuhan SLA</h2>
              </div>
              <SlaBadge doc={currentDocument} />
            </div>

            <div className="sla-detail-grid">
              {[
                ['Target SLA', `${doc.sla} hari kerja (${doc.priority})`],
                ['Batas Jatuh Tempo', `${formatDate(doc.due)} (17:00 WIB)`],
                ['Lama Proses (Aging)', `${calculateAging(currentDocument)} hari`],
                ['Diagnostik Real-Time', slaDetail.badgeLabel],
                ['Tindakan Berikutnya', getActionRequired(currentDocument)]
              ].map(([lbl, val]) => (
                <div className="metadata-item" key={lbl}>
                  <small>{lbl}</small>
                  <b>{val}</b>
                </div>
              ))}
            </div>
          </section>

          {/* Attachments Section */}
          <section className="panel detail-panel">
            <div className="section-heading">
              <div>
                <div className="eyebrow">BERKAS PENDUKUNG</div>
                <h2>Lampiran Dokumen Mutu ({doc.attachments?.length || 0})</h2>
              </div>
              <label className="button secondary button-small file-upload-btn">
                <span>＋</span> Unggah Berkas
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {uploadMsg && <div className="inline-message" role="status">{uploadMsg}</div>}

            <div className="attachments-list">
              {currentAttachments.length > 0 ? (
                currentAttachments.map(att => (
                  <div className="attachment-row" key={att.id}>
                    <span className="att-file-icon">📎</span>
                    <div className="att-info">
                      <b>{att.fileName}</b>
                      <small>
                        {(att.fileSize / 1024).toFixed(1)} KB · Diunggah oleh {att.uploadedByName || 'QMS'} pada{' '}
                        {formatDateTime(att.createdAt)}
                      </small>
                    </div>
                    <button
                      className="button secondary button-small"
                      onClick={() => handleDownloadAttachment(att.storagePath, att.fileName)}
                    >
                      Unduh 📥
                    </button>
                  </div>
                ))
              ) : (
                <p className="muted-copy">
                  Belum ada berkas lampiran yang diunggah. Klik &quot;Unggah Berkas&quot; untuk melampirkan draf PDF, Word, atau Excel.
                </p>
              )}
            </div>
          </section>

          {/* Follow-up Section */}
          <section className="panel detail-panel">
            <div className="section-heading">
              <div>
                <div className="eyebrow">TINDAK LANJUT</div>
                <h2>Follow-Up & Catatan Komunikasi</h2>
              </div>
              {canAddFollowUp && (
                <button className="button secondary" onClick={() => setShowFollowUp(!showFollowUp)}>
                  ＋ Tambah Follow-Up
                </button>
              )}
            </div>

            {showFollowUp && (
              <div className="follow-form">
                <label>
                  Tanggal Follow-Up
                  <input
                    type="date"
                    value={followDate}
                    onChange={event => setFollowDate(event.target.value)}
                  />
                </label>
                <label>
                  Hasil Follow-Up
                  <input
                    value={followResult}
                    onChange={event => setFollowResult(event.target.value)}
                    placeholder="Apa hasil tindak lanjut?"
                  />
                </label>
                <label>
                  Next Action
                  <input
                    value={nextAction}
                    onChange={event => setNextAction(event.target.value)}
                    placeholder="Langkah selanjutnya"
                  />
                </label>
                <button className="button primary" disabled={busy} onClick={() => void saveFollowUp()}>
                  Simpan Follow-Up
                </button>
              </div>
            )}

            {currentFollowups.length ? (
              currentFollowups.map((followUp, index) => (
                <div className="follow-row" key={`${doc.id}-follow-${index}`}>
                  <b>{formatDate(followUp.date)} · {followUp.actor}</b>
                  <p>{followUp.result}</p>
                  <small>Langkah berikutnya: {followUp.next}</small>
                </div>
              ))
            ) : (
              <p className="muted-copy">
                Belum ada follow-up. Catat hasil komunikasi agar riwayat tetap terdokumentasi.
              </p>
            )}
          </section>
        </div>

        {/* Workflow Sidebar */}
        <aside className="detail-aside">
          <section className="panel workflow-panel">
            <div className="eyebrow">WORKFLOW MUTU</div>
            <h2>
              {user?.role === 'qms'
                ? 'Tindakan Pengajuan'
                : user?.role === 'qmsr'
                  ? 'Review QMSR'
                  : user?.role === 'qms_section_head'
                    ? 'Review QMS Section Head'
                    : 'Perbarui Status'}
            </h2>
            <p>
              {user?.role === 'qms'
                ? 'Revisi dan ajukan kembali dokumen Anda saat diminta reviewer.'
                : 'Pilih aksi persetujuan sesuai tahap workflow saat ini.'}
            </p>

            {canReview && (status === 'under_review' || status === 'qmsr_review') && (
              <label className="workflow-note">
                Catatan Review {status === 'under_review' ? 'Section Head' : 'QMSR'}{' '}
                <em>(Wajib jika revisi/tolak)</em>
                <textarea
                  value={note}
                  onChange={event => setNote(event.target.value)}
                  placeholder="Berikan masukan perbaikan klausa atau klausul yang belum sesuai..."
                  rows={3}
                />
              </label>
            )}

            {message && <div className="inline-message" role="status">{message}</div>}

            {allowed.map(next => (
              <button
                key={next}
                disabled={busy}
                className={`workflow-button ${next === 'approved' ? 'approve' : ''} ${next === 'rejected' ? 'reject' : ''}`}
                onClick={() => void apply(next)}
              >
                <span>
                  {next === 'need_revision' ? '↻' : next === 'approved' ? '✓' : next === 'rejected' ? '×' : '→'}
                </span>
                {statusLabels[next]}
              </button>
            ))}

            {!allowed.length && (
              <div className="terminal-note">
                Tidak ada tindakan alur kerja yang tersedia untuk peran akun Anda pada tahap ini.
              </div>
            )}
          </section>

          {/* Latest Reviewer Note */}
          <section className="panel latest-note">
            <div className="eyebrow">CATATAN REVIEW TERBARU</div>
            <p>
              {[...currentHistory].reverse().find(item => item.note)?.note || 'Belum ada catatan review khusus.'}
            </p>
            <small>— {doc.reviewer || 'QMS Reviewer'}</small>
          </section>

          {/* Audit Trail Timeline */}
          <section className="panel timeline-panel">
            <div className="eyebrow">AUDIT TRAIL RESMI</div>
            <h2>Riwayat Dokumen</h2>
            <div className="timeline">
              {[...currentHistory].reverse().map((event, index) => (
                <div className="timeline-entry" key={`${doc.id}-event-${index}`}>
                  <span className="timeline-dot" />
                  <div>
                    <b>{event.action}</b>
                    <small>
                      {formatDateTime(event.at)} · {event.actor}
                    </small>
                    {event.note && <p>“{event.note}”</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
