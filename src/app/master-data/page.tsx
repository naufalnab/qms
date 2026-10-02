'use client';

import { useState } from 'react';
import { PageHeading } from '@/components/ui';
import { useQmsData } from '@/components/qms-data-provider';
import { getSupabaseBrowserClient, isDemoMode } from '@/lib/supabase/client';

type Tab = 'Departemen' | 'Jenis Dokumen' | 'Reviewer';

export default function MasterData() {
  const [tab, setTab] = useState<Tab>('Departemen');
  const [name, setName] = useState('');
  const [sla, setSla] = useState(7);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const { departments, documentTypes, reviewers, loading, error, reload } = useQmsData();
  const items = tab === 'Departemen'
    ? departments.map(item => ({ id: item.id, name: item.name, detail: 'Unit kerja', sla: null as number | null }))
    : tab === 'Jenis Dokumen'
      ? documentTypes.map(item => ({ id: item.id, name: item.name, detail: 'SLA default', sla: item.sla }))
      : reviewers.map((item, index) => ({ id: String(index), name: item, detail: 'Reviewer aktif', sla: null as number | null }));

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    if (isDemoMode) { setMessage('Master data demo bersifat read-only. Hubungkan Supabase untuk menyimpan perubahan.'); return; }
    const client = getSupabaseBrowserClient();
    if (!client) return;
    setBusy(true); setMessage('');
    const result = tab === 'Departemen'
      ? await client.from('departments').insert({ name: name.trim() })
      : tab === 'Jenis Dokumen'
        ? await client.from('document_types').insert({ name: name.trim(), default_sla_days: sla })
        : { error: { message: 'Tambahkan akun pengguna melalui Supabase Auth, lalu daftarkan profilnya sebagai reviewer.' } };
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else { setName(''); setMessage(`${tab} berhasil ditambahkan.`); await reload(); }
  };

  const updateSla = async (id: string, value: string) => {
    const days = Number(value);
    if (!Number.isInteger(days) || days < 1 || isDemoMode) return;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    setBusy(true);
    const { error: updateError } = await client.from('document_types').update({ default_sla_days: days }).eq('id', id);
    setBusy(false);
    setMessage(updateError?.message || 'SLA default diperbarui.');
    if (!updateError) await reload();
  };

  const deactivate = async (id: string) => {
    if (isDemoMode) { setMessage('Master data demo bersifat read-only.'); return; }
    const client = getSupabaseBrowserClient();
    if (!client) return;
    setBusy(true);
    const table = tab === 'Departemen' ? 'departments' : 'document_types';
    const { error: updateError } = await client.from(table).update({ is_active: false }).eq('id', id);
    setBusy(false);
    setMessage(updateError?.message || `${tab} dinonaktifkan.`);
    if (!updateError) await reload();
  };

  return <>
    <PageHeading eyebrow="PENGATURAN WORKSPACE" title="Master Data" description="Kelola departemen, jenis dokumen, SLA default, dan reviewer." />
    <section className="panel master-panel">
      <div className="master-tabs">{(['Departemen', 'Jenis Dokumen', 'Reviewer'] as Tab[]).map(item => <button onClick={() => setTab(item)} className={tab === item ? 'current' : ''} key={item}>{item}</button>)}</div>
      <div className="master-toolbar"><div><b>{tab}</b><small>{items.length} data aktif</small></div>
        {tab !== 'Reviewer' && <form onSubmit={save}>
          <input required value={name} onChange={event => setName(event.target.value)} placeholder={`Tambah ${tab.toLowerCase()}`} />
          {tab === 'Jenis Dokumen' && <label className="master-sla-input">SLA <input type="number" min="1" value={sla} onChange={event => setSla(Number(event.target.value))} aria-label="SLA default dalam hari" /> hari</label>}
          <button className="button primary" disabled={busy}>＋ Tambah</button>
        </form>}
      </div>
      {message && <div className="inline-message" role="status">{message}</div>}
      {error && <div className="data-error" role="alert">{error}</div>}
      {loading ? <div className="data-loading">Memuat master data…</div> : items.length ? items.map(item => <div className="master-row" key={item.id}>
        <span className="master-symbol">{tab === 'Departemen' ? '▦' : tab === 'Jenis Dokumen' ? '▤' : '♙'}</span>
        <div><b>{item.name}</b><small>{item.detail}</small></div>
        {item.sla !== null && <label className="master-sla-input">SLA <input type="number" min="1" defaultValue={item.sla} aria-label={`SLA ${item.name}`} onBlur={event => { if (Number(event.target.value) !== item.sla) void updateSla(item.id, event.target.value); }} /> hari</label>}
        {tab !== 'Reviewer' && <button className="row-more" disabled={busy} onClick={() => void deactivate(item.id)} aria-label={`Nonaktifkan ${item.name}`} title="Nonaktifkan">Nonaktifkan</button>}
      </div>) : <div className="empty-state">Belum ada data aktif.</div>}
      {tab === 'Reviewer' && <p className="muted-copy">Akun reviewer ditautkan ke profil pengguna. Buat pengguna dan profilnya melalui Supabase Auth, lalu daftarkan UUID profil di tabel reviewers.</p>}
    </section>
  </>;
}
