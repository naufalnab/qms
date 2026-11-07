# CATATAN VERIFIKASI & REKOMENDASI SISTEM (PENDING VERIFICATION & RECOMMENDATIONS)
## QMS MONITOR — LAPORAN PENELAAHAN TEKNIS
**PT. MEGA MARINE PRIDE & PT. BARAMUDA BAHARI**

---

| Dokumen | Detail |
|---|---|
| **Tanggal Analisis** | 7 November 2026 |
| **Penyusun** | Lead QA Engineer & Functional Consultant |
| **Otoritas** | Rosalia Pratiwi (Lead QMS Administrator) |
| **Status Produksi** | Siap Pakai & Beroperasi Penuh (`Ready for Full Production Adoption`) |

---

## 1. IKHTISAR HASIL VERIFIKASI FUNGSIONAL

Seluruh fungsi utama aplikasi QMS Monitor telah diuji secara mendalam dan dinyatakan beroperasi dengan tingkat kestabilan tinggi:
1. **Autentikasi & RBAC (Role-Based Access Control):** Pemisahan wewenang antara `Admin`, `QMS Submitter`, `QMS Section Head`, dan `QMSR` terbukti kokoh baik di tingkat antarmuka maupun logika bisnis.
2. **Alur Kerja Berjenjang (Workflow Engine):** Siklus hidup dokumen mulai dari `draft` ➔ `submitted` ➔ `under_review` ➔ `need_revision` ➔ `resubmitted` ➔ `qmsr_review` ➔ `approved` ➔ `closed` telah terverifikasi secara end-to-end tanpa kendala.
3. **Kalkulasi SLA Asia/Jakarta (WIB):** Perhitungan target hari kerja (Senin–Jumat) yang mengabaikan hari libur nasional serta cut-off jam kantor 17:00:00 WIB bekerja secara akurat.
4. **Isolasi Multi-Tenant (Perusahaan):** Data antara PT. Mega Marine Pride dan PT. Baramuda Bahari terisolasi secara aman.
5. **Ekspor Data:** Fitur ekspor CSV, Excel (.xlsx), dan layout Cetak/PDF resmi beroperasi optimal tanpa ketergantungan pada layanan pihak ketiga eksternal.

---

## 2. STATUS INTEGRASI GOOGLE SPREADSHEET (RESMI DITIADAKAN)

- **Keputusan Arsitektur:** Sebagaimana ditetapkan dalam rilis commit `53d97ce`, integrasi sinkronisasi langsung dua arah dengan Google Spreadsheet telah **resmi ditiadakan dan didekomisioning**.
- **Alasan Teknis & Keamanan:** Integrasi spreadsheet berbasis API publik memiliki risiko latensi jaringan, kegagalan sinkronisasi saat koneksi terputus, serta potensi inkonsistensi struktur sel yang dapat mengacaukan keabsahan data audit sistem mutu ISO 9001.
- **Solusi Pengganti yang Berlaku:**
  - Repositori basis data Supabase PostgreSQL kini menjadi satu-satunya sumber kebenaran (*Single Source of Truth*).
  - Kebutuhan pengolahan data spreadsheet oleh pengguna telah dipenuhi sepenuhnya melalui fitur **📗 Unduh Excel (.xlsx)** instan dengan library SheetJS dan **📥 Ekspor CSV**, yang dapat dibuka langsung menggunakan Microsoft Excel, LibreOffice, maupun diunggah manual ke Google Drive internal perusahaan.
- **Konfirmasi Dokumentasi:** Tidak ada instruksi konfigurasi Google Sheets di seluruh paket dokumen manual pengguna (PDF 01 s.d. 06).

---

## 3. CATATAN FITUR MASA DEPAN & REKOMENDASI PENGEMBANGAN

Berikut adalah rekomendasi peningkatan bertahap untuk rilis versi berikutnya (QMS Monitor v1.1 / v2.0):

### 3.1 Integrasi Notifikasi Email & WhatsApp Gateway
- *Kondisi Saat Ini:* Pemberitahuan dokumen masuk saat ini berfokus pada dasbor internal dan penanda visual (*counter badges*) pada sidebar navigasi.
- *Rekomendasi:* Menambahkan modul background worker (e.g. Supabase Edge Functions atau Resend) untuk mengirimkan notifikasi instan ke email atau WhatsApp grup pimpinan saat dokumen mendesak memasuki status `Review Terkritis / Mendekati Batas SLA`.

### 3.2 Tanda Tangan Elektronik Tersertifikasi (Digital Signature / BSrE / Privy)
- *Kondisi Saat Ini:* Sistem mencatat persetujuan QMSR berupa stempel digital berbasis ID akun terverifikasi dan stempel waktu WIB yang diakui dalam audit ISO 9001.
- *Rekomendasi:* Untuk kebutuhan perjanjian legal eksternal, dapat ditambahkan modul integrasi sertifikat digital kriptografis (PKI) yang menyematkan cap QR-Code terenkripsi pada berkas PDF lampiran.

### 3.3 Penjadwalan Kalender Audit Internal Terpadu
- *Kondisi Saat Ini:* Modul analitik menyajikan tren penyelesaian dokumen.
- *Rekomendasi:* Menambahkan tab jadwal audit internal tahunan yang secara otomatis mengingatkan departemen pemilik untuk merevisi prosedur (SOP) yang telah berusia $\ge 1$ tahun sejak tanggal persetujuan terakhir.

---

## 4. KESIMPULAN PENERIMAAN SISTEM

Aplikasi QMS Monitor telah memenuhi seluruh kriteria kelayakan operasional (*Definition of Done*) untuk diadopsi secara luas di lingkungan **PT. Mega Marine Pride** dan **PT. Baramuda Bahari**.
Paket dokumentasi manual resmi ini siap diserahkan kepada Rosalia Pratiwi beserta jajaran pimpinan kendali mutu.

