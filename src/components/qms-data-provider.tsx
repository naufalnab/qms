'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { demoSubmissions, type AppRole, type AppUser, type Submission } from '@/lib/qms';
import { demoMasterData, loadMasterData, loadSubmissions } from '@/lib/qms-data';
import type { Department, DocumentType, Reviewer, ReviewerOption } from '@/lib/qms';
import { getSupabaseBrowserClient, isDemoMode } from '@/lib/supabase/client';

type QmsData = { submissions: Submission[]; departments: Department[]; documentTypes: DocumentType[]; reviewers: Reviewer[]; availableReviewers: ReviewerOption[]; user: AppUser | null; loading: boolean; error: string; reload: () => Promise<void> };
const demoUser: AppUser = { id: 'demo-admin', fullName: 'Rosa Amelia', role: 'admin' };
const QmsDataContext = createContext<QmsData>({ submissions: demoSubmissions, ...demoMasterData, user: isDemoMode ? demoUser : null, loading: false, error: '', reload: async () => {} });

export function QmsDataProvider({ children }: { children: React.ReactNode }) {
  const [submissions, setSubmissions] = useState<Submission[]>(isDemoMode ? demoSubmissions : []);
  const [masters, setMasters] = useState<Pick<QmsData, 'departments' | 'documentTypes' | 'reviewers' | 'availableReviewers'>>(isDemoMode ? demoMasterData : { departments: [], documentTypes: [], reviewers: [], availableReviewers: [] });
  const [user, setUser] = useState<AppUser | null>(isDemoMode ? demoUser : null);
  const [loading, setLoading] = useState(!isDemoMode);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    if (isDemoMode) { setSubmissions(demoSubmissions); setMasters(demoMasterData); setUser(demoUser); setLoading(false); return; }
    const client = getSupabaseBrowserClient();
    if (!client) { setError('Konfigurasi Supabase tidak tersedia.'); setLoading(false); return; }
    setLoading(true);
    try {
      const [{ data: { user: authUser }, error: authError }, documents, masterData] = await Promise.all([
        client.auth.getUser(), loadSubmissions(client), loadMasterData(client),
      ]);
      if (authError || !authUser) throw authError || new Error('Sesi login tidak tersedia.');
      const { data: profile, error: profileError } = await client.from('profiles').select('id,full_name,role,is_active').eq('id', authUser.id).maybeSingle();
      if (profileError || !profile || !profile.is_active) throw profileError || new Error('Profil QMS tidak aktif.');
      const role = profile.role as AppRole;
      if (!['admin', 'qms', 'qms_section_head', 'qmsr'].includes(role)) throw new Error('Role QMS tidak valid.');
      setUser({ id: authUser.id, fullName: profile.full_name, role });
      setSubmissions(documents); setMasters(masterData); setError('');
    }
    catch { setUser(null); setError('Data dokumen gagal dimuat. Periksa sesi dan akses database.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void reload(); }, 0);
    return () => window.clearTimeout(timer);
  }, [reload]);
  const value = useMemo(() => ({ submissions, ...masters, user, loading, error, reload }), [submissions, masters, user, loading, error, reload]);
  return <QmsDataContext.Provider value={value}>{children}</QmsDataContext.Provider>;
}

export const useQmsData = () => useContext(QmsDataContext);
