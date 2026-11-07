'use client';

import { useState } from 'react';
import { useQmsData } from '@/components/qms-data-provider';

export function GoogleSheetsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { filteredSubmissions, user } = useQmsData();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ verified: boolean; message?: string; databaseConnected?: boolean } | null>(null);

  if (!isOpen) return null;

  const checkStatus = async () => {
    setTesting(true);
    try {
      const response = await fetch('/api/sheets/sync', { cache: 'no-store' });
      const result = await response.json();
      setTestResult({
        verified: result.verified === true && result.sheetSynced === true,
        databaseConnected: result.databaseConnected === true,
        message: result.message || result.error || 'Sinkronisasi belum tersedia.'
      });
    } catch {
      setTestResult({ verified: false, message: 'Tidak dapat memeriksa status integrasi.' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Integrasi Google Spreadsheet">
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="sheet-icon">📊</span>
            <div>
              <h2>Integrasi Google Spreadsheet</h2>
              <p>Informasi koneksi dan ekspor dokumen mutu.</p>
            </div>
          </div>
          <button className="modal-close-button" onClick={onClose} aria-label="Tutup">×</button>
        </div>
        <div className="modal-body">
          <div className="sheet-status-banner">
            <span className="status-indicator-dot offline" />
            <div>
              <b>Status: Sinkronisasi Otomatis Belum Aktif</b>
              <small>Integrasi publik IMPORTDATA dinonaktifkan demi menjaga kerahasiaan dokumen perusahaan.</small>
            </div>
            {user?.role === 'admin' && (
              <button className="button secondary button-small" disabled={testing} onClick={checkStatus}>
                {testing ? 'Memeriksa…' : 'Periksa Status'}
              </button>
            )}
          </div>
          {testResult && (
            <div className={`sync-report-box ${testResult.verified ? 'report-success' : 'report-error'}`}>
              <b>{testResult.verified ? 'Sinkronisasi Terverifikasi' : 'Sinkronisasi Belum Aktif'}</b>
              <p>{testResult.message}</p>
              {testResult.databaseConnected && <small>Database aplikasi terhubung; ini bukan bukti sinkronisasi Google Sheets.</small>}
            </div>
          )}
          <div className="sheet-instruction-card">
            <h3>Ekspor yang Aman</h3>
            <p>Unduh CSV hanya dari sesi admin yang terautentikasi. Untuk sinkronisasi Google Sheets otomatis, diperlukan integrasi privat dengan autentikasi service-to-service dan pembatasan perusahaan.</p>
          </div>
          <div className="sheet-preview-wrap">
            <div className="preview-top">
              <b>Pratinjau Dokumen ({filteredSubmissions.length})</b>
              {user?.role === 'admin' && (
                <a href="/api/sheets/feed" download="qms_document_export.csv" className="button secondary button-small">Unduh CSV (Admin)</a>
              )}
            </div>
            <div className="preview-table-container">
              <table className="mini-sheet-table">
                <thead><tr><th>No. Pengajuan</th><th>Perusahaan</th><th>Dokumen</th><th>Departemen</th><th>Status</th><th>Deadline</th></tr></thead>
                <tbody>
                  {filteredSubmissions.slice(0, 5).map(doc => (
                    <tr key={doc.id}>
                      <td><b>{doc.number}</b></td><td>{doc.company}</td><td>{doc.docNo} - {doc.title}</td>
                      <td>{doc.department}</td><td><span className={`status-pill pill-${doc.status}`}>{doc.status}</span></td><td>{doc.due}</td>
                    </tr>
                  ))}
                  {filteredSubmissions.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '16px' }}>Belum ada dokumen pada filter saat ini.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="modal-footer"><button className="button secondary" onClick={onClose}>Tutup</button></div>
      </div>
    </div>
  );
}
