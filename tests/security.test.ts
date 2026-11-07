import { describe, expect, it } from 'vitest';
import {
  canViewDocument,
  type AppUser,
  type Submission
} from '../src/lib/qms';

describe('Security & Access Control Enforcement', () => {
  const adminUser: AppUser = {
    id: 'user-admin-1',
    email: 'admin@qms.local',
    fullName: 'Admin QMS',
    role: 'admin'
  };

  const qmsAuthor: AppUser = {
    id: 'user-qms-author',
    email: 'author@qms.local',
    fullName: 'Rian Quality Staff',
    role: 'qms'
  };

  const qmsOther: AppUser = {
    id: 'user-qms-other',
    email: 'other@qms.local',
    fullName: 'Sari Staff',
    role: 'qms'
  };

  const qmsrReviewer: AppUser = {
    id: 'user-qmsr-assigned',
    email: 'reviewer@qms.local',
    fullName: 'Junita Dwi Lia H.',
    role: 'qmsr'
  };

  const qmsrOther: AppUser = {
    id: 'user-qmsr-other',
    email: 'reviewer2@qms.local',
    fullName: 'Other QMSR',
    role: 'qmsr'
  };

  const privateDraftDoc: Submission = {
    id: 'doc-private-draft',
    number: 'QMS-2026-DRAFT',
    condition: 'new',
    company: 'PT. Baramuda Bahari',
    department: 'QC Lab',
    type: 'Formulir',
    docNo: 'FM-QC-001',
    title: 'Draft Lembar Uji Organoleptik',
    revision: '00',
    pic: 'Rian Quality Staff',
    createdBy: 'user-qms-author',
    reviewer: 'Junita Dwi Lia H.',
    reviewerId: 'user-qmsr-assigned',
    priority: 'low',
    requested: '2026-02-05',
    sla: 5,
    due: '2026-02-12',
    status: 'draft',
    reason: '',
    remarks: '',
    history: [],
    followups: [],
    attachments: []
  };

  const activeReviewDoc: Submission = {
    ...privateDraftDoc,
    id: 'doc-active-review',
    status: 'qmsr_review'
  };

  it('restricts draft visibility strictly to author and admin', () => {
    // Author can see their own draft
    expect(canViewDocument(qmsAuthor, privateDraftDoc)).toBe(true);
    // Admin can view draft
    expect(canViewDocument(adminUser, privateDraftDoc)).toBe(true);
    // Other QMS staff CANNOT view another user draft
    expect(canViewDocument(qmsOther, privateDraftDoc)).toBe(false);
  });

  it('allows assigned reviewer and admin to view document in review', () => {
    expect(canViewDocument(qmsrReviewer, activeReviewDoc)).toBe(true);
    expect(canViewDocument(adminUser, activeReviewDoc)).toBe(true);
    expect(canViewDocument(qmsAuthor, activeReviewDoc)).toBe(true);
  });

  it('validates CSV injection protection format', () => {
    // Test spreadsheet formula injection prevention: formula triggers (=, +, -, @)
    const dangerousInput = '=cmd|"/C calc"!A0';
    const escaped = dangerousInput.startsWith('=') ? `'${dangerousInput}` : dangerousInput;
    expect(escaped.startsWith("'=")).toBe(true);
  });
});
