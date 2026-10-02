'use client';

import { getSlaStatus, statusLabels, statusOrder } from '@/lib/qms';
import { PageHeading } from '@/components/ui';
import { useQmsData } from '@/components/qms-data-provider';

export default function Analytics() {
  const { submissions, loading, error } = useQmsData();
  const total = submissions.length;
  const closed = submissions.filter(doc => doc.status === 'closed');
  const completedOnTime = closed.filter(doc => Boolean(doc.closed && doc.closed <= doc.due)).length;
  const overdue = submissions.filter(doc => getSlaStatus(doc) === 'overdue').length;
  const departments = Array.from(new Set(submissions.map(doc => doc.department))).map(name => ({ name, count: submissions.filter(doc => doc.department === name).length })).sort((a,b) => b.count-a.count).slice(0,8);
  const types = Array.from(new Set(submissions.map(doc => doc.type))).map(name => ({ name, count: submissions.filter(doc => doc.type === name).length })).sort((a,b) => b.count-a.count);
  const averageDays = closed.length ? Math.round(closed.reduce((sum,doc) => sum + Math.max(0,(new Date(`${doc.closed}T12:00:00+07:00`).getTime()-new Date(`${doc.requested}T12:00:00+07:00`).getTime())/86400000),0)/closed.length) : 0;
  const maxDepartment = Math.max(1,...departments.map(item => item.count));
  const maxType = Math.max(1,...types.map(item => item.count));
  if (loading) return <div className="panel data-loading">Memuat analitik…</div>;
  const bar = (label: string, count: number, max: number) => <div className="bar-row" key={label}><span>{label}</span><div className="bar-track"><i style={{ width: `${count / max * 100}%` }} /></div><b>{count}</b></div>;
  return <><PageHeading eyebrow="RINGKASAN KINERJA" title="Analitik" description={error || 'Gambaran pengajuan dan pemenuhan SLA.'} /><section className="analytics-kpis"><div className="panel analytics-kpi"><small>Total Pengajuan</small><b>{total}</b><span>Semua periode</span></div><div className="panel analytics-kpi"><small>On Time Rate</small><b>{closed.length ? Math.round(completedOnTime/closed.length*100) : 0}%</b><span>Dokumen ditutup tepat waktu</span></div><div className="panel analytics-kpi"><small>Terlambat</small><b>{overdue}</b><span>Perlu tindak lanjut</span></div><div className="panel analytics-kpi"><small>Rata-rata Penutupan</small><b>{averageDays} hari</b><span>Dokumen ditutup</span></div></section><div className="analytics-grid"><section className="panel analytics-panel"><div className="eyebrow">DISTRIBUSI</div><h2>Pengajuan berdasarkan Status</h2>{statusOrder.map(status => bar(statusLabels[status],submissions.filter(doc => doc.status === status).length,total||1))}</section><section className="panel analytics-panel"><div className="eyebrow">UNIT KERJA</div><h2>Pengajuan per Departemen</h2>{departments.map(item => bar(item.name,item.count,maxDepartment))}</section><section className="panel analytics-panel"><div className="eyebrow">KATEGORI</div><h2>Jenis Dokumen</h2>{types.map(item => bar(item.name,item.count,maxType))}</section><section className="panel analytics-panel"><div className="eyebrow">SLA</div><h2>Distribusi SLA</h2>{(['on_time','due_soon','overdue','completed'] as const).map(status => bar(({on_time:'Tepat Waktu',due_soon:'Mendekati Deadline',overdue:'Terlambat',completed:'Selesai'})[status],submissions.filter(doc => getSlaStatus(doc) === status).length,total||1))}</section></div></>;
}
