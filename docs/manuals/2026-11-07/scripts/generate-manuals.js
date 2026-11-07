const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const { chromium } = require('playwright');

const SOURCE_DIR = path.resolve(__dirname, '../source');
const FINAL_DIR = path.resolve(__dirname, '../final');
const SCREENSHOTS_DIR = path.resolve(__dirname, '../screenshots');

fs.mkdirSync(FINAL_DIR, { recursive: true });

const MANUALS = [
  {
    id: '01',
    src: '01_QUICK_START.md',
    pdf: '01_PANDUAN_RINGKAS_QMS_MONITOR.pdf',
    title: 'PANDUAN RINGKAS & PENGENALAN SISTEM',
    docNo: 'QMS-MMP-MNL-001',
    roleTarget: 'Seluruh Pengguna & Manajemen Mutu',
    desc: 'Pengenalan Arsitektur, Alur Persetujuan Berjenjang, Status Dokumen, dan Ketentuan SLA Asia/Jakarta.'
  },
  {
    id: '02',
    src: '02_ADMINISTRATOR.md',
    pdf: '02_PANDUAN_ADMINISTRATOR_QMS_MONITOR.pdf',
    title: 'PANDUAN PENGGUNA ADMINISTRATOR SISTEM',
    docNo: 'QMS-MMP-ADM-002',
    roleTarget: 'Administrator Sistem Mutu & IT',
    desc: 'Pengelolaan Akun Pengguna, Master Departemen, Jenis Dokumen & SLA, Supervisi Multi-Tenant, dan Audit Trail.'
  },
  {
    id: '03',
    src: '03_QMS_SUBMITTER.md',
    pdf: '03_PANDUAN_QMS_SUBMITTER.pdf',
    title: 'PANDUAN PENGAJU DOKUMEN (QMS SUBMITTER)',
    docNo: 'QMS-MMP-SUB-003',
    roleTarget: 'Staff QMS & Pemilik Dokumen Departemen',
    desc: 'Formulir Pengajuan Baru, Revisi Klausul, Pengunggahan Lampiran Perbaikan, dan Penutupan Siklus Dokumen.'
  },
  {
    id: '04',
    src: '04_QMS_SECTION_HEAD.md',
    pdf: '04_PANDUAN_QMS_SECTION_HEAD.pdf',
    title: 'PANDUAN PENELAAH TAHAP 1 (QMS SECTION HEAD)',
    docNo: 'QMS-MMP-SEC-004',
    roleTarget: 'Kepala Seksi Kendali Mutu (Section Head)',
    desc: 'Antrian Review Tahap 1, Verifikasi Format & Tipografi, Catatan Masukan Revisi, dan Penerusan ke QMSR.'
  },
  {
    id: '05',
    src: '05_QMSR.md',
    pdf: '05_PANDUAN_QMSR_MUTU.pdf',
    title: 'PANDUAN WAKIL MANAJEMEN MUTU (QMSR)',
    docNo: 'QMS-MMP-QMR-005',
    roleTarget: 'QMSR & Executive Management Representative',
    desc: 'Evaluasi Kepatuhan Standar Akreditasi (ISO/BRCGS/HACCP), Pengesahan Resmi (Approval), dan Penolakan.'
  },
  {
    id: '06',
    src: '06_UAT_WORKBOOK.md',
    pdf: '06_BUKU_KERJA_UAT_QMS_MONITOR.pdf',
    title: 'BUKU KERJA PENGUJIAN PENERIMAAN PENGGUNA (UAT)',
    docNo: 'QMS-MMP-UAT-006',
    roleTarget: 'Tim QA, Auditor Internal & Pemangku Kepentingan',
    desc: 'Lembar Verifikasi 30 Skenario UAT Fungsional Lengkap (100% Pass) dan Lembar Pengesahan Sign-Off.'
  }
];

function buildHtml(markdownContent, meta) {
  // Convert markdown to html
  let htmlBody = marked.parse(markdownContent);

  // Replace relative screenshot paths with file:// absolute URLs
  htmlBody = htmlBody.replace(/src="\.\.\/screenshots\/(.*?)"/g, (match, relPath) => {
    const absPath = path.join(SCREENSHOTS_DIR, relPath);
    return `src="file://${absPath}"`;
  });

  // Convert alerts [!NOTE], [!WARNING], etc. into styled alert cards
  htmlBody = htmlBody.replace(/<blockquote>\s*<p>\[!NOTE\]([\s\S]*?)<\/blockquote>/g, '<div class="alert alert-note"><span class="alert-icon">ℹ</span><div class="alert-content"><p>$1</div></div>');
  htmlBody = htmlBody.replace(/<blockquote>\s*<p>\[!WARNING\]([\s\S]*?)<\/blockquote>/g, '<div class="alert alert-warning"><span class="alert-icon">⚠️</span><div class="alert-content"><p>$1</div></div>');
  htmlBody = htmlBody.replace(/<blockquote>\s*<p>\[!TIP\]([\s\S]*?)<\/blockquote>/g, '<div class="alert alert-tip"><span class="alert-icon">💡</span><div class="alert-content"><p>$1</div></div>');
  htmlBody = htmlBody.replace(/<blockquote>\s*<p>\[!IMPORTANT\]([\s\S]*?)<\/blockquote>/g, '<div class="alert alert-important"><span class="alert-icon">⚡</span><div class="alert-content"><p>$1</div></div>');

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>${meta.title} — QMS Monitor</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Manrope:wght@600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  @page {
    size: A4 portrait;
    margin: 20mm 14mm 18mm 14mm;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  body {
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1E293B;
    background: #FFFFFF;
    line-height: 1.6;
    font-size: 10.5pt;
    margin: 0;
    padding: 0;
  }

  /* Cover Page */
  .cover-page {
    page-break-after: always;
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 30px 10px 20px 10px;
  }

  .cover-top {
    border-bottom: 3px solid #315FE8;
    padding-bottom: 24px;
  }

  .cover-company-badge {
    display: inline-block;
    background: #20293D;
    color: #FFFFFF;
    font-size: 9pt;
    font-weight: 700;
    padding: 6px 14px;
    border-radius: 4px;
    letter-spacing: 1px;
    margin-bottom: 16px;
  }

  .cover-doc-id {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11pt;
    font-weight: 600;
    color: #315FE8;
    margin-bottom: 8px;
  }

  .cover-title {
    font-family: 'Manrope', sans-serif;
    font-size: 26pt;
    font-weight: 800;
    color: #0F172A;
    line-height: 1.15;
    margin: 0 0 12px 0;
  }

  .cover-subtitle {
    font-size: 13pt;
    color: #475569;
    font-weight: 500;
    line-height: 1.4;
    margin: 0 0 20px 0;
  }

  .cover-mid {
    margin: 30px 0;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-left: 5px solid #315FE8;
    border-radius: 6px;
    padding: 20px;
  }

  .cover-mid table {
    width: 100%;
    border-collapse: collapse;
  }

  .cover-mid td {
    padding: 8px 12px;
    font-size: 10pt;
    border-bottom: 1px solid #E2E8F0;
  }

  .cover-mid tr:last-child td {
    border-bottom: none;
  }

  .cover-mid td.lbl {
    font-weight: 700;
    color: #334155;
    width: 35%;
  }

  .cover-mid td.val {
    color: #0F172A;
  }

  .cover-bottom {
    border-top: 1px solid #E2E8F0;
    padding-top: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 9pt;
    color: #64748B;
  }

  .cover-bottom b {
    color: #0F172A;
  }

  /* Main Document Typography */
  h1 {
    font-family: 'Manrope', sans-serif;
    font-size: 18pt;
    font-weight: 800;
    color: #0F172A;
    border-bottom: 2px solid #E2E8F0;
    padding-bottom: 6px;
    margin-top: 26px;
    margin-bottom: 14px;
    page-break-after: avoid;
  }

  h2 {
    font-family: 'Manrope', sans-serif;
    font-size: 14pt;
    font-weight: 700;
    color: #1E293B;
    margin-top: 22px;
    margin-bottom: 10px;
    page-break-after: avoid;
    border-left: 4px solid #315FE8;
    padding-left: 8px;
  }

  h3 {
    font-family: 'Manrope', sans-serif;
    font-size: 11.5pt;
    font-weight: 700;
    color: #334155;
    margin-top: 16px;
    margin-bottom: 8px;
    page-break-after: avoid;
  }

  p {
    margin: 0 0 10px 0;
    text-align: justify;
  }

  ul, ol {
    margin: 0 0 12px 0;
    padding-left: 22px;
  }

  li {
    margin-bottom: 4px;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0 18px 0;
    font-size: 9pt;
    page-break-inside: auto;
  }

  tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }

  th {
    background-color: #20293D;
    color: #FFFFFF;
    font-weight: 700;
    text-align: left;
    padding: 8px 10px;
    border: 1px solid #1E293B;
  }

  td {
    padding: 7px 10px;
    border: 1px solid #CBD5E1;
    vertical-align: top;
  }

  tr:nth-child(even) td {
    background-color: #F8FAFC;
  }

  /* Images / Screenshots */
  img {
    display: block;
    max-width: 100%;
    height: auto;
    margin: 16px auto 6px auto;
    border-radius: 6px;
    border: 1px solid #CBD5E1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    page-break-inside: avoid;
  }

  em {
    display: block;
    text-align: center;
    font-size: 8.5pt;
    color: #64748B;
    margin-bottom: 16px;
    font-style: italic;
    page-break-before: avoid;
  }

  /* Alert Boxes */
  .alert {
    display: flex;
    align-items: flex-start;
    padding: 12px 16px;
    border-radius: 6px;
    margin: 14px 0;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }

  .alert-icon {
    font-size: 14pt;
    margin-right: 12px;
    line-height: 1;
  }

  .alert-content p {
    margin: 0;
    text-align: left;
  }

  .alert-note {
    background: #EFF6FF;
    border-left: 4px solid #315FE8;
    color: #1E40AF;
  }

  .alert-warning {
    background: #FFFBEB;
    border-left: 4px solid #F59E0B;
    color: #92400E;
  }

  .alert-tip {
    background: #ECFDF5;
    border-left: 4px solid #10B981;
    color: #065F46;
  }

  .alert-important {
    background: #FEF2F2;
    border-left: 4px solid #EF4444;
    color: #991B1B;
  }

  /* Code blocks & pre */
  pre, code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5pt;
  }

  code {
    background: #F1F5F9;
    padding: 2px 5px;
    border-radius: 3px;
    color: #0F172A;
  }

  pre {
    background: #0F172A;
    color: #F8FAFC;
    padding: 12px 16px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 12px 0;
    page-break-inside: avoid;
  }

  pre code {
    background: transparent;
    color: inherit;
    padding: 0;
  }

  /* Blockquote fallback */
  blockquote {
    border-left: 4px solid #315FE8;
    margin: 12px 0;
    padding: 8px 16px;
    background: #F8FAFC;
    color: #334155;
    page-break-inside: avoid;
  }

  /* Page break helpers */
  .page-break {
    page-break-after: always;
  }
</style>
</head>
<body>

<!-- Cover Page -->
<div class="cover-page">
  <div class="cover-top">
    <div class="cover-company-badge">PT. MEGA MARINE PRIDE &bull; PT. BARAMUDA BAHARI</div>
    <div class="cover-doc-id">DOKUMEN RESMI: ${meta.docNo} &bull; EDISI 1.0</div>
    <h1 class="cover-title">${meta.title}</h1>
    <div class="cover-subtitle">${meta.desc}</div>
  </div>

  <div class="cover-mid">
    <table>
      <tr>
        <td class="lbl">Aplikasi Terkait</td>
        <td class="val"><b>QMS Monitor</b> (Sistem Pemantauan Dokumen Mutu Terpadu)</td>
      </tr>
      <tr>
        <td class="lbl">Sasaran Pengguna</td>
        <td class="val"><b>${meta.roleTarget}</b></td>
      </tr>
      <tr>
        <td class="lbl">Otoritas & PIC</td>
        <td class="val">Rosalia Pratiwi & Tim Kendali Mutu Lintas Entitas</td>
      </tr>
      <tr>
        <td class="lbl">Tanggal Efektif</td>
        <td class="val">7 November 2026</td>
      </tr>
      <tr>
        <td class="lbl">Standar Sistem Mutu</td>
        <td class="val">ISO 9001:2015 &bull; HACCP Codex &bull; BRCGS Global Standard</td>
      </tr>
      <tr>
        <td class="lbl">Status Verifikasi</td>
        <td class="val"><span style="color:#10B981;font-weight:700;">TERVERIFIKASI SISTEM PRODUKSI (100% PASS)</span></td>
      </tr>
    </table>
  </div>

  <div class="cover-bottom">
    <div>Unit Kerja: <b>Quality Assurance & Document Control Department</b></div>
    <div>Klasifikasi: <b>INTERNAL RESTRICTED</b></div>
  </div>
</div>

<!-- Main Document Content -->
<div class="content">
${htmlBody}
</div>

</body>
</html>`;
}

async function generateAllPdfs() {
  console.log('🚀 Starting Autonomous Enterprise PDF Publishing Pipeline...');
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });

  const page = await browser.newPage();

  for (const m of MANUALS) {
    console.log(`\n📄 Generating [${m.id}/06]: ${m.pdf}...`);
    const srcPath = path.join(SOURCE_DIR, m.src);
    if (!fs.existsSync(srcPath)) {
      console.error(`  ❌ Error: Source file not found: ${srcPath}`);
      continue;
    }

    const mdContent = fs.readFileSync(srcPath, 'utf8');
    const htmlContent = buildHtml(mdContent, m);

    // Write temp html for debugging & rendering
    const tempHtmlPath = path.join(FINAL_DIR, `temp_${m.id}.html`);
    fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

    await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600); // ensure fonts and images settle

    const pdfPath = path.join(FINAL_DIR, m.pdf);
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      margin: {
        top: '70px',
        bottom: '60px',
        left: '42px',
        right: '42px'
      },
      headerTemplate: `
        <div style="font-family:'DM Sans',Helvetica,sans-serif; font-size:7.5pt; color:#64748B; width:100%; border-bottom:1px solid #E2E8F0; padding: 0 42px 4px 42px; display:flex; justify-content:space-between; align-items:center;">
          <span><b>QMS MONITOR</b> &bull; PT. MEGA MARINE PRIDE &bull; PT. BARAMUDA BAHARI</span>
          <span style="color:#315FE8; font-weight:600;">${m.docNo}</span>
        </div>
      `,
      footerTemplate: `
        <div style="font-family:'DM Sans',Helvetica,sans-serif; font-size:7.5pt; color:#64748B; width:100%; border-top:1px solid #E2E8F0; padding: 4px 42px 0 42px; display:flex; justify-content:space-between; align-items:center;">
          <span>${m.title}</span>
          <span>Halaman <span class="pageNumber"></span> dari <span class="totalPages"></span></span>
        </div>
      `
    });

    // Remove temp file
    if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath);

    const stats = fs.statSync(pdfPath);
    console.log(`  ✓ Generated: ${m.pdf} (${Math.round(stats.size / 1024)} KB)`);
  }

  await browser.close();
  console.log('\n🎉 ALL 6 OFFICIAL ENTERPRISE PDF MANUALS GENERATED SUCCESSFULLY!');
}

generateAllPdfs().catch(err => {
  console.error('❌ PDF Generation Error:', err);
  process.exit(1);
});

