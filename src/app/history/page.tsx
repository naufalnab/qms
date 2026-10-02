'use client';

import Link from 'next/link';
import { formatDate } from '@/lib/qms';
import { PageHeading } from '@/components/ui';
import { useQmsData } from '@/components/qms-data-provider';

export default function History() {
  const { submissions, loading, error } = useQmsData();
  const entries = submissions.flatMap(doc => doc.history.map(event => ({ ...event, doc }))).sort((a,b) => b.at.localeCompare(a.at));
  if (loading) return <div className="panel data-loading">Memuat riwayat…</div>;
  return <><PageHeading eyebrow="AUDIT TRAIL" title="Riwayat Aktivitas" description={error || 'Jejak perubahan dan aktivitas dokumen QMS.'} /><section className="panel history-panel"><div className="results-caption">{entries.length} aktivitas terbaru</div>{entries.map((event,index) => <div className="global-history-row" key={`${event.doc.id}-${index}`}><span className="history-avatar">{event.actor.split(' ').map(part => part[0]).slice(0,2).join('')}</span><div className="global-history-copy"><b>{event.actor} <span>{event.action.toLowerCase()}</span></b><Link href={`/documents/${event.doc.id}`}>{event.doc.docNo} · {event.doc.title}</Link>{event.note && <p>“{event.note}”</p>}</div><time>{formatDate(event.at)}</time></div>)}</section></>;
}
