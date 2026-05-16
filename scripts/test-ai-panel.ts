import { firefox } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:5179/project-hub/';
const SCREENSHOT_DIR = path.resolve(import.meta.dirname, '../screenshots/ai-panel');

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

  // Navigate to builder
  console.log('\n--- Navigate to Builder ---');
  await page.goto(`${BASE_URL}#/builder`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await shot('01-builder-initial');

  // Click AI tab
  console.log('\n--- Switch to AI tab ---');
  const aiTab = page.locator('button').filter({ hasText: 'AI' });
  if (await aiTab.count() > 0) {
    await aiTab.click();
    await page.waitForTimeout(500);
    await shot('02-ai-tab-empty');
    console.log('  ✓ AI tab opened');
  } else {
    console.log('  ⚠ AI tab not found');
  }

  // Check for Generate Diagram button
  const generateBtn = page.locator('button').filter({ hasText: 'Generate Diagram' });
  const generateExists = await generateBtn.count() > 0;
  console.log(`  Generate Diagram button: ${generateExists ? 'found' : 'NOT found'}`);

  // Check for Review and Suggest buttons
  const reviewBtn = page.locator('button').filter({ hasText: 'Review Architecture' });
  const suggestBtn = page.locator('button').filter({ hasText: 'Suggest Components' });
  console.log(`  Review Architecture button: ${await reviewBtn.count() > 0 ? 'found' : 'NOT found'}`);
  console.log(`  Suggest Components button: ${await suggestBtn.count() > 0 ? 'found' : 'NOT found'}`);

  // Switch to Properties tab then back to AI to test persistence
  console.log('\n--- Test tab switching (chat persistence) ---');

  // Type something in the input first
  const chatInput = page.locator('input[placeholder*="Describe"]');
  if (await chatInput.count() > 0) {
    await chatInput.fill('Test message for persistence');
    await shot('03-ai-with-input');
    console.log('  ✓ Typed into input field');
  }

  // Switch to Properties
  const propsTab = page.locator('button').filter({ hasText: 'PROPERTIES' });
  if (await propsTab.count() > 0) {
    await propsTab.click();
    await page.waitForTimeout(300);
    await shot('04-switched-to-properties');
    console.log('  ✓ Switched to Properties tab');
  }

  // Switch back to AI
  if (await aiTab.count() > 0) {
    await aiTab.click();
    await page.waitForTimeout(300);
    await shot('05-back-to-ai');

    // Check if input text persisted
    const inputValue = await page.locator('input[placeholder*="Describe"]').inputValue();
    console.log(`  Input value after switch: "${inputValue}"`);
    if (inputValue === 'Test message for persistence') {
      console.log('  ✓ Input text persisted across tab switch');
    } else {
      console.log('  ⚠ Input text was LOST during tab switch');
    }
  }

  // Check the overall layout of the AI panel
  console.log('\n--- Check AI panel layout ---');
  const panelButtons = await page.locator('button').allTextContents();
  const aiPanelButtons = panelButtons.filter(t =>
    t.includes('Generate') || t.includes('Review') || t.includes('Suggest')
  );
  console.log(`  Action buttons in panel: ${aiPanelButtons.join(', ')}`);

  // Summary
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
  console.error('AI panel test failed:', err);
  process.exit(1);
});
