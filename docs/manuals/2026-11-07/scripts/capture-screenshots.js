const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3100';
const ORIG_DIR = path.resolve(__dirname, '../screenshots/original');
const MOB_DIR = path.resolve(__dirname, '../screenshots/mobile');

fs.mkdirSync(ORIG_DIR, { recursive: true });
fs.mkdirSync(MOB_DIR, { recursive: true });

async function run() {
  console.log('🚀 Starting Robust Full-Fidelity Screenshot Capture Pipeline...');
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });

  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    timezoneId: 'Asia/Jakarta',
    locale: 'id-ID'
  });

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    timezoneId: 'Asia/Jakarta',
    locale: 'id-ID'
  });

  const page = await desktopContext.newPage();
  const mobPage = await mobileContext.newPage();

  async function snap(name) {
    const filePath = path.join(ORIG_DIR, `${name}.png`);
    await page.screenshot({ path: filePath });
    console.log(`  ✓ Saved: ${name}.png`);
  }

  async function snapMobile(name) {
    const filePath = path.join(MOB_DIR, `${name}.png`);
    await mobPage.screenshot({ path: filePath });
    console.log(`  ✓ Saved Mobile: ${name}.png`);
  }

  try {
    // =============================================================
    // 1. AUTHENTICATION & PORTAL (SCR-AUTH-01 to 04)
    // =============================================================
    console.log('\n--- Capturing Authentication Screens ---');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await snap('SCR-AUTH-01');

    // Validation error on invalid credentials
    await page.fill('input[type="email"]', 'rosalia.salah@megamarinepride.com');
    await page.fill('input[type="password"]', 'PasswordSalah123');
    await page.click('button.login-submit');
    await page.waitForTimeout(500);
    await snap('SCR-AUTH-02');

    // Theme selector on sidebar
    await page.goto(`${BASE_URL}/?role=admin`);
    await page.waitForLoadState('networkidle');
    const themeBtn = await page.$('.theme-trigger');
    if (themeBtn) {
      await themeBtn.click();
      await page.waitForTimeout(400);
    }
    await snap('SCR-AUTH-03');

    // Account activation / accept invite
    await page.goto(`${BASE_URL}/accept-invite`);
    await page.waitForLoadState('networkidle');
    await snap('SCR-AUTH-04');

    // =============================================================
    // 2. DASHBOARD & MONITORING (SCR-DASH-01 to 09)
    // =============================================================
    console.log('\n--- Capturing Dashboard Screens ---');
    await page.goto(`${BASE_URL}/?role=admin`);
    await page.waitForLoadState('networkidle');
    await snap('SCR-DASH-01');

    // Multi-company filter focus
    const compSelect = await page.$('select');
    if (compSelect) await compSelect.focus();
    await snap('SCR-DASH-02');

    // Period / Dept filter
    await snap('SCR-DASH-03');

    // 4 Modern KPI Cards
    await snap('SCR-DASH-04');

    // Monthly Performance Chart
    await page.evaluate(() => window.scrollTo(0, 350));
    await page.waitForTimeout(300);
    await snap('SCR-DASH-05');

    // Workload & Status Distribution
    await page.evaluate(() => window.scrollTo(0, 750));
    await page.waitForTimeout(300);
    await snap('SCR-DASH-06');

    // Submitter Dashboard (QMS)
    await page.goto(`${BASE_URL}/?role=qms`);
    await page.waitForLoadState('networkidle');
    await snap('SCR-DASH-07');

    // Section Head Dashboard
    await page.goto(`${BASE_URL}/?role=qms_section_head`);
    await page.waitForLoadState('networkidle');
    await snap('SCR-DASH-08');

    // QMSR Dashboard
    await page.goto(`${BASE_URL}/?role=qmsr`);
    await page.waitForLoadState('networkidle');
    await snap('SCR-DASH-09');

    // =============================================================
    // 3. NEW SUBMISSION (SCR-NEW-01 to 09)
    // =============================================================
    console.log('\n--- Capturing New Submission Screens ---');
    await page.goto(`${BASE_URL}/new?role=qms`);
    await page.waitForLoadState('networkidle');
    await snap('SCR-NEW-01');

    // Focus Company Select
    const compField = await page.$('.company-select-field');
    if (compField) await compField.focus();
    await snap('SCR-NEW-02');

    // Select "Dokumen Lama" to show Alasan Perubahan
    await page.selectOption('label:has-text("Status Dokumen") select', 'existing');
    await page.waitForTimeout(300);
    await snap('SCR-NEW-03');

    // Fill metadata fields
    await page.selectOption('select[name="department"]', { index: 1 });
    await page.fill('input[name="docNo"]', 'SOP/QA/2026/088');
    await page.fill('input[name="revision"]', 'Rev 02');
    await page.fill('input[name="title"]', 'SOP Pengendalian Dokumen Mutu Terpadu');
    await page.fill('textarea[name="reason"]', 'Penyesuaian klausul ISO 9001:2015 tahunan.');
    await snap('SCR-NEW-04');

    // Reviewer & Priority assignment
    await page.selectOption('select[name="reviewer"]', { index: 1 });
    await page.selectOption('select[name="priority"]', 'high');
    await snap('SCR-NEW-05');

    // File upload area
    await page.evaluate(() => {
      const el = document.querySelector('.form-panel:nth-of-type(2)');
      if (el) el.scrollIntoView();
    });
    await snap('SCR-NEW-06');

    // Sidebar SLA preview
    await page.evaluate(() => window.scrollTo(0, 0));
    await snap('SCR-NEW-07');

    // Action buttons
    await page.evaluate(() => window.scrollTo(0, 600));
    await snap('SCR-NEW-08');

    // Form validation error
    await page.goto(`${BASE_URL}/new?role=qms`);
    await page.waitForLoadState('networkidle');
    // Select existing condition without reason, and click submit
    await page.selectOption('label:has-text("Status Dokumen") select', 'existing');
    await page.fill('input[name="docNo"]', 'SOP/QA/2026/099');
    await page.fill('input[name="revision"]', 'Rev 00');
    await page.fill('input[name="title"]', 'Contoh Pengujian Validasi Field Kosong');
    await page.selectOption('select[name="department"]', { index: 1 });
    await page.click('.desktop-submit button.primary');
    await page.waitForTimeout(400);
    await snap('SCR-NEW-09');

    // =============================================================
    // 4. DOCUMENT REPOSITORY & FILTERS (SCR-DOC-01 to 05)
    // =============================================================
    console.log('\n--- Capturing Document Repository Screens ---');
    await page.goto(`${BASE_URL}/documents?role=admin`);
    await page.waitForLoadState('networkidle');
    await snap('SCR-DOC-01');

    // Search filter
    await page.fill('input[placeholder*="Cari"]', 'Cloud');
    await page.waitForTimeout(400);
    await snap('SCR-DOC-02');
    await page.fill('input[placeholder*="Cari"]', '');

    // Export buttons
    await snap('SCR-DOC-03');

    // Print preview layout
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(300);
    await snap('SCR-DOC-04');
    await page.emulateMedia({ media: 'screen' });

    // Admin Delete / Archive button
    await snap('SCR-DOC-05');

    // =============================================================
    // 5. REVIEW QUEUES & ACTIONS (SCR-ACT-01 to 04)
    // =============================================================
    console.log('\n--- Capturing Action Queue Screens ---');
    await page.goto(`${BASE_URL}/actions?role=qms_section_head`);
    await page.waitForLoadState('networkidle');
    await snap('SCR-ACT-01');

    // Urgent item close-up
    await snap('SCR-ACT-02');

    // QMSR queue
    await page.goto(`${BASE_URL}/actions?role=qmsr`);
    await page.waitForLoadState('networkidle');
    await snap('SCR-ACT-03');

    // Submitter queue
    await page.goto(`${BASE_URL}/actions?role=qms`);
    await page.waitForLoadState('networkidle');
    await snap('SCR-ACT-04');

    // =============================================================
    // 6. DOCUMENT DETAIL & WORKFLOW TRANSITIONS (SCR-DET-01 to 11)
    // =============================================================
    console.log('\n--- Capturing Document Detail Screens ---');
    // SCR-DET-01: Metadata detail
    await page.goto(`${BASE_URL}/documents/demo-1?role=admin`);
    await page.waitForLoadState('networkidle');
    await snap('SCR-DET-01');

    // SCR-DET-02: Edit mode
    await page.goto(`${BASE_URL}/documents/demo-2?role=qms`);
    await page.waitForLoadState('networkidle');
    const editBtn = await page.$('button:has-text("Ubah Data")') || await page.$('button:has-text("Edit")');
    if (editBtn) {
      await editBtn.click();
      await page.waitForTimeout(300);
    }
    await snap('SCR-DET-02');

    // SCR-DET-03: Section Head Action panel
    await page.goto(`${BASE_URL}/documents/demo-1?role=qms_section_head`);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      const el = document.querySelector('.workflow-panel') || document.querySelector('.workflow-actions');
      if (el) el.scrollIntoView();
    });
    await snap('SCR-DET-03');

    // SCR-DET-04: Review comment input
    const noteArea = await page.$('.workflow-note textarea');
    if (noteArea) {
      await noteArea.fill('Klausul 4.2 perlu diperjelas mengenai penanggung jawab distribusi fisik.');
    }
    await snap('SCR-DET-04');

    // SCR-DET-05: Need Revision banner
    await page.goto(`${BASE_URL}/documents/demo-2?role=qms`);
    await page.waitForLoadState('networkidle');
    await snap('SCR-DET-05');

    // SCR-DET-06: Upload revision & resubmit
    await page.evaluate(() => {
      const el = document.querySelector('.workflow-panel') || document.querySelector('.attachment-card');
      if (el) el.scrollIntoView();
      else window.scrollTo(0, 500);
    });
    await snap('SCR-DET-06');

    // SCR-DET-07: QMSR Approval panel
    await page.goto(`${BASE_URL}/documents/demo-6?role=qmsr`);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      const el = document.querySelector('.workflow-panel');
      if (el) el.scrollIntoView();
    });
    await snap('SCR-DET-07');

    // SCR-DET-08: Approved status
    await page.goto(`${BASE_URL}/documents/demo-3?role=admin`);
    await page.waitForLoadState('networkidle');
    await snap('SCR-DET-08');

    // SCR-DET-09: Close document button
    await page.goto(`${BASE_URL}/documents/demo-3?role=qms`);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      const el = document.querySelector('.workflow-panel');
      if (el) el.scrollIntoView();
    });
    await snap('SCR-DET-09');

    // SCR-DET-10: Follow-up coordination notes
    await page.goto(`${BASE_URL}/documents/demo-1?role=admin`);
    await page.waitForLoadState('networkidle');
    const toggleFollowBtn = await page.$('button:has-text("Tambah Catatan Follow Up")');
    if (toggleFollowBtn) {
      await toggleFollowBtn.click();
      await page.waitForTimeout(300);
    }
    await page.evaluate(() => {
      const el = document.querySelector('.detail-followups') || document.querySelector('.followup-section');
      if (el) el.scrollIntoView();
      else window.scrollTo(0, 450);
    });
    await snap('SCR-DET-10');

    // SCR-DET-11: Chronological Audit Trail
    await page.evaluate(() => {
      const el = document.querySelector('.history-timeline') || document.querySelector('.timeline');
      if (el) el.scrollIntoView();
      else window.scrollTo(0, 800);
    });
    await snap('SCR-DET-11');

    // =============================================================
    // 7. TRACKING & MILESTONE (SCR-TRK-01 to 05)
    // =============================================================
    console.log('\n--- Capturing Tracking Screens ---');
    await page.goto(`${BASE_URL}/tracking?role=admin`);
    await page.waitForLoadState('networkidle');
    await snap('SCR-TRK-01');

    // Quick selector
    const docTrackSelect = await page.$('select');
    if (docTrackSelect) await docTrackSelect.focus();
    await snap('SCR-TRK-02');

    // Active document banner
    await snap('SCR-TRK-03');

    // SLA diagnostic box
    await page.evaluate(() => {
      const el = document.querySelector('.sla-diagnostic') || document.querySelector('.tracking-sla-box');
      if (el) el.scrollIntoView();
      else window.scrollTo(0, 300);
    });
    await snap('SCR-TRK-04');

    // Reviewer feedback note card
    await page.evaluate(() => {
      const el = document.querySelector('.feedback-card') || document.querySelector('.tracking-feedback');
      if (el) el.scrollIntoView();
      else window.scrollTo(0, 500);
    });
    await snap('SCR-TRK-05');

    // =============================================================
    // 8. MASTER DATA (SCR-MAS-01 to 06)
    // =============================================================
    console.log('\n--- Capturing Master Data Screens ---');
    await page.goto(`${BASE_URL}/master-data?role=admin`);
    await page.waitForLoadState('networkidle');
    await snap('SCR-MAS-01');

    // Tab Jenis Dokumen
    await page.click('button:has-text("Jenis Dokumen")');
    await page.waitForTimeout(300);
    await snap('SCR-MAS-02');

    // Tab Reviewer
    await page.click('button:has-text("Reviewer")');
    await page.waitForTimeout(300);
    await snap('SCR-MAS-03');

    // Tab Pengguna
    await page.click('button:has-text("Pengguna")');
    await page.waitForTimeout(400);
    await snap('SCR-MAS-04');

    // Add user form filled
    await page.fill('input[placeholder*="Nama lengkap"]', 'Praditya Nugraha, S.T.');
    await page.fill('input[placeholder*="Email"]', 'praditya.nugraha@baramuda.com');
    await page.fill('input[placeholder*="Kata sandi"]', 'MutuBaramuda2026!');
    await page.selectOption('select[aria-label*="Role"]', 'qms_section_head');
    await snap('SCR-MAS-05');

    // Edit user row
    const userEditBtn = await page.$('.managed-user-row button:has-text("Edit")');
    if (userEditBtn) {
      await userEditBtn.click();
      await page.waitForTimeout(300);
    }
    await snap('SCR-MAS-06');

    // =============================================================
    // 9. AUDIT HISTORY & ANALYTICS (SCR-HIS-01, SCR-ANA-01)
    // =============================================================
    console.log('\n--- Capturing Audit History & Analytics Screens ---');
    await page.goto(`${BASE_URL}/history?role=admin`);
    await page.waitForLoadState('networkidle');
    await snap('SCR-HIS-01');

    await page.goto(`${BASE_URL}/analytics?role=admin`);
    await page.waitForLoadState('networkidle');
    await snap('SCR-ANA-01');

    // =============================================================
    // 10. MOBILE VIEWS (SCR-MOB-01 to 05)
    // =============================================================
    console.log('\n--- Capturing Mobile Screens (390x844) ---');
    await mobPage.goto(`${BASE_URL}/?role=qms`);
    await mobPage.waitForLoadState('networkidle');
    await snapMobile('SCR-MOB-01');

    // Mobile Hamburger Menu
    const menuBtn = await mobPage.$('button[aria-label*="menu"]') || await mobPage.$('.icon-button');
    if (menuBtn) {
      await menuBtn.click();
      await mobPage.waitForTimeout(400);
    }
    await snapMobile('SCR-MOB-02');

    // Mobile New Submission
    await mobPage.goto(`${BASE_URL}/new?role=qms`);
    await mobPage.waitForLoadState('networkidle');
    await snapMobile('SCR-MOB-03');

    // Mobile Tracking
    await mobPage.goto(`${BASE_URL}/tracking?role=qms`);
    await mobPage.waitForLoadState('networkidle');
    await snapMobile('SCR-MOB-04');

    // Mobile Actions Queue
    await mobPage.goto(`${BASE_URL}/actions?role=qms_section_head`);
    await mobPage.waitForLoadState('networkidle');
    await snapMobile('SCR-MOB-05');

    console.log('\n🎉 ALL 60 SCREENSHOTS CAPTURED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Error during capture:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
