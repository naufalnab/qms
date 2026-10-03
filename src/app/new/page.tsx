'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { calculateDueDate, demoSubmissions, todayISO, type Condition, type Priority, type Submission } from '@/lib/qms';
import { PageHeading } from '@/components/ui';
import { useQmsData } from '@/components/qms-data-provider';
import { getSupabaseBrowserClient, isDemoMode } from '@/lib/supabase/client';

export default function NewSubmission() {
  const router = useRouter();
  const { departments, documentTypes, reviewers, reload, loading } = useQmsData();
  const [condition, setCondition] = useState<Condition>('new');
  const [type, setType] = useState('Form');
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const selectedType = documentTypes.find(item => item.name === type) || documentTypes[0];
  const dueDate = selectedType ? calculateDueDate(date, selectedType.sla) : date;

  const submit = async (asDraft: boolean) => {
    const form = document.querySelector('form') as HTMLFormElement;
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const reason = String(values.get('reason') || '');
    if (condition === 'existing' && !reason.trim()) { setError('Alasan perubahan wajib diisi untuk dokumen lama.'); return; }
    setError(''); setSaving(true);
    try {
      const status = asDraft ? 'draft' : 'submitted';
      if (isDemoMode) {
        const index = demoSubmissions.length + 1;
        const doc: Submission = {
          id: `demo-${index}`, number: `QMS-${date.slice(0,4)}-${String(index).padStart(4,'0')}`, requested: date,
          condition, department: String(values.get('department')), type, docNo: String(values.get('docNo')),
          title: String(values.get('title')), revision: String(values.get('revision')), reason,
          pic: String(values.get('pic')), reviewer: reviewers.find(item => item.id === values.get('reviewer'))?.name || '',
          priority: String(values.get('priority')) as Priority, sla: selectedType?.sla || 7, due: dueDate,
          status, remarks: String(values.get('remarks') || ''),
          history: [{ action: asDraft ? 'Draft disimpan' : 'Diajukan', actor: 'Rosa Amelia', at: todayISO() }], followups: [],
        };
        demoSubmissions.unshift(doc);
        router.push(`/documents/${doc.id}?created=1`);
        return;
      }

      const client = getSupabaseBrowserClient();
      if (!client) throw new Error('Konfigurasi Supabase tidak tersedia.');
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error('Sesi login berakhir. Silakan masuk kembali.');
      const [departmentRow, typeRow] = await Promise.all([
        client.from('departments').select('id').eq('name', String(values.get('department'))).single(),
        client.from('document_types').select('id,default_sla_days').eq('name', type).single(),
      ]);
      if (departmentRow.error || typeRow.error) throw new Error('Master data departemen atau jenis dokumen belum lengkap.');
      const reviewer = await client.from('reviewers').select('id').eq('id', String(values.get('reviewer'))).eq('is_active', true).maybeSingle();
      if (reviewer.error || !reviewer.data) throw new Error('Reviewer belum terdaftar sebagai reviewer aktif.');
      const slaDays = typeRow.data.default_sla_days;
      const due = calculateDueDate(date, slaDays);
      const created = await client.from('document_submissions').insert({
        request_date: date, document_condition: condition, department_id: departmentRow.data.id,
        document_type_id: typeRow.data.id, document_number: String(values.get('docNo')),
        document_title: String(values.get('title')), revision: String(values.get('revision')),
        change_reason: reason, requestor_name: String(values.get('pic')), reviewer_id: reviewer.data.id,
        priority: String(values.get('priority')), sla_days: slaDays, due_date: due,
        status, remarks: String(values.get('remarks') || ''), created_by: user.id,
      }).select('id').single();
      if (created.error) throw created.error;
      await reload();
      router.push(`/documents/${created.data.id}?created=1`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Pengajuan gagal disimpan. Periksa kembali data dan akses Anda.');
      setSaving(false);
    }
  };

  return <>
    <div className="detail-back"><Link href="/">← Kembali ke dashboard</Link></div>
    <PageHeading eyebrow="PENGAJUAN DOKUMEN" title="Buat Pengajuan Baru" description="Lengkapi informasi dokumen untuk memulai proses QMS." />
    {error && <div className="panel data-error form-error" role="alert">{error}</div>}
    <form className="submission-layout" onSubmit={event => event.preventDefault()}>
      <div className="submission-main">
        <section className="panel form-panel"><div className="form-section-head"><span className="form-step">01</span><div><h2>Informasi Dokumen</h2><p>Informasi utama dokumen yang diajukan.</p></div></div>
          <div className="form-grid">
            <label>Tanggal Pengajuan <em>*</em><input type="date" required value={date} onChange={event => setDate(event.target.value)} /></label>
            <label>Status Dokumen <em>*</em><select value={condition} onChange={event => setCondition(event.target.value as Condition)}><option value="new">Baru</option><option value="existing">Lama</option></select></label>
            <label>Departemen <em>*</em><select required name="department" defaultValue=""><option value="" disabled>Pilih departemen</option>{departments.map(item => <option key={item.id}>{item.name}</option>)}</select></label>
            <label>Jenis Dokumen <em>*</em><select required value={type} onChange={event => setType(event.target.value)}>{documentTypes.map(item => <option key={item.id}>{item.name}</option>)}</select></label>
            <label>Nomor Dokumen <em>*</em><input required name="docNo" placeholder="Contoh: SOP-QA-014" /></label>
            <label>Revisi <em>*</em><input required name="revision" placeholder="Contoh: A.1" /></label>
            <label className="span-two">Judul Dokumen <em>*</em><input required name="title" placeholder="Masukkan judul dokumen" /></label>
            <label className="span-two change-reason">Alasan Perubahan {condition === 'existing' && <em>* Wajib untuk dokumen lama</em>}<textarea name="reason" rows={3} required={condition === 'existing'} placeholder={condition === 'existing' ? 'Jelaskan alasan perubahan dokumen...' : 'Contoh: Dokumen baru atau pembaruan persyaratan'} /></label>
          </div>
        </section>
        <section className="panel form-panel"><div className="form-section-head"><span className="form-step">02</span><div><h2>Penanggung Jawab</h2><p>PIC pengajuan dan reviewer dokumen.</p></div></div>
          <div className="form-grid">
            <label>PIC Dokumen <em>*</em><input required name="pic" placeholder="Nama PIC / Requestor" /></label>
            <label>Reviewer QMSR <em>*</em><select required name="reviewer" defaultValue=""><option value="" disabled>Pilih reviewer</option>{reviewers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Prioritas <em>*</em><select name="priority" defaultValue="medium"><option value="low">Rendah</option><option value="medium">Sedang</option><option value="high">Tinggi</option><option value="critical">Kritis</option></select></label>
            <label className="span-two">Catatan Tambahan<textarea name="remarks" rows={3} placeholder="Informasi tambahan (opsional)" /></label>
          </div>
        </section>
      </div>
      <aside className="submission-aside"><section className="panel sla-preview"><div className="eyebrow">PERHITUNGAN OTOMATIS</div><h2>Ringkasan SLA</h2><div className="preview-row"><span>Jenis Dokumen</span><b>{type}</b></div><div className="preview-row"><span>Target SLA</span><b>{selectedType?.sla ?? '—'} hari kalender</b></div><div className="preview-row"><span>Tanggal Pengajuan</span><b>{date}</b></div><div className="preview-due"><span>Deadline</span><strong>{dueDate}</strong></div><p>{loading ? 'Memuat SLA dari master data…' : 'SLA menggunakan hari kalender. Deadline diperbarui otomatis saat jenis dokumen atau tanggal berubah.'}</p></section><div className="form-submit desktop-submit"><button type="button" className="button secondary" disabled={saving || loading} onClick={() => void submit(true)}>Simpan Draft</button><button type="button" className="button primary" disabled={saving || loading} onClick={() => void submit(false)}>{saving ? 'Menyimpan…' : 'Kirim Pengajuan →'}</button></div></aside>
      <div className="form-submit mobile-submit"><button type="button" className="button secondary" disabled={saving || loading} onClick={() => void submit(true)}>Simpan Draft</button><button type="button" className="button primary" disabled={saving || loading} onClick={() => void submit(false)}>{saving ? 'Menyimpan…' : 'Kirim Pengajuan →'}</button></div>
    </form>
  </>;
}
