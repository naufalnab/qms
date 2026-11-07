'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  demoSubmissions,
  type AppRole,
  type AppUser,
  type Submission,
  type Company,
  type Department,
  type DocumentType,
  type Reviewer,
  type ReviewerOption
} from '@/lib/qms';
import { demoMasterData, loadMasterData, loadSubmissions } from '@/lib/qms-data';
import { getSupabaseBrowserClient, isDemoMode } from '@/lib/supabase/client';

type QmsData = {
  submissions: Submission[];
  filteredSubmissions: Submission[];
  departments: Department[];
  documentTypes: DocumentType[];
  reviewers: Reviewer[];
  availableReviewers: ReviewerOption[];
  user: AppUser | null;
  company: Company | 'all';
  setCompany: (c: Company | 'all') => void;
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
};

const roleUsers: Record<AppRole, { name: string; id: string }> = {
  admin: { name: 'Rosalia Pratiwi', id: 'demo-admin' },
  qms: { name: 'Budi Santoso', id: 'demo-qms' },
  qms_section_head: { name: 'Hendra Wijaya', id: 'demo-section-head' },
  qmsr: { name: 'Junita Dwi Lia H.', id: 'demo-reviewer-1' }
};

function getDemoUser(): AppUser {
  if (typeof window !== 'undefined') {
    const p = new URLSearchParams(window.location.search).get('role') as AppRole | null;
    if (p && roleUsers[p]) {
      return { id: roleUsers[p].id, fullName: roleUsers[p].name, role: p };
    }
  }
  return { id: 'demo-admin', fullName: 'Rosalia Pratiwi', role: 'admin' };
}

const QmsDataContext = createContext<QmsData>({
  submissions: demoSubmissions,
  filteredSubmissions: demoSubmissions,
  ...demoMasterData,
  user: isDemoMode ? getDemoUser() : null,
  company: 'all',
  setCompany: () => {},
  loading: false,
  error: '',
  reload: async () => {}
});

export function QmsDataProvider({ children }: { children: React.ReactNode }) {
  const [submissions, setSubmissions] = useState<Submission[]>(isDemoMode ? demoSubmissions : []);
  const [masters, setMasters] = useState<Pick<QmsData, 'departments' | 'documentTypes' | 'reviewers' | 'availableReviewers'>>(
    isDemoMode ? demoMasterData : { departments: [], documentTypes: [], reviewers: [], availableReviewers: [] }
  );
  const [user, setUser] = useState<AppUser | null>(isDemoMode ? getDemoUser() : null);
  const [company, setCompany] = useState<Company | 'all'>('all');
  const [loading, setLoading] = useState(!isDemoMode);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (isDemoMode) {
      setSubmissions(demoSubmissions);
      setMasters(demoMasterData);
      setUser(getDemoUser());
      setLoading(false);
      return;
    }
    const client = getSupabaseBrowserClient();
    if (!client) {
      setError('Konfigurasi Supabase tidak tersedia.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [{ data: { user: authUser }, error: authError }, documents, masterData] = await Promise.all([
        client.auth.getUser(),
        loadSubmissions(client),
        loadMasterData(client)
      ]);
      if (authError || !authUser) throw authError || new Error('Sesi login tidak tersedia.');

      const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('id,full_name,role,is_active')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileError || !profile || !profile.is_active) {
        throw profileError || new Error('Profil QMS tidak aktif.');
      }

      const role = profile.role as AppRole;
      if (!['admin', 'qms', 'qms_section_head', 'qmsr'].includes(role)) {
        throw new Error('Role QMS tidak valid.');
      }

      setUser({ id: authUser.id, fullName: profile.full_name, role });
      setSubmissions(documents);
      setMasters(masterData);
      setError('');
    } catch {
      setUser(null);
      setError('Data dokumen gagal dimuat. Periksa sesi dan akses database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void reload();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  const filteredSubmissions = useMemo(() => {
    if (company === 'all') return submissions;
    return submissions.filter(s => s.company === company);
  }, [submissions, company]);

  const value = useMemo(
    () => ({
      submissions,
      filteredSubmissions,
      ...masters,
      user,
      company,
      setCompany,
      loading,
      error,
      reload
    }),
    [submissions, filteredSubmissions, masters, user, company, setCompany, loading, error, reload]
  );

  return <QmsDataContext.Provider value={value}>{children}</QmsDataContext.Provider>;
}

export const useQmsData = () => useContext(QmsDataContext);
