'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { calculateAging, calculateDueDate, canTransitionStatus, demoSubmissions, formatDate, getActionRequired, priorityLabels, statusLabels, todayISO, type Condition, type Priority, type Status, type Submission } from '@/lib/qms';
import { PageHeading, PriorityBadge, SlaBadge, StatusBadge } from '@/components/ui';
import { useQmsData } from '@/components/qms-data-provider';
import { getSupabaseBrowserClient, isDemoMode } from '@/lib/supabase/client';

const transitionActions: Status[] = ['submitted','under_review','need_revision','resubmitted','approved','rejected','closed'];
type EditValues = Pick<Submission, 'title' | 'condition' | 'department' | 'type' | 'docNo' | 'revision' | 'pic' | 'priority' | 'requested' | 'reason' | 'remarks'> & { reviewerId: string };

export default function DocumentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { submissions, departments, documentTypes, reviewers, loading, error, reload } = useQmsData();
  const doc = submissions.find(item => item.id === id) || demoSubmissions.find(item => item.id === id);
  const [statusOverride, setStatusOverride] = useState<Status | null>(null);
  const [role, setRole] = useState(isDemoMode ? 'admin' : 'viewer');
  const [userId, setUserId] = useState('');
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<EditValues | null>(null);
  const [editMessage, setEditMessage] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followDate, setFollowDate] = useState(todayISO());
  const [followResult, setFollowResult] = useState('');
  const [nextAction, setNextAction] = useState('');

  const status = statusOverride ?? doc?.status ?? 'draft';
  useEffect(() => {
    if (isDemoMode) return;
    let active = true;
    const client = getSupabaseBrowserClient();
    void client?.auth.getUser().then(async (result: { data: { user: { id: string } | null } }) => {
      const data = result.data;
      if (!data.user) return;
      const { data: profile } = await client.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
      if (active) setUserId(data.user.id);
      if (active && profile?.role) setRole(profile.role);
    });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="panel data-loading">Memuat detail dokumen…</div>;
  if (error) return <div className="panel data-error" role="alert">{error}</div>;
  if (!doc) return <div className="panel">Dokumen tidak ditemukan. <Link className="text-link" href="/documents">Kembali ke dokumen</Link></div>;

  const currentDocument = { ...doc, status };
  const canEdit = role === 'admin' || (role === 'submitter' && doc.createdBy === userId && ['draft', 'need_revision'].includes(status));
  const allowed = transitionActions.filter(next => canTransitionStatus(status, next, role));
  const startEditing = () => {
    setEditValues({ title: doc.title, condition: doc.condition, department: doc.department, type: doc.type, docNo: doc.docNo, revision: doc.revision, pic: doc.pic, reviewerId: reviewers.find(item => item.name === doc.reviewer)?.id || '', priority: doc.priority, requested: doc.requested, reason: doc.reason, remarks: doc.remarks });
    setEditMessage('');
    setEditing(true);
  };
  const updateEditValue = <K extends keyof EditValues>(key: K, value: EditValues[K]) => setEditValues(current => current ? { ...current, [key]: value } : current);
  const saveMetadata = async () => {
    if (!editValues) return;
    const type = documentTypes.find(item => item.name === editValues.type);
    if (!type) { setEditMessage('Jenis dokumen tidak tersedia.'); return; }
    if (editValues.condition === 'existing' && !editValues.reason.trim()) { setEditMessage('Alasan perubahan wajib diisi untuk dokumen lama.'); return; }
    setBusy(true); setEditMessage('');
    const dueDate = calculateDueDate(editValues.requested, type.sla);
    if (isDemoMode) {
      Object.assign(doc, { title: editValues.title, condition: editValues.condition, department: editValues.department, type: editValues.type, docNo: editValues.docNo, revision: editValues.revision, pic: editValues.pic, reviewer: reviewers.find(item => item.id === editValues.reviewerId)?.name || '', priority: editValues.priority, requested: editValues.requested, reason: editValues.reason, remarks: editValues.remarks, sla: type.sla, due: dueDate });
      setEditing(false); setEditValues(null); setEditMessage('Perubahan berhasil disimpan.'); setBusy(false); return;
    }
    const client = getSupabaseBrowserClient();
    if (!client) { setEditMessage('Konfigurasi Supabase tidak tersedia.'); setBusy(false); return; }
    const [department, reviewer] = await Promise.all([
      client.from('departments').select('id').eq('name', editValues.department).single(),
      editValues.reviewerId ? client.from('reviewers').select('id').eq('id', editValues.reviewerId).eq('is_active', true).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ]);
    if (department.error || !department.data || (editValues.reviewerId && (reviewer.error || !reviewer.data))) {
      setEditMessage('Departemen atau reviewer tidak valid/aktif.'); setBusy(false); return;
    }
    const { data: updated, error: updateError } = await client.from('document_submissions').update({
      document_title: editValues.title.trim(), document_condition: editValues.condition, department_id: department.data.id,
      document_type_id: type.id, document_number: editValues.docNo.trim(), revision: editValues.revision.trim(),
      requestor_name: editValues.pic.trim(), reviewer_id: reviewer.data?.id || null, priority: editValues.priority,
      request_date: editValues.requested, change_reason: editValues.reason.trim(), remarks: editValues.remarks.trim(),
      sla_days: type.sla, due_date: dueDate,
    }).eq('id', id).select('id').maybeSingle();
    if (updateError) { setEditMessage(updateError.message); setBusy(false); return; }
    if (!updated) { setEditMessage('Perubahan tidak tersimpan. Pastikan Anda memiliki akses edit pada dokumen ini.'); setBusy(false); return; }
    await reload();
    setEditing(false); setEditValues(null); setEditMessage('Perubahan berhasil disimpan.'); setBusy(false);
  };
  const apply = async (next: Status) => {
    if (!canTransitionStatus(status, next, role)) { setMessage('Aksi ini tidak tersedia untuk role Anda.'); return; }
    if ((next === 'need_revision' || next === 'rejected') && !note.trim()) { setMessage('Catatan wajib diisi untuk revisi atau penolakan.'); return; }
    setBusy(true); setMessage('');
    if (isDemoMode) {
      doc.status = next;
      if (next === 'approved') doc.approval = todayISO();
      if (next === 'closed') doc.closed = todayISO();
      doc.history.push({ action: statusLabels[next], actor: 'Rosa Amelia', at: todayISO(), note: note || undefined });
      setStatusOverride(next); setNote(''); setMessage(`Status diperbarui: ${statusLabels[next]}`); setBusy(false); return;
    }
    const client = getSupabaseBrowserClient();
    if (!client) { setMessage('Konfigurasi Supabase tidak tersedia.'); setBusy(false); return; }
    const { error: transitionError } = await client.rpc('transition_document', { p_document_id: id, p_new_status: next, p_note: note || null });
    if (transitionError) setMessage(transitionError.message);
    else { setStatusOverride(next); setNote(''); setMessage(`Status diperbarui: ${statusLabels[next]}`); await reload(); }
    setBusy(false);
  };

  const saveFollowUp = async () => {
    if (!followResult.trim() || !nextAction.trim()) return;
    setBusy(true); setMessage('');
    if (isDemoMode) {
      doc.followups.push({ date: followDate, result: followResult, next: nextAction, actor: 'Rosa Amelia' });
      doc.history.push({ action: 'Follow-up dicatat', actor: 'Rosa Amelia', at: followDate, note: followResult });
      setMessage('Follow-up berhasil disimpan.');
    } else {
      const client = getSupabaseBrowserClient();
      const { data: { user } } = await client!.auth.getUser();
      const { error: followError } = await client!.from('document_followups').insert({ document_id: id, follow_up_date: followDate, follow_up_result: followResult, next_action: nextAction, created_by: user!.id });
      if (followError) setMessage(followError.message);
      else { setMessage('Follow-up berhasil disimpan.'); await reload(); }
    }
    setShowFollowUp(false); setFollowResult(''); setNextAction(''); setBusy(false);
  };

  return <>
    <div className="detail-back"><Link href="/documents">← Kembali ke dokumen</Link><span>QMS / Dokumen / {doc.docNo}</span></div>
    <PageHeading eyebrow={doc.number} title={doc.title} description={`${doc.docNo} · Revisi ${doc.revision}`} action={<StatusBadge status={status} />} />
    <div className="detail-layout">
      <div className="detail-main">
        <section className="panel detail-panel"><div className="section-heading"><div><div className="eyebrow">INFORMASI DOKUMEN</div><h2>Detail Pengajuan</h2></div><div className="detail-edit-actions">{canEdit && !editing && <button className="button secondary" onClick={startEditing}>Edit detail</button>}{!editing && <PriorityBadge priority={doc.priority} />}</div></div>
          {editing && editValues ? <form className="metadata-edit-form" onSubmit={event => { event.preventDefault(); void saveMetadata(); }}>
            <label className="metadata-edit-field metadata-edit-wide">Judul Dokumen<input required value={editValues.title} onChange={event => updateEditValue('title', event.target.value)} /></label>
            <label className="metadata-edit-field">Status Dokumen<select value={editValues.condition} onChange={event => updateEditValue('condition', event.target.value as Condition)}><option value="new">Baru</option><option value="existing">Lama</option></select></label>
            <label className="metadata-edit-field">Departemen<select value={editValues.department} onChange={event => updateEditValue('department', event.target.value)}>{departments.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
            <label className="metadata-edit-field">Jenis Dokumen<select value={editValues.type} onChange={event => updateEditValue('type', event.target.value)}>{documentTypes.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
            <label className="metadata-edit-field">Nomor Dokumen<input required value={editValues.docNo} onChange={event => updateEditValue('docNo', event.target.value)} /></label>
            <label className="metadata-edit-field">Revisi<input required value={editValues.revision} onChange={event => updateEditValue('revision', event.target.value)} /></label>
            <label className="metadata-edit-field">Tanggal Pengajuan<input type="date" required value={editValues.requested} onChange={event => updateEditValue('requested', event.target.value)} /></label>
            <label className="metadata-edit-field">Prioritas<select value={editValues.priority} onChange={event => updateEditValue('priority', event.target.value as Priority)}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="metadata-edit-field">PIC Dokumen<input value={editValues.pic} onChange={event => updateEditValue('pic', event.target.value)} /></label>
            <label className="metadata-edit-field">Reviewer<select value={editValues.reviewerId} onChange={event => updateEditValue('reviewerId', event.target.value)}><option value="">Belum ditentukan</option>{reviewers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="metadata-edit-field metadata-edit-wide">Alasan Perubahan<textarea rows={3} required={editValues.condition === 'existing'} value={editValues.reason} onChange={event => updateEditValue('reason', event.target.value)} /></label>
            <label className="metadata-edit-field metadata-edit-wide">Catatan<textarea rows={3} value={editValues.remarks} onChange={event => updateEditValue('remarks', event.target.value)} /></label>
            <div className="metadata-edit-sla">SLA akan dihitung ulang: <b>{documentTypes.find(item => item.name === editValues.type)?.sla ?? '—'} hari kalender</b> · Jatuh tempo <b>{formatDate(calculateDueDate(editValues.requested, documentTypes.find(item => item.name === editValues.type)?.sla ?? doc.sla))}</b></div>
            {editMessage && <div className="inline-message metadata-edit-wide" role="status">{editMessage}</div>}
            <div className="metadata-edit-actions metadata-edit-wide"><button type="button" className="button secondary" disabled={busy} onClick={() => { setEditing(false); setEditValues(null); setEditMessage(''); }}>Batal</button><button className="button primary" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan Perubahan'}</button></div>
          </form> : <div className="metadata-grid">{[
            ['Status Dokumen',doc.condition === 'new' ? 'Baru' : 'Lama'],['Departemen',doc.department],['Jenis Dokumen',doc.type],
            ['Nomor Dokumen',doc.docNo],['Revisi',doc.revision],['PIC Dokumen',doc.pic],['Reviewer',doc.reviewer],
            ['Tanggal Pengajuan',formatDate(doc.requested)],['Tanggal Persetujuan',formatDate(doc.approval)],['Tanggal Ditutup',formatDate(doc.closed)],
            ['Alasan Perubahan',doc.reason],['Catatan',doc.remarks || '—'],
          ].map(([label,value]) => <div className="metadata-item" key={label}><small>{label}</small><b>{value}</b></div>)}</div>}
          {!editing && editMessage && <div className="inline-message" role="status">{editMessage}</div>}
        </section>
        <section className="panel detail-panel"><div className="section-heading"><div><div className="eyebrow">PEMANTAUAN TENGGAT</div><h2>SLA Dokumen</h2></div><SlaBadge doc={currentDocument} /></div>
          <div className="sla-detail-grid">{[['SLA',`${doc.sla} hari kalender`],['Tanggal jatuh tempo',formatDate(doc.due)],['Lama proses',`${calculateAging(currentDocument)} hari`],['Tindakan berikutnya',getActionRequired(currentDocument)]].map(([label,value]) => <div className="metadata-item" key={label}><small>{label}</small><b>{value}</b></div>)}</div>
        </section>
        <section className="panel detail-panel"><div className="section-heading"><div><div className="eyebrow">TINDAK LANJUT</div><h2>Follow-Up History</h2></div><button className="button secondary" onClick={() => setShowFollowUp(!showFollowUp)}>＋ Tambah Follow-Up</button></div>
          {showFollowUp && <div className="follow-form"><label>Tanggal Follow-Up<input type="date" value={followDate} onChange={event => setFollowDate(event.target.value)} /></label><label>Hasil Follow-Up<input value={followResult} onChange={event => setFollowResult(event.target.value)} placeholder="Apa hasil tindak lanjut?" /></label><label>Next Action<input value={nextAction} onChange={event => setNextAction(event.target.value)} placeholder="Langkah selanjutnya" /></label><button className="button primary" disabled={busy} onClick={() => void saveFollowUp()}>Simpan Follow-Up</button></div>}
          {doc.followups.length ? doc.followups.map((followUp,index) => <div className="follow-row" key={`${doc.id}-follow-${index}`}><b>{formatDate(followUp.date)} · {followUp.actor}</b><p>{followUp.result}</p><small>Langkah berikutnya: {followUp.next}</small></div>) : <p className="muted-copy">Belum ada follow-up. Catat hasil komunikasi agar riwayat tetap terdokumentasi.</p>}
        </section>
      </div>
      <aside className="detail-aside">
        <section className="panel workflow-panel"><div className="eyebrow">WORKFLOW</div><h2>Perbarui Status</h2><p>Pilih tindakan sesuai hasil proses dokumen.</p>
          {status === 'under_review' && <label className="workflow-note">Catatan QMSR<textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Catatan wajib untuk revisi atau penolakan; opsional untuk approval." /></label>}
          {message && <div className="inline-message" role="status">{message}</div>}
          {allowed.map(next => <button key={next} disabled={busy} className={`workflow-button ${next === 'approved' ? 'approve' : ''} ${next === 'rejected' ? 'reject' : ''}`} onClick={() => void apply(next)}><span>{next === 'need_revision' ? '↻' : next === 'approved' ? '✓' : next === 'rejected' ? '×' : '→'}</span>{statusLabels[next]}</button>)}
          {!allowed.length && <div className="terminal-note">Tidak ada tindakan workflow yang tersedia untuk role ini.</div>}
        </section>
        <section className="panel latest-note"><div className="eyebrow">CATATAN QMSR TERBARU</div><p>{[...doc.history].reverse().find(item => item.note)?.note || 'Belum ada catatan review.'}</p><small>— {doc.reviewer}</small></section>
        <section className="panel timeline-panel"><div className="eyebrow">AUDIT TRAIL</div><h2>Riwayat Dokumen</h2><div className="timeline">{[...doc.history].reverse().map((event,index) => <div className="timeline-entry" key={`${doc.id}-event-${index}`}><span className="timeline-dot" /><div><b>{event.action}</b><small>{formatDate(event.at)} · {event.actor}</small>{event.note && <p>{event.note}</p>}</div></div>)}</div></section>
      </aside>
    </div>
  </>;
}
