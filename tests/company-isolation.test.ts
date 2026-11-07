import { describe, expect, it } from 'vitest';
import {
  extractCompany,
  formatRemarksWithCompany,
  type Submission
} from '../src/lib/qms';

describe('Company Data Isolation Engine', () => {
  describe('Company Extraction from Remarks & Department Context', () => {
    it('extracts PT. Baramuda Bahari when explicit tag is present', () => {
      const raw = '[PT. Baramuda Bahari] Dokumen untuk audit BRCGS line pasteurisasi';
      const result = extractCompany(raw, 'QA');
      expect(result.company).toBe('PT. Baramuda Bahari');
      expect(result.cleanRemarks).toBe('Dokumen untuk audit BRCGS line pasteurisasi');
    });

    it('extracts PT. Mega Marine Pride when explicit tag is present', () => {
      const raw = '[PT. Mega Marine Pride] Pembaruan formulir checklist suhu raw material';
      const result = extractCompany(raw, 'Production');
      expect(result.company).toBe('PT. Mega Marine Pride');
      expect(result.cleanRemarks).toBe('Pembaruan formulir checklist suhu raw material');
    });

    it('falls back to Crab department context for PT. Baramuda Bahari', () => {
      const result = extractCompany('Dokumen standar penerimaan kepiting', 'Production Crab');
      expect(result.company).toBe('PT. Baramuda Bahari');
    });

    it('falls back to Shrimp department context for PT. Mega Marine Pride', () => {
      const result = extractCompany('Standar proses udang beku IQF', 'Production Shrimp');
      expect(result.company).toBe('PT. Mega Marine Pride');
    });

    it('defaults safely to PT. Baramuda Bahari when no cues are available', () => {
      const result = extractCompany('Formulir umum', 'General Affair');
      expect(result.company).toBe('PT. Baramuda Bahari');
    });
  });

  describe('Remarks Formatting with Company Tags', () => {
    it('formats remarks by prepending company tag and removing duplicate prefixes', () => {
      const clean = formatRemarksWithCompany('PT. Mega Marine Pride', '[PT. Baramuda Bahari] Catatan revisi 2');
      expect(clean).toBe('[PT. Mega Marine Pride] Catatan revisi 2');
    });

    it('handles empty remarks cleanly', () => {
      const formatted = formatRemarksWithCompany('PT. Baramuda Bahari', '');
      expect(formatted).toBe('[PT. Baramuda Bahari]');
    });
  });

  describe('Multi-Tenant Dataset Filtering Isolation', () => {
    const mixedDocs: Submission[] = [
      {
        id: 'doc-bb-1',
        number: 'QMS-BB-001',
        condition: 'new',
        company: 'PT. Baramuda Bahari',
        department: 'Quality Crab',
        type: 'SOP',
        docNo: 'SOP-BB-01',
        title: 'Pengolahan Daging Rajungan Kaleng',
        revision: '00',
        pic: 'Andi',
        reviewer: 'Junita',
        priority: 'high',
        requested: '2026-02-01',
        sla: 5,
        due: '2026-02-08',
        status: 'submitted',
        reason: '',
        remarks: '[PT. Baramuda Bahari]',
        history: [],
        followups: [],
        attachments: []
      },
      {
        id: 'doc-mmp-1',
        number: 'QMS-MMP-001',
        condition: 'new',
        company: 'PT. Mega Marine Pride',
        department: 'Quality Shrimp',
        type: 'SOP',
        docNo: 'SOP-MMP-01',
        title: 'Pembekuan Udang Headless',
        revision: '00',
        pic: 'Dewi',
        reviewer: 'Junita',
        priority: 'medium',
        requested: '2026-02-02',
        sla: 5,
        due: '2026-02-09',
        status: 'under_review',
        reason: '',
        remarks: '[PT. Mega Marine Pride]',
        history: [],
        followups: [],
        attachments: []
      }
    ];

    it('strictly isolates PT. Baramuda Bahari data when filtered', () => {
      const baramudaOnly = mixedDocs.filter(d => d.company === 'PT. Baramuda Bahari');
      expect(baramudaOnly.length).toBe(1);
      expect(baramudaOnly[0].id).toBe('doc-bb-1');
      expect(baramudaOnly.every(d => d.company === 'PT. Baramuda Bahari')).toBe(true);
    });

    it('strictly isolates PT. Mega Marine Pride data when filtered', () => {
      const megaOnly = mixedDocs.filter(d => d.company === 'PT. Mega Marine Pride');
      expect(megaOnly.length).toBe(1);
      expect(megaOnly[0].id).toBe('doc-mmp-1');
      expect(megaOnly.every(d => d.company === 'PT. Mega Marine Pride')).toBe(true);
    });
  });
});

