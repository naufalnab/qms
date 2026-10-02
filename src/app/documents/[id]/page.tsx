'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { calculateAging, canTransitionStatus, demoSubmissions, formatDate, getActionRequired, statusLabels, todayISO, type Status } from '@/lib/qms';
import { PageHeading, PriorityBadge, SlaBadge, StatusBadge } from '@/components/ui';
import { useQmsData } from '@/components/qms-data-provider';
import { getSupabaseBrowserClient, isDemoMode } from '@/lib/supabase/client';

const transitionActions: Status[] = ['submitted','under_review','need_revision','resubmitted','approved','rejected','closed'];

export default function DocumentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { submissions, loading, error, reload } = useQmsData();
  const doc = submissions.find(item => item.id === id) || demoSubmissions.find(item => item.id === id);
  const [statusOverride, setStatusOverride] = useState<Status | null>(null);
  const [role, setRole] = useState(isDemoMode ? 'admin' : 'viewer');
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
      if (active && profile?.role) setRole(profile.role);
    });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="panel data-loading">Memuat detail dokumen…</div>;
  if (error) return <div className="panel data-error" role="alert">{error}</div>;
  if (!doc) return <div className="panel">Dokumen tidak ditemukan. <Link className="text-link" href="/documents">Kembali ke dokumen</Link></div>;

  const currentDocument = { ...doc, status };
  const allowed = transitionActions.filter(next => canTransitionStatus(status, next, role));
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
        <section className="panel detail-panel"><div className="section-heading"><div><div className="eyebrow">INFORMASI DOKUMEN</div><h2>Detail Pengajuan</h2></div><PriorityBadge priority={doc.priority} /></div>
          <div className="metadata-grid">{[
            ['Status Dokumen',doc.condition === 'new' ? 'Baru' : 'Lama'],['Departemen',doc.department],['Jenis Dokumen',doc.type],
            ['Nomor Dokumen',doc.docNo],['Revisi',doc.revision],['PIC Dokumen',doc.pic],['Reviewer',doc.reviewer],
            ['Tanggal Pengajuan',formatDate(doc.requested)],['Tanggal Persetujuan',formatDate(doc.approval)],['Tanggal Ditutup',formatDate(doc.closed)],
            ['Alasan Perubahan',doc.reason],['Catatan',doc.remarks || '—'],
          ].map(([label,value]) => <div className="metadata-item" key={label}><small>{label}</small><b>{value}</b></div>)}</div>
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
