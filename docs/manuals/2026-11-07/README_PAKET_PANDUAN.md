# PAKET RESMI PANDUAN PENGGUNA (OFFICIAL USER MANUAL PACKAGE)
## QMS MONITOR — SISTEM PEMANTAUAN DOKUMEN MUTU TERPADU
**PT. MEGA MARINE PRIDE & PT. BARAMUDA BAHARI**

---

| Parameter Paket Dokumentasi | Rincian |
|---|---|
| **Tanggal Rilis** | 7 November 2026 |
| **Versi Dokumen** | 1.0 (Edisi Produksi) |
| **Penerima Utama** | Rosalia Pratiwi & Tim Kendali Mutu |
| **Target Lingkungan** | Produksi (`https://qms-ruddy.vercel.app`) |
| **Basis Data** | Supabase PostgreSQL |
| **Status UAT** | **100% LULUS (30 / 30 Skenario Terverifikasi)** |
| **Jumlah Dokumen PDF** | 6 Dokumen PDF Lengkap Berisi Tangkapan Layar Asli |

---

## 1. STRUKTUR BERKAS PAKET DOKUMENTASI

Paket panduan ini dikemas dalam direktori terstruktur:

```
docs/manuals/2026-11-07/
├── README_PAKET_PANDUAN.md          <- Panduan inventaris paket ini
├── SCREENSHOT_INDEX.md              <- Indeks 60 tangkapan layar asli & anotasi
├── PENDING_VERIFICATION.md          <- Catatan fitur masa depan & rekomendasi
├── final/                           <- Berkas deliverable PDF siap cetak / distribusi
│   ├── 01_PANDUAN_RINGKAS_QMS_MONITOR.pdf       (12 Hlm, 1.3 MB)
│   ├── 02_PANDUAN_ADMINISTRATOR_QMS_MONITOR.pdf (20 Hlm, 3.1 MB)
│   ├── 03_PANDUAN_QMS_SUBMITTER.pdf             (20 Hlm, 3.1 MB)
│   ├── 04_PANDUAN_QMS_SECTION_HEAD.pdf          (11 Hlm, 1.7 MB)
│   ├── 05_PANDUAN_QMSR_MUTU.pdf                 (8 Hlm, 1.3 MB)
│   ├── 06_BUKU_KERJA_UAT_QMS_MONITOR.pdf        (10 Hlm, 456 KB)
│   ├── DOCUMENTATION_QA_REPORT.md               (Laporan pengujian visual QA PDF)
│   └── qa_previews/                             (Render visual sampul & isi PDF)
├── source/                          <- Naskah sumber Markdown & matriks analisis
│   ├── 01_QUICK_START.md
│   ├── 02_ADMINISTRATOR.md
│   ├── 03_QMS_SUBMITTER.md
│   ├── 04_QMS_SECTION_HEAD.md
│   ├── 05_QMSR.md
│   ├── 06_UAT_WORKBOOK.md
│   ├── FUNCTIONAL_INVENTORY.md
│   ├── ROLE_PERMISSION_MATRIX.md
│   └── SCREENSHOT_CAPTURE_PLAN.md
├── screenshots/                     <- Koleksi tangkapan layar asli & teranotasi
│   ├── original/                    (55 file PNG desktop 1440x900)
│   ├── annotated/                   (55 file PNG dengan callout biru #315FE8)
│   └── mobile/                      (5 file PNG smartphone 390x844)
└── scripts/                         <- Alat otomatisasi reproduksi
    ├── capture-screenshots.js       (Playwright browser capture engine)
    ├── annotate-screenshots.py      (Pillow callout & banner generator)
    ├── generate-manuals.js          (Chromium PDF publishing pipeline)
    └── validate-pdfs.py             (PyMuPDF integrity & QA inspector)
```

---

## 2. DAFTAR MANUAL PDF & SASARAN DISTRIBUSI

1. **`01_PANDUAN_RINGKAS_QMS_MONITOR.pdf` (12 Halaman):**
   - **Sasaran:** Seluruh karyawan PT. Mega Marine Pride dan PT. Baramuda Bahari yang memiliki hak akses sistem.
   - **Cakupan:** Pengenalan alur kerja, hierarki 4 peran, navigasi menu, arti warna status alur, perhitungan jam kerja SLA Asia/Jakarta (17:00 WIB), dan panduan mobile PWA.

2. **`02_PANDUAN_ADMINISTRATOR_QMS_MONITOR.pdf` (20 Halaman):**
   - **Sasaran:** Rosalia Pratiwi, Tim IT Administrator, dan Lead Quality Assurance.
   - **Cakupan:** Pengelolaan akun pengguna, penugasan peran, manajemen master data unit kerja (departemen) dan jenis dokumen (SLA default), pengawasan multi-tenant, audit trail kronologis, serta prosedur ekspor CSV/Excel/PDF.

3. **`03_PANDUAN_QMS_SUBMITTER.pdf` (20 Halaman):**
   - **Sasaran:** Staff QMS, Document Controller, dan pembuat dokumen di setiap departemen.
   - **Cakupan:** Formulir pengajuan dokumen baru `/new`, pengisian metadata, penugasan reviewer QMSR, penanganan revisi `need_revision`, pengajuan ulang `resubmitted`, hingga penutupan resmi dokumen `closed`.

4. **`04_PANDUAN_QMS_SECTION_HEAD.pdf` (11 Halaman):**
   - **Sasaran:** Kepala Seksi Kendali Mutu (QMS Section Head) dan Penelaah Tahap 1.
   - **Cakupan:** Antrian review personal `/actions`, verifikasi format dan penomoran klausul, input catatan korektif, opsi pengembalian revisi vs penerusan ke QMSR, dan pencatatan follow-up koordinasi.

5. **`05_PANDUAN_QMSR_MUTU.pdf` (8 Halaman):**
   - **Sasaran:** Wakil Manajemen Mutu (QMSR), Executive Approver, dan Manajemen Representatif.
   - **Cakupan:** Antrian penelaahan akhir Tahap 2, evaluasi kepatuhan standar akreditasi internasional (ISO 9001:2015, HACCP, BRCGS), penerbitan pengesahan resmi `approved`, penguncian stempel waktu, dan transparansi catatan umpan balik.

6. **`06_BUKU_KERJA_UAT_QMS_MONITOR.pdf` (10 Halaman):**
   - **Sasaran:** Auditor internal, Auditor eksternal sertifikasi, Manajemen Eksekutif.
   - **Cakupan:** Buku kerja 30 skenario pengujian fungsional terperinci (UAT-001 s.d. UAT-030) yang telah terverifikasi 100% PASS, dilengkapi lembar tanda tangan pengesahan (Sign-Off Sheet).

---

## 3. INSTRUKSI DISTRIBUSI KEPADA TIM ROSALIA PRATIWI

- **Langkah 1 (Distribusi Dokumen PDF):** Bagikan file PDF yang berada di folder `final/` kepada pengguna sesuai peran tanggung jawab masing-masing melalui email perusahaan atau folder jaringan bersama yang aman.
- **Langkah 2 (Sosialisasi Awal):** Anjurkan seluruh pengguna membaca `01_PANDUAN_RINGKAS_QMS_MONITOR.pdf` terlebih dahulu sebagai orientasi awal sebelum menggunakan aplikasi secara langsung.
- **Langkah 3 (Reproduksi Mandiri):** Jika di kemudian hari terdapat perubahan antarmuka atau penambahan fitur, tim teknis dapat meregenerasi seluruh tangkapan layar dan PDF baru secara instan dengan menjalankan:
  ```bash
  node docs/manuals/2026-11-07/scripts/capture-screenshots.js
  python3 docs/manuals/2026-11-07/scripts/annotate-screenshots.py
  node docs/manuals/2026-11-07/scripts/generate-manuals.js
  python3 docs/manuals/2026-11-07/scripts/validate-pdfs.py
  ```

