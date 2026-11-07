'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  calculateBusinessDueDate,
  companies,
  defaultCompany,
  demoSubmissions,
  formatRemarksWithCompany,
  getPriorityAdjustedSla,
  todayISO,
  type Company,
  type Condition,
  type Priority,
  type Submission
} from '@/lib/qms';
import { uploadAttachment } from '@/lib/qms-data';
import { PageHeading } from '@/components/ui';
import { useQmsData } from '@/components/qms-data-provider';
import { getSupabaseBrowserClient, isDemoMode } from '@/lib/supabase/client';

export default function NewSubmission() {
  const router = useRouter();
  const { departments, documentTypes, reviewers, reload, loading } = useQmsData();

  const [company, setCompany] = useState<Company>(defaultCompany);
  const [condition, setCondition] = useState<Condition>('new');
  const [type, setType] = useState('Form');
  const [date, setDate] = useState(todayISO());
  const [priority, setPriority] = useState<Priority>('medium');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedType = documentTypes.find(item => item.name === type) || documentTypes[0];
  const targetWorkingDays = selectedType ? getPriorityAdjustedSla(selectedType.sla, priority) : 3;
  const dueDate = selectedType ? calculateBusinessDueDate(date, selectedType.sla, priority) : date;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10485760) {
        setError('Ukuran file maksimal adalah 10MB.');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const submit = async (asDraft: boolean) => {
    const form = document.querySelector('form') as HTMLFormElement;
    if (!form.reportValidity()) return;

    const values = new FormData(form);
    const reason = String(values.get('reason') || '');
    const reviewerId = String(values.get('reviewer') || '');
    const rawRemarks = String(values.get('remarks') || '');

    if (condition === 'existing' && !reason.trim()) {
      setError('Alasan perubahan wajib diisi untuk dokumen lama.');
      return;
    }
    if (!asDraft && !reviewerId) {
      setError('Pilih reviewer QMSR sebelum mengirim pengajuan.');
      return;
    }

    setError('');
    setSaving(true);

    try {
      const status = asDraft ? 'draft' : 'submitted';
      const formattedRemarks = formatRemarksWithCompany(company, rawRemarks);

      if (isDemoMode) {
        const index = demoSubmissions.length + 1;
        const newDocId = `demo-${index}`;
        const doc: Submission = {
          id: newDocId,
          number: `QMS-${date.slice(0, 4)}-${String(index).padStart(4, '0')}`,
          requested: date,
          condition,
          company,
          department: String(values.get('department')),
          type,
          docNo: String(values.get('docNo')),
          title: String(values.get('title')),
          revision: String(values.get('revision')),
          reason,
          pic: String(values.get('pic')),
          reviewer: reviewers.find(item => item.id === reviewerId)?.name || 'Junita Dwi Lia H.',
          reviewerId,
          priority,
          sla: targetWorkingDays,
          due: dueDate,
          status,
          remarks: formattedRemarks,
          history: [
            {
              action: asDraft ? 'Draft disimpan' : 'Pengajuan Awal',
              actor: 'Rosalia Pratiwi',
              at: `${date}T08:30:00+07:00`,
              role: 'QMS'
            }
          ],
          followups: [],
          attachments: selectedFile
            ? [
                {
                  id: `att-demo-${Date.now()}`,
                  documentId: newDocId,
                  fileName: selectedFile.name,
                  storagePath: `demo/${selectedFile.name}`,
                  fileType: selectedFile.type || 'application/pdf',
                  fileSize: selectedFile.size,
                  uploadedByName: 'Rosalia Pratiwi',
                  createdAt: `${date}T08:30:00+07:00`
                }
              ]
            : []
        };

        demoSubmissions.unshift(doc);
        await reload();
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

      if (departmentRow.error || typeRow.error) {
        throw new Error('Master data departemen atau jenis dokumen belum lengkap.');
      }

      let activeReviewerId: string | null = null;
      if (reviewerId) {
        const reviewer = await client.from('reviewers').select('id').eq('id', reviewerId).eq('is_active', true).maybeSingle();
        if (reviewer.error || !reviewer.data) {
          throw new Error('Reviewer belum terdaftar sebagai reviewer aktif.');
        }
        activeReviewerId = reviewer.data.id;
      }

      // Generate submission number: QMS-YYYY-XXXX
      const currentYear = date.slice(0, 4);
      const prefix = `QMS-${currentYear}-`;
      const { data: lastSubmission } = await client
        .from('document_submissions')
        .select('submission_number')
        .like('submission_number', `${prefix}%`)
        .order('submission_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextSeq = 1;
      if (lastSubmission?.submission_number) {
        const parts = lastSubmission.submission_number.split('-');
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) nextSeq = lastNum + 1;
      }
      const submissionNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;

      // Insert submission record
      const created = await client.from('document_submissions').insert({
        submission_number: submissionNumber,
        request_date: date,
        document_condition: condition,
        department_id: departmentRow.data.id,
        document_type_id: typeRow.data.id,
        document_number: String(values.get('docNo')).trim(),
        document_title: String(values.get('title')).trim(),
        revision: String(values.get('revision')).trim(),
        change_reason: reason.trim(),
        requestor_name: String(values.get('pic')).trim() || user.user_metadata?.full_name || 'Pengguna QMS',
        reviewer_id: activeReviewerId,
        priority,
        sla_days: targetWorkingDays,
        due_date: dueDate,
        status,
        remarks: formattedRemarks,
        created_by: user.id,
      }).select('id').single();

      if (created.error) throw created.error;
      const createdId = created.data.id;

      // Upload attachment if provided
      if (selectedFile) {
        try {
          await uploadAttachment(client, createdId, selectedFile, user.id);
        } catch (attErr) {
          console.error('Attachment upload error:', attErr);
          // Don't fail the entire submission if attachment upload had an issue
        }
      }

      await reload();
      router.push(`/documents/${createdId}?created=1`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Pengajuan gagal disimpan. Periksa kembali data dan akses Anda.'
      );
      setSaving(false);
    }
  };

  return (
    <>
      <div className="detail-back">
        <Link href="/">← Kembali ke dashboard</Link>
      </div>

      <PageHeading
        eyebrow="PENGAJUAN DOKUMEN SISTEM MUTU"
        title="Buat Pengajuan Dokumen Baru"
        description="Lengkapi informasi dokumen, pilih entitas perusahaan, dan lampirkan berkas untuk memulai alur review QMS."
      />

      {error && <div className="panel data-error form-error" role="alert">{error}</div>}

      <form className="submission-layout" onSubmit={event => event.preventDefault()}>
        <div className="submission-main">
          {/* Section 01: Entitas & Informasi Dokumen */}
          <section className="panel form-panel">
            <div className="form-section-head">
              <span className="form-step">01</span>
              <div>
                <h2>Entitas & Informasi Dokumen</h2>
                <p>Pilih perusahaan yang menerbitkan dokumen dan spesifikasi teknisnya.</p>
              </div>
            </div>

            <div className="form-grid">
              <label className="span-two">
                Entitas Perusahaan <em>*</em>
                <select
                  value={company}
                  onChange={e => setCompany(e.target.value as Company)}
                  className="company-select-field"
                  required
                >
                  {companies.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>

              <label>
                Tanggal Pengajuan <em>*</em>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={event => setDate(event.target.value)}
                />
              </label>

              <label>
                Status Dokumen <em>*</em>
                <select
                  value={condition}
                  onChange={event => setCondition(event.target.value as Condition)}
                >
                  <option value="new">Dokumen Baru</option>
                  <option value="existing">Dokumen Lama (Revisi/Pembaruan)</option>
                </select>
              </label>

              <label>
                Departemen Pemilik <em>*</em>
                <select required name="department" defaultValue="">
                  <option value="" disabled>Pilih departemen</option>
                  {departments.map(item => (
                    <option key={item.id} value={item.name}>{item.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Jenis Dokumen <em>*</em>
                <select
                  required
                  value={type}
                  onChange={event => setType(event.target.value)}
                >
                  {documentTypes.map(item => (
                    <option key={item.id} value={item.name}>{item.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Nomor Dokumen <em>*</em>
                <input required name="docNo" placeholder="Contoh: SOP/IT/2026/042" />
              </label>

              <label>
                Revisi <em>*</em>
                <input required name="revision" placeholder="Contoh: Rev 00 atau A.1" />
              </label>

              <label className="span-two">
                Judul Dokumen Mutu <em>*</em>
                <input required name="title" placeholder="Masukkan judul lengkap dokumen..." />
              </label>

              <label className="span-two change-reason">
                Alasan Perubahan {condition === 'existing' && <em>* Wajib untuk dokumen lama</em>}
                <textarea
                  name="reason"
                  rows={3}
                  required={condition === 'existing'}
                  placeholder={
                    condition === 'existing'
                      ? 'Jelaskan alasan perubahan klausul dokumen secara rinci...'
                      : 'Contoh: Penerbitan dokumen baru untuk standardisasi operasional.'
                  }
                />
              </label>
            </div>
          </section>

          {/* Section 02: Penanggung Jawab & Lampiran */}
          <section className="panel form-panel">
            <div className="form-section-head">
              <span className="form-step">02</span>
              <div>
                <h2>Penanggung Jawab & Berkas Lampiran</h2>
                <p>PIC dokumen, reviewer QMSR yang ditugaskan, dan upload berkas dokumen.</p>
              </div>
            </div>

            <div className="form-grid">
              <label>
                Nama PIC / Requestor
                <input name="pic" placeholder="Nama PIC dokumen (opsional)" />
              </label>

              <label>
                Reviewer QMSR Ditugaskan <em>*</em>
                <select name="reviewer" defaultValue="" required>
                  <option value="">Pilih reviewer QMSR</option>
                  {reviewers.map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Prioritas Dokumen <em>*</em>
                <select
                  name="priority"
                  value={priority}
                  onChange={e => setPriority(e.target.value as Priority)}
                >
                  <option value="low">Rendah (SLA +1 hari)</option>
                  <option value="medium">Sedang (Standar)</option>
                  <option value="high">Tinggi (SLA -1 hari)</option>
                  <option value="critical">Kritis (SLA Prioritas Cepat)</option>
                </select>
              </label>

              <label className="span-two">
                Unggah Dokumen Lampiran (PDF / Word / Excel, maks. 10MB)
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="file-upload-input"
                />
                {selectedFile && (
                  <small className="file-info-badge">
                    ✓ Berkas terpilih: <b>{selectedFile.name}</b> ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </small>
                )}
              </label>

              <label className="span-two">
                Catatan Tambahan untuk Reviewer
                <textarea name="remarks" rows={2} placeholder="Informasi pendukung atau catatan khusus (opsional)" />
              </label>
            </div>
          </section>
        </div>

        {/* Aside Summary & Submission Buttons */}
        <aside className="submission-aside">
          <section className="panel sla-preview">
            <div className="eyebrow">PERHITUNGAN REAL-TIME</div>
            <h2>Ringkasan SLA & Target</h2>

            <div className="preview-row">
              <span>Perusahaan</span>
              <b>{company}</b>
            </div>
            <div className="preview-row">
              <span>Jenis Dokumen</span>
              <b>{type}</b>
            </div>
            <div className="preview-row">
              <span>Prioritas</span>
              <b>{priority.toUpperCase()}</b>
            </div>
            <div className="preview-row">
              <span>Target Waktu SLA</span>
              <b>{targetWorkingDays} Hari Kerja</b>
            </div>
            <div className="preview-row">
              <span>Tanggal Pengajuan</span>
              <b>{date}</b>
            </div>
            <div className="preview-due">
              <span>Batas Deadline (17:00 WIB)</span>
              <strong>{dueDate}</strong>
            </div>

            <p>
              {loading
                ? 'Memuat master data…'
                : 'SLA dihitung otomatis berdasarkan hari kerja Asia/Jakarta (Senin–Jumat), mengecualikan libur nasional resmi.'}
            </p>
          </section>

          <div className="form-submit desktop-submit">
            <button
              type="button"
              className="button secondary"
              disabled={saving || loading}
              onClick={() => void submit(true)}
            >
              Simpan Draft
            </button>
            <button
              type="button"
              className="button primary"
              disabled={saving || loading}
              onClick={() => void submit(false)}
            >
              {saving ? 'Mengirim…' : 'Kirim Pengajuan →'}
            </button>
          </div>
        </aside>

        <div className="form-submit mobile-submit">
          <button
            type="button"
            className="button secondary"
            disabled={saving || loading}
            onClick={() => void submit(true)}
          >
            Simpan Draft
          </button>
          <button
            type="button"
            className="button primary"
            disabled={saving || loading}
            onClick={() => void submit(false)}
          >
            {saving ? 'Mengirim…' : 'Kirim Pengajuan →'}
          </button>
        </div>
      </form>
    </>
  );
}
