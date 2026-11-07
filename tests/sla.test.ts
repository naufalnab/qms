import { describe, expect, it } from 'vitest';
import {
  calculateBusinessDueDate,
  getDetailedSlaStatus,
  getPriorityAdjustedSla,
  getSlaStatus,
  isBusinessDay,
  type Submission
} from '../src/lib/qms';

describe('SLA & Indonesian Business Calendar Engine', () => {
  it('correctly identifies weekend days as non-business days', () => {
    // 2026-01-03 is Saturday, 2026-01-04 is Sunday
    expect(isBusinessDay('2026-01-03')).toBe(false);
    expect(isBusinessDay('2026-01-04')).toBe(false);

    // 2026-01-05 is Monday
    expect(isBusinessDay('2026-01-05')).toBe(true);
  });

  it('correctly recognizes Indonesian National Holidays as non-business days', () => {
    // 2026-01-01 is New Year's Day (Tahun Baru 2026 Masehi)
    expect(isBusinessDay('2026-01-01')).toBe(false);

    // 2026-08-17 is Indonesian Independence Day (HUT Kemerdekaan RI Ke-81)
    expect(isBusinessDay('2026-08-17')).toBe(false);

    // 2026-12-25 is Christmas Day
    expect(isBusinessDay('2026-12-25')).toBe(false);
  });

  it('calculates priority adjusted SLA days correctly', () => {
    const baseDays = 5;
    expect(getPriorityAdjustedSla(baseDays, 'medium')).toBe(5);
    expect(getPriorityAdjustedSla(baseDays, 'low')).toBe(6); // base + 1
    expect(getPriorityAdjustedSla(baseDays, 'high')).toBe(4); // base - 1
    expect(getPriorityAdjustedSla(baseDays, 'critical')).toBe(2); // Math.floor(base * 0.4)
  });

  it('calculates business due date skipping weekends and Indonesian holidays', () => {
    // Start Wednesday 2026-08-12, base 5 business days:
    // Wed 12 (start)
    // Day 1: Thu 13
    // Day 2: Fri 14
    // Sat 15, Sun 16: weekend (skip)
    // Mon 17: Hari Kemerdekaan RI (holiday, skip)
    // Day 3: Tue 18
    // Day 4: Wed 19
    // Day 5: Thu 20
    const dueDate = calculateBusinessDueDate('2026-08-12', 5, 'medium');
    expect(dueDate).toBe('2026-08-20');
  });

  it('evaluates SLA status as completed when document is approved or closed', () => {
    const doc: Submission = {
      id: 'doc-comp-1',
      number: 'QMS-2026-001',
      condition: 'new',
      company: 'PT. Baramuda Bahari',
      department: 'Quality Assurance',
      type: 'SOP',
      docNo: 'SOP-QA-001',
      title: 'Validasi Sanitasi Line 1',
      revision: '00',
      pic: 'Budi Santoso',
      reviewer: 'Junita Dwi Lia H.',
      priority: 'medium',
      requested: '2026-01-10',
      sla: 5,
      due: '2026-01-16',
      status: 'approved',
      reason: 'Prosedur baru',
      remarks: 'Prioritas normal',
      history: [],
      followups: [],
      attachments: []
    };

    expect(getSlaStatus(doc)).toBe('completed');
    const detailed = getDetailedSlaStatus(doc);
    expect(detailed.status).toBe('completed');
    expect(detailed.badgeLabel).toBe('Selesai Tepat Waktu');
  });

  it('evaluates SLA status as overdue for past due date', () => {
    const doc: Submission = {
      id: 'doc-overdue-1',
      number: 'QMS-2026-002',
      condition: 'new',
      company: 'PT. Mega Marine Pride',
      department: 'Production Shrimp',
      type: 'IK',
      docNo: 'IK-PROD-002',
      title: 'Instruksi Kerja Grading Udang',
      revision: '01',
      pic: 'Ahmad Fauzi',
      reviewer: 'Junita Dwi Lia H.',
      priority: 'high',
      requested: '2025-01-05',
      sla: 3,
      due: '2025-01-08',
      status: 'under_review',
      reason: 'Update standar susut',
      remarks: 'Segera diproses',
      history: [],
      followups: [],
      attachments: []
    };

    expect(getSlaStatus(doc)).toBe('overdue');
    const detailed = getDetailedSlaStatus(doc);
    expect(detailed.status).toBe('overdue');
    expect(detailed.badgeLabel).toContain('Terlambat');
  });

  it('evaluates SLA status as on_time for far future due date', () => {
    const futureDue = '2099-12-31';
    const doc: Submission = {
      id: 'doc-safe-1',
      number: 'QMS-2099-001',
      condition: 'new',
      company: 'PT. Baramuda Bahari',
      department: 'Maintenance',
      type: 'Formulir',
      docNo: 'FM-MT-001',
      title: 'Formulir Kalibrasi Freezer',
      revision: '00',
      pic: 'Siti Rahma',
      reviewer: 'Junita Dwi Lia H.',
      priority: 'medium',
      requested: '2099-12-20',
      sla: 7,
      due: futureDue,
      status: 'submitted',
      reason: 'Formulir baru',
      remarks: '',
      history: [],
      followups: [],
      attachments: []
    };

    expect(getSlaStatus(doc)).toBe('on_time');
    const detailed = getDetailedSlaStatus(doc);
    expect(detailed.status).toBe('on_time');
    expect(detailed.badgeLabel).toContain('Aman');
  });
});
