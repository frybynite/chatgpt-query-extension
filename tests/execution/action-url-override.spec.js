// tests/execution/action-url-override.spec.js
import { test, expect } from '../fixtures/extension.js';

test.describe('Action URL Override - Config Validation', () => {

  test('CONF-01: absent action URL saves without error', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('Conf-01 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-conf01');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    await page.locator('.action-title').first().fill('No Override');
    await page.locator('.action-prompt').first().fill('Summarize:');
    // action URL field left blank
    await page.locator('#save').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#error-banner')).toBeHidden();
  });

  test('CONF-02: valid chatgpt.com action URL saves without error', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('Conf-02 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-conf02-menu');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    await page.locator('.action-title').first().fill('GPT Override');
    await page.locator('.action-prompt').first().fill('Explain:');
    await page.locator('.action-custom-url').first().fill('https://chatgpt.com/g/g-conf02-action');
    await page.locator('#save').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#error-banner')).toBeHidden();
  });

  test('CONF-03: valid gemini.google.com action URL saves without error', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('Conf-03 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-conf03');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    await page.locator('.action-title').first().fill('Gemini Override');
    await page.locator('.action-prompt').first().fill('Translate:');
    await page.locator('.action-custom-url').first().fill('https://gemini.google.com/app');
    await page.locator('#save').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#error-banner')).toBeHidden();
  });

  test('CONF-04: disallowed action URL domain is rejected', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('Conf-04 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-conf04');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    await page.locator('.action-title').first().fill('Bad Override');
    await page.locator('.action-prompt').first().fill('Hack:');
    await page.locator('.action-custom-url').first().fill('https://evil.com/steal');
    await page.locator('#save').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#error-banner')).toBeVisible();
  });

});

test.describe('Action URL Override - URL Routing', () => {

  test('ROUTE-01: action without URL uses menu URL', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    const menuUrl = 'https://chatgpt.com/g/g-route01-menu';
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('Route-01 Menu');
    await page.locator('#customGptUrl').fill(menuUrl);
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    await page.locator('.action-title').first().fill('Route01');
    await page.locator('.action-prompt').first().fill('p:');
    // leave .action-custom-url blank
    await page.locator('#save').click();
    await page.waitForTimeout(500);
    await page.reload();
    await page.waitForTimeout(300);
    const cfg = await page.evaluate(() => new Promise(r => chrome.storage.sync.get('config', ({config}) => r(config))));
    const menu = cfg.menus.find(m => m.name === 'Route-01 Menu');
    const action = menu.actions[0];
    const effectiveUrl = (action.customGptUrl && action.customGptUrl.trim()) ? action.customGptUrl.trim() : menu.customGptUrl;
    expect(effectiveUrl).toBe(menuUrl);
  });

  test('ROUTE-02: action with URL uses action URL', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    const menuUrl = 'https://chatgpt.com/g/g-route02-menu';
    const actionUrl = 'https://chatgpt.com/g/g-route02-action';
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('Route-02 Menu');
    await page.locator('#customGptUrl').fill(menuUrl);
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    await page.locator('.action-title').first().fill('Route02');
    await page.locator('.action-prompt').first().fill('p:');
    await page.locator('.action-custom-url').first().fill(actionUrl);
    await page.locator('#save').click();
    await page.waitForTimeout(500);
    await page.reload();
    await page.waitForTimeout(300);
    const cfg = await page.evaluate(() => new Promise(r => chrome.storage.sync.get('config', ({config}) => r(config))));
    const menu = cfg.menus.find(m => m.name === 'Route-02 Menu');
    const action = menu.actions[0];
    expect(action.customGptUrl).toBe(actionUrl);
    const effectiveUrl = (action.customGptUrl && action.customGptUrl.trim()) ? action.customGptUrl.trim() : menu.customGptUrl;
    expect(effectiveUrl).toBe(actionUrl);
    expect(effectiveUrl).not.toBe(menuUrl);
  });

});

test.describe('Action URL Override - Backward Compatibility', () => {

  test('COMPAT-01: legacy V3 config (no action.customGptUrl) loads and saves cleanly', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');

    // Inject a raw V3 config with no customGptUrl on the action
    const menuUrl = 'https://chatgpt.com/g/g-legacy-compat';
    await page.evaluate((menuUrl) => {
      const legacyConfig = {
        version: 3,
        menus: [{
          id: 'menu_legacy_compat',
          name: 'Legacy Menu',
          customGptUrl: menuUrl,
          autoSubmit: true,
          runAllEnabled: false,
          runAllShortcut: '',
          order: 1,
          actions: [{
            id: 'action_legacy_compat',
            title: 'Legacy Action',
            prompt: 'Summarize:',
            shortcut: '',
            enabled: true,
            order: 1
            // NO customGptUrl field
          }]
        }],
        globalSettings: { gptTitleMatch: 'ChatGPT', clearContext: true }
      };
      return new Promise(resolve => chrome.storage.sync.set({ config: legacyConfig }, resolve));
    }, menuUrl);

    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Page loaded without error
    await expect(page.locator('#error-banner')).toBeHidden();

    // Action URL field is present and empty
    const urlField = page.locator('.action-custom-url').first();
    await expect(urlField).toBeVisible();
    expect(await urlField.inputValue()).toBe('');

    // Save succeeds
    await page.locator('#save').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#error-banner')).toBeHidden();

    // effectiveUrl resolves to menu URL
    const cfg = await page.evaluate(() => new Promise(r => chrome.storage.sync.get('config', ({config}) => r(config))));
    const action = cfg.menus[0].actions[0];
    const effectiveUrl = (action.customGptUrl && action.customGptUrl.trim()) ? action.customGptUrl.trim() : cfg.menus[0].customGptUrl;
    expect(effectiveUrl).toBe(menuUrl);
  });

});
