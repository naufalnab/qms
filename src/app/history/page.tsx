'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatDateTime, type Company } from '@/lib/qms';
import { CompanyBadge, PageHeading } from '@/components/ui';
import { useQmsData } from '@/components/qms-data-provider';

export default function History() {
  const { filteredSubmissions, company, setCompany, loading, error } = useQmsData();
  const [search, setSearch] = useState('');

  const entries = useMemo(() => {
    return filteredSubmissions
      .flatMap(doc => doc.history.map(event => ({ ...event, doc })))
      .filter(entry => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          entry.action.toLowerCase().includes(q) ||
          entry.actor.toLowerCase().includes(q) ||
          entry.doc.docNo.toLowerCase().includes(q) ||
          entry.doc.title.toLowerCase().includes(q) ||
          entry.doc.company.toLowerCase().includes(q) ||
          (entry.note && entry.note.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [filteredSubmissions, search]);

  if (loading) return <div className="panel data-loading">Memuat riwayat audit…</div>;

  return (
    <>
      <div className="history-header-row">
        <PageHeading
          eyebrow="AUDIT TRAIL RESMI"
          title="Riwayat Aktivitas & Log Mutu"
          description={error || 'Jejak perubahan, persetujuan, dan catatan review dokumen QMS secara transparan.'}
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

      <section className="panel history-panel">
        <div className="history-search-bar">
          <input
            type="search"
            placeholder="Cari aktivitas, pengaju, reviewer, nomor dokumen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="history-filter-input"
          />
          <div className="results-caption">
            Menampilkan <b>{entries.length}</b> log aktivitas terbaru
          </div>
        </div>

        <div className="history-entries-list">
          {entries.map((event, index) => (
            <div className="global-history-row" key={`${event.doc.id}-${index}`}>
              <span className="history-avatar">
                {event.actor
                  .split(' ')
                  .map(part => part[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </span>
              <div className="global-history-copy">
                <div className="history-row-top">
                  <b>
                    {event.actor} <span className="action-tag">{event.action}</span>
                  </b>
                  <CompanyBadge company={event.doc.company} />
                </div>
                <Link href={`/documents/${event.doc.id}`} className="history-doc-link">
                  {event.doc.docNo} · {event.doc.title}
                </Link>
                {event.note && <p className="history-quote">“{event.note}”</p>}
              </div>
              <time className="history-time">{formatDateTime(event.at)}</time>
            </div>
          ))}

          {entries.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">✓</div>
              <b>Belum ada riwayat aktivitas</b>
              <span>Aktivitas pembuatan dan review dokumen akan tercatat secara otomatis di sini.</span>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
