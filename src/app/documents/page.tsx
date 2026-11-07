'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  canViewDocument,
  formatDate,
  getDetailedSlaStatus,
  getSlaStatus,
  priorityLabels,
  statusLabels,
  statusOrder,
  type Company
} from '@/lib/qms';
import { CompanyBadge, PageHeading, PriorityBadge, SlaBadge, StatusBadge } from '@/components/ui';
import { useQmsData } from '@/components/qms-data-provider';
import { getSupabaseBrowserClient, isDemoMode } from '@/lib/supabase/client';
import { GoogleSheetsModal } from '@/components/google-sheets-modal';

function DocumentsContent({ initialStatus, initialSla }: { initialStatus: string; initialSla: string }) {
  const { submissions, departments, documentTypes, reviewers, user, company, setCompany, loading, error, reload } = useQmsData();
  const isAdmin = user?.role === 'admin';
  const [deletingId, setDeletingId] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [department, setDepartment] = useState('');
  const [type, setType] = useState('');
  const [sla, setSla] = useState(initialSla);
  const [priority, setPriority] = useState('');
  const [reviewer, setReviewer] = useState('');
  const [pic, setPic] = useState('');
  const [sort, setSort] = useState('due_asc');
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);

  const deleteDocument = async (id: string, title: string) => {
    if (!isAdmin || isDemoMode) return;
    if (!window.confirm(`Hapus pengajuan “${title}” dari daftar dokumen aktif? Riwayat audit tetap disimpan.`)) return;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    setDeletingId(id);
    setActionMessage('');
    const { error: deleteError } = await client.rpc('archive_document', { p_document_id: id });
    if (deleteError) {
      setActionMessage(`Dokumen gagal dihapus: ${deleteError.message}`);
    } else {
      setActionMessage(`Pengajuan “${title}” berhasil dihapus dari daftar aktif.`);
      await reload();
    }
    setDeletingId('');
  };

  // Securely filter documents visible to this user
  const visible = useMemo(() => {
    return submissions.filter(doc => canViewDocument(user, doc));
  }, [submissions, user]);

  const rows = useMemo(() => {
    return visible
      .filter(doc => {
        const matchesQuery = `${doc.number} ${doc.docNo} ${doc.title} ${doc.pic} ${doc.reviewer} ${doc.company}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesCompany = company === 'all' || doc.company === company;
        const matchesStatus = !status || doc.status === status;
        const matchesDept = !department || doc.department === department;
        const matchesType = !type || doc.type === type;
        const matchesSla = !sla || getSlaStatus(doc) === sla;
        const matchesPrio = !priority || doc.priority === priority;
        const matchesRev = !reviewer || doc.reviewer === reviewer;
        const matchesPic = !pic || doc.pic === pic;

        return (
          matchesQuery &&
          matchesCompany &&
          matchesStatus &&
          matchesDept &&
          matchesType &&
          matchesSla &&
          matchesPrio &&
          matchesRev &&
          matchesPic
        );
      })
      .sort((a, b) => {
        if (sort === 'newest') return b.requested.localeCompare(a.requested);
        if (sort === 'oldest') return a.requested.localeCompare(b.requested);
        if (sort === 'priority') {
          const rank = ['critical', 'high', 'medium', 'low'];
          return rank.indexOf(a.priority) - rank.indexOf(b.priority);
        }
        if (sort === 'aging') {
          return new Date(a.requested).getTime() - new Date(b.requested).getTime();
        }
        return a.due.localeCompare(b.due);
      });
  }, [visible, query, company, status, department, type, sla, priority, reviewer, pic, sort]);

  // Export to Excel XLSX
  const exportXlsx = () => {
    const records = rows.map((doc, index) => {
      const slaDetail = getDetailedSlaStatus(doc);
      return {
        'No.': index + 1,
        'Nomor Pengajuan': doc.number,
        'Tanggal Pengajuan': formatDate(doc.requested),
        'Perusahaan': doc.company,
        'Kondisi': doc.condition === 'new' ? 'Baru' : 'Lama',
        'Departemen': doc.department,
        'Jenis Dokumen': doc.type,
        'Nomor Dokumen': doc.docNo,
        'Judul Dokumen': doc.title,
        'Revisi': doc.revision,
        'Alasan Perubahan': doc.reason,
        'PIC / Requestor': doc.pic,
        'Reviewer QMSR': doc.reviewer,
        'Prioritas': priorityLabels[doc.priority],
        'Target SLA': `${doc.sla} Hari`,
        'Batas Deadline': formatDate(doc.due),
        'Status Alur': statusLabels[doc.status],
        'Diagnostik SLA': slaDetail.badgeLabel,
        'Tanggal Persetujuan': formatDate(doc.approval),
        'Tanggal Ditutup': formatDate(doc.closed),
        'Catatan Reviewer': [...doc.history].reverse().find(e => e.note)?.note || '—',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(records);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dokumen Mutu');
    const companySuffix = company === 'all' ? 'Gabungan' : company.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(workbook, `QMS_Dokumen_${companySuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export to CSV
  const exportCsv = () => {
    const headers = [
      'No', 'Nomor Pengajuan', 'Tanggal Pengajuan', 'Perusahaan', 'Kondisi', 'Departemen',
      'Jenis Dokumen', 'Nomor Dokumen', 'Judul Dokumen', 'Revisi', 'PIC', 'Reviewer',
      'Prioritas', 'SLA Hari', 'Deadline', 'Status', 'Diagnostik SLA', 'Approval', 'Closed'
    ];
    const csvLines = [headers.map(h => `"${h}"`).join(',')];
    rows.forEach((doc, idx) => {
      const slaDetail = getDetailedSlaStatus(doc);
      csvLines.push([
        idx + 1,
        doc.number,
        doc.requested,
        doc.company,
        doc.condition === 'new' ? 'Baru' : 'Lama',
        doc.department,
        doc.type,
        doc.docNo,
        doc.title,
        doc.revision,
        doc.pic,
        doc.reviewer,
        priorityLabels[doc.priority],
        doc.sla,
        doc.due,
        statusLabels[doc.status],
        slaDetail.badgeLabel,
        doc.approval || '—',
        doc.closed || '—'
      ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QMS_Export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Print Report PDF
  const printReport = () => {
    window.print();
  };

  return (
    <>
      <div className="documents-top-wrap">
        <PageHeading
          eyebrow="INVENTARIS MUTU PERUSAHAAN"
          title="Daftar Dokumen Mutu"
          description="Basis data terintegrasi dokumen QMS, alur review, dan kepatuhan SLA."
        />

        <div className="documents-export-actions">
          <button className="button secondary button-spreadsheet" onClick={() => setIsSheetModalOpen(true)}>
            <span>📊</span> Google Spreadsheet
          </button>
          <button className="button secondary" onClick={exportCsv} title="Unduh CSV">
            <span>📥</span> CSV
          </button>
          <button className="button secondary" onClick={exportXlsx} title="Unduh Excel XLSX">
            <span>📗</span> Excel
          </button>
          <button className="button primary" onClick={printReport} title="Cetak atau Simpan PDF">
            <span>🖨️</span> Cetak / PDF
          </button>
        </div>
      </div>

      <div className="panel documents-filter-panel">
        <div className="filter-grid-doc">
          <input
            className="filter-search-input"
            aria-label="Cari dokumen"
            placeholder="Cari nomor, judul, PIC, reviewer, perusahaan..."
            value={query}
            onChange={event => setQuery(event.target.value)}
          />

          <select
            aria-label="Filter Perusahaan"
            value={company}
            onChange={e => setCompany(e.target.value as Company | 'all')}
            className="highlight-select"
          >
            <option value="all">Semua Perusahaan</option>
            <option value="PT. Baramuda Bahari">PT. Baramuda Bahari</option>
            <option value="PT. Mega Marine Pride">PT. Mega Marine Pride</option>
          </select>

          <select aria-label="Filter status alur" value={status} onChange={event => setStatus(event.target.value)}>
            <option value="">Semua Status</option>
            {statusOrder.map(item => (
              <option value={item} key={item}>{statusLabels[item]}</option>
            ))}
          </select>

          <select aria-label="Filter departemen" value={department} onChange={event => setDepartment(event.target.value)}>
            <option value="">Semua Departemen</option>
            {departments.map(item => (
              <option key={item.id} value={item.name}>{item.name}</option>
            ))}
          </select>

          <select aria-label="Filter jenis dokumen" value={type} onChange={event => setType(event.target.value)}>
            <option value="">Semua Jenis</option>
            {documentTypes.map(item => (
              <option key={item.id} value={item.name}>{item.name}</option>
            ))}
          </select>

          <select aria-label="Filter SLA" value={sla} onChange={event => setSla(event.target.value)}>
            <option value="">Semua SLA</option>
            <option value="on_time">Tepat Waktu</option>
            <option value="due_soon">Mendekati Deadline</option>
            <option value="overdue">Terlambat</option>
            <option value="completed">Selesai</option>
          </select>

          <select aria-label="Filter prioritas" value={priority} onChange={event => setPriority(event.target.value)}>
            <option value="">Semua Prioritas</option>
            <option value="low">Rendah</option>
            <option value="medium">Sedang</option>
            <option value="high">Tinggi</option>
            <option value="critical">Kritis</option>
          </select>

          <select aria-label="Filter reviewer" value={reviewer} onChange={event => setReviewer(event.target.value)}>
            <option value="">Semua Reviewer</option>
            {reviewers.map(item => (
              <option key={item.id} value={item.name}>{item.name}</option>
            ))}
          </select>

          <select aria-label="Filter PIC" value={pic} onChange={event => setPic(event.target.value)}>
            <option value="">Semua PIC</option>
            {Array.from(new Set(submissions.map(item => item.pic))).map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <select aria-label="Urutkan dokumen" value={sort} onChange={event => setSort(event.target.value)}>
            <option value="due_asc">Deadline terdekat</option>
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
            <option value="priority">Prioritas Tertinggi</option>
            <option value="aging">Lama Proses (Aging)</option>
          </select>
        </div>

        {error && <div className="data-error inline-data-error" role="alert">{error}</div>}
        {loading && <div className="data-loading">Memuat data pengajuan…</div>}
        {actionMessage && <div className="inline-message" role="status">{actionMessage}</div>}

        <div className="results-caption">
          Menampilkan <b>{rows.length}</b> dari {visible.length} pengajuan dokumen aktif
        </div>

        {/* Desktop Table View */}
        <div className="table-wrap print-table-wrap">
          <table className="documents-table">
            <thead>
              <tr>
                <th>DOKUMEN</th>
                <th>PERUSAHAAN</th>
                <th>DEPARTEMEN / JENIS</th>
                <th>PIC / REVIEWER</th>
                <th>PRIORITAS</th>
                <th>STATUS</th>
                <th>DEADLINE / SLA</th>
                <th className="no-print">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(doc => (
                <tr key={doc.id}>
                  <td>
                    <Link href={`/documents/${doc.id}`} className="doc-cell">
                      <span className="table-file-icon">▤</span>
                      <span>
                        <b>{doc.docNo}</b>
                        <small>{doc.title}</small>
                      </span>
                    </Link>
                  </td>
                  <td>
                    <CompanyBadge company={doc.company} />
                  </td>
                  <td>
                    <b>{doc.department}</b>
                    <small>{doc.type} · Rev {doc.revision}</small>
                  </td>
                  <td>
                    <b>{doc.pic}</b>
                    <small>Reviewer: {doc.reviewer}</small>
                  </td>
                  <td>
                    <PriorityBadge priority={doc.priority} />
                  </td>
                  <td>
                    <StatusBadge status={doc.status} />
                  </td>
                  <td>
                    <b>{formatDate(doc.due)}</b>
                    <small><SlaBadge doc={doc} /></small>
                  </td>
                  <td className="document-actions no-print">
                    <Link href={`/documents/${doc.id}`} className="row-more" aria-label={`Detail ${doc.title}`}>
                      Buka
                    </Link>
                    <Link href={`/tracking?id=${doc.id}`} className="row-more tracking-link-btn" title="Lacak Alur">
                      Lacak
                    </Link>
                    {isAdmin && (
                      <button
                        className="delete-document-button"
                        disabled={deletingId === doc.id}
                        onClick={() => void deleteDocument(doc.id, doc.title)}
                        title="Arsipkan / Hapus Dokumen"
                      >
                        {deletingId === doc.id ? 'Menghapus…' : 'Hapus'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px' }}>
                    Tidak ada dokumen yang sesuai dengan filter aktif.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Document Cards */}
        <div className="mobile-documents no-print">
          {rows.map(doc => (
            <div className="mobile-document-row" key={doc.id}>
              <Link href={`/documents/${doc.id}`}>
                <div className="mobile-top">
                  <b>{doc.docNo}</b>
                  <SlaBadge doc={doc} />
                </div>
                <h3>{doc.title}</h3>
                <div className="mobile-meta">
                  <CompanyBadge company={doc.company} />
                  <small>{doc.department} · {doc.pic}</small>
                </div>
                <div className="mobile-bottom">
                  <StatusBadge status={doc.status} />
                  <span className="due-label">Deadline {formatDate(doc.due)}</span>
                </div>
              </Link>
              <div className="mobile-actions">
                <Link href={`/tracking?id=${doc.id}`} className="button secondary button-small">
                  Lacak Alur
                </Link>
                {isAdmin && (
                  <button
                    className="delete-document-button button-small"
                    disabled={deletingId === doc.id}
                    onClick={() => void deleteDocument(doc.id, doc.title)}
                  >
                    {deletingId === doc.id ? 'Menghapus…' : 'Hapus'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <GoogleSheetsModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
      />
    </>
  );
}

export default function Documents() {
  return (
    <Suspense fallback={<div className="panel data-loading">Memuat dokumen…</div>}>
      <DocumentsRoute />
    </Suspense>
  );
}

function DocumentsRoute() {
  const searchParams = useSearchParams();
  return (
    <DocumentsContent
      key={searchParams.toString()}
      initialStatus={searchParams.get('status') || ''}
      initialSla={searchParams.get('sla') || ''}
    />
  );
}
