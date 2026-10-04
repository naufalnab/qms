'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { demoSubmissions, type Submission } from '@/lib/qms';
import { demoMasterData, loadMasterData, loadSubmissions } from '@/lib/qms-data';
import type { Department, DocumentType, Reviewer, ReviewerOption } from '@/lib/qms';
import { getSupabaseBrowserClient, isDemoMode } from '@/lib/supabase/client';

type QmsData = { submissions: Submission[]; departments: Department[]; documentTypes: DocumentType[]; reviewers: Reviewer[]; availableReviewers: ReviewerOption[]; loading: boolean; error: string; reload: () => Promise<void> };
const QmsDataContext = createContext<QmsData>({ submissions: demoSubmissions, ...demoMasterData, loading: false, error: '', reload: async () => {} });

export function QmsDataProvider({ children }: { children: React.ReactNode }) {
  const [submissions, setSubmissions] = useState<Submission[]>(isDemoMode ? demoSubmissions : []);
  const [masters, setMasters] = useState<Pick<QmsData, 'departments' | 'documentTypes' | 'reviewers' | 'availableReviewers'>>(isDemoMode ? demoMasterData : { departments: [], documentTypes: [], reviewers: [], availableReviewers: [] });
  const [loading, setLoading] = useState(!isDemoMode);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    if (isDemoMode) { setSubmissions(demoSubmissions); setMasters(demoMasterData); setLoading(false); return; }
    const client = getSupabaseBrowserClient();
    if (!client) { setError('Konfigurasi Supabase tidak tersedia.'); setLoading(false); return; }
    setLoading(true);
    try { const [documents, masterData] = await Promise.all([loadSubmissions(client), loadMasterData(client)]); setSubmissions(documents); setMasters(masterData); setError(''); }
    catch { setError('Data dokumen gagal dimuat. Periksa sesi dan akses database.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void reload(); }, 0);
    return () => window.clearTimeout(timer);
  }, [reload]);
  const value = useMemo(() => ({ submissions, ...masters, loading, error, reload }), [submissions, masters, loading, error, reload]);
  return <QmsDataContext.Provider value={value}>{children}</QmsDataContext.Provider>;
}

export const useQmsData = () => useContext(QmsDataContext);
