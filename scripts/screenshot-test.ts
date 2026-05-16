import { firefox } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:5174/project-hub/';
const SCREENSHOT_DIR = path.resolve(import.meta.dirname, '../screenshots');

async function run() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`Console error: ${msg.text()}`);
  });
  page.on('pageerror', err => {
    errors.push(`Page error: ${err.message}`);
  });

  const shot = async (name: string) => {
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`) });
    console.log(`  ✓ ${name}.png`);
  };

  // ---------- Test 1: Initial page load (desktop) ----------
  console.log('\n--- Test 1: Desktop page load ---');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await shot('01-desktop-full');

  // Scroll to each section
  const workflowsEl = page.locator('#workflows');
  if (await workflowsEl.count() > 0) {
    await workflowsEl.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await shot('02-workflows-section');
  } else {
    console.log('  ⚠ #workflows section not found');
  }

  const pipelineEl = page.locator('#pipeline');
  if (await pipelineEl.count() > 0) {
    await pipelineEl.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await shot('03-pipeline-section');
  } else {
    console.log('  ⚠ #pipeline section not found (pipeline data may be null)');
  }

  const projectsEl = page.locator('#projects');
  if (await projectsEl.count() > 0) {
    await projectsEl.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await shot('04-projects-section');
  } else {
    console.log('  ⚠ #projects section not found');
  }

  // ---------- Test 2: NavBar scroll links ----------
  console.log('\n--- Test 2: NavBar links ---');
  const navLinks = await page.locator('nav a[href^="#"]').count();
  console.log(`  Found ${navLinks} nav anchor links`);

  // ---------- Test 3: Dark mode toggle ----------
  console.log('\n--- Test 3: Dark mode toggle ---');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  const currentTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log(`  Current theme: ${currentTheme}`);

  const toggleBtn = page.locator('button[aria-label="Toggle theme"]');
  if (await toggleBtn.count() > 0) {
    await toggleBtn.click();
    await page.waitForTimeout(500);
  } else {
    console.log('  ⚠ Theme toggle button not found');
  }

  const newTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log(`  After toggle: ${newTheme}`);
  await shot('05-after-theme-toggle');

  if (await page.locator('#pipeline').count() > 0) {
    await page.locator('#pipeline').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await shot('06-pipeline-toggled-theme');
  } else if (await page.locator('#projects').count() > 0) {
    await page.locator('#projects').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await shot('06-projects-toggled-theme');
  }

  // Toggle back
  if (await toggleBtn.count() > 0) {
    await toggleBtn.click();
    await page.waitForTimeout(500);
  }

  // ---------- Test 4: Project card interactions ----------
  console.log('\n--- Test 4: Project card buttons ---');
  if (await page.locator('#projects').count() > 0) {
    await page.locator('#projects').scrollIntoViewIfNeeded();
  }
  await page.waitForTimeout(500);

  const allButtonTexts = await page.locator('button').allTextContents();
  console.log(`  Buttons: ${allButtonTexts.join(', ')}`);

  // Click Architecture button
  const archBtn = page.locator('button').filter({ hasText: 'Architecture' }).first();
  if (await archBtn.count() > 0) {
    await archBtn.click();
    await page.waitForTimeout(2000);
    await shot('07-architecture-modal');
    console.log('  ✓ Architecture modal opened');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await shot('08-after-escape');
    console.log('  ✓ Escape pressed');
  } else {
    console.log('  ⚠ No Architecture button found');
  }

  // Click Pipeline button on a project card (not the nav button)
  const pipeBtn = page.locator('#projects button').filter({ hasText: 'Pipeline' }).first();
  if (await pipeBtn.count() > 0) {
    await pipeBtn.click();
    await page.waitForTimeout(2000);
    await shot('09-pipeline-modal');
    console.log('  ✓ Pipeline modal opened');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  } else {
    console.log('  ⚠ No Pipeline button found in projects section');
  }

  // ---------- Test 5: Mobile viewport ----------
  console.log('\n--- Test 5: Mobile (390×844) ---');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await shot('10-mobile-full');

  if (await page.locator('#pipeline').count() > 0) {
    await page.locator('#pipeline').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await shot('11-mobile-pipeline');
  }

  if (await page.locator('#projects').count() > 0) {
    await page.locator('#projects').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await shot('12-mobile-projects');
  }

  // ---------- Test 6: Tablet viewport ----------
  console.log('\n--- Test 6: Tablet (768×1024) ---');
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await shot('13-tablet-full');

  // ---------- Summary ----------
  console.log('\n=== Summary ===');
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
  if (errors.length > 0) {
    console.log(`\n⚠ ${errors.length} console/page errors:`);
    errors.forEach(e => console.log(`  - ${e}`));
  } else {
    console.log('✓ No console or page errors detected');
  }

  await browser.close();
}

run().catch(err => {
  console.error('Screenshot test failed:', err);
  process.exit(1);
});
