'use client';

import { getSlaStatus, statusLabels, statusOrder, type Company } from '@/lib/qms';
import { PageHeading } from '@/components/ui';
import { useQmsData } from '@/components/qms-data-provider';

export default function Analytics() {
  const { filteredSubmissions, company, setCompany, loading, error } = useQmsData();

  const total = filteredSubmissions.length;
  const closed = filteredSubmissions.filter(doc => doc.status === 'closed');
  const overdue = filteredSubmissions.filter(doc => getSlaStatus(doc) === 'overdue').length;

  const departments = Array.from(new Set(filteredSubmissions.map(doc => doc.department)))
    .map(name => ({
      name,
      count: filteredSubmissions.filter(doc => doc.department === name).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const types = Array.from(new Set(filteredSubmissions.map(doc => doc.type)))
    .map(name => ({
      name,
      count: filteredSubmissions.filter(doc => doc.type === name).length,
    }))
    .sort((a, b) => b.count - a.count);

  const baramudaCount = filteredSubmissions.filter(doc => doc.company === 'PT. Baramuda Bahari').length;
  const megaCount = filteredSubmissions.filter(doc => doc.company === 'PT. Mega Marine Pride').length;
  const companyStats = [
    { name: 'PT. Baramuda Bahari', count: baramudaCount },
    { name: 'PT. Mega Marine Pride', count: megaCount },
  ];

  const averageDays = closed.length
    ? Math.round(
        closed.reduce((sum, doc) => {
          const start = new Date(`${doc.requested}T12:00:00+07:00`).getTime();
          const end = new Date(`${doc.closed}T12:00:00+07:00`).getTime();
          return sum + Math.max(0, (end - start) / 86400000);
        }, 0) / closed.length
      )
    : 0;

  const onTimeRate = total > 0 ? Math.round(((total - overdue) / total) * 100) : 100;
  const maxDepartment = Math.max(1, ...departments.map(item => item.count));
  const maxType = Math.max(1, ...types.map(item => item.count));
  const maxCompany = Math.max(1, ...companyStats.map(item => item.count));

  if (loading) return <div className="panel data-loading">Memuat analitik…</div>;

  const bar = (label: string, count: number, max: number) => (
    <div className="bar-row" key={label}>
      <span>{label}</span>
      <div className="bar-track">
        <i style={{ width: `${(count / max) * 100}%` }} />
      </div>
      <b>{count}</b>
    </div>
  );

  return (
    <>
      <div className="analytics-header-row">
        <PageHeading
          eyebrow="INTELLIGENCE & METRICS MUTU"
          title="Analitik Kinerja Dokumen & SLA"
          description={error || 'Statistik komprehensif kepatuhan SLA, distribusi workflow, dan volume entitas.'}
        />

        <div className="company-badge-selector">
          <span>Perusahaan:</span>
          <select
            value={company}
            onChange={e => setCompany(e.target.value as Company | 'all')}
            className="company-select mini-select"
          >
            <option value="all">Semua Perusahaan</option>
            <option value="PT. Baramuda Bahari">PT. Baramuda Bahari</option>
            <option value="PT. Mega Marine Pride">PT. Mega Marine Pride</option>
          </select>
        </div>
      </div>

      <section className="analytics-kpis">
        <div className="panel analytics-kpi">
          <small>Total Pengajuan</small>
          <b>{total}</b>
          <span>Semua periode ({company === 'all' ? 'Gabungan' : company})</span>
        </div>
        <div className="panel analytics-kpi">
          <small>Kepatuhan SLA</small>
          <b>{onTimeRate}%</b>
          <span>Dokumen memenuhi target SLA</span>
        </div>
        <div className="panel analytics-kpi">
          <small>Overdue / Terlambat</small>
          <b className="text-urgent">{overdue}</b>
          <span>Membutuhkan tindak lanjut</span>
        </div>
        <div className="panel analytics-kpi">
          <small>Rata-rata Penyelesaian</small>
          <b>{averageDays} hari</b>
          <span>Dokumen ditutup</span>
        </div>
      </section>

      <div className="analytics-grid">
        <section className="panel analytics-panel">
          <div className="eyebrow">DISTRIBUSI ALUR</div>
          <h2>Pengajuan berdasarkan Status</h2>
          {statusOrder.map(status =>
            bar(
              statusLabels[status],
              filteredSubmissions.filter(doc => doc.status === status).length,
              total || 1
            )
          )}
        </section>

        <section className="panel analytics-panel">
          <div className="eyebrow">DISTRIBUSI ENTITAS</div>
          <h2>Volume Berkas per Perusahaan</h2>
          {companyStats.map(item => bar(item.name, item.count, maxCompany))}
        </section>

        <section className="panel analytics-panel">
          <div className="eyebrow">UNIT KERJA</div>
          <h2>Pengajuan per Departemen</h2>
          {departments.map(item => bar(item.name, item.count, maxDepartment))}
          {departments.length === 0 && <small className="muted-copy">Tidak ada data.</small>}
        </section>

        <section className="panel analytics-panel">
          <div className="eyebrow">KATEGORI DOKUMEN</div>
          <h2>Distribusi Jenis Dokumen</h2>
          {types.map(item => bar(item.name, item.count, maxType))}
        </section>
      </div>
    </>
  );
}
