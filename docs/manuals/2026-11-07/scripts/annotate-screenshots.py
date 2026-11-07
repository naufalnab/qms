#!/usr/bin/env python3
import os
import glob
from PIL import Image, ImageDraw, ImageFont

ORIG_DIR = "docs/manuals/2026-11-07/screenshots/original"
ANN_DIR = "docs/manuals/2026-11-07/screenshots/annotated"
os.makedirs(ANN_DIR, exist_ok=True)

# Colors
BLUE = "#315FE8"
DARK_NAVY = "#20293D"
WHITE = "#FFFFFF"
RED = "#EF4444"
GREEN = "#10B981"
AMBER = "#F59E0B"

# Try loading standard system truetype fonts or fallback
def get_font(size=16, bold=False):
    font_paths = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/SFCompact.ttf"
    ]
    for p in font_paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()

font_title = get_font(18, bold=True)
font_badge = get_font(15, bold=True)
font_caption = get_font(13, bold=False)

# Custom callout annotations per screenshot ID:
# Each callout: (x1, y1, x2, y2, label, num, color)
CALLOUTS = {
    "SCR-AUTH-01": [
        (470, 310, 830, 470, "Form Kredensial Email & Kata Sandi", 1, BLUE),
        (470, 485, 830, 535, "Tombol Masuk Akun", 2, BLUE)
    ],
    "SCR-AUTH-02": [
        (470, 455, 830, 495, "Pesan Validasi: Email / Kata Sandi Tidak Cocok", 1, RED)
    ],
    "SCR-DASH-01": [
        (260, 40, 520, 90, "Filter Entitas Perusahaan Multi-Tenant", 1, BLUE),
        (260, 110, 1400, 240, "4 Kartu KPI Metrik Kinerja Mutu", 2, BLUE),
        (260, 260, 960, 560, "Grafik Tren Pengajuan vs Disetujui", 3, BLUE)
    ],
    "SCR-DASH-04": [
        (260, 110, 530, 240, "KPI Kepatuhan SLA (%)", 1, BLUE),
        (545, 110, 815, 240, "KPI Approval Ratio (%)", 2, GREEN),
        (830, 110, 1100, 240, "Rata-rata Waktu Proses (Hari)", 3, BLUE),
        (1115, 110, 1385, 240, "SLA Terkritis / Mendekati Jatuh Tempo", 4, AMBER)
    ],
    "SCR-NEW-01": [
        (280, 180, 980, 280, "Pilihan Entitas Perusahaan (Baramuda / MMP)", 1, BLUE),
        (280, 300, 980, 550, "Metadata Utama: No Dokumen, Judul & Klausul", 2, BLUE),
        (1000, 180, 1380, 550, "Sidebar Preview SLA & Tanggal Batas 17:00 WIB", 3, BLUE)
    ],
    "SCR-NEW-03": [
        (650, 270, 980, 350, "Status Dokumen: Lama (Revisi/Pembaruan)", 1, BLUE),
        (280, 540, 980, 680, "Kolom Wajib: Alasan Perubahan Klausul Dokumen", 2, AMBER)
    ],
    "SCR-NEW-07": [
        (1000, 180, 1380, 460, "Kalkulasi Otomatis Jam Kerja SLA (Asia/Jakarta)", 1, BLUE)
    ],
    "SCR-NEW-08": [
        (1000, 480, 1180, 535, "Simpan Draf (Belum Masuk Alur SLA)", 1, BLUE),
        (1195, 480, 1380, 535, "Kirim Pengajuan Resmi (Mulai Alur Mutu)", 2, GREEN)
    ],
    "SCR-NEW-09": [
        (280, 140, 1380, 190, "Peringatan Validasi Field Wajib Belum Lengkap", 1, RED)
    ],
    "SCR-DOC-01": [
        (280, 110, 700, 170, "Pencarian Instan No Dokumen / Judul / PIC", 1, BLUE),
        (1100, 110, 1380, 170, "Tombol Ekspor CSV, Excel & Cetak PDF", 2, GREEN),
        (280, 200, 1380, 800, "Tabel Dokumen Mutu Terpadu & Badge Status SLA", 3, BLUE)
    ],
    "SCR-DOC-03": [
        (1080, 110, 1170, 160, "Ekspor CSV Data Lengkap", 1, BLUE),
        (1180, 110, 1270, 160, "Ekspor Buku Kerja Excel (.xlsx)", 2, GREEN),
        (1280, 110, 1380, 160, "Cetak / Simpan Laporan PDF", 3, DARK_NAVY)
    ],
    "SCR-ACT-01": [
        (280, 110, 1380, 360, "Antrian Tahap 1: Menunggu Review Section Head", 1, BLUE),
        (280, 380, 1380, 620, "Antrian Sedang Direview QMS Section Head", 2, BLUE)
    ],
    "SCR-ACT-03": [
        (280, 110, 1380, 500, "Antrian Tahap 2: Review Final & Persetujuan QMSR", 1, BLUE)
    ],
    "SCR-DET-01": [
        (280, 110, 960, 320, "Panel Ringkasan Identitas & Metadata Dokumen", 1, BLUE),
        (980, 110, 1380, 320, "Status Alur Kerja Saat Ini & PIC Dokumen", 2, BLUE)
    ],
    "SCR-DET-03": [
        (980, 340, 1380, 600, "Panel Aksi Workflow Section Head: Teruskan / Revisi", 1, BLUE)
    ],
    "SCR-DET-04": [
        (980, 370, 1380, 480, "Catatan Masukan Review Klausul & Kesalahan", 1, AMBER),
        (980, 540, 1380, 590, "Tombol 'Perlu Revisi' (Kembalikan ke Pengaju)", 2, RED)
    ],
    "SCR-DET-05": [
        (280, 110, 960, 200, "Banner Kuning: Status Dokumen Perlu Revisi", 1, AMBER),
        (980, 110, 1380, 260, "Catatan Detail dari Reviewer yang Harus Diperbaiki", 2, AMBER)
    ],
    "SCR-DET-07": [
        (980, 340, 1380, 480, "Panel Aksi Persetujuan Final QMSR", 1, BLUE),
        (980, 540, 1380, 590, "Tombol Hijau: Setujui Dokumen (Approved)", 2, GREEN)
    ],
    "SCR-DET-08": [
        (280, 110, 500, 160, "Badge Hijau: Dokumen Disetujui (Approved)", 1, GREEN),
        (280, 220, 700, 270, "Pencatatan Resmi Tanggal Persetujuan Mutu", 2, GREEN)
    ],
    "SCR-DET-09": [
        (980, 340, 1380, 420, "Tombol Penutupan: Tutup Dokumen (Selesai)", 1, DARK_NAVY)
    ],
    "SCR-DET-11": [
        (280, 450, 960, 850, "Audit Trail Kronologis (Aktor, Waktu WIB, Catatan)", 1, BLUE)
    ],
    "SCR-TRK-01": [
        (280, 160, 1380, 340, "Milestone Stepper 6 Tahapan Mutu Interaktif", 1, BLUE),
        (280, 360, 750, 680, "Diagnostik Kepatuhan SLA (Asia/Jakarta)", 2, BLUE)
    ],
    "SCR-MAS-01": [
        (280, 120, 800, 170, "Navigasi Tab: Departemen, Jenis, Reviewer, Pengguna", 1, BLUE),
        (280, 180, 1380, 260, "Form Tambah Data Departemen / Unit Kerja Baru", 2, BLUE)
    ],
    "SCR-MAS-04": [
        (280, 180, 1380, 300, "Form Pembuatan Akun Baru (Role, Email, Password)", 1, BLUE),
        (280, 320, 1380, 750, "Daftar Akun Pengguna, Penugasan Peran & Status Aktif", 2, BLUE)
    ],
    "SCR-HIS-01": [
        (280, 120, 1380, 200, "Filter Pencarian Jejak Audit Global", 1, BLUE),
        (280, 220, 1380, 820, "Log Aktivitas Mutu Multi-Perusahaan Terpusat", 2, BLUE)
    ],
    "SCR-ANA-01": [
        (280, 120, 1380, 280, "Metrik Analitik Kinerja SLA & Volume Dokumen", 1, BLUE)
    ]
}

def annotate_image(src_path, dst_path, code):
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # 1. Top Enterprise Watermark Header Banner
    header_h = 32
    draw.rectangle([(0, 0), (w, header_h)], fill=(32, 41, 61, 235))
    draw.text((16, 7), "QMS MONITOR • PANDUAN PENGGUNA RESMI", fill=WHITE, font=font_title)
    code_text = f"KODE ARTIFAK: {code}  |  STATUS: TERVERIFIKASI SISTEM"
    draw.text((w - 420, 7), code_text, fill=(180, 200, 240, 255), font=font_caption)

    # 2. Draw Callouts if mapped
    if code in CALLOUTS:
        for (x1, y1, x2, y2, label, num, color) in CALLOUTS[code]:
            # Bounding box
            draw.rounded_rectangle([(x1, y1), (x2, y2)], radius=6, outline=color, width=3)
            
            # Badge Circle
            r = 14
            bx, by = x1 - 5, y1 - 5
            draw.ellipse([(bx - r, by - r), (bx + r, by + r)], fill=color, outline=WHITE, width=2)
            num_str = str(num)
            draw.text((bx - 4, by - 8), num_str, fill=WHITE, font=font_badge)

            # Caption Pill
            tw = len(label) * 8 + 20
            px1, py1 = bx + r + 6, by - 12
            px2, py2 = px1 + tw, py1 + 24
            draw.rounded_rectangle([(px1, py1), (px2, py2)], radius=4, fill=(32, 41, 61, 225), outline=color, width=1)
            draw.text((px1 + 8, py1 + 4), label, fill=WHITE, font=font_caption)

    # Merge overlay with image
    final_img = Image.alpha_composite(img, overlay).convert("RGB")
    final_img.save(dst_path, "PNG", quality=95)
    print(f"  ✓ Annotated: {os.path.basename(dst_path)}")

def main():
    print("🎨 Processing Screenshot Annotations...")
    files = glob.glob(os.path.join(ORIG_DIR, "*.png"))
    for f in sorted(files):
        filename = os.path.basename(f)
        code = os.path.splitext(filename)[0]
        dst = os.path.join(ANN_DIR, filename)
        annotate_image(f, dst, code)
    print(f"🎉 Successfully created {len(files)} annotated screenshots in {ANN_DIR}")

if __name__ == "__main__":
    main()

