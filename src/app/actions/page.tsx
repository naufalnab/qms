'use client';

import { getSlaStatus, type Submission } from '@/lib/qms';
import { DocumentCard, EmptyState, PageHeading } from '@/components/ui';
import { useQmsData } from '@/components/qms-data-provider';

export default function Actions() {
  const { submissions, loading, error } = useQmsData();
  const actionable = submissions.filter(doc => doc.status !== 'closed' && doc.status !== 'rejected' && (doc.status === 'need_revision' || doc.status === 'approved' || getSlaStatus(doc) === 'overdue' || getSlaStatus(doc) === 'due_soon'));
  const groups: [string, (doc: Submission) => boolean][] = [['Terlambat', doc => getSlaStatus(doc) === 'overdue'], ['Perlu Revisi', doc => doc.status === 'need_revision'], ['Mendekati Deadline', doc => getSlaStatus(doc) === 'due_soon'], ['Menunggu Penutupan', doc => doc.status === 'approved']];
  if (loading) return <div className="panel data-loading">Memuat daftar tindakan...</div>;
  if (error) return <><PageHeading eyebrow="ACTION CENTER" title="Butuh Tindakan" description="Daftar tindakan belum dapat dimuat." /><div className="panel data-error" role="alert">{error}</div></>;
  return <><PageHeading eyebrow="ACTION CENTER" title="Butuh Tindakan" description={`${actionable.length} dokumen membutuhkan perhatian Anda.`} />{groups.map(([name, predicate]) => { const list = actionable.filter(predicate); return list.length ? <section className="action-group" key={name}><div className="action-group-heading"><h2>{name}</h2><span>{list.length}</span></div><div className="card-grid">{list.map(doc => <DocumentCard doc={doc} key={doc.id} />)}</div></section> : null; })}{!actionable.length && <EmptyState title="Semua terkendali" detail="Tidak ada dokumen yang membutuhkan tindakan." />}</>;
}
