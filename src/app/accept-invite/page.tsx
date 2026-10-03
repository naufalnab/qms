'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function AcceptInvite() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    if (password.length < 8) { setMessage('Kata sandi minimal 8 karakter.'); return; }
    if (password !== confirmPassword) { setMessage('Konfirmasi kata sandi belum sama.'); return; }
    const client = getSupabaseBrowserClient();
    if (!client) { setMessage('Konfigurasi Supabase tidak tersedia.'); return; }
    setBusy(true);
    const { data: { user } } = await client.auth.getUser();
    if (!user) { setMessage('Link undangan tidak valid atau sudah kedaluwarsa. Minta admin mengirim undangan baru.'); setBusy(false); return; }
    const { error } = await client.auth.updateUser({ password });
    if (error) { setMessage(error.message); setBusy(false); return; }
    await client.auth.signOut();
    router.replace('/login?invite=accepted');
  };

  return <main className="login-page"><section className="login-card">
    <Link href="/login" className="brand login-brand"><span className="brand-mark">q</span><span><b>qms<span className="brand-dot">.</span></b><small>DOCUMENT MONITOR</small></span></Link>
    <div className="login-intro"><span className="eyebrow">UNDANGAN QMS</span><h1>Atur kata sandi</h1><p>Buat kata sandi untuk menyelesaikan aktivasi akun QMS Anda.</p></div>
    <form className="login-form" onSubmit={submit}>
      <label>Kata Sandi<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} placeholder="Minimal 8 karakter" /></label>
      <label>Ulangi Kata Sandi<input type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Ketik ulang kata sandi" /></label>
      {message && <div className="login-error" role="alert">{message}</div>}
      <button className="button primary login-submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Aktifkan Akun'}</button>
    </form>
    <div className="login-footer"><span>QMS Document Monitoring</span><span>Aktivasi akun</span></div>
  </section><div className="login-side"><div className="login-side-content"><span className="side-orb">q</span><p>Dokumen yang terkendali mendukung mutu yang konsisten.</p><small>QMS DOCUMENT MONITOR</small></div></div></main>;
}
