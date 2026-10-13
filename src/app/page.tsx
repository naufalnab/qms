'use client';

import Link from 'next/link';
import { useMemo, useState, type CSSProperties } from 'react';
import { canReviewDocument, canSubmitDocument, canViewDocument, currentMonthKey, formatDate, getActionRequired, getSlaStatus, statusLabels, statusOrder, todayLabel, type Status, type Submission } from '@/lib/qms';
import { EmptyState, PageHeading, SlaBadge, StatusBadge } from '@/components/ui';
import { useQmsData } from '@/components/qms-data-provider';

const statusTone: Record<Status, string> = {
  draft: 'var(--status-draft-fg)', submitted: 'var(--status-submitted-fg)', under_review: 'var(--status-review-fg)',
  qmsr_review: 'var(--status-review-fg)', need_revision: 'var(--status-revision-fg)', resubmitted: 'var(--status-resubmitted-fg)',
  approved: 'var(--status-approved-fg)', rejected: 'var(--status-rejected-fg)', closed: 'var(--status-closed-fg)',
};

function priorityRank(doc: Submission) {
  if (doc.status === 'approved') return 4;
  if (getSlaStatus(doc) === 'overdue') return 0;
  if (doc.status === 'need_revision') return 1;
  if (getSlaStatus(doc) === 'due_soon') return 2;
  return 3;
}

export default function Dashboard() {
  const [period, setPeriod] = useState(currentMonthKey);
  const [department, setDepartment] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [pic, setPic] = useState('');
  const { submissions, departments, documentTypes, user, loading, error, reload } = useQmsData();
  const periods = useMemo(() => {
    const [year, month] = currentMonthKey().split('-').map(Number);
    return Array.from({ length: 7 }, (_, index) => {
      // Start on the first day to avoid skipping February or duplicating March on the 31st.
      const date = new Date(Date.UTC(year, month - 1 - index, 1, 5));
      return {
        value: date.toISOString().slice(0, 7),
        label: new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(date),
      };
    });
  }, []);

  const isQms = user?.role === 'qms';
  const isQmsr = user?.role === 'qmsr';
  const isSectionHead = user?.role === 'qms_section_head';
  const isReviewDashboard = isQmsr || isSectionHead;
  const title = isQms ? 'Pengajuan Saya'
    : isQmsr ? 'Antrian Review Saya'
      : isSectionHead ? 'Antrian Review QMS Section Head'
        : `Selamat datang${user?.fullName ? `, ${user.fullName}` : ''}`;
  const description = isQms ? 'Tracking dokumen Anda dan revisi yang perlu ditindaklanjuti.'
    : isReviewDashboard ? 'Dokumen yang membutuhkan review Anda pada tahap workflow saat ini.'
      : 'Berikut ringkasan pengajuan dokumen QMS hari ini.';

  const visible = useMemo(() => submissions.filter(doc => canViewDocument(user, doc)), [submissions, user]);
  const filtered = useMemo(() => visible.filter(doc =>
    (period === 'all' || doc.requested.startsWith(period))
    && (!department || doc.department === department)
    && (!type || doc.type === type)
    && (!status || doc.status === status)
    && (!pic || doc.pic === pic)), [visible, period, department, type, status, pic]);

  const count = (value: Status) => filtered.filter(doc => doc.status === value).length;
  const currentQueue = filtered.filter(doc => canReviewDocument(user, doc));
  const activeDocs = filtered.filter(doc => doc.status !== 'closed' && doc.status !== 'rejected');
  const overdue = activeDocs.filter(doc => getSlaStatus(doc) === 'overdue');
  const dueSoon = activeDocs.filter(doc => getSlaStatus(doc) === 'due_soon');
  const attention = (isReviewDashboard ? currentQueue
    : isQms ? filtered.filter(doc => doc.status === 'need_revision' || doc.status === 'approved')
      : activeDocs.filter(doc => doc.status === 'need_revision' || doc.status === 'approved'
        || getSlaStatus(doc) === 'overdue' || getSlaStatus(doc) === 'due_soon'))
    .sort((a, b) => priorityRank(a) - priorityRank(b) || a.due.localeCompare(b.due));

  const kpis: [string, number, string, string, string][] = isQms ? [
    ['Total Pengajuan Saya', filtered.length, '▤', 'neutral', '/documents'],
    ['Dalam Review', count('under_review') + count('qmsr_review') + count('submitted') + count('resubmitted'), '◷', 'blue', '/documents'],
    ['Perlu Revisi', count('need_revision'), '↻', 'amber', '/documents?status=need_revision'],
    ['Disetujui', count('approved'), '✓', 'green', '/documents?status=approved'],
  ] : isReviewDashboard ? [
    ['Menunggu Review', currentQueue.length, '◷', 'blue', '/documents'],
    ['Segera Jatuh Tempo', currentQueue.filter(doc => getSlaStatus(doc) === 'due_soon').length, '⌛', 'amber', '/documents?sla=due_soon'],
    ['Terlambat', currentQueue.filter(doc => getSlaStatus(doc) === 'overdue').length, '!', 'red', '/documents?sla=overdue'],
    ['Total Dokumen', filtered.length, '▤', 'neutral', '/documents'],
  ] : [
    ['Total Pengajuan', filtered.length, '▤', 'neutral', '/documents'],
    ['Dalam Review', count('under_review') + count('qmsr_review') + count('submitted') + count('resubmitted'), '◷', 'blue', '/documents?status=under_review'],
    ['Perlu Revisi', count('need_revision'), '↻', 'amber', '/documents?status=need_revision'],
    ['Terlambat', overdue.length, '!', 'red', '/documents?sla=overdue'],
  ];

  if (loading) return <div className="panel data-loading" role="status">Memuat data pengajuan…</div>;
  if (error) return <div className="panel data-error" role="alert"><b>Dashboard belum dapat menampilkan data</b><p>{error}</p><button className="button secondary" onClick={() => void reload()}>Coba lagi</button></div>;

  return <>
    <PageHeading eyebrow={todayLabel().toLocaleUpperCase('id-ID')} title={title} description={description}
      action={canSubmitDocument(user) ? <Link className="button primary" href="/new"><span>＋</span> Pengajuan Baru</Link> : undefined} />
    <section className="filter-panel">
      <div className="filter-caption"><span className="filter-glyph">⌁</span><div><b>Filter ringkasan</b><small>Semua informasi menyesuaikan filter aktif</small></div></div>
      <div className="filter-fields">
        <label>Periode<select value={period} onChange={event => setPeriod(event.target.value)}>
          <option value={periods[0].value}>{periods[0].label}</option>
          <option value="all">Semua Periode</option>
          {periods.slice(1).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select></label>
        <label>Departemen<select value={department} onChange={event => setDepartment(event.target.value)}><option value="">Semua Departemen</option>{departments.map(item => <option key={item.id}>{item.name}</option>)}</select></label>
        <label>Jenis Dokumen<select value={type} onChange={event => setType(event.target.value)}><option value="">Semua Jenis</option>{documentTypes.map(item => <option key={item.id}>{item.name}</option>)}</select></label>
        <label>Status<select value={status} onChange={event => setStatus(event.target.value)}><option value="">Semua Status</option>{statusOrder.map(value => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label>
        <label className="pic-filter">PIC / Requestor<select value={pic} onChange={event => setPic(event.target.value)}><option value="">Semua PIC</option>{Array.from(new Set(visible.map(doc => doc.pic))).map(name => <option key={name}>{name}</option>)}</select></label>
      </div>
    </section>

    <section className="kpi-grid">{kpis.map(([label, value, icon, color, href]) => <Link className="kpi-card" href={href} key={label}>
      <div className="kpi-top"><span>{label}</span><i className={`kpi-icon ${color}`}>{icon}</i></div><strong>{value}</strong><small>Dari filter aktif <span>↗</span></small>
    </Link>)}</section>

    <div className="dashboard-grid">
      <section className="panel attention-panel">
        <div className="section-heading"><div><div className="eyebrow">{isReviewDashboard ? 'ANTRIAN WORKFLOW' : 'PRIORITAS HARI INI'}</div>
          <h2>{isQms ? 'Revisi / Koreksi yang Perlu Saya Tindaklanjuti' : isReviewDashboard ? 'Antrian Review Saya' : 'Butuh Tindakan'} <span className="count-pill">{attention.length}</span></h2>
          <p>{isQms ? 'Pengajuan Anda yang perlu direvisi atau ditutup' : isReviewDashboard ? 'Dokumen yang berada pada tahap review Anda' : 'Dokumen yang membutuhkan perhatian Anda'}</p>
        </div><Link className="text-link" href={isReviewDashboard ? '/documents' : '/actions'}>Lihat semua <span>→</span></Link></div>
        {attention.length ? <div className="attention-list">{attention.slice(0, 5).map(doc => <Link href={`/documents/${doc.id}`} className="attention-row" key={doc.id}>
          <div className={`attention-mark ${getSlaStatus(doc)}`}><span>{doc.status === 'need_revision' ? '↻' : doc.status === 'approved' ? '✓' : '!'}</span></div>
          <div className="attention-copy"><div className="card-topline"><span className="doc-number">{doc.docNo}</span><SlaBadge doc={doc} /></div><b>{doc.title}</b><small>{doc.department} <span>·</span> PIC: {doc.pic}</small></div>
          <div className="attention-action"><small>{formatDate(doc.due)}</small><span>{isReviewDashboard ? 'Review dokumen' : getActionRequired(doc)}　›</span></div>
        </Link>)}</div> : <EmptyState
          title={isQms ? 'Tidak ada revisi yang perlu ditindaklanjuti' : isReviewDashboard ? 'Antrian review kosong' : 'Tidak ada dokumen yang perlu ditindaklanjuti'}
          detail={isReviewDashboard ? 'Tidak ada dokumen pada tahap review Anda untuk filter ini.' : 'Semua pengajuan pada filter ini berjalan sesuai jadwal.'} />}
      </section>

      <section className="panel status-panel"><div className="section-heading"><div><div className="eyebrow">GAMBARAN UMUM</div><h2>Status Pengajuan</h2><p>Distribusi status pada periode aktif</p></div><span className="tiny-calendar">◷</span></div>
        <div className="status-list">{statusOrder.map(value => {
          const total = count(value);
          const percentage = filtered.length ? Math.round(total / filtered.length * 100) : 0;
          return <div className="status-line" key={value}><span className="status-dot" style={{ '--dot-color': statusTone[value] } as CSSProperties} /><span className="status-line-label">{statusLabels[value]}</span><b>{total}</b><div className="progress-track"><i style={{ width: `${percentage}%`, '--bar-color': statusTone[value] } as CSSProperties} /></div></div>;
        })}</div>
      </section>
    </div>

    <div className="lower-grid">
      <section className="panel sla-panel"><div className="section-heading"><div><div className="eyebrow">PANTAU TENGGAT</div><h2>Monitoring SLA</h2></div><Link className="text-link" href="/documents">Detail →</Link></div>
        <div className="sla-summary"><div className="sla-stat"><span className="sla-orb green">✓</span><div><strong>{activeDocs.filter(doc => getSlaStatus(doc) === 'on_time').length}</strong><small>Tepat Waktu</small></div></div>
          <div className="sla-stat"><span className="sla-orb orange">⌛</span><div><strong>{dueSoon.length}</strong><small>Segera Jatuh Tempo</small></div></div>
          <div className="sla-stat"><span className="sla-orb red">!</span><div><strong>{overdue.length}</strong><small>Terlambat</small></div></div>
          <div className="sla-stat"><span className="sla-orb gray">✓</span><div><strong>{count('closed')}</strong><small>Selesai</small></div></div>
        </div>
      </section>
      <section className="panel recent-panel"><div className="section-heading"><div><div className="eyebrow">AKTIVITAS TERBARU</div><h2>Dokumen Terbaru</h2></div><Link className="text-link" href="/documents">Semua →</Link></div>
        {filtered.length ? <div className="recent-list">{[...filtered].sort((a, b) => b.requested.localeCompare(a.requested)).slice(0, 4).map(doc => <Link href={`/documents/${doc.id}`} className="recent-row" key={doc.id}><span className="file-icon">▤</span><span className="recent-name"><b>{doc.docNo}</b><small>{doc.title}</small></span><StatusBadge status={doc.status} /></Link>)}</div>
          : <EmptyState title="Belum ada dokumen" detail="Tidak ada pengajuan yang sesuai dengan filter aktif." />}
      </section>
    </div>
  </>;
}
