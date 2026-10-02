'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getSupabaseBrowserClient, isDemoMode } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (isDemoMode) { router.replace('/'); return; }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setError('Konfigurasi autentikasi belum tersedia.'); return; }
    setBusy(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (authError) { setError('Email atau kata sandi tidak cocok. Coba lagi.'); return; }
    router.replace('/');
    router.refresh();
  };

  return <main className="login-page">
    <section className="login-card">
      <Link href="/" className="brand login-brand"><span className="brand-mark">q</span><span><b>qms<span className="brand-dot">.</span></b><small>DOCUMENT MONITOR</small></span></Link>
      <div className="login-intro"><span className="eyebrow">RUANG KERJA QMS</span><h1>Selamat datang</h1><p>Kelola pengajuan, review, dan tenggat dokumen dalam satu tempat.</p></div>
      {isDemoMode ? <div className="demo-notice"><span>ⓘ</span><p>Mode demo aktif. Hubungkan Supabase untuk menggunakan akun email.</p></div> : null}
      <form className="login-form" onSubmit={signIn}>
        <label>Email<input type="email" autoComplete="username" required={!isDemoMode} value={email} onChange={event => setEmail(event.target.value)} placeholder="nama@perusahaan.com" /></label>
        <label>Kata Sandi<input type="password" autoComplete="current-password" required={!isDemoMode} value={password} onChange={event => setPassword(event.target.value)} placeholder="Masukkan kata sandi" /></label>
        {error && <div className="login-error" role="alert">{error}</div>}
        <button className="button primary login-submit" disabled={busy}>{busy ? 'Memeriksa akun…' : isDemoMode ? 'Masuk ke Demo →' : 'Masuk →'}</button>
      </form>
      <div className="login-footer"><span>QMS Document Monitoring</span><span>Workspace internal</span></div>
    </section>
    <div className="login-side"><div className="login-side-content"><span className="side-orb">q</span><p>“Dokumen yang terkendali mendukung mutu yang konsisten.”</p><small>QMS DOCUMENT MONITORING</small></div></div>
  </main>;
}
