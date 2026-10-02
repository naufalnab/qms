'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { demoSubmissions, departments, documentTypes, formatDate, getActionRequired, getSlaStatus, priorityLabels, statusLabels, statusOrder } from '@/lib/qms';
import { PageHeading, PriorityBadge, SlaBadge, StatusBadge } from '@/components/ui';

function DocumentsContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [department, setDepartment] = useState('');
  const [type, setType] = useState('');
  const [sla, setSla] = useState(searchParams.get('sla') || '');

  useEffect(() => {
    setStatus(searchParams.get('status') || '');
    setSla(searchParams.get('sla') || '');
  }, [searchParams]);

  const rows = useMemo(() => demoSubmissions
    .filter(doc => `${doc.number} ${doc.docNo} ${doc.title} ${doc.pic} ${doc.reviewer}`.toLowerCase().includes(query.toLowerCase())
      && (!status || doc.status === status)
      && (!department || doc.department === department)
      && (!type || doc.type === type)
      && (!sla || getSlaStatus(doc) === sla))
    .sort((a, b) => a.due.localeCompare(b.due)), [query, status, department, type, sla]);

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
      </div>
      <div className="results-caption">Menampilkan <b>{rows.length}</b> dari {demoSubmissions.length} pengajuan</div>
      <div className="table-wrap"><table className="documents-table"><thead><tr><th>DOKUMEN</th><th>DEPARTEMEN / JENIS</th><th>PIC / REVIEWER</th><th>PRIORITAS</th><th>STATUS</th><th>DEADLINE / SLA</th><th /></tr></thead><tbody>
        {rows.map(doc => <tr key={doc.id}><td><Link href={`/documents/${doc.id}`} className="doc-cell"><span className="table-file-icon">▤</span><span><b>{doc.docNo}</b><small>{doc.title}</small></span></Link></td><td><b>{doc.department}</b><small>{doc.type} · Rev {doc.revision}</small></td><td><b>{doc.pic}</b><small>Review: {doc.reviewer}</small></td><td><PriorityBadge priority={doc.priority} /></td><td><StatusBadge status={doc.status} /></td><td><b>{doc.due}</b><small><SlaBadge doc={doc} /></small></td><td><Link href={`/documents/${doc.id}`} className="row-more">···</Link></td></tr>)}
      </tbody></table></div>
      <div className="mobile-documents">{rows.map(doc => <Link href={`/documents/${doc.id}`} className="mobile-document-row" key={doc.id}><div><b>{doc.docNo}</b><SlaBadge doc={doc} /></div><h3>{doc.title}</h3><small>{doc.department} · {doc.pic}</small><div><StatusBadge status={doc.status} /><span className="due-label">Deadline {doc.due}</span></div></Link>)}</div>
    </div>
  </>;
}

export default function Documents() {
  return <Suspense fallback={<div className="panel">Memuat dokumen…</div>}><DocumentsContent /></Suspense>;
}
