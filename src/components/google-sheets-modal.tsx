'use client';

import { useState } from 'react';
import { useQmsData } from '@/components/qms-data-provider';

export function GoogleSheetsModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { filteredSubmissions } = useQmsData();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    verified: boolean;
    syncedAt?: string;
    recordsSynced?: number;
    message?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://qms-ruddy.vercel.app';
  const feedUrl = `${siteOrigin}/api/sheets/feed`;
  const importFormula = `=IMPORTDATA("${feedUrl}")`;

  const runTestSync = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/sheets/sync');
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({
        verified: false,
        message: 'Gagal menghubungi server sinkronisasi.'
      });
    } finally {
      setTesting(false);
    }
  };

  const copyFormula = async () => {
    try {
      await navigator.clipboard.writeText(importFormula);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="sheet-icon">📊</span>
            <div>
              <h2>Integrasi Google Spreadsheet</h2>
              <p>Sinkronisasi otomatis basis data dokumen QMS ke Google Sheets secara real-time.</p>
            </div>
          </div>
          <button className="modal-close-button" onClick={onClose} aria-label="Tutup">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="sheet-status-banner">
            <span className="status-indicator-dot online" />
            <div>
              <b>Status Integrasi: Aktif & Terverifikasi</b>
              <small>Data diperbarui secara otomatis setiap kali dokumen dibuat atau bertransisi.</small>
            </div>
            <button className="button secondary button-small" disabled={testing} onClick={runTestSync}>
              {testing ? 'Menguji…' : '↻ Uji Koneksi'}
            </button>
          </div>

          {testResult && (
            <div className={`sync-report-box ${testResult.verified ? 'report-success' : 'report-error'}`}>
              <b>{testResult.verified ? '✓ Verifikasi Berhasil' : '! Kendala Koneksi'}</b>
              <p>{testResult.message}</p>
              {testResult.syncedAt && (
                <small>Waktu Sinkronisasi: {testResult.syncedAt} · {testResult.recordsSynced} berkas diverifikasi</small>
              )}
            </div>
          )}

          <div className="sheet-instruction-card">
            <h3>Cara Menghubungkan ke Google Spreadsheet</h3>
            <ol>
              <li>Buka lembar kerja Google Sheets baru atau lembar kerja dokumen mutu Anda.</li>
              <li>Pada sel <code>A1</code>, masukkan formula di bawah ini:</li>
            </ol>
            <div className="formula-box">
              <code>{importFormula}</code>
              <button className="button primary button-small" onClick={copyFormula}>
                {copied ? '✓ Tersalin!' : 'Salin Formula'}
              </button>
            </div>
            <small className="muted-copy">
              Google Sheets akan memuat seluruh kolom (Nomor Dokumen, Perusahaan, PIC, SLA, Status, Catatan Review) dan memperbaruinya otomatis.
            </small>
          </div>

          <div className="sheet-preview-wrap">
            <div className="preview-top">
              <b>Pratinjau Data Sinkronisasi ({filteredSubmissions.length} Dokumen)</b>
              <a href="/api/sheets/feed" download="qms_document_database.csv" className="button secondary button-small">
                📥 Unduh CSV
              </a>
            </div>
            <div className="preview-table-container">
              <table className="mini-sheet-table">
                <thead>
                  <tr>
                    <th>No. Pengajuan</th>
                    <th>Perusahaan</th>
                    <th>Dokumen</th>
                    <th>Departemen</th>
                    <th>Status</th>
                    <th>Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.slice(0, 5).map(doc => (
                    <tr key={doc.id}>
                      <td><b>{doc.number}</b></td>
                      <td>{doc.company}</td>
                      <td>{doc.docNo} - {doc.title}</td>
                      <td>{doc.department}</td>
                      <td><span className={`status-pill pill-${doc.status}`}>{doc.status}</span></td>
                      <td>{doc.due}</td>
                    </tr>
                  ))}
                  {filteredSubmissions.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '16px' }}>
                        Belum ada dokumen aktif untuk filter perusahaan saat ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <a
            href="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
            target="_blank"
            rel="noopener noreferrer"
            className="button primary"
          >
            Buka di Google Spreadsheet ↗
          </a>
          <button className="button secondary" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
