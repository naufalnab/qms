'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  canViewDocument,
  getSlaStatus,
  type Company,
  type Submission
} from '@/lib/qms';
import { DocumentCard, EmptyState, PageHeading } from '@/components/ui';
import { useQmsData } from '@/components/qms-data-provider';

export default function Actions() {
  const { filteredSubmissions, user, company, setCompany, loading, error } = useQmsData();

  const visibleSubmissions = useMemo(() => {
    return filteredSubmissions.filter(doc => canViewDocument(user, doc));
  }, [filteredSubmissions, user]);

  const roleKey = user?.role || 'admin';
  const isQms = roleKey === 'qms';
  const isQmsr = roleKey === 'qmsr';
  const isSectionHead = roleKey === 'qms_section_head';
  const isAdmin = roleKey === 'admin';
  const isReviewDashboard = isQmsr || isSectionHead;

  // Build role-specific action groups
  const groups: { title: string; count: number; docs: Submission[]; badgeColor?: string }[] = useMemo(() => {
    if (isSectionHead) {
      const stage1New = visibleSubmissions.filter(d => d.status === 'submitted' || d.status === 'resubmitted');
      const stage1Active = visibleSubmissions.filter(d => d.status === 'under_review');
      const urgent = visibleSubmissions.filter(
        d => (d.status === 'submitted' || d.status === 'resubmitted' || d.status === 'under_review') &&
             (getSlaStatus(d) === 'overdue' || getSlaStatus(d) === 'due_soon')
      );
      return [
        { title: 'Menunggu Dimulai Review (Tahap 1)', count: stage1New.length, docs: stage1New, badgeColor: 'blue' },
        { title: 'Sedang Dalam Review QMS Section Head', count: stage1Active.length, docs: stage1Active, badgeColor: 'purple' },
        { title: 'Review Terkritis / Mendekati Batas SLA', count: urgent.length, docs: urgent, badgeColor: 'red' },
      ];
    }

    if (isQmsr) {
      const qmsrQueue = visibleSubmissions.filter(d => d.status === 'qmsr_review' && (isAdmin || d.reviewerId === user?.id));
      const urgent = qmsrQueue.filter(d => getSlaStatus(d) === 'overdue' || getSlaStatus(d) === 'due_soon');
      return [
        { title: 'Antrian Review Final QMSR (Tahap 2)', count: qmsrQueue.length, docs: qmsrQueue, badgeColor: 'blue' },
        { title: 'Review Terkritis / Mendekati Batas SLA', count: urgent.length, docs: urgent, badgeColor: 'red' },
      ];
    }

    if (isQms) {
      const needRev = visibleSubmissions.filter(d => d.status === 'need_revision' && d.createdBy === user?.id);
      const readyToClose = visibleSubmissions.filter(d => d.status === 'approved' && d.createdBy === user?.id);
      const overdue = visibleSubmissions.filter(d => d.createdBy === user?.id && getSlaStatus(d) === 'overdue' && d.status !== 'closed');
      return [
        { title: 'Perlu Revisi & Perbaikan Klausa', count: needRev.length, docs: needRev, badgeColor: 'amber' },
        { title: 'Telah Disetujui (Menunggu Penutupan)', count: readyToClose.length, docs: readyToClose, badgeColor: 'green' },
        { title: 'Pengajuan Terlambat', count: overdue.length, docs: overdue, badgeColor: 'red' },
      ];
    }

    // Admin view
    const stage1 = visibleSubmissions.filter(d => d.status === 'submitted' || d.status === 'resubmitted' || d.status === 'under_review');
    const stage2 = visibleSubmissions.filter(d => d.status === 'qmsr_review');
    const revisions = visibleSubmissions.filter(d => d.status === 'need_revision');
    const overdue = visibleSubmissions.filter(d => getSlaStatus(d) === 'overdue' && d.status !== 'closed' && d.status !== 'rejected');
    const approved = visibleSubmissions.filter(d => d.status === 'approved');

    return [
      { title: 'Antrian Review Tahap 1 (Section Head)', count: stage1.length, docs: stage1, badgeColor: 'blue' },
      { title: 'Antrian Review Tahap 2 (QMSR Final)', count: stage2.length, docs: stage2, badgeColor: 'purple' },
      { title: 'Perlu Revisi oleh Pengaju', count: revisions.length, docs: revisions, badgeColor: 'amber' },
      { title: 'Semua Dokumen Terlambat (Overdue SLA)', count: overdue.length, docs: overdue, badgeColor: 'red' },
      { title: 'Disetujui & Siap Ditutup', count: approved.length, docs: approved, badgeColor: 'green' },
    ];
  }, [visibleSubmissions, isSectionHead, isQmsr, isQms, isAdmin, user]);

  const totalActionItems = groups.reduce((sum, g) => sum + g.count, 0);

  if (loading) return <div className="panel data-loading">Memuat antrian review…</div>;
  if (error) {
    return (
      <>
        <PageHeading
          eyebrow="ANTRIAN TUGAS"
          title="Antrian Review Dokumen"
          description="Daftar dokumen belum dapat dimuat."
        />
        <div className="panel data-error" role="alert">{error}</div>
      </>
    );
  }

  return (
    <>
      <div className="actions-header-wrap">
        <PageHeading
          eyebrow="ACTION CENTER & WORKFLOW QUEUE"
          title={
            isSectionHead
              ? 'Antrian Review QMS Section Head'
              : isQmsr
                ? 'Antrian Review QMSR'
                : isQms
                  ? 'Tindakan Pengajuan Saya'
                  : 'Antrian Review Seluruh Workflow'
          }
          description={`${totalActionItems} dokumen membutuhkan perhatian atau tindak lanjut pada alur aktif.`}
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

      {groups.map(group => {
        if (!group.count) return null;
        return (
          <section className="action-group" key={group.title}>
            <div className="action-group-heading">
              <div className="heading-left">
                <span className={`status-orb ${group.badgeColor || 'blue'}`} />
                <h2>{group.title}</h2>
              </div>
              <span className="count-tag">{group.count} Dokumen</span>
            </div>
            <div className="card-grid">
              {group.docs.map(doc => (
                <DocumentCard doc={doc} key={doc.id} />
              ))}
            </div>
          </section>
        );
      })}

      {totalActionItems === 0 && (
        <EmptyState
          title="Semua terkendali!"
          detail={
            isReviewDashboard
              ? 'Tidak ada dokumen yang menunggu review Anda saat ini.'
              : 'Tidak ada dokumen yang membutuhkan tindakan pada filter perusahaan terpilih.'
          }
          action={
            <Link className="button secondary" href="/documents">
              Buka Semua Dokumen
            </Link>
          }
        />
      )}
    </>
  );
}
