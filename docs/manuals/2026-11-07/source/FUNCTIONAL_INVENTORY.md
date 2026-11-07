# INVENTARIS FUNGSIONAL APLIKASI QMS MONITOR

**Tanggal Audit:** 7 November 2026  
**Versi Sistem:** 1.0  
**Lingkungan:** Hybrid (Production https://qms-ruddy.vercel.app & Verified Local Test Environment)  
**Entitas:** PT. Mega Marine Pride & PT. Baramuda Bahari  
**Status Klasifikasi:**
- **VERIFIED:** Fitur diuji secara langsung, bekerja sesuai spesifikasi, dan didukung bukti kode/data.
- **IMPLEMENTED_NOT_UAT_VERIFIED:** Fitur telah terimplementasi dalam kode produksi namun menunggu validasi skenario UAT resmi dari pengguna bisnis.
- **UNAVAILABLE:** Fitur tidak tersedia dalam ruang lingkup aplikasi saat ini.
- **BLOCKED:** Fitur tidak dapat dijalankan karena kendala lingkungan atau prasyarat dependensi luar.

---

## 1. Modul Otentikasi & Akun Pengguna

| ID Fitur | Rute / Komponen | Peran Terkait | Tindakan Pengguna | Input & Validasi | Hasil yang Diharapkan | Status Klasifikasi |
|---|---|---|---|---|---|---|
| AUTH-01 | `/login` | Semua Peran | Masuk ke sistem dengan Email & Kata Sandi | Email valid (format email), Password wajib diisi. Pesan error: "Email atau kata sandi tidak cocok. Coba lagi." | Pengguna diarahkan ke `/` dengan sesi login aktif (SSR cookie). | **VERIFIED** |
| AUTH-02 | `/accept-invite` | Pengguna Baru | Mengatur password awal dari tautan aktivasi | Password minimal 8 karakter, konfirmasi password harus cocok. | Password tersimpan di Supabase Auth, sesi diarahkan ke login. | **IMPLEMENTED_NOT_UAT_VERIFIED** |
| AUTH-03 | Sidebar / Header | Semua Peran | Keluar (Logout) dari aplikasi | Tombol logout di menu samping / navigasi mobile. | Sesi otentikasi dihapus dan diarahkan kembali ke `/login`. | **VERIFIED** |
| AUTH-04 | Sidebar / Footer | Semua Peran | Mengganti tema (Terang / Gelap / Sistem) | Menu pilihan tema di pojok bawah sidebar. | Atribut `data-theme` dan `data-color-scheme` berubah seketika tanpa reload. | **VERIFIED** |

---

## 2. Modul Dashboard Kinerja Mutu (`/`)

| ID Fitur | Komponen UI | Peran Terkait | Tindakan Pengguna | Input & Validasi | Hasil yang Diharapkan | Status Klasifikasi |
|---|---|---|---|---|---|---|
| DASH-01 | Top Bar Entitas | Semua Peran | Memeriksa konteks perusahaan aktif | Label entitas: PT. Mega Marine Pride & PT. Baramuda Bahari. | Pengguna memahami cakupan data perusahaan yang ditampilkan. | **VERIFIED** |
| DASH-02 | Filter Multi-Entitas | Semua Peran | Memfilter data berdasarkan perusahaan | Dropdown pilihan: "Semua Perusahaan", "PT. Baramuda Bahari", "PT. Mega Marine Pride". | Angka KPI, grafik batang, distribusi status, dan tabel perhatian terfilter sesuai pilihan. | **VERIFIED** |
| DASH-03 | Filter Periode & Facet | Semua Peran | Memfilter data berdasarkan bulan, departemen, jenis, status, PIC | Pilihan periode 7 bulan terakhir, dropdown departemen, tipe dokumen, PIC. | Menampilkan subset dokumen yang relevan. | **VERIFIED** |
| DASH-04 | 4 KPI Modern | Semua Peran | Memantau indikator kinerja utama | Menghitung otomatis: Kepatuhan SLA %, Rasio Approval %, Rata-rata Hari SLA, SLA Terkritis. | Nilai numerik real-time, badge kategori, dan status kritis. | **VERIFIED** |
| DASH-05 | Grafik Kinerja Bulanan | Semua Peran | Evaluasi tren pengajuan vs persetujuan | Visual bar chart 5 bulan terakhir (warna biru untuk Pengajuan, hijau untuk Approved). | Tampilan visual rasio efektivitas penutupan dokumen mutu. | **VERIFIED** |
| DASH-06 | Beban Kerja Unit | Semua Peran | Melihat departemen dengan dokumen terbanyak | Bar meter progress beban dokumen per departemen. | Mengidentifikasi departemen yang memerlukan prioritas review. | **VERIFIED** |
| DASH-07 | Prioritas Perhatian | Semua Peran | Akses cepat dokumen mendesak/revisi | Baris perhatian dengan badge SLA real-time dan link aksi langsung. | Klik baris langsung membuka detail dokumen terkait. | **VERIFIED** |

---

## 3. Modul Pengajuan Dokumen Baru (`/new`)

| ID Fitur | Komponen UI | Peran Terkait | Tindakan Pengguna | Input & Validasi | Hasil yang Diharapkan | Status Klasifikasi |
|---|---|---|---|---|---|---|
| SUB-01 | Form Header | QMS, Admin | Memulai pembuatan draf atau pengajuan | Tombol "+ Ajukan Dokumen Baru" dari Dashboard / Dokumen. | Tampil form formulir multi-bagian dengan panduan alur. | **VERIFIED** |
| SUB-02 | Pilihan Entitas | QMS, Admin | Memilih PT. Baramuda Bahari atau PT. Mega Marine Pride | Radio button / select perusahaan. | Tagging otomatis ke metadata dan format keterangan dokumen. | **VERIFIED** |
| SUB-03 | Kondisi Dokumen | QMS, Admin | Memilih kondisi dokumen "Baru" atau "Lama" (Perubahan) | Jika memilih "Lama", field *Alasan Perubahan* wajib diisi. | Validasi form mencegah pengajuan dokumen lama tanpa alasan revisi. | **VERIFIED** |
| SUB-04 | Klasifikasi Dokumen | QMS, Admin | Mengisi Departemen, Jenis Dokumen, Judul, No. Dok, Revisi, PIC | Seluruh input wajib diisi. SLA hari kerja dihitung otomatis berdasarkan jenis dokumen. | Form tervalidasi lengkap dan akurat. | **VERIFIED** |
| SUB-05 | Penugasan Reviewer | QMS, Admin | Memilih reviewer QMSR | Wajib dipilih sebelum pengajuan resmi dikirimkan. | Reviewer QMSR terhubung ke data alur verifikasi. | **VERIFIED** |
| SUB-06 | Upload Berkas | QMS, Admin | Mengunggah draf lampiran (PDF, DOCX, XLSX) | Maksimal 10MB per berkas. Validasi ukuran file otomatis. | Berkas diunggah ke storage aman dan tercatat di lampiran. | **VERIFIED** |
| SUB-07 | Simpan sebagai Draft | QMS, Admin | Menyimpan dokumen sementara tanpa mengirim | Klik "Simpan sebagai Draft". | Dokumen berstatus `draft`, nomor pengajuan terbentuk, dapat diedit kembali. | **VERIFIED** |
| SUB-08 | Kirim Pengajuan | QMS, Admin | Mengirim dokumen ke antrian review Tahap 1 | Klik "Kirim Pengajuan Mutu". | Status berubah menjadi `submitted`, langsung masuk ke antrian QMS Section Head. | **VERIFIED** |

---

## 4. Modul Antrian Review (`/actions`)

| ID Fitur | Komponen UI | Peran Terkait | Tindakan Pengguna | Input & Validasi | Hasil yang Diharapkan | Status Klasifikasi |
|---|---|---|---|---|---|---|
| ACT-01 | Antrian Section Head | QMS Section Head | Meninjau berkas yang menunggu review Tahap 1 | Dokumen berstatus `submitted` dan `resubmitted`. | Menampilkan kartu dokumen tugas Tahap 1 terurut berdasarkan urgensi SLA. | **VERIFIED** |
| ACT-02 | Antrian QMSR | QMSR | Meninjau berkas yang menunggu verifikasi Tahap 2 | Dokumen berstatus `qmsr_review`. | Menampilkan antrian dokumen siap persetujuan/penolakan final. | **VERIFIED** |
| ACT-03 | Antrian Pengaju | QMS Submitter | Menindaklanjuti berkas yang memerlukan revisi | Dokumen berstatus `need_revision` dan `approved` (siap ditutup). | Pengaju langsung mengetahui dokumen yang butuh perbaikan klausa. | **VERIFIED** |
| ACT-04 | Antrian Admin | Administrator | Memantau seluruh antrian lintas tahapan alur | Tampilan komprehensif seluruh kelompok status dokumen aktif. | Pengawasan menyeluruh kelancaran alur mutu kedua perusahaan. | **VERIFIED** |

---

## 5. Modul Detail Dokumen & Aksi Alur (`/documents/[id]`)

| ID Fitur | Komponen UI | Peran Terkait | Tindakan Pengguna | Input & Validasi | Hasil yang Diharapkan | Status Klasifikasi |
|---|---|---|---|---|---|---|
| DET-01 | Panel Metadata | Semua Peran | Memeriksa spesifikasi dokumen mutu | Menampilkan nomor dokumen, versi revisi, perusahaan, departemen, PIC, SLA. | Informasi detail terbaca lengkap dan terstruktur. | **VERIFIED** |
| DET-02 | Edit Metadata | Submitter (Draft/Revisi), Admin | Memperbaiki metadata dokumen | Hanya aktif bila dokumen belum disetujui atau dalam status revisi. | Data dokumen terupdate di database dengan audit log. | **VERIFIED** |
| DET-03 | Aksi Review Tahap 1 | QMS Section Head, Admin | Memulai review (`under_review`) | Klik "Sedang Direview Section Head". | Status dokumen diperbarui menjadi `under_review`. | **VERIFIED** |
| DET-04 | Permintaan Revisi | Section Head, QMSR, Admin | Meminta perbaikan klausa (`need_revision`) | Catatan review wajib diisi sebagai panduan bagi pengaju. | Dokumen berstatus `need_revision`, notifikasi catatan tampil bagi pengaju. | **VERIFIED** |
| DET-05 | Forward ke QMSR | QMS Section Head, Admin | Meneruskan dokumen ke Tahap 2 (`qmsr_review`) | Dipilih saat verifikasi teknis Section Head telah terpenuhi. | Dokumen masuk ke antrian kerja QMSR. | **VERIFIED** |
| DET-06 | Persetujuan Final | QMSR, Admin | Menyetujui dokumen mutu (`approved`) | Tombol hijau persetujuan mutu. | Tanggal persetujuan dicatat otomatis, status menjadi `approved`. | **VERIFIED** |
| DET-07 | Penolakan Dokumen | QMSR, Admin | Menolak dokumen yang tidak memenuhi standar (`rejected`) | Catatan penolakan diwajibkan. | Dokumen berstatus ditolak dengan jejak alasan permanen. | **VERIFIED** |
| DET-08 | Resubmit Dokumen | QMS Submitter, Admin | Mengajukan kembali setelah revisi (`resubmitted`) | Mengunggah berkas revisi lalu klik "Ajukan Kembali". | Dokumen kembali ke antrian Section Head untuk verifikasi ulang. | **VERIFIED** |
| DET-09 | Tutup Dokumen | QMS Submitter, Admin | Menutup siklus dokumen setelah disosialisasikan (`closed`) | Klik "Tutup Dokumen (Selesai)". | Dokumen berstatus `closed`, perhitungan siklus waktu SLA selesai. | **VERIFIED** |
| DET-10 | Lampiran Berkas | Semua Peran | Mengunduh berkas lampiran pendukung | Klik tombol "Unduh" pada baris lampiran. | Berkas diunduh langsung dari storage bucket dengan link aman. | **VERIFIED** |
| DET-11 | Catatan Follow-Up | Submitter, Reviewer, Admin | Menambahkan catatan komunikasi non-formal | Tanggal follow-up, hasil komunikasi, langkah selanjutnya. | Catatan follow-up terekam di riwayat dokumen. | **VERIFIED** |

---

## 6. Modul Tracking Dokumen (`/tracking`)

| ID Fitur | Komponen UI | Peran Terkait | Tindakan Pengguna | Input & Validasi | Hasil yang Diharapkan | Status Klasifikasi |
|---|---|---|---|---|---|---|
| TRK-01 | Stepper 6 Tahapan | Semua Peran | Melacak posisi dokumen pada milestone resmi | Visual stepper interaktif (Langkah 1 s.d. 6) dengan penanda peran. | Posisi dokumen terlihat jelas: Selesai (hijau), Aktif (biru), Pending (abu-abu). | **VERIFIED** |
| TRK-02 | Pemilih Dokumen | Semua Peran | Memilih berkas yang ingin dilacak | Dropdown pilihan dokumen real-time + input pencarian cepat. | Detail dokumen, status milestone, dan jejak audit berganti instan. | **VERIFIED** |
| TRK-03 | Diagnostik SLA | Semua Peran | Memeriksa waktu target dan jatuh tempo Asia/Jakarta | Tanggal pengajuan, target hari kerja, jam cut-off 17:00 WIB, sisa waktu. | Transparansi penuh pemenuhan standar layanan dokumen mutu. | **VERIFIED** |
| TRK-04 | Jejak Audit Resmi | Semua Peran | Mengaudit riwayat transisi status dan aktor | Kartu urutan kronologis kejadian (aktor, peran, aksi, catatan review). | Jejak kepatuhan standar ISO/BRCGS terdokumentasi tanpa celah. | **VERIFIED** |

---

## 7. Modul Inventaris Dokumen & Ekspor (`/documents`)

| ID Fitur | Komponen UI | Peran Terkait | Tindakan Pengguna | Input & Validasi | Hasil yang Diharapkan | Status Klasifikasi |
|---|---|---|---|---|---|---|
| DOC-01 | Filter Multi-Kriteria | Semua Peran | Menyaring dokumen berdasarkan teks, status, departemen, jenis, prioritas, reviewer | Form filter responsif di atas tabel data. | Tabel dokumen langsung menampilkan data yang cocok. | **VERIFIED** |
| DOC-02 | Ekspor Excel (.xlsx) | Semua Peran | Mengunduh basis data ke file spreadsheet Excel | Klik tombol "📗 Excel". | File `.xlsx` terunduh otomatis berisi data komprehensif seluruh dokumen. | **VERIFIED** |
| DOC-03 | Ekspor CSV | Semua Peran | Mengunduh format CSV untuk interoperabilitas data | Klik tombol "📥 CSV". | File `.csv` terunduh otomatis dengan encoding UTF-8 aman. | **VERIFIED** |
| DOC-04 | Cetak / Simpan PDF | Semua Peran | Mencetak dokumen inventaris resmi | Klik tombol "🖨️ Cetak / PDF". | Dialog print browser terbuka dengan layout print CSS resmi (bebas elemen navigasi). | **VERIFIED** |
| DOC-05 | Arsip / Hapus | Administrator | Menghapus dokumen aktif dari daftar kerja | Tombol "Hapus" pada baris dokumen (khusus admin). | Dokumen diarsipkan secara aman tanpa menghapus riwayat audit trail. | **VERIFIED** |

---

## 8. Modul Master Data (`/master-data`) — Khusus Administrator

| ID Fitur | Komponen UI | Peran Terkait | Tindakan Pengguna | Input & Validasi | Hasil yang Diharapkan | Status Klasifikasi |
|---|---|---|---|---|---|---|
| MAS-01 | Tab Departemen | Administrator | Mengelola unit kerja perusahaan | Tambah departemen baru, ubah nama, hapus unit kerja. | Daftar departemen pada form pengajuan terbarui. | **VERIFIED** |
| MAS-02 | Tab Jenis Dokumen | Administrator | Mengatur jenis dokumen dan SLA standar | Nama jenis dokumen (SOP, IK, Form, dll.) dan target SLA (hari kerja). | SLA otomatis dihitung berdasarkan jenis yang dipilih. | **VERIFIED** |
| MAS-03 | Tab Reviewer | Administrator | Menentukan personil yang berhak mereview | Memilih pengguna aktif dan mengaktifkan status reviewer. | Nama reviewer muncul di opsi pilihan reviewer QMSR. | **VERIFIED** |
| MAS-04 | Tab Pengguna | Administrator | Membuat akun pengguna baru | Nama lengkap, email perusahaan, kata sandi awal, pilihan peran. | Akun terbentuk di Supabase Auth & profil database dengan peran sesuai. | **VERIFIED** |
| MAS-05 | Manajemen Peran | Administrator | Mengubah hak akses pengguna | Dropdown pilihan role: Admin, QMS, QMS Section Head, QMSR. | Hak akses pengguna langsung berubah pada sesi login berikutnya. | **VERIFIED** |
| MAS-06 | Nonaktifkan Akun | Administrator | Mencabut akses pengguna non-aktif | Klik tombol "Nonaktifkan" pada baris pengguna. | Akun tidak dapat login dan ditandai sebagai non-aktif. | **VERIFIED** |

---

## 9. Modul Riwayat Global (`/history`) & Analitik Mutu (`/analytics`)

| ID Fitur | Komponen UI | Peran Terkait | Tindakan Pengguna | Input & Validasi | Hasil yang Diharapkan | Status Klasifikasi |
|---|---|---|---|---|---|---|
| HIS-01 | Timeline Audit Global | Semua Peran | Memeriksa seluruh aktivitas dokumen perusahaan | Filter pencarian teks dan filter perusahaan. | Tampilan kronologis aktivitas seluruh tim dengan penanda waktu presisi. | **VERIFIED** |
| ANA-01 | Analitik Kinerja Dokumen | Semua Peran | Melihat ringkasan analitik dan volume berkas | Filter perusahaan (Gabungan, Baramuda, Mega Marine). | Metrik kepatuhan SLA, rata-rata durasi penyelesaian, dan proporsi unit kerja. | **VERIFIED** |
