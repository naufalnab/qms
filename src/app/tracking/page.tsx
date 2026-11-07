'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import {
  canSubmitDocument,
  formatDate,
  formatDateTime,
  getDetailedSlaStatus,
  statusLabels,
  trackingStages,
  type Submission
} from '@/lib/qms';
import { CompanyBadge, EmptyState, PageHeading, PriorityBadge, SlaBadge, StatusBadge } from '@/components/ui';
import { useQmsData } from '@/components/qms-data-provider';

function TrackingContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id');
  const { filteredSubmissions, user, loading, error } = useQmsData();

  const [selectedId, setSelectedId] = useState<string>(initialId || '');
  const [query, setQuery] = useState('');

  const activeDoc: Submission | undefined = useMemo(() => {
    if (selectedId) {
      const found = filteredSubmissions.find(d => d.id === selectedId);
      if (found) return found;
    }
    return filteredSubmissions[0];
  }, [selectedId, filteredSubmissions]);

  const searchedDocs = useMemo(() => {
    if (!query.trim()) return filteredSubmissions;
    const q = query.toLowerCase();
    return filteredSubmissions.filter(d =>
      `${d.number} ${d.docNo} ${d.title} ${d.pic} ${d.company} ${d.department}`.toLowerCase().includes(q)
    );
  }, [filteredSubmissions, query]);

  if (loading) return <div className="panel data-loading">Memuat pelacakan dokumen…</div>;
  if (error) return <div className="panel data-error" role="alert">{error}</div>;

  if (!activeDoc) {
    return (
      <>
        <PageHeading
          eyebrow="AUDIT MUTU REAL-TIME"
          title="Fitur Tracking Document"
          description="Lacak status, riwayat revisi, dan transparansi alur review dokumen."
        />
        <EmptyState
          title="Belum ada dokumen untuk dilacak"
          detail="Belum ada dokumen aktif yang dapat dilacak. Pengajuan baru akan muncul di sini."
          action={canSubmitDocument(user) ? <Link className="button primary" href="/new">+ Ajukan Dokumen Baru</Link> : undefined}
        />
      </>
    );
  }

  // Determine current active stage index (1..6)
  const getActiveStageIndex = (doc: Submission): number => {
    switch (doc.status) {
      case 'draft':
      case 'submitted':
        return 1;
      case 'under_review':
        return 2;
      case 'need_revision':
        return 3;
      case 'resubmitted':
        return 4;
      case 'qmsr_review':
        return 5;
      case 'approved':
      case 'closed':
        return 6;
      case 'rejected':
        return 3;
      default:
        return 1;
    }
  };

  const currentStageIndex = getActiveStageIndex(activeDoc);
  const slaDetail = getDetailedSlaStatus(activeDoc);

  // Extract review feedback notes
  const reviewNotes = activeDoc.history.filter(h => Boolean(h.note?.trim()));

  return (
    <>
      <div className="tracking-top-actions">
        <PageHeading
          eyebrow="AUDIT MUTU REAL-TIME"
          title="Fitur Tracking Document"
          description="Lacak status, riwayat revisi, transparansi alur review, dan feedback QMSR."
        />
        <div className="tracking-header-buttons">
          <Link
            className="button primary"
            href={`/documents/${activeDoc.id}`}
          >
            Buka Detail Dokumen ↗
          </Link>
        </div>
      </div>

      {/* Document Selector & Quick Search */}
      <section className="panel tracking-search-panel">
        <div className="tracking-search-bar">
          <label htmlFor="doc-picker">
            <span>Pilih Dokumen untuk Dilacak:</span>
          </label>
          <div className="picker-wrapper">
            <select
              id="doc-picker"
              value={activeDoc.id}
              onChange={e => setSelectedId(e.target.value)}
              className="tracking-dropdown"
            >
              {searchedDocs.map(doc => (
                <option key={doc.id} value={doc.id}>
                  {doc.docNo} — {doc.title} ({doc.company} · PIC: {doc.pic}) [{statusLabels[doc.status]}]
                </option>
              ))}
            </select>
          </div>
          <input
            type="search"
            placeholder="Cari nomor, judul, atau PIC..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="tracking-filter-input"
          />
        </div>
      </section>

      {/* Active Document Overview Card */}
      <section className="panel active-doc-banner">
        <div className="banner-left">
          <div className="banner-meta-top">
            <CompanyBadge company={activeDoc.company} />
            <span className="banner-doc-no">{activeDoc.docNo}</span>
            <span className="banner-rev">Revisi {activeDoc.revision}</span>
            <PriorityBadge priority={activeDoc.priority} />
          </div>
          <h2>{activeDoc.title}</h2>
          <div className="banner-meta-sub">
            <span>Departemen: <b>{activeDoc.department}</b></span>
            <span>·</span>
            <span>Jenis: <b>{activeDoc.type}</b></span>
            <span>·</span>
            <span>PIC: <b>{activeDoc.pic}</b></span>
            <span>·</span>
            <span>Reviewer QMSR: <b>{activeDoc.reviewer}</b></span>
          </div>
        </div>
        <div className="banner-right">
          <div className="banner-status-box">
            <small>Status Saat Ini</small>
            <StatusBadge status={activeDoc.status} />
          </div>
          <div className="banner-sla-box">
            <small>Pemantauan SLA</small>
            <SlaBadge doc={activeDoc} />
          </div>
        </div>
      </section>

      {/* 6-Stage Progress Stepper */}
      <section className="panel stepper-panel">
        <div className="section-heading">
          <div>
            <div className="eyebrow">WORKFLOW MUTU BERJENJANG</div>
            <h2>6 Tahapan Alur Pelacakan Mutu</h2>
            <p>Tahapan review sesuai alur resmi QMS Section Head dan QMSR</p>
          </div>
          <span className="stage-count-tag">{activeDoc.history.length} Entri Alur Terekam</span>
        </div>

        <div className="stepper-horizontal">
          {trackingStages.map(stage => {
            const isCompleted = stage.step < currentStageIndex || (stage.step === 6 && (activeDoc.status === 'approved' || activeDoc.status === 'closed'));
            const isCurrent = stage.step === currentStageIndex && activeDoc.status !== 'closed';
            const isPending = stage.step > currentStageIndex;

            return (
              <div
                key={stage.id}
                className={`step-item ${isCompleted ? 'step-completed' : ''} ${isCurrent ? 'step-current' : ''} ${isPending ? 'step-pending' : ''}`}
              >
                <div className="step-marker">
                  {isCompleted ? '✓' : stage.step}
                </div>
                <div className="step-content">
                  <span className="step-role">{stage.roleRequired}</span>
                  <b className="step-name">{stage.name}</b>
                  <small className="step-desc">{stage.description}</small>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Audit Trail & History Timeline Cards */}
      <div className="tracking-grid">
        <section className="panel timeline-card-panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow">JEJAK REKAM RESMI</div>
              <h2>Riwayat Aktivitas & Perubahan Status</h2>
            </div>
          </div>
          <div className="tracking-timeline-list">
            {[...activeDoc.history].reverse().map((entry, idx) => (
              <div className="tracking-timeline-card" key={`history-${idx}`}>
                <div className="timeline-card-header">
                  <div className="timeline-actor-info">
                    <span className="actor-badge">{entry.role || 'QMS'}</span>
                    <b>{entry.actor}</b>
                  </div>
                  <time className="timeline-time">{formatDateTime(entry.at)}</time>
                </div>
                <div className="timeline-action-row">
                  <span className="action-pill">{entry.action}</span>
                </div>
                {entry.note && (
                  <div className="timeline-note-box">
                    <p>“{entry.note}”</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Review Feedback Detail Cards */}
        <section className="panel feedback-detail-panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow">TRANSPARANSI FEEDBACK</div>
              <h2>Rincian Catatan Review & Feedback</h2>
              <p>Catatan audit kepatuhan, masukan perbaikan klausa, dan persetujuan.</p>
            </div>
          </div>

          {reviewNotes.length > 0 ? (
            <div className="feedback-card-list">
              {reviewNotes.map((entry, idx) => (
                <div className="feedback-box" key={`note-${idx}`}>
                  <div className="feedback-top">
                    <span className="feedback-reviewer-tag">{entry.role || 'Reviewer'}: {entry.actor}</span>
                    <small>{formatDate(entry.at)}</small>
                  </div>
                  <blockquote className="feedback-quote">
                    {entry.note}
                  </blockquote>
                  <div className="feedback-context">
                    <small>Tahap: <b>{entry.action}</b></small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Belum ada catatan review khusus"
              detail="Catatan review akan muncul di sini saat QMS Section Head atau QMSR memberikan masukan perbaikan."
            />
          )}

          {/* SLA Diagnostics box */}
          <div className="sla-diagnostics-box">
            <h3>Diagnostik SLA Asia/Jakarta</h3>
            <div className="diag-row">
              <span>Target SLA:</span>
              <b>{activeDoc.sla} hari kerja ({activeDoc.priority})</b>
            </div>
            <div className="diag-row">
              <span>Tanggal Pengajuan:</span>
              <b>{formatDate(activeDoc.requested)}</b>
            </div>
            <div className="diag-row">
              <span>Batas Jatuh Tempo (17:00 WIB):</span>
              <b>{formatDate(activeDoc.due)}</b>
            </div>
            <div className="diag-row">
              <span>Status Kepatuhan:</span>
              <b>{slaDetail.badgeLabel}</b>
            </div>
          </div>
        </section>
      </div>

    </>
  );
}

export default function TrackingPage() {
  return (
    <Suspense fallback={<div className="panel data-loading">Memuat pelacakan dokumen…</div>}>
      <TrackingContent />
    </Suspense>
  );
}
