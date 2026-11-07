# MATRIKS HAK AKSES & PERAN (ROLE-PERMISSION MATRIX)
## APLIKASI QMS MONITOR

**Tanggal Rilis:** 7 November 2026  
**Versi Dokumen:** 1.0  
**Entitas:** PT. Mega Marine Pride & PT. Baramuda Bahari  

---

## 1. Definisi Peran (User Roles)

Sistem QMS Monitor menerapkan sistem kendali akses berbasis peran (Role-Based Access Control / RBAC) yang terdiri atas 4 peran hierarkis:

1. **Administrator (`admin`)**  
   Pengelola sistem utama, bertanggung jawab atas manajemen master data, pembuatan dan penonaktifan akun pengguna, penugasan peran, pemantauan seluruh alur dokumen, dan tindakan korektif administratif.
2. **QMS / Submitter (`qms`)**  
   Personil pelaksana penjaminan mutu di unit kerja yang berwenang membuat pengajuan dokumen mutu baru atau revisi dokumen lama, mengunggah draf lampiran, memperbaiki draf berdasarkan masukan reviewer, dan menutup dokumen yang telah disetujui.
3. **QMS Section Head (`qms_section_head`)**  
   Kepala seksi penjaminan mutu yang bertindak sebagai **Reviewer Tahap 1 (Verifikasi Teknis & Kelengkapan Klausul)**. Berwenang memeriksa kelayakan teknis dokumen, meminta revisi klausul ke pengaju, atau meneruskan dokumen ke QMSR bila telah memenuhi syarat.
4. **QMSR (`qmsr`)**  
   *Quality Management System Representative*, bertindak sebagai **Reviewer Tahap 2 (Otoritas Persetujuan Akhir)**. Berwenang memverifikasi kepatuhan terhadap standar sistem manajemen mutu (ISO/BRCGS/HACCP), memberikan persetujuan final (*approval*), mengembalikan untuk revisi lebih lanjut, atau menolak dokumen.

---

## 2. Matriks Hak Akses Modul & Navigasi

| Modul & Rute Aplikasi | QMS (Submitter) | QMS Section Head | QMSR | Administrator | Catatan Kebijakan Keamanan |
|---|:---:|:---:|:---:|:---:|---|
| **Dashboard Kinerja (`/`)** | ✓ | ✓ | ✓ | ✓ | Tampilan beradaptasi sesuai peran (Pengaju fokus dokumen saya, Reviewer fokus antrian tugas). |
| **Daftar Dokumen Mutu (`/documents`)** | ✓ | ✓ | ✓ | ✓ | Dokumen draf pribadi hanya dapat dilihat oleh pembuat dan Admin. |
| **Pengajuan Baru (`/new`)** | ✓ | ✗ | ✗ | ✓ | Hanya Pengaju dan Admin yang berwenang mengajukan dokumen awal. |
| **Detail Dokumen (`/documents/[id]`)** | ✓ | ✓ | ✓ | ✓ | Hak akses tombol alur kerja dibatasi secara ketat di backend. |
| **Pelacakan Dokumen (`/tracking`)** | ✓ | ✓ | ✓ | ✓ | Transparan untuk seluruh pengguna terotentikasi. |
| **Antrian Review (`/actions`)** | ✓ | ✓ | ✓ | ✓ | Menampilkan grup antrian sesuai tahapan wewenang masing-masing peran. |
| **Riwayat Aktivitas (`/history`)** | ✓ | ✓ | ✓ | ✓ | Catatan audit trail permanen (*append-only*). |
| **Analitik Mutu (`/analytics`)** | ✓ | ✓ | ✓ | ✓ | Akses data statistik performa kedua perusahaan. |
| **Master Data (`/master-data`)** | ✗ | ✗ | ✗ | ✓ | **Khusus Administrator**. Dilindungi server-side middleware proxy & database RLS. |

---

## 3. Matriks Transisi Status Alur Kerja (Workflow State Transitions)

Berikut adalah kewenangan pengubahan status dokumen pada siklus hidup mutu:

| Status Asal (*From*) | Status Tujuan (*To*) | QMS | Section Head | QMSR | Admin | Aturan & Validasi Bisnis |
|---|---|:---:|:---:|:---:|:---:|---|
| `draft` | `submitted` | **✓** | ✗ | ✗ | **✓** | Draf diajukan resmi ke antrian review Tahap 1. Reviewer QMSR wajib dipilih. |
| `submitted` / `resubmitted` | `under_review` | ✗ | **✓** | ✗ | **✓** | Section Head menyatakan mulai meninjau kelayakan berkas secara teknis. |
| `under_review` | `qmsr_review` | ✗ | **✓** | ✗ | **✓** | Dokumen dinyatakan lengkap secara teknis dan diteruskan ke meja QMSR. |
| `under_review` | `need_revision` | ✗ | **✓** | ✗ | **✓** | Section Head menemukan klausul belum lengkap. **Catatan review wajib diisi**. |
| `qmsr_review` | `approved` | ✗ | ✗ | **✓** | **✓** | **Persetujuan Mutu Final**. Tanggal approval tercatat otomatis secara permanen. |
| `qmsr_review` | `need_revision` | ✗ | ✗ | **✓** | **✓** | QMSR meminta penyempurnaan klausul lebih lanjut. **Catatan review wajib diisi**. |
| `qmsr_review` | `rejected` | ✗ | ✗ | **✓** | **✓** | Dokumen ditolak definitif. **Alasan penolakan wajib dicatat**. |
| `need_revision` | `resubmitted` | **✓** | ✗ | ✗ | **✓** | Pengaju mengunggah revisi dan mengajukan kembali ke Section Head. |
| `approved` | `closed` | **✓** | ✗ | ✗ | **✓** | Dokumen yang telah disetujui ditutup siklusnya oleh Pengaju setelah didistribusikan. |

---

## 4. Matriks Operasi Data & Fitur Pendukung

| Operasi Data & Fitur | QMS (Submitter) | QMS Section Head | QMSR | Administrator | Keterangan & Batasan |
|---|:---:|:---:|:---:|:---:|---|
| **Unggah Lampiran Awal (Form Pengajuan)** | ✓ | ✗ | ✗ | ✓ | Format didukung: PDF, DOCX, XLSX. Maksimal 10MB per berkas. |
| **Unggah Lampiran Revisi (Halaman Detail)** | ✓ | ✓ | ✓ | ✓ | Diunggah langsung ke storage bucket aman `qms-attachments`. |
| **Unduh Berkas Lampiran** | ✓ | ✓ | ✓ | ✓ | URL unduh bertanda tangan (*signed URL*) berbatas waktu kedaluwarsa. |
| **Edit Metadata Dokumen** | Kondisional* | ✗ | ✗ | ✓ | *Hanya saat status dokumen `draft` atau `need_revision`, dan pembuat dokumen adalah user aktif. |
| **Tambah Catatan Follow-Up** | ✓ | ✓ | ✓ | ✓ | Membantu koordinasi lintas unit kerja tanpa mengubah status resmi dokumen. |
| **Ekspor Data Excel (.xlsx)** | ✓ | ✓ | ✓ | ✓ | Menghasilkan spreadsheet lengkap terfilter sesuai entitas aktif. |
| **Ekspor Data CSV** | ✓ | ✓ | ✓ | ✓ | Format teks delimit koma berstandar internasional UTF-8. |
| **Cetak Dokumen / Simpan PDF** | ✓ | ✓ | ✓ | ✓ | Tampilan cetak resmi A4 portrait bersih dari elemen menu dan navigasi. |
| **Hapus / Arsipkan Dokumen Aktif** | ✗ | ✗ | ✗ | ✓ | **Khusus Admin**. Dokumen diarsipkan secara non-destruktif (`archive_document` RPC). |
| **Buat Akun Pengguna Baru** | ✗ | ✗ | ✗ | ✓ | Menginput nama, email, password awal, dan penugasan peran. |
| **Nonaktifkan / Aktifkan Akun** | ✗ | ✗ | ✗ | ✓ | Membatalkan hak login personil yang mutasi atau purnatugas. |
| **Kelola Departemen & Jenis Dokumen** | ✗ | ✗ | ✗ | ✓ | Penambahan, pengubahan nama, dan penentuan SLA standar hari kerja. |

---

## 5. Ringkasan Prinsip Keamanan Sistem

1. **Prinsip Hak Akses Terkecil (Principle of Least Privilege):**  
   Pengguna hanya diberikan wewenang yang mutlak diperlukan untuk menyelesaikan tugas mutunya.
2. **Pemisahan Tugas (Segregation of Duties):**  
   Pengaju dokumen (`qms`) tidak dapat menyetujui dokumen miliknya sendiri. Reviewer Tahap 1 (`qms_section_head`) tidak dapat memberikan persetujuan final yang merupakan wewenang mutlak QMSR (`qmsr`).
3. **Integritas Audit Trail:**  
   Setiap perubahan status dan input catatan review dicatat secara otomatis bersama identitas aktor, peran, dan cap waktu (*timestamp*) Asia/Jakarta yang tidak dapat diubah kembali (*immutable*).

