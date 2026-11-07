import { describe, expect, it } from 'vitest';
import {
  canEditSubmission,
  canPerformWorkflowAction,
  canReviewDocument,
  canSubmitDocument,
  type AppUser,
  type Submission
} from '../src/lib/qms';

describe('Workflow & RBAC Security Engine', () => {
  const adminUser: AppUser = {
    id: 'user-admin',
    email: 'admin@qms.local',
    fullName: 'Rosalia Pratiwi',
    role: 'admin'
  };

  const qmsUser: AppUser = {
    id: 'user-qms',
    email: 'qms@qms.local',
    fullName: 'Budi QMS Staff',
    role: 'qms'
  };

  const sectionHeadUser: AppUser = {
    id: 'user-sec-head',
    email: 'sechead@qms.local',
    fullName: 'Section Head Quality',
    role: 'qms_section_head'
  };

  const qmsrUser: AppUser = {
    id: 'user-qmsr',
    email: 'qmsr@qms.local',
    fullName: 'Junita Dwi Lia H.',
    role: 'qmsr'
  };

  const baseSubmission: Submission = {
    id: 'sub-1',
    number: 'QMS-2026-101',
    condition: 'new',
    company: 'PT. Baramuda Bahari',
    department: 'Quality Assurance',
    type: 'SOP',
    docNo: 'SOP-QA-010',
    title: 'SOP Inspeksi Bahan Baku Masuk',
    revision: '00',
    pic: 'Budi QMS Staff',
    createdBy: 'user-qms',
    reviewer: 'Junita Dwi Lia H.',
    reviewerId: 'user-qmsr',
    priority: 'medium',
    requested: '2026-02-01',
    sla: 5,
    due: '2026-02-08',
    status: 'draft',
    reason: '',
    remarks: '',
    history: [],
    followups: [],
    attachments: []
  };

  describe('Document Submission Rights', () => {
    it('allows QMS submitter and Admin to submit documents', () => {
      expect(canSubmitDocument(qmsUser)).toBe(true);
      expect(canSubmitDocument(adminUser)).toBe(true);
    });

    it('denies Section Head and QMSR reviewers from initial submission', () => {
      expect(canSubmitDocument(sectionHeadUser)).toBe(false);
      expect(canSubmitDocument(qmsrUser)).toBe(false);
    });
  });

  describe('Document Editing Rights', () => {
    it('allows document author to edit while in draft or need_revision', () => {
      const draftDoc = { ...baseSubmission, status: 'draft' as const };
      const revisionDoc = { ...baseSubmission, status: 'need_revision' as const };
      const submittedDoc = { ...baseSubmission, status: 'submitted' as const };

      expect(canEditSubmission(qmsUser, draftDoc)).toBe(true);
      expect(canEditSubmission(qmsUser, revisionDoc)).toBe(true);
      expect(canEditSubmission(qmsUser, submittedDoc)).toBe(false);
    });

    it('prevents non-authors from editing draft documents', () => {
      const otherQms: AppUser = {
        id: 'user-qms-2',
        email: 'other@qms.local',
        fullName: 'Other Staff',
        role: 'qms'
      };
      const draftDoc = { ...baseSubmission, status: 'draft' as const };
      expect(canEditSubmission(otherQms, draftDoc)).toBe(false);
    });

    it('allows Admin to edit document metadata regardless of status', () => {
      const submittedDoc = { ...baseSubmission, status: 'submitted' as const };
      const approvedDoc = { ...baseSubmission, status: 'approved' as const };
      expect(canEditSubmission(adminUser, submittedDoc)).toBe(true);
      expect(canEditSubmission(adminUser, approvedDoc)).toBe(true);
    });
  });

  describe('2-Stage Workflow Review Progression', () => {
    it('Stage 1: QMS Section Head reviews submitted and resubmitted documents', () => {
      const submittedDoc = { ...baseSubmission, status: 'submitted' as const };
      const resubmittedDoc = { ...baseSubmission, status: 'resubmitted' as const };
      const underReviewDoc = { ...baseSubmission, status: 'under_review' as const };
      const qmsrReviewDoc = { ...baseSubmission, status: 'qmsr_review' as const };

      // Can review
      expect(canReviewDocument(sectionHeadUser, submittedDoc)).toBe(true);
      expect(canReviewDocument(sectionHeadUser, resubmittedDoc)).toBe(true);
      expect(canReviewDocument(sectionHeadUser, underReviewDoc)).toBe(true);

      // Cannot review Stage 2 (QMSR stage)
      expect(canReviewDocument(sectionHeadUser, qmsrReviewDoc)).toBe(false);

      // Section Head actions:
      // submitted -> under_review
      expect(canPerformWorkflowAction(sectionHeadUser, submittedDoc, 'under_review')).toBe(true);
      // under_review -> qmsr_review (forward to Stage 2 QMSR)
      expect(canPerformWorkflowAction(sectionHeadUser, underReviewDoc, 'qmsr_review')).toBe(true);
      // under_review -> need_revision (request revision from QMS)
      expect(canPerformWorkflowAction(sectionHeadUser, underReviewDoc, 'need_revision')).toBe(true);
      // Section Head CANNOT directly approve or reject to final
      expect(canPerformWorkflowAction(sectionHeadUser, underReviewDoc, 'approved')).toBe(false);
      expect(canPerformWorkflowAction(sectionHeadUser, underReviewDoc, 'rejected')).toBe(false);
    });

    it('Stage 2: QMSR reviews final approval, revision, or rejection', () => {
      const qmsrReviewDoc = { ...baseSubmission, status: 'qmsr_review' as const };
      const submittedDoc = { ...baseSubmission, status: 'submitted' as const };

      // QMSR can review when status is qmsr_review
      expect(canReviewDocument(qmsrUser, qmsrReviewDoc)).toBe(true);
      // QMSR cannot review before Section Head completes Stage 1
      expect(canReviewDocument(qmsrUser, submittedDoc)).toBe(false);

      // QMSR actions from qmsr_review:
      expect(canPerformWorkflowAction(qmsrUser, qmsrReviewDoc, 'approved')).toBe(true);
      expect(canPerformWorkflowAction(qmsrUser, qmsrReviewDoc, 'need_revision')).toBe(true);
      expect(canPerformWorkflowAction(qmsrUser, qmsrReviewDoc, 'rejected')).toBe(true);
    });

    it('QMS Submitter lifecycle actions: submit, resubmit, and close approved', () => {
      const draftDoc = { ...baseSubmission, status: 'draft' as const };
      const revisionDoc = { ...baseSubmission, status: 'need_revision' as const };
      const approvedDoc = { ...baseSubmission, status: 'approved' as const };
      const submittedDoc = { ...baseSubmission, status: 'submitted' as const };

      // draft -> submitted
      expect(canPerformWorkflowAction(qmsUser, draftDoc, 'submitted')).toBe(true);
      // need_revision -> resubmitted
      expect(canPerformWorkflowAction(qmsUser, revisionDoc, 'resubmitted')).toBe(true);
      // approved -> closed
      expect(canPerformWorkflowAction(qmsUser, approvedDoc, 'closed')).toBe(true);

      // Submitter CANNOT approve their own document
      expect(canPerformWorkflowAction(qmsUser, submittedDoc, 'approved')).toBe(false);
      expect(canPerformWorkflowAction(qmsUser, submittedDoc, 'under_review')).toBe(false);
    });

    it('Admin can perform administrative overrides across all stages', () => {
      const submittedDoc = { ...baseSubmission, status: 'submitted' as const };
      const qmsrDoc = { ...baseSubmission, status: 'qmsr_review' as const };

      expect(canPerformWorkflowAction(adminUser, submittedDoc, 'under_review')).toBe(true);
      expect(canPerformWorkflowAction(adminUser, qmsrDoc, 'approved')).toBe(true);
      expect(canPerformWorkflowAction(adminUser, qmsrDoc, 'need_revision')).toBe(true);
      expect(canPerformWorkflowAction(adminUser, qmsrDoc, 'rejected')).toBe(true);
    });
  });
});
