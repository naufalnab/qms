'use client';

import { useState } from 'react';
import { PageHeading } from '@/components/ui';
import { useQmsData } from '@/components/qms-data-provider';
import { getSupabaseBrowserClient, isDemoMode } from '@/lib/supabase/client';

type Tab = 'Departemen' | 'Jenis Dokumen' | 'Reviewer';
type MasterItem = { id: string; name: string; detail: string; sla: number | null };

export default function MasterData() {
  const [tab, setTab] = useState<Tab>('Departemen');
  const [name, setName] = useState('');
  const [sla, setSla] = useState(7);
  const [reviewerId, setReviewerId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editName, setEditName] = useState('');
  const [editSla, setEditSla] = useState(7);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const { departments, documentTypes, reviewers, availableReviewers, loading, error, reload } = useQmsData();
  const items: MasterItem[] = tab === 'Departemen'
    ? departments.map(item => ({ id: item.id, name: item.name, detail: 'Unit kerja', sla: null }))
    : tab === 'Jenis Dokumen'
      ? documentTypes.map(item => ({ id: item.id, name: item.name, detail: 'SLA default', sla: item.sla }))
      : reviewers.map(item => ({ id: item.id, name: item.name, detail: 'Reviewer aktif', sla: null }));

  const cancelEdit = () => { setEditingId(''); setEditName(''); setEditSla(7); };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isDemoMode) { setMessage('Master data demo bersifat read-only. Hubungkan Supabase untuk menyimpan perubahan.'); return; }
    const client = getSupabaseBrowserClient();
    if (!client) return;
    setBusy(true); setMessage('');
    let errorMessage: string | undefined;
    if (editingId) {
      if (!editName.trim()) { setBusy(false); return; }
      const result = tab === 'Departemen'
        ? await client.from('departments').update({ name: editName.trim() }).eq('id', editingId)
        : tab === 'Jenis Dokumen'
          ? await client.from('document_types').update({ name: editName.trim(), default_sla_days: editSla }).eq('id', editingId)
          : await client.from('profiles').update({ full_name: editName.trim() }).eq('id', editingId);
      errorMessage = result.error?.message;
      if (!errorMessage) { setMessage(`${tab} berhasil diperbarui.`); cancelEdit(); }
    } else if (tab === 'Departemen' || tab === 'Jenis Dokumen') {
      if (!name.trim()) { setBusy(false); return; }
      const result = tab === 'Departemen'
        ? await client.from('departments').insert({ name: name.trim() })
        : await client.from('document_types').insert({ name: name.trim(), default_sla_days: sla });
      errorMessage = result.error?.message;
      if (!errorMessage) { setName(''); setMessage(`${tab} berhasil ditambahkan.`); }
    } else {
      if (!reviewerId) { setBusy(false); return; }
      const result = await client.from('reviewers').insert({ id: reviewerId });
      errorMessage = result.error?.message;
      if (!errorMessage) { setReviewerId(''); setMessage('Reviewer berhasil ditambahkan.'); }
    }
    setBusy(false);
    if (errorMessage) setMessage(errorMessage);
    else await reload();
  };

  const startEdit = (item: MasterItem) => {
    setEditingId(item.id); setEditName(item.name); setEditSla(item.sla ?? 7); setMessage('');
  };

  const remove = async (id: string) => {
    if (isDemoMode) { setMessage('Master data demo bersifat read-only.'); return; }
    const client = getSupabaseBrowserClient();
    if (!client) return;
    setBusy(true); setMessage('');
    const table = tab === 'Departemen' ? 'departments' : tab === 'Jenis Dokumen' ? 'document_types' : 'reviewers';
    const { error: updateError } = await client.from(table).update({ is_active: false }).eq('id', id);
    setBusy(false);
    setMessage(updateError?.message || `${tab} berhasil dihapus dari data aktif.`);
    if (!updateError) { if (editingId === id) cancelEdit(); await reload(); }
  };

  const changeTab = (item: Tab) => { setTab(item); cancelEdit(); setMessage(''); setName(''); setReviewerId(''); };

  return <>
    <PageHeading eyebrow="PENGATURAN WORKSPACE" title="Master Data" description="Kelola departemen, jenis dokumen, SLA default, dan reviewer." />
    <section className="panel master-panel">
      <div className="master-tabs">{(['Departemen', 'Jenis Dokumen', 'Reviewer'] as Tab[]).map(item => <button onClick={() => changeTab(item)} className={tab === item ? 'current' : ''} key={item}>{item}</button>)}</div>
      <div className="master-toolbar"><div><b>{tab}</b><small>{items.length} data aktif</small></div>
        <form onSubmit={save}>
          {editingId ? <>
            <input required value={editName} onChange={event => setEditName(event.target.value)} aria-label={`Nama ${tab}`} />
            {tab === 'Jenis Dokumen' && <label className="master-sla-input">SLA <input type="number" min="1" required value={editSla} onChange={event => setEditSla(Number(event.target.value))} aria-label="SLA default dalam hari" /> hari</label>}
            <button className="button primary" disabled={busy}>Simpan</button>
            <button type="button" className="button secondary" disabled={busy} onClick={cancelEdit}>Batal</button>
          </> : tab === 'Reviewer' ? <>
            <select required value={reviewerId} onChange={event => setReviewerId(event.target.value)} aria-label="Pilih akun reviewer">
              <option value="">Pilih akun reviewer</option>
              {availableReviewers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <button className="button primary" disabled={busy || availableReviewers.length === 0}>＋ Tambah</button>
          </> : <>
            <input required value={name} onChange={event => setName(event.target.value)} placeholder={`Tambah ${tab.toLowerCase()}`} aria-label={`Tambah ${tab.toLowerCase()}`} />
            {tab === 'Jenis Dokumen' && <label className="master-sla-input">SLA <input type="number" min="1" required value={sla} onChange={event => setSla(Number(event.target.value))} aria-label="SLA default dalam hari" /> hari</label>}
            <button className="button primary" disabled={busy}>＋ Tambah</button>
          </>}
        </form>
      </div>
      {tab === 'Reviewer' && !editingId && <p className="muted-copy">Reviewer ditambahkan dari akun aktif yang rolenya sudah disetel sebagai reviewer di profil pengguna.</p>}
      {message && <div className="inline-message" role="status">{message}</div>}
      {error && <div className="data-error" role="alert">{error}</div>}
      {loading ? <div className="data-loading">Memuat master data…</div> : items.length ? items.map(item => <div className="master-row" key={item.id}>
        <span className="master-symbol">{tab === 'Departemen' ? '▦' : tab === 'Jenis Dokumen' ? '▤' : '♙'}</span>
        <div><b>{item.name}</b><small>{item.detail}</small></div>
        {item.sla !== null && <span className="master-sla-value">{item.sla} hari</span>}
        <button className="row-more" disabled={busy} onClick={() => startEdit(item)} aria-label={`Edit ${item.name}`}>Edit</button>
        <button className="row-more master-delete" disabled={busy} onClick={() => void remove(item.id)} aria-label={`Hapus ${item.name}`}>Hapus</button>
      </div>) : <div className="empty-state">{tab === 'Reviewer' && availableReviewers.length === 0 ? 'Belum ada akun reviewer yang tersedia.' : 'Belum ada data aktif.'}</div>}
      <p className="muted-copy">Hapus akan menonaktifkan data agar tetap aman untuk riwayat dokumen yang sudah ada.</p>
    </section>
  </>;
}
