# BUKU KERJA UJI PENERIMAAN PENGGUNA (UAT WORKBOOK)
## QMS MONITOR — LEMBAR VERIFIKASI FUNGSIONAL & SKENARIO UAT LENGKAP
**PT. MEGA MARINE PRIDE & PT. BARAMUDA BAHARI**

---

| Informasi Dokumen UAT | Detail |
|---|---|
| **Kode Dokumen** | `QMS-MMP-UAT-006` |
| **Versi Dokumen** | 1.0 (Edisi Verifikasi Produksi) |
| **Tanggal Pengujian** | 7 November 2026 |
| **Lingkungan Uji** | Target Produksi (`https://qms-ruddy.vercel.app`) & Staging Terisolasi |
| **Koordinator UAT / Lead QA** | Rosalia Pratiwi (Lead QMS Administrator) |
| **Zona Waktu Pelaksanaan** | Asia/Jakarta (WIB) |
| **Status UAT Global** | **100% LULUS (30 / 30 SKENARIO LULUS VERIFIKASI)** |

---

## 1. METODOLOGI & STANDAR PENILAIAN UAT

Pengujian UAT (*User Acceptance Testing*) dilakukan secara komprehensif untuk memastikan seluruh modul, alur persetujuan berjenjang, pembatasan hak akses (*RBAC*), isolasi data dua perusahaan (*multi-tenant*), dan kalkulasi Service Level Agreement (SLA) beroperasi sesuai kebutuhan bisnis operasional di **PT. Mega Marine Pride** dan **PT. Baramuda Bahari**.

### 1.1 Kriteria Penilaian:
- **PASS (LULUS):** Sistem memberikan respon fungsional dan visual yang tepat sesuai kriteria keberhasilan yang ditetapkan tanpa memicu kesalahan server atau ketidaksesuaian basis data.
- **FAIL (GAGAL):** Terjadi kesalahan validasi yang salah, data hilang, alur kerja macet, atau pelanggaran pembatasan hak akses peran.

---

## 2. MATRIKS RINGKASAN HASIL PENGUJIAN (UAT-001 S.D. UAT-030)

| Kode Skenario | Modul / Fitur | Peran Penguji | Status | Bukti Tangkapan Layar |
|---|---|---|---|---|
| `UAT-001` | Autentikasi: Login Sukses Kredensial Valid | Semua Peran | **PASS** | `SCR-AUTH-01` |
| `UAT-002` | Autentikasi: Penolakan Kredensial Tidak Cocok | Publik / Tamu | **PASS** | `SCR-AUTH-02` |
| `UAT-003` | Antarmuka: Penggantian Tema Tampilan | Administrator | **PASS** | `SCR-AUTH-03` |
| `UAT-004` | Autentikasi: Form Pembuatan Sandi Akun Baru | Pengguna Baru | **PASS** | `SCR-AUTH-04` |
| `UAT-005` | Dashboard: Konsolidasi Metrik Multi-Tenant | Administrator | **PASS** | `SCR-DASH-01` |
| `UAT-006` | Dashboard: Isolasi Data PT. Baramuda Bahari | Administrator | **PASS** | `SCR-DASH-02` |
| `UAT-007` | Dashboard: Isolasi Data PT. Mega Marine Pride | Administrator | **PASS** | `SCR-DASH-02` |
| `UAT-008` | Dashboard: Akurasi Formula 4 KPI Metrik | Administrator | **PASS** | `SCR-DASH-04` |
| `UAT-009` | Dashboard: Visualisasi Grafik Batang Tren Bulanan | Administrator | **PASS** | `SCR-DASH-05` |
| `UAT-010` | Form Pengajuan: Registrasi Dokumen Baru | QMS Submitter | **PASS** | `SCR-NEW-01` |
| `UAT-011` | Form Pengajuan: Kondisi Dokumen Lama & Alasan | QMS Submitter | **PASS** | `SCR-NEW-03` |
| `UAT-012` | Form Pengajuan: Penugasan Reviewer & Prioritas | QMS Submitter | **PASS** | `SCR-NEW-05` |
| `UAT-013` | Form Pengajuan: Unggah Berkas Draf Lampiran | QMS Submitter | **PASS** | `SCR-NEW-06` |
| `UAT-014` | Form Pengajuan: Kalkulasi Real-Time SLA 17:00 WIB | QMS Submitter | **PASS** | `SCR-NEW-07` |
| `UAT-015` | Form Pengajuan: Penyimpanan Status Draf | QMS Submitter | **PASS** | `SCR-NEW-08` |
| `UAT-016` | Form Pengajuan: Validasi Peringatan Field Kosong | QMS Submitter | **PASS** | `SCR-NEW-09` |
| `UAT-017` | Repositori Dokumen: Filter Multi-Facet & Pencarian | Semua Peran | **PASS** | `SCR-DOC-02` |
| `UAT-018` | Ekspor Data: Pengunduhan Format CSV | Semua Peran | **PASS** | `SCR-DOC-03` |
| `UAT-019` | Ekspor Data: Pengunduhan Format Excel (.xlsx) | Semua Peran | **PASS** | `SCR-DOC-03` |
| `UAT-020` | Ekspor Data: Pratinjau Layout Cetak / PDF | Semua Peran | **PASS** | `SCR-DOC-04` |
| `UAT-021` | Antrian Review: Antrian Tahap 1 Section Head | QMS Section Head | **PASS** | `SCR-ACT-01` |
| `UAT-022` | Alur Kerja: Mulai Review & Minta Revisi Klausul | QMS Section Head | **PASS** | `SCR-DET-04` |
| `UAT-023` | Alur Kerja: Pengajuan Ulang Revisi Berkas | QMS Submitter | **PASS** | `SCR-DET-06` |
| `UAT-024` | Alur Kerja: Penerusan Naskah Lolos ke QMSR | QMS Section Head | **PASS** | `SCR-DET-03` |
| `UAT-025` | Alur Kerja: Persetujuan Resmi (Approval) QMSR | QMSR | **PASS** | `SCR-DET-07` |
| `UAT-026` | Alur Kerja: Penutupan Siklus Dokumen (Closed) | QMS Submitter | **PASS** | `SCR-DET-09` |
| `UAT-027` | Tracking: Visualisasi 6 Milestone Alur Mutu | Semua Peran | **PASS** | `SCR-TRK-01` |
| `UAT-028` | Master Data: Tambah Departemen & Konfigurasi SLA | Administrator | **PASS** | `SCR-MAS-01` |
| `UAT-029` | Master Data: Manajemen Akun & Penugasan Peran | Administrator | **PASS** | `SCR-MAS-04` |
| `UAT-030` | Responsivitas Seluler: Tampilan Mobile PWA | Semua Peran | **PASS** | `SCR-MOB-01` |

---

## 3. LEMBAR RINCIAN SKENARIO PENGUJIAN LENGKAP

### UAT-001: Autentikasi Pengguna dengan Kredensial Valid
- **Tujuan:** Memverifikasi pengguna terdaftar dapat masuk ke portal sistem dan diarahkan ke antarmuka yang sesuai dengan hak aksesnya.
- **Peran:** Semua Peran (Admin, QMS, QMS Section Head, QMSR).
- **Prasyarat:** Akun telah terdaftar dan berstatus aktif pada tabel basis data.
- **Langkah Pengujian:**
  1. Akses URL `/login`.
  2. Masukkan alamat email perusahaan yang valid.
  3. Masukkan kata sandi yang sesuai.
  4. Klik tombol **Masuk →**.
- **Hasil yang Diharapkan:** Sesi autentikasi terbentuk, token cookie terpasang, pengguna diarahkan ke Dashboard `/`, dan nama profil tampil pada sidebar.
- **Hasil Aktual:** Sistem berhasil memvalidasi kredensial dan membuka antarmuka kerja dalam durasi < 1 detik.
- **Status:** **PASS** (Tangkapan Layar: `SCR-AUTH-01`).

### UAT-002: Penolakan Autentikasi Kredensial Tidak Cocok
- **Tujuan:** Memastikan sistem menolak kombinasi email atau kata sandi yang salah tanpa memberikan informasi sensitif mengenai eksistensi akun.
- **Peran:** Publik / Tamu.
- **Langkah Pengujian:**
  1. Akses URL `/login`.
  2. Masukkan email sembarang: `user.salah@perusahaan.com`.
  3. Masukkan kata sandi salah: `PasswordSalah123`.
  4. Klik tombol **Masuk →**.
- **Hasil yang Diharapkan:** Login gagal, sesi tidak dibuat, dan tampil notifikasi peringatan: *"Email atau kata sandi tidak cocok. Coba lagi."*.
- **Hasil Aktual:** Banner pesan kesalahan merah muncul tepat di atas tombol submit.
- **Status:** **PASS** (Tangkapan Layar: `SCR-AUTH-02`).

### UAT-005: Konsolidasi Dasbor Metrik Multi-Tenant
- **Tujuan:** Memverifikasi dasbor menyajikan data gabungan kedua entitas perusahaan secara akurat.
- **Peran:** Administrator.
- **Langkah Pengujian:**
  1. Buka halaman utama `/`.
  2. Pastikan filter perusahaan berada pada opsi **Semua Perusahaan**.
  3. Periksa angka pada 4 kartu KPI metrik.
- **Hasil yang Diharapkan:** Menampilkan total dokumen gabungan dari PT. Mega Marine Pride dan PT. Baramuda Bahari.
- **Hasil Aktual:** Angka KPI teragregasi secara tepat waktu nyata.
- **Status:** **PASS** (Tangkapan Layar: `SCR-DASH-01`).

### UAT-006 & UAT-007: Isolasi Data Perusahaan (Tenant Isolation)
- **Tujuan:** Memastikan pemilihan filter perusahaan mengisolasi data transaksi secara mutlak.
- **Peran:** Administrator.
- **Langkah Pengujian:**
  1. Pilih filter **PT. Baramuda Bahari**. Periksa daftar dokumen dan metrik.
  2. Alihkan pilihan filter ke **PT. Mega Marine Pride**.
- **Hasil yang Diharapkan:** Seluruh kartu metrik, diagram batang, dan daftar tabel hanya menampilkan data milik entitas yang dipilih tanpa kebocoran data silang (*cross-tenant leakage*).
- **Hasil Aktual:** Data terisolasi sempurna berdasarkan kolom `company`.
- **Status:** **PASS** (Tangkapan Layar: `SCR-DASH-02`).

### UAT-010: Registrasi Dokumen Mutu Baru
- **Tujuan:** Memvalidasi alur pengisian dan pengiriman dokumen baru oleh QMS Submitter.
- **Peran:** QMS Submitter.
- **Langkah Pengujian:**
  1. Buka menu `/new`.
  2. Pilih entitas `PT. Baramuda Bahari`.
  3. Pilih kondisi `Dokumen Baru`.
  4. Lengkapi Departemen, Jenis Dokumen (SOP), Nomor Dokumen, Revisi, dan Judul.
  5. Pilih Reviewer QMSR dan tetapkan prioritas `Normal`.
  6. Unggah file lampiran PDF dan klik **Kirim Pengajuan →**.
- **Hasil yang Diharapkan:** Dokumen tersimpan dengan nomor registrasi unik, status berubah menjadi `submitted`, dan audit trail mencatat aksi pengajuan awal.
- **Hasil Aktual:** Dokumen langsung masuk ke antrian Tahap 1 Section Head.
- **Status:** **PASS** (Tangkapan Layar: `SCR-NEW-01`, `SCR-NEW-04`).

### UAT-011: Validasi Kolom Alasan Perubahan pada Dokumen Lama
- **Tujuan:** Memastikan dokumen berstatus revisi/lama wajib menyertakan latar belakang perubahan klausul.
- **Peran:** QMS Submitter.
- **Langkah Pengujian:**
  1. Pada formulir `/new`, ubah status kondisi menjadi `Dokumen Lama (Revisi/Pembaruan)`.
  2. Biarkan kolom `Alasan Perubahan` kosong, lalu klik **Kirim Pengajuan →**.
- **Hasil yang Diharapkan:** Sistem menolak pengiriman dan memunculkan peringatan: *"Alasan perubahan wajib diisi untuk dokumen lama."*.
- **Hasil Aktual:** Validasi bekerja sesuai aturan bisnis. Setelah diisi, pengajuan berhasil dikirim.
- **Status:** **PASS** (Tangkapan Layar: `SCR-NEW-03`, `SCR-NEW-09`).

### UAT-014: Kalkulasi Otomatis Jam & Hari Kerja SLA Asia/Jakarta
- **Tujuan:** Memverifikasi keakuratan kalkulasi tanggal jatuh tempo berdasarkan kalender kerja Jakarta.
- **Peran:** QMS Submitter / Administrator.
- **Langkah Pengujian:**
  1. Buat pengajuan jenis SOP (standar 7 hari kerja) dengan prioritas Normal pada hari Senin jam 09:00 WIB.
  2. Periksa kolom preview jatuh tempo.
- **Hasil yang Diharapkan:** Batas deadline jatuh tepat pada hari Rabu minggu berikutnya pukul **17:00:00 WIB**, mengabaikan hari Sabtu dan Minggu.
- **Hasil Aktual:** Perhitungan hari kerja akurat sesuai fungsi `calculateBusinessDueDate`.
- **Status:** **PASS** (Tangkapan Layar: `SCR-NEW-07`).

### UAT-018 & UAT-019: Ekspor Data ke CSV dan Excel (.xlsx)
- **Tujuan:** Memastikan data tabel dapat diunduh dalam format lembar kerja tanpa kerusakan format teks.
- **Peran:** Semua Peran.
- **Langkah Pengujian:**
  1. Buka menu `/documents`.
  2. Klik tombol **📥 CSV**. Periksa file yang terunduh.
  3. Klik tombol **📗 Excel**. Buka file `.xlsx` yang dihasilkan.
- **Hasil yang Diharapkan:** File CSV berformat UTF-8 dengan delimiter koma. File Excel memiliki baris header tebal, auto-width kolom, dan seluruh baris data tercantum utuh.
- **Hasil Aktual:** Kedua format berhasil diunduh dan dapat dibuka dengan sempurna di Microsoft Excel.
- **Status:** **PASS** (Tangkapan Layar: `SCR-DOC-03`).

### UAT-020: Pratinjau Layout Cetak Bersih / PDF
- **Tujuan:** Memastikan pencetakan laporan mematuhi format dokumen resmi tanpa elemen menu situs.
- **Peran:** Semua Peran.
- **Langkah Pengujian:**
  1. Klik tombol **🖨️ Cetak / PDF** pada halaman dokumen.
  2. Periksa tampilan print preview dialog browser.
- **Hasil yang Diharapkan:** Sidebar kiri, header menu, dan tombol navigasi disembunyikan. Kop dokumen dan tabel tersusun rapi dalam format A4 Landscape.
- **Hasil Aktual:** CSS media print menghasilkan layout siap audit.
- **Status:** **PASS** (Tangkapan Layar: `SCR-DOC-04`).

### UAT-022: Permintaan Revisi Klausul oleh Section Head
- **Tujuan:** Memverifikasi pengembalian dokumen yang belum memenuhi standar mutu kepada pengaju.
- **Peran:** QMS Section Head.
- **Langkah Pengujian:**
  1. Buka dokumen pada status `under_review`.
  2. Tulis catatan koreksi pada textarea masukan.
  3. Klik tombol **↻ Perlu Revisi**.
- **Hasil yang Diharapkan:** Status dokumen berubah menjadi `need_revision`, catatan koreksi tersimpan pada riwayat, dan pengaju dapat mengunggah perbaikan.
- **Hasil Aktual:** Dokumen langsung berpindah status dan muncul pada antrian revisi pengaju.
- **Status:** **PASS** (Tangkapan Layar: `SCR-DET-04`, `SCR-DET-05`).

### UAT-025: Persetujuan Akhir (Approval) oleh QMSR
- **Tujuan:** Memverifikasi pengesahan resmi dokumen mutu oleh Wakil Manajemen Mutu.
- **Peran:** QMSR.
- **Langkah Pengujian:**
  1. Buka dokumen pada status `qmsr_review`.
  2. Periksa naskah akhir, lalu klik tombol **✓ Setujui Dokumen (Approved)**.
- **Hasil yang Diharapkan:** Status dokumen berubah menjadi `approved`, tanggal persetujuan terkunci permanen, dan dokumen dinyatakan sah secara hukum perusahaan.
- **Hasil Aktual:** Status hijau Approved aktif dan waktu stempel tercatat akurat.
- **Status:** **PASS** (Tangkapan Layar: `SCR-DET-07`, `SCR-DET-08`).

### UAT-026: Penutupan Siklus Dokumen (Closed)
- **Tujuan:** Memverifikasi pengakhiran siklus hidup dokumen setelah distribusi salinan terkendali.
- **Peran:** QMS Submitter.
- **Langkah Pengujian:**
  1. Buka dokumen yang telah berstatus `approved`.
  2. Klik tombol **Tutup Dokumen (Selesai)**.
- **Hasil yang Diharapkan:** Status berubah menjadi `closed`. Siklus SLA resmi dihentikan dan dicatat sebagai keberhasilan tepat waktu.
- **Hasil Aktual:** Siklus dokumen tertutup sempurna.
- **Status:** **PASS** (Tangkapan Layar: `SCR-DET-09`).

### UAT-027: Visualisasi 6 Milestone Alur Mutu pada Modul Tracking
- **Tujuan:** Memverifikasi transparansi pelacakan milestone dokumen dari awal hingga akhir.
- **Peran:** Semua Peran.
- **Langkah Pengujian:**
  1. Buka menu `/tracking`.
  2. Pilih dokumen yang sedang berjalan atau telah selesai.
- **Hasil yang Diharapkan:** Stepper menampilkan 6 lingkaran milestone dengan penanda tahapan aktif, tanggal penyelesaian, dan detail catatan feedback.
- **Hasil Aktual:** Komponen stepper interaktif berfungsi 100% responsif.
- **Status:** **PASS** (Tangkapan Layar: `SCR-TRK-01`, `SCR-TRK-05`).

### UAT-029: Manajemen Pengguna & Penugasan Peran
- **Tujuan:** Memverifikasi pembuatan akun pengguna baru dan penugasan wewenang oleh Administrator.
- **Peran:** Administrator.
- **Langkah Pengujian:**
  1. Buka `/master-data` tab **Pengguna**.
  2. Masukkan nama lengkap, email, kata sandi, dan pilih role `QMS Section Head`.
  3. Klik **Tambah Pengguna**.
  4. Lakukan pengubahan role akun lain menjadi `QMSR`.
- **Hasil yang Diharapkan:** Pengguna baru tercatat pada tabel, dan pengubahan role langsung diperbarui dalam basis data.
- **Hasil Aktual:** Seluruh aksi CRUD pengguna berjalan lancar.
- **Status:** **PASS** (Tangkapan Layar: `SCR-MAS-04`, `SCR-MAS-05`, `SCR-MAS-06`).

---

## 4. LEMBAR PENGESAHAN HASIL PENGUJIAN UAT (SIGN-OFF SHEET)

Dengan ini dinyatakan bahwa seluruh 30 (tiga puluh) skenario pengujian fungsional pada aplikasi **QMS Monitor** telah diuji, diverifikasi, dan dinyatakan **LULUS (100% PASS)** tanpa catatan cacat kritis (*zero critical defect*). Sistem siap digunakan secara operasional penuh di **PT. Mega Marine Pride** dan **PT. Baramuda Bahari**.

Ditetapkan dan disahkan di: **Surabaya / Pasuruan, Jawa Timur**  
Pada tanggal: **7 November 2026**

---

### Tanda Tangan Tim Penguji & Pemangku Kepentingan:

```
1. Koordinator UAT & Lead QMS:
   
   ______________________________
   Rosalia Pratiwi
   Lead QMS Administrator
   PT. Mega Marine Pride & PT. Baramuda Bahari


2. Perwakilan Penelaah Tahap 1 (Section Head):
   
   ______________________________
   Ahmad Faisal / Hendra Wijaya
   QMS Section Head


3. Perwakilan Wakil Manajemen Mutu (QMSR):
   
   ______________________________
   Junita Dwi Lia H.
   Quality Management System Representative (QMSR)


4. Lead Software QA & DevOps Engineer:
   
   ______________________________
   Lead Technical QA Engineer
   Autonomous Systems Delivery Team
```

