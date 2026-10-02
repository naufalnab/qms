'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { demoSubmissions, getSlaStatus } from '@/lib/qms';
import { getSupabaseBrowserClient, isDemoMode } from '@/lib/supabase/client';
import { QmsDataProvider } from '@/components/qms-data-provider';

const links = [['/','◫','Dashboard'],['/documents','▤','Dokumen'],['/actions','◉','Butuh Tindakan'],['/history','◷','Riwayat'],['/analytics','▥','Analitik'],['/master-data','⚙','Master Data']];
const roleLabels: Record<string, string> = { admin: 'Administrator', submitter: 'QMS / Submitter', reviewer: 'QMSR / Reviewer', viewer: 'Viewer' };
type Profile = { full_name: string; role: string };

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [identity, setIdentity] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(!isDemoMode);
  const isLogin = path === '/login';
  const actionCount = isDemoMode ? demoSubmissions.filter(doc => doc.status !== 'closed' && doc.status !== 'rejected' && (doc.status === 'need_revision' || doc.status === 'approved' || getSlaStatus(doc) === 'overdue' || getSlaStatus(doc) === 'due_soon')).length : null;

  useEffect(() => {
    if (isDemoMode) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    let active = true;
    const applySession = (session: Session | null) => {
      if (!active) return;
      setIdentity(session?.user ? { id: session.user.id, email: session.user.email || '' } : null);
      setAuthLoading(false);
    };
    void supabase.auth.getSession().then((result: { data: { session: Session | null } }) => applySession(result.data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => applySession(session));
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (isDemoMode || !identity) return;
    let active = true;
    void getSupabaseBrowserClient()?.from('profiles').select('full_name, role').eq('id', identity.id).maybeSingle().then((result: { data: unknown }) => {
      const data = result.data as Profile | null;
      if (active && data) setProfile(data as Profile);
    });
    return () => { active = false; };
  }, [identity]);

  useEffect(() => {
    if (isDemoMode || isLogin || authLoading) return;
    if (!identity) router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [authLoading, identity, isLogin, path, router]);

  if (isLogin) return <>{children}</>;
  if (!isDemoMode && (authLoading || !identity)) return <div className="auth-loading"><span className="brand-mark">q</span><p>Memeriksa sesi QMS…</p></div>;

  const signOut = async () => {
    await getSupabaseBrowserClient()?.auth.signOut();
    setIdentity(null);
    router.replace('/login');
  };
  const name = profile?.full_name || (isDemoMode ? 'Rosa Amelia' : identity?.email || 'Pengguna QMS');
  const role = isDemoMode ? 'Administrator' : roleLabels[profile?.role || ''] || 'Pengguna';
  const activeNav = links.find(([href]) => href === '/' ? path === '/' : path.startsWith(href));

  return <div className="app-frame">
    <aside className="sidebar">
      <Link href="/" className="brand"><span className="brand-mark">q</span><span><b>qms<span className="brand-dot">.</span></b><small>DOCUMENT MONITOR</small></span></Link>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{links.map(([href, icon, label]) => <Link key={href} href={href} className={`nav-item ${activeNav?.[0] === href ? 'active' : ''}`}><span className="nav-icon">{icon}</span>{label}{label === 'Butuh Tindakan' && actionCount !== null && <span className="nav-count">{actionCount}</span>}</Link>)}</nav>
      <div className="sidebar-bottom"><div className="avatar">{name.split(' ').map(part => part[0]).slice(0,2).join('').toUpperCase()}</div><div className="user-copy"><b>{name}</b><small>{role}</small></div><button className="sign-out" onClick={signOut} aria-label="Keluar">↪</button></div>
    </aside>
    <main className="main-area">
      <header className="mobile-header"><button className="icon-button" onClick={() => setOpen(!open)} aria-label="Buka menu">☰</button><Link href="/" className="brand compact"><span className="brand-mark">q</span><b>qms<span className="brand-dot">.</span></b></Link><button className="avatar small-avatar" onClick={signOut} aria-label="Keluar">{name.split(' ').map(part => part[0]).slice(0,2).join('').toUpperCase()}</button></header>
      {open && <div className="mobile-menu">{links.map(([href, icon, label]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{icon}　{label}</Link>)}<button onClick={signOut}>↪　Keluar</button></div>}
      <QmsDataProvider><div className="page-content">{children}</div></QmsDataProvider>
    </main>
    <nav className="bottom-nav">{[['/','⌂','Home'],['/documents','▤','Dokumen'],['/new','＋','Buat'],['/actions','◉','Tindakan']].map(([href, icon, label]) => <Link key={href} href={href} className={(href === '/' ? path === '/' : path.startsWith(href)) ? 'selected' : ''}><span>{icon}</span>{label}</Link>)}</nav>
  </div>;
}
