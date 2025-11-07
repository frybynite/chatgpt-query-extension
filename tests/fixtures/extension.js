import { test as base, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Custom fixture for Chrome extension testing
 *
 * Provides:
 * - context: Browser context with extension loaded
 * - extensionId: The ID of the loaded extension
 * - optionsPage: Direct access to options.html page
 */
export const test = base.extend({
  context: async ({}, use) => {
    // Path to extension directory (project root)
    const extensionPath = path.resolve(__dirname, '../..');

    // Create a temporary user data directory for this test
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-chrome-'));

    // Launch browser with extension loaded
    // Use chromium channel for extension support in headless mode (Playwright 1.49+)
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: !!process.env.CI, // Use headless mode in CI environment
      channel: 'chromium', // Required for extensions in headless mode
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });

    await use(context);
    await context.close();

    // Clean up temp directory
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  },

  extensionId: async ({ context }, use) => {
    // Get the extension ID from service worker
    let [background] = context.serviceWorkers();
    if (!background) {
      // In CI, service workers may take longer to initialize
      // Use a shorter timeout to fail fast if something is wrong
      try {
        background = await context.waitForEvent('serviceworker', {
          timeout: process.env.CI ? 30000 : 10000
        });
      } catch (error) {
        throw new Error(`Failed to get extension service worker: ${error.message}`);
      }
    }

    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  },

  optionsPage: async ({ context, extensionId }, use) => {
    // Get the first page or create new one
    const pages = context.pages();
    const page = pages.length > 0 ? pages[0] : await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');

    // Add helper method to safely reload the options page
    page.reloadOptions = async () => {
      // Use goto with waitUntil to ensure page is ready
      await page.goto(`chrome-extension://${extensionId}/options.html`, {
        waitUntil: 'networkidle',
      });
      // Extra wait for extension to initialize
      await page.waitForTimeout(500);
    };

    // Add helper method to wait for save operation to complete
    // This waits for either success or warning banner to appear, indicating save completed and sidebar updated
    // (Warning banner appears when menu has no actions, success banner appears otherwise)
    page.waitForSave = async (timeout = 5000) => {
      // Wait for either success or warning banner to be visible (not have 'hidden' class)
      // Using a selector that matches either banner when visible
      await page.waitForFunction(
        () => {
          const successBanner = document.getElementById('success-banner');
          const warningBanner = document.getElementById('warning-banner');
          return (successBanner && !successBanner.classList.contains('hidden')) ||
                 (warningBanner && !warningBanner.classList.contains('hidden'));
        },
        { timeout }
      );
      
      // Small additional wait to ensure DOM updates are complete
      await page.waitForTimeout(100);
    };

    await use(page);
  },
});

export { expect } from '@playwright/test';

// Helper to check if shortcut contains modifier keys (works on both Mac and PC)
export function hasModifierKey(shortcut, modifier) {
  if (!shortcut) return false;

  const modifierMap = {
    'Ctrl': ['Ctrl', '⌃'],
    'Alt': ['Alt', '⌥'],
    'Shift': ['Shift', '⇧'],
    'Meta': ['Meta', '⌘']
  };

  const variants = modifierMap[modifier] || [modifier];
  return variants.some(variant => shortcut.includes(variant));
}
