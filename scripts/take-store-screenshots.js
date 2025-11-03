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

  // Screenshot 1: Options page overview
  console.log('📸 Screenshot 1: Options page overview...');
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500); // Let UI settle

  await page.screenshot({
    path: path.join(screenshotsDir, '01-options-page-overview.png'),
    fullPage: false, // Just viewport
  });
  console.log('   ✓ Saved: 01-options-page-overview.png\n');

  // Screenshot 2: Menu with actions
  console.log('📸 Screenshot 2: Menu with actions...');
  // Add a sample action to make it more interesting
  const addActionBtn = page.locator('#add-action');
  await addActionBtn.click();
  await page.waitForTimeout(500);

  // Fill in the action using class selectors
  const actionItems = page.locator('.action-item');
  const firstAction = actionItems.first();
  await firstAction.locator('.action-title').fill('Summarize Text');
  await firstAction.locator('.action-prompt').fill('Please summarize the following text:\n\n%s');

  await page.screenshot({
    path: path.join(screenshotsDir, '02-menu-with-action.png'),
    fullPage: false,
  });
  console.log('   ✓ Saved: 02-menu-with-action.png\n');

  // Screenshot 3: Multiple menus
  console.log('📸 Screenshot 3: Multiple menus...');
  const addMenuBtn = page.locator('#add-menu');
  await addMenuBtn.click();
  await page.waitForTimeout(800);

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
