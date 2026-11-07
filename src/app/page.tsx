'use client';

import Link from 'next/link';
import { useMemo, useState, type CSSProperties } from 'react';
import {
  canReviewDocument,
  canSubmitDocument,
  canViewDocument,
  currentMonthKey,
  getActionRequired,
  getDetailedSlaStatus,
  getSlaStatus,
  percentageOrNull,
  statusLabels,
  statusOrder,
  todayLabel,
  type Company,
  type Status,
  type Submission
} from '@/lib/qms';
import { CompanyBadge, EmptyState, PageHeading, PriorityBadge, SlaBadge } from '@/components/ui';
import { useQmsData } from '@/components/qms-data-provider';

const statusTone: Record<Status, string> = {
  draft: 'var(--status-draft-fg)',
  submitted: 'var(--status-submitted-fg)',
  under_review: 'var(--status-review-fg)',
  qmsr_review: 'var(--status-review-fg)',
  need_revision: 'var(--status-revision-fg)',
  resubmitted: 'var(--status-resubmitted-fg)',
  approved: 'var(--status-approved-fg)',
  rejected: 'var(--status-rejected-fg)',
  closed: 'var(--status-closed-fg)',
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

  const {
    filteredSubmissions,
    departments,
    documentTypes,
    user,
    company,
    setCompany,
    loading,
    error,
    reload
  } = useQmsData();

  const periods = useMemo(() => {
    const [year, month] = currentMonthKey().split('-').map(Number);
    return Array.from({ length: 7 }, (_, index) => {
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

  const roleTitle = isQms
    ? 'Fokus Pengaju: Status Dokumen Saya'
    : isQmsr
      ? 'Antrian Review Saya (QMSR)'
      : isSectionHead
        ? 'Antrian Review QMS Section Head'
        : `Ringkasan Alur & Pemantauan Dokumen Real-Time`;

  const description = isQms
    ? 'Tracking dokumen pengajuan Anda dan revisi yang perlu ditindaklanjuti.'
    : isReviewDashboard
      ? 'Dokumen yang membutuhkan review dan verifikasi mutu Anda pada tahap alur saat ini.'
      : 'Pemantauan dokumen mutu, kepatuhan SLA, dan alur persetujuan kedua perusahaan secara real-time.';

  // Filter submissions by user visibility, company context, period, and facets
  const visible = useMemo(() => {
    return filteredSubmissions.filter(doc => canViewDocument(user, doc));
  }, [filteredSubmissions, user]);

  const filtered = useMemo(() => {
    return visible.filter(doc =>
      (period === 'all' || doc.requested.startsWith(period)) &&
      (!department || doc.department === department) &&
      (!type || doc.type === type) &&
      (!status || doc.status === status) &&
      (!pic || doc.pic === pic)
    );
  }, [visible, period, department, type, status, pic]);

  const count = (value: Status) => filtered.filter(doc => doc.status === value).length;
  const currentQueue = filtered.filter(doc => canReviewDocument(user, doc));
  const activeDocs = filtered.filter(doc => doc.status !== 'closed' && doc.status !== 'rejected');
  const overdueDocs = activeDocs.filter(doc => getSlaStatus(doc) === 'overdue');
  const dueSoonDocs = activeDocs.filter(doc => getSlaStatus(doc) === 'due_soon');

  // Attention documents sorted by urgency
  const attention = (
    isReviewDashboard
      ? currentQueue
      : isQms
        ? filtered.filter(doc => doc.status === 'need_revision' || doc.status === 'approved')
        : activeDocs.filter(
            doc =>
              doc.status === 'need_revision' ||
              doc.status === 'approved' ||
              getSlaStatus(doc) === 'overdue' ||
              getSlaStatus(doc) === 'due_soon'
          )
  ).sort((a, b) => priorityRank(a) - priorityRank(b) || a.due.localeCompare(b.due));

  // SLA Compliance calculation
  const totalEvaluated = activeDocs.length;
  const slaComplianceRate = percentageOrNull(totalEvaluated - overdueDocs.length, totalEvaluated);

  // Approval Ratio calculation
  const totalDecided = filtered.filter(doc => doc.status === 'approved' || doc.status === 'closed' || doc.status === 'rejected').length;
  const totalApproved = filtered.filter(doc => doc.status === 'approved' || doc.status === 'closed').length;
  const approvalRatio = percentageOrNull(totalApproved, totalDecided);

  // Average SLA Days
  const closedDocs = filtered.filter(doc => doc.status === 'closed');
  const avgSlaDays = closedDocs.length > 0
    ? (closedDocs.reduce((sum, d) => {
        const start = new Date(`${d.requested}T12:00:00+07:00`).getTime();
        const end = new Date(`${d.closed || d.due}T12:00:00+07:00`).getTime();
        return sum + Math.max(0, Math.floor((end - start) / 86400000));
      }, 0) / closedDocs.length).toFixed(1)
    : null;

  // Most critical document
  const mostCritical = attention[0];

  // Monthly Submissions vs Approved chart data (last 5 months)
  const monthlyChartData = useMemo(() => {
    return periods.slice(0, 5).reverse().map(p => {
      const monthSubmissions = visible.filter(d => d.requested.startsWith(p.value));
      const monthApproved = monthSubmissions.filter(d => d.status === 'approved' || d.status === 'closed');
      return {
        month: p.label.split(' ')[0],
        total: monthSubmissions.length,
        approved: monthApproved.length,
      };
    });
  }, [periods, visible]);

  // Department Workload top 4
  const departmentWorkload = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of filtered) {
      counts[d.department] = (counts[d.department] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);
  }, [filtered]);

  const maxWorkload = Math.max(1, ...departmentWorkload.map(d => d.total));

  if (loading) return <div className="panel data-loading" role="status">Memuat data pengajuan…</div>;
  if (error) {
    return (
      <div className="panel data-error" role="alert">
        <b>Dashboard belum dapat menampilkan data</b>
        <p>{error}</p>
        <button className="button secondary" onClick={() => void reload()}>Coba lagi</button>
      </div>
    );
  }

  return (
    <>
      {/* Top Banner and Navigation Bar */}
      <div className="dashboard-top-bar">
        <div className="dashboard-brand-row">
          <div className="entity-tag">
            <span className="entity-icon">🏢</span>
            <span>Entitas: <b>PT. Mega Marine Pride & PT. Baramuda Bahari</b></span>
          </div>
          <div className="dashboard-header-right">
            {overdueDocs.length > 0 && (
              <Link href="/documents?sla=overdue" className="overdue-alert-pill">
                <span>⚠️</span> {overdueDocs.length} Overdue
              </Link>
            )}
            <div className="role-pill">
              <span className="role-dot" />
              <span>Hak Akses: <b>{user?.role === 'admin' ? 'Admin' : user?.role === 'qms_section_head' ? 'QMS Section Head' : user?.role === 'qmsr' ? 'QMSR' : 'QMS'}</b></span>
            </div>
          </div>
        </div>

        <PageHeading
          eyebrow={todayLabel().toLocaleUpperCase('id-ID')}
          title={roleTitle}
          description={description}
          action={
            canSubmitDocument(user) ? (
              <Link className="button primary" href="/new">
                <span>＋</span> Ajukan Dokumen Baru
              </Link>
            ) : undefined
          }
        />
      </div>

      {/* Primary Multi-Company & Facet Filter Panel */}
      <section className="filter-panel">
        <div className="filter-caption">
          <span className="filter-glyph">🏢</span>
          <div>
            <b>Filter Perusahaan & Alur</b>
            <small>Data, tabel, dan grafik otomatis menyesuaikan entitas yang dipilih</small>
          </div>
        </div>

        <div className="filter-fields">
          <label className="company-filter-field">
            <span>Perusahaan:</span>
            <select
              value={company}
              onChange={e => setCompany(e.target.value as Company | 'all')}
              className="company-select"
            >
              <option value="all">Semua Perusahaan (Gabungan)</option>
              <option value="PT. Baramuda Bahari">PT. Baramuda Bahari</option>
              <option value="PT. Mega Marine Pride">PT. Mega Marine Pride</option>
            </select>
          </label>

          <label>
            <span>Periode:</span>
            <select value={period} onChange={event => setPeriod(event.target.value)}>
              <option value={periods[0].value}>{periods[0].label}</option>
              <option value="all">Semua Periode</option>
              {periods.slice(1).map(item => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Departemen:</span>
            <select value={department} onChange={event => setDepartment(event.target.value)}>
              <option value="">Semua Departemen</option>
              {departments.map(item => (
                <option key={item.id} value={item.name}>{item.name}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Jenis Dokumen:</span>
            <select value={type} onChange={event => setType(event.target.value)}>
              <option value="">Semua Jenis</option>
              {documentTypes.map(item => (
                <option key={item.id} value={item.name}>{item.name}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Status:</span>
            <select value={status} onChange={event => setStatus(event.target.value)}>
              <option value="">Semua Status</option>
              {statusOrder.map(value => (
                <option key={value} value={value}>{statusLabels[value]}</option>
              ))}
            </select>
          </label>

          <label className="pic-filter">
            <span>PIC:</span>
            <select value={pic} onChange={event => setPic(event.target.value)}>
              <option value="">Semua PIC</option>
              {Array.from(new Set(visible.map(doc => doc.pic))).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Reference 4 Modern Metric KPI Cards */}
      <section className="kpi-grid-reference">
        <div className="kpi-card-modern">
          <div className="kpi-card-top">
            <span className="kpi-title">Kepatuhan Waktu SLA</span>
            <span className="kpi-icon-pill green">⏱</span>
          </div>
          <div className="kpi-value-row">
            <strong>{slaComplianceRate === null ? '—' : `${slaComplianceRate}%`}</strong>
            <span className="kpi-tag success">{slaComplianceRate === null ? 'Belum dinilai' : 'Tepat Waktu'}</span>
          </div>
          <div className="kpi-subtext">
            <span>{overdueDocs.length} overdue</span>
            <span>·</span>
            <span>{dueSoonDocs.length} &lt; 24 jam</span>
          </div>
        </div>

        <div className="kpi-card-modern">
          <div className="kpi-card-top">
            <span className="kpi-title">Rasio Approval</span>
            <span className="kpi-icon-pill blue">✓</span>
          </div>
          <div className="kpi-value-row">
            <strong>{approvalRatio === null ? '—' : `${approvalRatio}%`}</strong>
            <span className="kpi-tag info">{totalDecided === 0 ? 'Belum ada keputusan' : `${totalApproved} Disetujui`}</span>
          </div>
          <div className="kpi-subtext">
            <span>{count('need_revision')} revisi</span>
            <span>·</span>
            <span>{count('under_review') + count('qmsr_review')} aktif review</span>
          </div>
        </div>

        <div className="kpi-card-modern">
          <div className="kpi-card-top">
            <span className="kpi-title">Rata-rata Waktu SLA</span>
            <span className="kpi-icon-pill purple">⚡</span>
          </div>
          <div className="kpi-value-row">
            <strong>{avgSlaDays ?? '—'}</strong>
            <span className="kpi-unit">hari kalender</span>
          </div>
          <div className="kpi-subtext">
            <span>{closedDocs.length ? `Berdasarkan ${closedDocs.length} dokumen ditutup` : 'Belum ada dokumen ditutup'}</span>
          </div>
        </div>

        <div className="kpi-card-modern">
          <div className="kpi-card-top">
            <span className="kpi-title">SLA Terkritis</span>
            <span className={`kpi-icon-pill ${overdueDocs.length ? 'red' : 'amber'}`}>!</span>
          </div>
          <div className="kpi-value-row">
            {mostCritical ? (
              <span className="kpi-doc-target" title={mostCritical.title}>
                {mostCritical.docNo}
              </span>
            ) : (
              <span className="kpi-doc-target">{filtered.length === 0 ? 'Belum Ada Data' : 'Tidak Ada Prioritas'}</span>
            )}
          </div>
          <div className="kpi-subtext">
            {mostCritical ? (
              <span className="text-urgent">{getDetailedSlaStatus(mostCritical).badgeLabel}</span>
            ) : (
              <span>{filtered.length === 0 ? 'Belum ada pengajuan pada filter ini' : 'Tidak ada dokumen kritis'}</span>
            )}
          </div>
        </div>
      </section>

      {/* Middle Visual Charts & Workload */}
      <div className="dashboard-grid">
        {/* Monthly Bar Chart: Submissions vs Approved */}
        <section className="panel chart-panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow">TREN KINERJA BULANAN</div>
              <h2>Grafik Pengajuan vs Approved per Bulan</h2>
              <p>Perbandingan volume pengajuan masuk dan persetujuan selesai</p>
            </div>
            <div className="chart-legend">
              <span className="legend-item"><i className="legend-dot submissions" /> Pengajuan</span>
              <span className="legend-item"><i className="legend-dot approved" /> Disetujui</span>
            </div>
          </div>

          <div className="chart-bar-container">
            {monthlyChartData.every(m => m.total === 0 && m.approved === 0) ? (
              <div className="chart-empty-message">Belum ada pengajuan atau persetujuan untuk lima bulan terakhir.</div>
            ) : monthlyChartData.map(m => {
              const maxVal = Math.max(1, ...monthlyChartData.map(x => Math.max(x.total, x.approved)));
              const subH = Math.round((m.total / maxVal) * 120);
              const appH = Math.round((m.approved / maxVal) * 120);
              return (
                <div className="chart-col" key={m.month}>
                  <div className="bars-pair">
                    <div className="bar-sub" style={{ height: `${subH}px` }} title={`Pengajuan: ${m.total}`}>
                      <span>{m.total || ''}</span>
                    </div>
                    <div className="bar-app" style={{ height: `${appH}px` }} title={`Disetujui: ${m.approved}`}>
                      <span>{m.approved || ''}</span>
                    </div>
                  </div>
                  <small className="chart-month-label">{m.month}</small>
                </div>
              );
            })}
          </div>
        </section>

        {/* Status Distribution & Department Workload */}
        <div className="dashboard-side-panels">
          <section className="panel status-panel">
            <div className="section-heading">
              <div>
                <div className="eyebrow">DISTRIBUSI TAHAPAN</div>
                <h2>Status Alur Dokumen</h2>
              </div>
            </div>
            <div className="status-list">
              {statusOrder.map(value => {
                const total = count(value);
                const percentage = filtered.length ? Math.round((total / filtered.length) * 100) : 0;
                return (
                  <div className="status-line" key={value}>
                    <span className="status-dot" style={{ '--dot-color': statusTone[value] } as CSSProperties} />
                    <span className="status-line-label">{statusLabels[value]}</span>
                    <b>{total}</b>
                    <div className="progress-track">
                      <i style={{ width: `${percentage}%`, '--bar-color': statusTone[value] } as CSSProperties} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="panel workload-panel">
            <div className="section-heading">
              <div>
                <div className="eyebrow">BEBAN KERJA UNIT</div>
                <h2>Beban Kerja Departemen</h2>
              </div>
            </div>
            <div className="workload-list">
              {departmentWorkload.map(item => (
                <div className="workload-row" key={item.name}>
                  <span className="workload-name">{item.name}</span>
                  <div className="workload-bar-track">
                    <div
                      className="workload-bar-fill"
                      style={{ width: `${Math.round((item.total / maxWorkload) * 100)}%` }}
                    />
                  </div>
                  <b>{item.total} Dokumen</b>
                </div>
              ))}
              {departmentWorkload.length === 0 && (
                <small className="muted-copy">Tidak ada data untuk filter aktif.</small>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Urgent Attention / Action Table matching reference */}
      <section className="panel attention-panel">
        <div className="section-heading">
          <div>
            <div className="eyebrow">PRIORITAS HARI INI</div>
            <h2>
              {isQms
                ? 'Revisi / Koreksi yang Perlu Saya Tindaklanjuti'
                : isReviewDashboard
                  ? 'Antrian Review Saya'
                  : 'Dokumen Perlu Perhatian & Tindak Lanjut Segera'}{' '}
              <span className="count-pill">{attention.length}</span>
            </h2>
            <p>
              {isQms
                ? 'Pengajuan Anda yang membutuhkan revisi perbaikan klausa atau penutupan'
                : isReviewDashboard
                  ? 'Dokumen yang berada pada tahap review Anda saat ini'
                  : 'Dokumen yang mendekati batas SLA, perlu revisi, atau menunggu persetujuan'}
            </p>
          </div>
          <Link className="text-link" href={isReviewDashboard ? '/actions' : '/documents'}>
            Lihat semua <span>→</span>
          </Link>
        </div>

        {attention.length ? (
          <div className="attention-list">
            {attention.slice(0, 5).map(doc => {
              const slaDetail = getDetailedSlaStatus(doc);
              return (
                <Link href={`/documents/${doc.id}`} className="attention-row" key={doc.id}>
                  <div className={`attention-mark ${slaDetail.status}`}>
                    <span>{doc.status === 'need_revision' ? '↻' : doc.status === 'approved' ? '✓' : '!'}</span>
                  </div>
                  <div className="attention-copy">
                    <div className="card-topline">
                      <CompanyBadge company={doc.company} />
                      <span className="doc-number">{doc.docNo}</span>
                      <PriorityBadge priority={doc.priority} />
                    </div>
                    <b>{doc.title}</b>
                    <small>
                      {doc.department} <span>·</span> PIC: {doc.pic} <span>·</span> Rev {doc.revision}
                    </small>
                  </div>
                  <div className="attention-action">
                    <SlaBadge doc={doc} />
                    <span className="action-cta">
                      {isReviewDashboard ? 'Review Sekarang' : getActionRequired(doc)} ›
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={
              isQms
                ? 'Tidak ada revisi yang perlu ditindaklanjuti'
                : isReviewDashboard
                  ? 'Antrian review Anda kosong'
                  : filtered.length === 0 ? 'Belum ada dokumen pada filter ini' : 'Tidak ada dokumen yang membutuhkan tindakan'
            }
            detail={
              isReviewDashboard
                ? 'Tidak ada dokumen yang menunggu review Anda saat ini.'
                : filtered.length === 0
                  ? 'Buat pengajuan baru atau ubah filter untuk memulai pemantauan dokumen.'
                  : 'Tidak ada dokumen yang memerlukan tindakan pada filter terpilih.'
            }
            action={filtered.length === 0 && canSubmitDocument(user)
              ? <Link href="/new" className="button primary">+ Ajukan Dokumen Baru</Link>
              : undefined}
          />
        )}
      </section>

    </>
  );
}
