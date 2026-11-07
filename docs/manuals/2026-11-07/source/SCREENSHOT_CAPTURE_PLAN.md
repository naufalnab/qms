# RENCANA TANGKAPAN LAYAR (SCREENSHOT CAPTURE PLAN)
## PANDUAN PENGGUNA RESMI QMS MONITOR

**Tanggal Rencana:** 7 November 2026  
**Standar Resolusi:**
- **Desktop:** 1440 × 900 piksel (Rasio 16:10, Standar Laptop Bisnis Enterprise)
- **Mobile:** 390 × 844 piksel (Rasio Smartphone Modern / PWA)  
**Zona Waktu Browser:** `Asia/Jakarta` (WIB)  
**Format Penyimpanan:**
- `docs/manuals/2026-11-07/screenshots/original/`: Tangkapan layar asli mentah (PNG lossless)
- `docs/manuals/2026-11-07/screenshots/annotated/`: Tangkapan layar dengan callout bingkai biru, nomor urut langkah, dan panah petunjuk aksi
- `docs/manuals/2026-11-07/screenshots/mobile/`: Tangkapan layar tampilan antarmuka mobile/responsive

---

## 1. Matriks Rencana Tangkapan Layar (Target 60+ Tangkapan Layar)

| No | Kode Screenshot | Judul / Keadaan Antarmuka | Rute Halaman | Peran Pengguna | Resolusi | Fokus Anotasi & Aksi Pengguna | Target Manual PDF |
|---|---|---|---|---|---|---|---|
| 01 | `SCR-AUTH-01` | Halaman Login Utama | `/login` | Publik / Semua | Desktop 1440×900 | Form input email, password, tombol "Masuk →" | PDF 01, 02, 03, 04, 05 |
| 02 | `SCR-AUTH-02` | Validasi Login Gagal | `/login` | Publik | Desktop 1440×900 | Banner error "Email atau kata sandi tidak cocok" | PDF 01, 02, 06 |
| 03 | `SCR-AUTH-03` | Pemilih Tema Tampilan | `/` (Sidebar) | Administrator | Desktop 1440×900 | Menu popover pemilihan tema Terang, Gelap, Sistem | PDF 01, 02 |
| 04 | `SCR-AUTH-04` | Aktivasi Akun Pengguna | `/accept-invite` | Pengguna Baru | Desktop 1440×900 | Form pembuatan kata sandi awal (minimal 8 karakter) | PDF 02, 06 |
| 05 | `SCR-DASH-01` | Dashboard Administrator Penuh | `/` | Administrator | Desktop 1440×900 | Top bar entitas, 4 kartu KPI modern, grafik tren bulanan | PDF 01, 02 |
| 06 | `SCR-DASH-02` | Filter Multi-Perusahaan | `/` | Administrator | Desktop 1440×900 | Dropdown filter: Semua Perusahaan, PT. Baramuda Bahari, PT. Mega Marine Pride | PDF 01, 02, 03 |
| 07 | `SCR-DASH-03` | Filter Periode & Departemen | `/` | Administrator | Desktop 1440×900 | Dropdown pemilihan bulan kalender & filter unit kerja | PDF 02 |
| 08 | `SCR-DASH-04` | 4 Kartu Metrik KPI Modern | `/` | Administrator | Desktop 1440×900 | Detail KPI: Kepatuhan SLA, Approval Ratio, Rata-rata Hari, SLA Terkritis | PDF 01, 02 |
| 09 | `SCR-DASH-05` | Grafik Batang Kinerja Bulanan | `/` | Administrator | Desktop 1440×900 | Visual diagram batang Pengajuan (Biru) vs Disetujui (Hijau) | PDF 02 |
| 10 | `SCR-DASH-06` | Distribusi Status & Beban Kerja | `/` | Administrator | Desktop 1440×900 | Progress bar tahapan alur dan visualisasi beban per unit kerja | PDF 02 |
| 11 | `SCR-DASH-07` | Dashboard Peran Pengaju (QMS) | `/` | QMS Submitter | Desktop 1440×900 | Header khusus "Fokus Pengaju: Status Dokumen Saya" | PDF 03 |
| 12 | `SCR-DASH-08` | Dashboard Reviewer Section Head | `/` | QMS Section Head | Desktop 1440×900 | Header khusus "Antrian Review QMS Section Head" | PDF 04 |
| 13 | `SCR-DASH-09` | Dashboard Reviewer QMSR | `/` | QMSR | Desktop 1440×900 | Header khusus "Antrian Review Saya (QMSR)" | PDF 05 |
| 14 | `SCR-NEW-01` | Formulir Pengajuan Dokumen Baru | `/new` | QMS Submitter | Desktop 1440×900 | Tampilan form pengajuan bagian atas (Entitas & Kondisi) | PDF 01, 03 |
| 15 | `SCR-NEW-02` | Pemilihan Perusahaan Pengajuan | `/new` | QMS Submitter | Desktop 1440×900 | Radio/select PT. Baramuda Bahari vs PT. Mega Marine Pride | PDF 03 |
| 16 | `SCR-NEW-03` | Kondisi Dokumen Lama & Alasan | `/new` | QMS Submitter | Desktop 1440×900 | Pemilihan kondisi "Lama" dan isian wajib "Alasan Perubahan" | PDF 03, 06 |
| 17 | `SCR-NEW-04` | Pengisian Metadata Dokumen | `/new` | QMS Submitter | Desktop 1440×900 | Field Departemen, Jenis Dokumen, No. Dokumen, Judul, Revisi | PDF 03 |
| 18 | `SCR-NEW-05` | Penugasan Reviewer & Prioritas | `/new` | QMS Submitter | Desktop 1440×900 | Dropdown reviewer QMSR dan skala prioritas (Normal s.d. Kritis) | PDF 03 |
| 19 | `SCR-NEW-06` | Upload Lampiran Berkas Draf | `/new` | QMS Submitter | Desktop 1440×900 | Kotak unggah file draf (PDF/Word/Excel) maks 10MB | PDF 03 |
| 20 | `SCR-NEW-07` | Sidebar Preview SLA & Due Date | `/new` | QMS Submitter | Desktop 1440×900 | Kalkulasi otomatis hari kerja SLA & tanggal jatuh tempo 17:00 WIB | PDF 03 |
| 21 | `SCR-NEW-08` | Tombol Aksi Simpan Draf vs Kirim | `/new` | QMS Submitter | Desktop 1440×900 | Tombol "Simpan sebagai Draft" dan "Kirim Pengajuan Mutu" | PDF 03 |
| 22 | `SCR-NEW-09` | Validasi Field Wajib Kosong | `/new` | QMS Submitter | Desktop 1440×900 | Peringatan validasi browser jika field wajib belum terisi | PDF 03, 06 |
| 23 | `SCR-DOC-01` | Daftar Dokumen Mutu Terpadu | `/documents` | Semua Peran | Desktop 1440×900 | Tabel dokumen komprehensif, badge status alur, badge SLA | PDF 01, 02, 03 |
| 24 | `SCR-DOC-02` | Filter Pencarian & Multi-Facet | `/documents` | Semua Peran | Desktop 1440×900 | Filter teks kata kunci, status, departemen, jenis, SLA, prioritas | PDF 02, 03 |
| 25 | `SCR-DOC-03` | Tombol Ekspor Data CSV & Excel | `/documents` | Semua Peran | Desktop 1440×900 | Grup tombol aksi: "📥 CSV", "📗 Excel", dan "🖨️ Cetak / PDF" | PDF 01, 02, 06 |
| 26 | `SCR-DOC-04` | Tampilan Pratinjau Cetak / PDF | `/documents` (Print) | Semua Peran | Desktop 1440×900 | Layout cetak resmi tanpa header menu, format tabel siap audit | PDF 02, 06 |
| 27 | `SCR-DOC-05` | Tombol Arsip / Hapus Admin | `/documents` | Administrator | Desktop 1440×900 | Tombol "Hapus" pada baris dokumen (konfirmasi arsip) | PDF 02, 06 |
| 28 | `SCR-ACT-01` | Antrian Review Section Head (Tahap 1) | `/actions` | QMS Section Head | Desktop 1440×900 | Kelompok antrian "Menunggu Dimulai Review" & "Sedang Direview" | PDF 04 |
| 29 | `SCR-ACT-02` | Kartu Antrian Dokumen Mendesak | `/actions` | QMS Section Head | Desktop 1440×900 | Kartu penugasan dengan badge "Mendekati Batas SLA" / "Overdue" | PDF 04 |
| 30 | `SCR-ACT-03` | Antrian Review Final QMSR (Tahap 2) | `/actions` | QMSR | Desktop 1440×900 | Kelompok antrian "Antrian Review Final QMSR (Tahap 2)" | PDF 05 |
| 31 | `SCR-ACT-04` | Antrian Pengaju (Revisi & Tutup) | `/actions` | QMS Submitter | Desktop 1440×900 | Kelompok "Perlu Revisi Klausul" dan "Dokumen Disetujui" | PDF 03 |
| 32 | `SCR-DET-01` | Halaman Rincian Dokumen Mutu | `/documents/[id]` | Semua Peran | Desktop 1440×900 | Panel informasi metadata lengkap, nomor dokumen, revisi, PIC | PDF 01, 03, 04, 05 |
| 33 | `SCR-DET-02` | Form Edit Metadata Dokumen | `/documents/[id]` | QMS / Admin | Desktop 1440×900 | Mode ubah data pengajuan saat status draf atau perlu revisi | PDF 03 |
| 34 | `SCR-DET-03` | Panel Aksi Alur Section Head | `/documents/[id]` | QMS Section Head | Desktop 1440×900 | Tombol "Sedang Direview Section Head" dan "Teruskan ke QMSR" | PDF 04 |
| 35 | `SCR-DET-04` | Form Input Catatan Review & Revisi | `/documents/[id]` | Section Head / QMSR | Desktop 1440×900 | Textarea catatan masukan perbaikan klausul & tombol "Perlu Revisi" | PDF 04, 05 |
| 36 | `SCR-DET-05` | Status Dokumen Perlu Revisi | `/documents/[id]` | QMS Submitter | Desktop 1440×900 | Status kuning "Perlu Revisi" dan catatan reviewer yang ditampilkan | PDF 03 |
| 37 | `SCR-DET-06` | Unggah Berkas Perbaikan Revisi | `/documents/[id]` | QMS Submitter | Desktop 1440×900 | Daftar lampiran, tombol unggah revisi, tombol "Ajukan Kembali" | PDF 03 |
| 38 | `SCR-DET-07` | Panel Aksi Alur QMSR (Approval) | `/documents/[id]` | QMSR | Desktop 1440×900 | Tombol hijau "Setujui Dokumen (Approved)" dan "Tolak Dokumen" | PDF 05 |
| 39 | `SCR-DET-08` | Dokumen Disetujui (Approved) | `/documents/[id]` | Semua Peran | Desktop 1440×900 | Status hijau "Disetujui", tanggal persetujuan resmi terekam | PDF 03, 05 |
| 40 | `SCR-DET-09` | Penutupan Dokumen (Closed) | `/documents/[id]` | QMS Submitter | Desktop 1440×900 | Tombol "Tutup Dokumen (Selesai)" untuk mengakhiri siklus SLA | PDF 03 |
| 41 | `SCR-DET-10` | Form & Catatan Follow-Up | `/documents/[id]` | Semua Peran | Desktop 1440×900 | Input tanggal, hasil koordinasi, dan langkah selanjutnya | PDF 03, 04, 05 |
| 42 | `SCR-DET-11` | Jejak Audit Trail Kronologis | `/documents/[id]` | Semua Peran | Desktop 1440×900 | Garis waktu resmi perubahan status, aktor, dan catatan waktu WIB | PDF 01, 02 |
| 43 | `SCR-TRK-01` | Halaman Tracking Stepper 6 Tahap | `/tracking` | Semua Peran | Desktop 1440×900 | Visual 6 milestone alur mutu (Pengajuan s.d. Persetujuan & Distribusi) | PDF 01, 02, 03, 04, 05 |
| 44 | `SCR-TRK-02` | Pemilih Berkas Pelacakan Cepat | `/tracking` | Semua Peran | Desktop 1440×900 | Dropdown pemilih dokumen langsung dan filter pencarian instan | PDF 01, 02 |
| 45 | `SCR-TRK-03` | Banner Ringkasan Dokumen Aktif | `/tracking` | Semua Peran | Desktop 1440×900 | Banner rincian berkas, badge entitas, revisi, prioritas, status SLA | PDF 01 |
| 46 | `SCR-TRK-04` | Kotak Diagnostik SLA Asia/Jakarta | `/tracking` | Semua Peran | Desktop 1440×900 | Detail target hari kerja, jam cut-off kantor, dan status ketepatan | PDF 01, 02 |
| 47 | `SCR-TRK-05` | Rincian Catatan Feedback Reviewer | `/tracking` | Semua Peran | Desktop 1440×900 | Kartu transparansi masukan review QMSR & Section Head | PDF 01, 03, 04, 05 |
| 48 | `SCR-MAS-01` | Master Data: Tab Departemen | `/master-data` | Administrator | Desktop 1440×900 | Form tambah unit kerja baru, daftar departemen, tombol edit/hapus | PDF 02 |
| 49 | `SCR-MAS-02` | Master Data: Tab Jenis Dokumen | `/master-data` | Administrator | Desktop 1440×900 | Form nama jenis dokumen, SLA standar hari kerja, daftar kategori | PDF 02 |
| 50 | `SCR-MAS-03` | Master Data: Tab Reviewer Mutu | `/master-data` | Administrator | Desktop 1440×900 | Pemilihan personil reviewer aktif, tombol aktivasi reviewer | PDF 02 |
| 51 | `SCR-MAS-04` | Master Data: Tab Pengguna | `/master-data` | Administrator | Desktop 1440×900 | Tabel personil terdaftar, status aktif/nonaktif, penugasan peran | PDF 02 |
| 52 | `SCR-MAS-05` | Tambah Akun Pengguna Baru | `/master-data` | Administrator | Desktop 1440×900 | Form nama lengkap, email perusahaan, kata sandi, pemilihan role | PDF 02 |
| 53 | `SCR-MAS-06` | Pengubahan Peran & Penonaktifan | `/master-data` | Administrator | Desktop 1440×900 | Aksi edit role (Admin/QMS/SecHead/QMSR) dan tombol nonaktifkan | PDF 02 |
| 54 | `SCR-HIS-01` | Riwayat Audit Global Perusahaan | `/history` | Semua Peran | Desktop 1440×900 | Log kronologis seluruh aktivitas kedua perusahaan, filter pencarian | PDF 01, 02 |
| 55 | `SCR-ANA-01` | Analitik Kinerja Dokumen & SLA | `/analytics` | Semua Peran | Desktop 1440×900 | KPI kepatuhan SLA %, volume per entitas, distribusi status | PDF 01, 02 |
| 56 | `SCR-MOB-01` | Tampilan Mobile: Dashboard | `/` | Semua Peran | Mobile 390×844 | Tata letak responsif HP, bar navigasi bawah, kartu metrik ringkas | PDF 01, 06 |
| 57 | `SCR-MOB-02` | Tampilan Mobile: Menu Navigasi | `/` (Menu) | Semua Peran | Mobile 390×844 | Header menu hamburger mobile dengan pilihan rute lengkap | PDF 01 |
| 58 | `SCR-MOB-03` | Tampilan Mobile: Form Pengajuan | `/new` | QMS Submitter | Mobile 390×844 | Form pengajuan responsif pada layar smartphone | PDF 03, 06 |
| 59 | `SCR-MOB-04` | Tampilan Mobile: Tracking Milestone | `/tracking` | Semua Peran | Mobile 390×844 | Stepper vertikal responsif pada perangkat mobile | PDF 01, 06 |
| 60 | `SCR-MOB-05` | Tampilan Mobile: Antrian Review | `/actions` | QMS Section Head | Mobile 390×844 | Kartu antrian tugas pada tata letak seluler | PDF 04, 06 |
