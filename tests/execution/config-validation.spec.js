// tests/execution/config-validation.spec.js
import { test, expect } from '../fixtures/extension.js';

/**
 * Config Validation Edge Case Tests
 *
 * Tests validation rules in validateV3Config() that are not covered
 * by the existing UI tests, including boundary conditions and
 * invalid-config fallback behaviour.
 */

test.describe('Config Validation Edge Cases', () => {

  test('VAL-01: menu name of exactly 50 characters saves without error', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');

    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);

    const fiftyCharName = 'A'.repeat(50);
    await page.locator('#menuName').fill(fiftyCharName);
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-val01');
    await page.locator('#save').click();
    await page.waitForTimeout(500);

    await expect(page.locator('#error-banner')).toBeHidden();

    // Verify stored
    const cfg = await page.evaluate(() => new Promise(r => chrome.storage.sync.get('config', ({ config }) => r(config))));
    const menu = cfg.menus.find(m => m.name === fiftyCharName);
    expect(menu).toBeTruthy();
    expect(menu.name.length).toBe(50);
  });

  test('VAL-02: invalid stored V3 config falls back to defaults on load', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');

    // Inject an invalid V3 config — menu URL uses a disallowed domain
    const invalidConfig = {
      version: 3,
      menus: [{
        id: 'menu_invalid',
        name: 'Invalid Menu',
        customGptUrl: 'https://evil.com/steal',   // disallowed
        autoSubmit: true,
        runAllEnabled: false,
        runAllShortcut: '',
        order: 1,
        actions: []
      }],
      globalSettings: { gptTitleMatch: 'ChatGPT', clearContext: true }
    };

    await page.evaluate((cfg) => new Promise(r => chrome.storage.sync.set({ config: cfg }, r)), invalidConfig);
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);

    // getConfig() detects validation failure and falls back to defaults
    // The "Invalid Menu" name should NOT appear — default config is shown instead
    const menuName = await page.locator('#menuName').inputValue();
    expect(menuName).not.toBe('Invalid Menu');

    // No crash — page loads cleanly
    await expect(page.locator('#error-banner')).toBeHidden();
  });

  test('VAL-03: whitespace-only action title is rejected on save', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');

    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('VAL-03 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-val03');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);

    // Title is spaces only — should fail trim() check
    await page.locator('.action-title').first().fill('   ');
    await page.locator('.action-prompt').first().fill('Valid prompt:');
    await page.locator('#save').click();
    await page.waitForTimeout(500);

    await expect(page.locator('#error-banner')).toBeVisible();
  });

  test('VAL-04: whitespace-only action prompt is rejected on save', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');

    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('VAL-04 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-val04');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);

    await page.locator('.action-title').first().fill('Valid Title');
    // Prompt is spaces only — should fail trim() check
    await page.locator('.action-prompt').first().fill('   ');
    await page.locator('#save').click();
    await page.waitForTimeout(500);

    await expect(page.locator('#error-banner')).toBeVisible();
  });

  test('VAL-05: config with more than 10 menus in storage falls back to defaults', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');

    // Build an invalid V3 config with 11 menus
    const menus = Array.from({ length: 11 }, (_, i) => ({
      id: `menu_val05_${i}`,
      name: `VAL-05 Menu ${i + 1}`,
      customGptUrl: 'https://chatgpt.com/g/g-val05',
      autoSubmit: true,
      runAllEnabled: false,
      runAllShortcut: '',
      order: i + 1,
      actions: []
    }));

    const invalidConfig = {
      version: 3,
      menus,
      globalSettings: { gptTitleMatch: 'ChatGPT', clearContext: true }
    };

    await page.evaluate((cfg) => new Promise(r => chrome.storage.sync.set({ config: cfg }, r)), invalidConfig);
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);

    // Falls back to defaults — none of the VAL-05 menu names should appear
    const allMenuNames = await page.locator('.menu-name').allTextContents();
    const hasInvalidMenu = allMenuNames.some(n => n.includes('VAL-05 Menu'));
    expect(hasInvalidMenu).toBe(false);

    // Page loads cleanly
    await expect(page.locator('#error-banner')).toBeHidden();
  });

});
