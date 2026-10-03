'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { formatDate, getActionRequired, getSlaStatus, priorityLabels, statusLabels, statusOrder, currentMonthKey } from '@/lib/qms';
import { PageHeading, PriorityBadge, SlaBadge, StatusBadge } from '@/components/ui';
import { useQmsData } from '@/components/qms-data-provider';

function DocumentsContent({ initialStatus, initialSla }: { initialStatus: string; initialSla: string }) {
  const { submissions, departments, documentTypes, reviewers, loading, error } = useQmsData();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [department, setDepartment] = useState('');
  const [type, setType] = useState('');
  const [sla, setSla] = useState(initialSla);
  const [condition, setCondition] = useState('');
  const [priority, setPriority] = useState('');
  const [reviewer, setReviewer] = useState('');
  const [pic, setPic] = useState('');
  const [period, setPeriod] = useState('');
  const [sort, setSort] = useState('due_asc');

  const rows = useMemo(() => submissions
    .filter(doc => `${doc.number} ${doc.docNo} ${doc.title} ${doc.pic} ${doc.reviewer}`.toLowerCase().includes(query.toLowerCase())
      && (!status || doc.status === status)
      && (!department || doc.department === department)
      && (!type || doc.type === type)
      && (!sla || getSlaStatus(doc) === sla)
      && (!condition || doc.condition === condition)
      && (!priority || doc.priority === priority)
      && (!reviewer || doc.reviewer === reviewer)
      && (!pic || doc.pic === pic)
      && (!period || (period === 'all' ? true : doc.requested.startsWith(period))))
    .sort((a, b) => sort === 'newest' ? b.requested.localeCompare(a.requested)
      : sort === 'oldest' ? a.requested.localeCompare(b.requested)
        : sort === 'priority' ? ['critical','high','medium','low'].indexOf(a.priority)-['critical','high','medium','low'].indexOf(b.priority)
          : sort === 'aging' ? new Date(a.requested).getTime()-new Date(b.requested).getTime() : a.due.localeCompare(b.due)),
    [submissions, query, status, department, type, sla, condition, priority, reviewer, pic, period, sort]);

  const exportXlsx = () => {
    const records = rows.map((doc, index) => ({
      'No.': index + 1, 'Submission Number': doc.number, 'Request Date': formatDate(doc.requested),
      'Document Condition': doc.condition === 'new' ? 'Baru' : 'Lama', Department: doc.department,
      'Document Type': doc.type, 'Document No.': doc.docNo, 'Document Title': doc.title,
      Revision: doc.revision, 'Change Reason': doc.reason, 'PIC / Requestor': doc.pic,
      Reviewer: doc.reviewer, Priority: priorityLabels[doc.priority], 'SLA Days': doc.sla,
      'Due Date': formatDate(doc.due), Status: statusLabels[doc.status],
      'Approval Date': formatDate(doc.approval), 'Closed Date': formatDate(doc.closed),
      'Aging Days': Math.max(0, Math.floor((new Date(`${doc.closed || new Date().toISOString().slice(0, 10)}T12:00:00`).getTime() - new Date(`${doc.requested}T12:00:00`).getTime()) / 86400000)),
      'SLA Status': getSlaStatus(doc), 'Action Required': getActionRequired(doc),
      'Latest QMSR Note': [...doc.history].reverse().find(event => event.note)?.note || '', Remarks: doc.remarks,
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(records), 'Document Database');
    XLSX.writeFile(workbook, `QMS_Document_Monitoring_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return <>
    <PageHeading eyebrow="DATABASE DOKUMEN" title="Semua Dokumen" description="Cari dan kelola seluruh pengajuan dokumen QMS."
      action={<div className="heading-actions"><button className="button secondary export-button" onClick={exportXlsx}>↓ Export Excel</button><Link href="/new" className="button primary">＋ Pengajuan Baru</Link></div>} />
    <div className="panel document-panel">
      <div className="documents-toolbar">
        <label className="search-box"><span>⌕</span><input placeholder="Cari nomor dokumen, judul, PIC..." value={query} onChange={event => setQuery(event.target.value)} /><kbd>⌘ K</kbd></label>
        <select aria-label="Filter status" value={status} onChange={event => setStatus(event.target.value)}><option value="">Semua Status</option>{statusOrder.map(item => <option value={item} key={item}>{statusLabels[item]}</option>)}</select>
        <select aria-label="Filter departemen" value={department} onChange={event => setDepartment(event.target.value)}><option value="">Semua Departemen</option>{departments.map(item => <option key={item.id}>{item.name}</option>)}</select>
        <select aria-label="Filter jenis dokumen" value={type} onChange={event => setType(event.target.value)}><option value="">Semua Jenis</option>{documentTypes.map(item => <option key={item.id}>{item.name}</option>)}</select>
        <select aria-label="Filter SLA" value={sla} onChange={event => setSla(event.target.value)}><option value="">Semua SLA</option><option value="on_time">Tepat Waktu</option><option value="due_soon">Mendekati Deadline</option><option value="overdue">Terlambat</option><option value="completed">Selesai</option></select>
        <select aria-label="Filter periode" value={period} onChange={event => setPeriod(event.target.value)}><option value="">Semua Periode</option><option value={currentMonthKey()}>Bulan Ini</option></select>
        <select aria-label="Filter kondisi dokumen" value={condition} onChange={event => setCondition(event.target.value)}><option value="">Baru / Lama</option><option value="new">Baru</option><option value="existing">Lama</option></select>
        <select aria-label="Filter prioritas" value={priority} onChange={event => setPriority(event.target.value)}><option value="">Semua Prioritas</option><option value="low">Rendah</option><option value="medium">Sedang</option><option value="high">Tinggi</option><option value="critical">Kritis</option></select>
        <select aria-label="Filter reviewer" value={reviewer} onChange={event => setReviewer(event.target.value)}><option value="">Semua Reviewer</option>{reviewers.map(item => <option key={item.id}>{item.name}</option>)}</select>
        <select aria-label="Filter PIC" value={pic} onChange={event => setPic(event.target.value)}><option value="">Semua PIC</option>{Array.from(new Set(submissions.map(item => item.pic))).map(name => <option key={name}>{name}</option>)}</select>
        <select aria-label="Urutkan dokumen" value={sort} onChange={event => setSort(event.target.value)}><option value="due_asc">Deadline terdekat</option><option value="newest">Terbaru</option><option value="oldest">Terlama</option><option value="priority">Prioritas</option><option value="aging">Aging</option></select>
      </div>
      {error && <div className="data-error inline-data-error" role="alert">{error}</div>}{loading && <div className="data-loading">Memuat data pengajuan…</div>}
      <div className="results-caption">Menampilkan <b>{rows.length}</b> dari {submissions.length} pengajuan</div>
      <div className="table-wrap"><table className="documents-table"><thead><tr><th>DOKUMEN</th><th>DEPARTEMEN / JENIS</th><th>PIC / REVIEWER</th><th>PRIORITAS</th><th>STATUS</th><th>DEADLINE / SLA</th><th /></tr></thead><tbody>
        {rows.map(doc => <tr key={doc.id}><td><Link href={`/documents/${doc.id}`} className="doc-cell"><span className="table-file-icon">▤</span><span><b>{doc.docNo}</b><small>{doc.title}</small></span></Link></td><td><b>{doc.department}</b><small>{doc.type} · Rev {doc.revision}</small></td><td><b>{doc.pic}</b><small>Review: {doc.reviewer}</small></td><td><PriorityBadge priority={doc.priority} /></td><td><StatusBadge status={doc.status} /></td><td><b>{doc.due}</b><small><SlaBadge doc={doc} /></small></td><td><Link href={`/documents/${doc.id}`} className="row-more">···</Link></td></tr>)}
      </tbody></table></div>
      <div className="mobile-documents">{rows.map(doc => <Link href={`/documents/${doc.id}`} className="mobile-document-row" key={doc.id}><div><b>{doc.docNo}</b><SlaBadge doc={doc} /></div><h3>{doc.title}</h3><small>{doc.department} · {doc.pic}</small><div><StatusBadge status={doc.status} /><span className="due-label">Deadline {doc.due}</span></div></Link>)}</div>
    </div>
  </>;
}

export default function Documents() {
  return <Suspense fallback={<div className="panel">Memuat dokumen…</div>}><DocumentsRoute /></Suspense>;
}

function DocumentsRoute() {
  const searchParams = useSearchParams();
  return <DocumentsContent key={searchParams.toString()} initialStatus={searchParams.get('status') || ''} initialSla={searchParams.get('sla') || ''} />;
}
