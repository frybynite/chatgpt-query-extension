import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script to generate high-quality screenshots for Chrome Web Store
 *
 * Chrome Web Store screenshot requirements:
 * - Minimum: 640x400 or 1280x800
 * - Maximum: 1280x800 or 2560x1600
 * - Aspect ratio: 16:10 preferred
 * - Format: PNG or JPEG
 *
 * This script generates 1280x800 screenshots (16:10 aspect ratio)
 */

async function takeStoreScreenshots() {
  console.log('🎬 Starting screenshot capture for Chrome Web Store...\n');

  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, '../store-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const extensionPath = path.join(__dirname, '..');

  // Launch browser with extension
  const browser = await chromium.launchPersistentContext('', {
    headless: false, // Must be false for extensions
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
    ],
    viewport: { width: 1280, height: 800 }, // Store-friendly size
  });

  const page = await browser.newPage();

  // Get extension ID
  let [background] = browser.serviceWorkers();
  if (!background) background = await browser.waitForEvent('serviceworker');

  const extensionId = background.url().split('/')[2];
  console.log(`✓ Extension loaded with ID: ${extensionId}\n`);

  // Configure the default menu with company profiler data
  console.log('⚙️  Configuring menu with company profiler data...');
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500); // Let UI settle

  // Fill in menu name
  const menuNameInput = page.locator('#menuName');
  await menuNameInput.fill('Company Profile');

  // Fill in GPT URL
  const gptUrlInput = page.locator('#customGptUrl');
  await gptUrlInput.fill('https://chatgpt.com/g/g-68dfbe5566c08191b14e16e520379add-company-profiler');

  // Add first action: Company Summary
  const addActionBtn = page.locator('#add-action');
  await addActionBtn.click();
  await page.waitForTimeout(500);

  const actionItems = page.locator('.action-item');
  const firstAction = actionItems.first();
  await firstAction.locator('.action-title').fill('Company Summary');
  await firstAction.locator('.action-prompt').fill('Provide a summary of the company found in the text including their core business market:');

  // Add keyboard shortcut (Alt+Shift+O - will display as ⌥⇧O on Mac)
  let captureBtn = firstAction.locator('.btn-capture');
  await captureBtn.click();
  await page.waitForTimeout(200);

  await page.keyboard.down('Alt');
  await page.keyboard.down('Shift');
  await page.keyboard.press('KeyO');
  await page.keyboard.up('Shift');
  await page.keyboard.up('Alt');
  await page.waitForTimeout(300);

  // Make sure first action is enabled (should be by default)
  const firstEnabledCheckbox = firstAction.locator('.action-enabled');
  await firstEnabledCheckbox.check();

  // Save the menu configuration so the sidebar updates
  const saveBtn = page.locator('#save');
  await saveBtn.click();
  await page.waitForTimeout(3000); // Wait 3 seconds for save banner to disappear

  console.log('   ✓ Menu configured with first action and saved\n');

  // Screenshot 1: Options page overview
  console.log('📸 Screenshot 1: Options page overview with first action...');

  // Scroll back to top to show clean overview
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  await page.screenshot({
    path: path.join(screenshotsDir, '01-options-page-overview.png'),
    fullPage: false, // Just viewport
  });
  console.log('   ✓ Saved: 01-options-page-overview.png\n');

  // Screenshot 2: Menu with two actions
  console.log('📸 Screenshot 2: Menu with two company profiler actions...');

  // Add second action: Company Revenue
  await addActionBtn.click();
  await page.waitForTimeout(500);

  const secondAction = actionItems.nth(1);
  await secondAction.locator('.action-title').fill('Company Revenue');
  await secondAction.locator('.action-prompt').fill('Provide a 5-year prior and 5-year projected revenue analysis for the given company. Just provide the data, no details required');

  // Add keyboard shortcut (Alt+Shift+P - will display as ⌥⇧P on Mac)
  captureBtn = secondAction.locator('.btn-capture');
  await captureBtn.click();
  await page.waitForTimeout(200);

  await page.keyboard.down('Alt');
  await page.keyboard.down('Shift');
  await page.keyboard.press('KeyP');
  await page.keyboard.up('Shift');
  await page.keyboard.up('Alt');
  await page.waitForTimeout(300);

  // Make sure second action is enabled
  const secondEnabledCheckbox = secondAction.locator('.action-enabled');
  await secondEnabledCheckbox.check();

  // Save the updated configuration
  await saveBtn.click();
  await page.waitForTimeout(3000); // Wait 3 seconds for save banner to disappear

  // Scroll to show both actions nicely
  await page.evaluate(() => window.scrollBy(0, 150));
  await page.waitForTimeout(300);

  await page.screenshot({
    path: path.join(screenshotsDir, '02-menu-with-actions.png'),
    fullPage: false,
  });
  console.log('   ✓ Saved: 02-menu-with-actions.png\n');

  // Add second menu: Job Search
  console.log('⚙️  Adding second menu: Job Search...');
  const addMenuBtn = page.locator('#add-menu');
  await addMenuBtn.click();
  await page.waitForTimeout(800);

  // Click the second menu in the sidebar to select it
  const menuItems = page.locator('.menu-item');
  const secondMenu = menuItems.nth(1);
  await secondMenu.click();
  await page.waitForTimeout(500);

  // Configure Job Search menu
  await menuNameInput.fill('Job Search');
  await gptUrlInput.fill('https://chatgpt.com/g/g-yourjobsearchurl');

  // Enable "Run All Actions"
  const runAllEnabledCheckbox = page.locator('#runAllEnabled');
  await runAllEnabledCheckbox.check();
  await page.waitForTimeout(300);

  // Set Run All shortcut (Alt+Shift+H - will display as ⌥⇧H on Mac)
  const runAllShortcutBtn = page.locator('#runAllShortcutBtn');
  await runAllShortcutBtn.click();
  await page.waitForTimeout(200);

  await page.keyboard.down('Alt');
  await page.keyboard.down('Shift');
  await page.keyboard.press('KeyH');
  await page.keyboard.up('Shift');
  await page.keyboard.up('Alt');
  await page.waitForTimeout(300);

  // Add action: Job Summary
  const jobAddActionBtn = page.locator('#add-action');
  await jobAddActionBtn.click();
  await page.waitForTimeout(500);

  const jobActionItems = page.locator('.action-item');
  const jobAction = jobActionItems.first();
  await jobAction.locator('.action-title').fill('Job Summary');
  await jobAction.locator('.action-prompt').fill('Summarize the job posting against my resume, skills, etc.:');

  // Add keyboard shortcut (Alt+Shift+J - will display as ⌥⇧J on Mac)
  const jobCaptureBtn = jobAction.locator('.btn-capture');
  await jobCaptureBtn.click();
  await page.waitForTimeout(200);

  await page.keyboard.down('Alt');
  await page.keyboard.down('Shift');
  await page.keyboard.press('KeyJ');
  await page.keyboard.up('Shift');
  await page.keyboard.up('Alt');
  await page.waitForTimeout(300);

  // Make sure action is enabled
  const jobEnabledCheckbox = jobAction.locator('.action-enabled');
  await jobEnabledCheckbox.check();

  // Save the Job Search menu configuration
  await saveBtn.click();
  await page.waitForTimeout(3000); // Wait 3 seconds for save banner to disappear

  console.log('   ✓ Job Search menu configured and saved\n');

  // Screenshot 3: Multiple menus
  console.log('📸 Screenshot 3: Multiple menus...');

  // Scroll to top to show clean view
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  await page.screenshot({
    path: path.join(screenshotsDir, '03-multiple-menus.png'),
    fullPage: false,
  });
  console.log('   ✓ Saved: 03-multiple-menus.png\n');

  // Screenshot 4: Full page view showing the complete interface
  console.log('📸 Screenshot 4: Complete interface view...');
  await page.waitForTimeout(300);

  await page.screenshot({
    path: path.join(screenshotsDir, '04-complete-interface.png'),
    fullPage: true, // Show entire page
  });
  console.log('   ✓ Saved: 04-complete-interface.png\n');

  await browser.close();

  console.log('\n✅ All screenshots captured successfully!');
  console.log(`📁 Screenshots saved to: ${screenshotsDir}`);
  console.log('\n💡 Tips for Chrome Web Store:');
  console.log('   - Use these screenshots in your store listing');
  console.log('   - Add descriptive captions for each screenshot');
  console.log('   - You can edit/crop them as needed');
  console.log('   - Consider adding annotations or highlights\n');
}

// Run the script
takeStoreScreenshots().catch(error => {
  console.error('❌ Error capturing screenshots:', error);
  process.exit(1);
});
