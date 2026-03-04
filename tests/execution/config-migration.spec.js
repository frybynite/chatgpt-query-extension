// tests/execution/config-migration.spec.js
import { test, expect } from '../fixtures/extension.js';

/**
 * Config Migration Tests
 *
 * Verifies that V1 and V2 configs are correctly migrated to V3 when
 * the options page loads. Migration is triggered by getConfig() and
 * auto-saves the migrated result back to storage (config.js:372-374).
 *
 * V2 format: { version: 2, globalSettings: { contextMenuTitle, customGptUrl, ... }, actions: [] }
 * V3 format: { version: 3, menus: [{ name, customGptUrl, actions, ... }], globalSettings: { ... } }
 * V1 format: same as V2 but no version field
 */

test.describe('Config Migration', () => {

  test('MIG-01: V2 config migrates to V3 preserving all fields', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');

    const v2Config = {
      version: 2,
      globalSettings: {
        contextMenuTitle: 'My Migration Menu',
        customGptUrl: 'https://chatgpt.com/g/g-mig01',
        autoSubmit: true,
        runAllEnabled: false,
        runAllShortcut: '',
        gptTitleMatch: 'ChatGPT',
        clearContext: true
      },
      actions: [{
        id: 'action_mig01',
        title: 'Summarize',
        prompt: 'Summarize this:',
        shortcut: '',
        enabled: true,
        order: 1
      }]
    };

    await page.evaluate((cfg) => new Promise(r => chrome.storage.sync.set({ config: cfg }, r)), v2Config);

    // Reload — triggers getConfig() → migrateV2toV3() → auto-saves V3 to storage
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);

    // Storage must now contain V3
    const stored = await page.evaluate(() => new Promise(r => chrome.storage.sync.get('config', ({ config }) => r(config))));
    expect(stored.version).toBe(3);
    expect(stored.menus).toHaveLength(1);
    expect(stored.menus[0].name).toBe('My Migration Menu');
    expect(stored.menus[0].customGptUrl).toBe('https://chatgpt.com/g/g-mig01');
    expect(stored.menus[0].autoSubmit).toBe(true);
    expect(stored.menus[0].runAllEnabled).toBe(false);
    expect(stored.menus[0].actions).toHaveLength(1);
    expect(stored.menus[0].actions[0].title).toBe('Summarize');
    expect(stored.menus[0].actions[0].prompt).toBe('Summarize this:');
    expect(stored.globalSettings.gptTitleMatch).toBe('ChatGPT');
    expect(stored.globalSettings.clearContext).toBe(true);

    // UI must reflect migrated data
    await expect(page.locator('#error-banner')).toBeHidden();
    expect(await page.locator('#menuName').inputValue()).toBe('My Migration Menu');
    expect(await page.locator('#customGptUrl').inputValue()).toBe('https://chatgpt.com/g/g-mig01');
  });

  test('MIG-02: V2 config with missing optional fields uses correct defaults', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');

    // Minimal V2 — no contextMenuTitle, no autoSubmit, no runAllEnabled
    const v2Minimal = {
      version: 2,
      globalSettings: {
        customGptUrl: 'https://chatgpt.com/g/g-mig02',
        gptTitleMatch: 'ChatGPT',
        clearContext: true
      },
      actions: []
    };

    await page.evaluate((cfg) => new Promise(r => chrome.storage.sync.set({ config: cfg }, r)), v2Minimal);
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);

    const stored = await page.evaluate(() => new Promise(r => chrome.storage.sync.get('config', ({ config }) => r(config))));
    expect(stored.version).toBe(3);
    // contextMenuTitle absent → falls back to "Send to ChatGPT"
    expect(stored.menus[0].name).toBe('Send to ChatGPT');
    // autoSubmit absent → defaults to true
    expect(stored.menus[0].autoSubmit).toBe(true);
    // runAllEnabled absent → defaults to false
    expect(stored.menus[0].runAllEnabled).toBe(false);
    await expect(page.locator('#error-banner')).toBeHidden();
  });

  test('MIG-03: V1 config (no version field) migrates to V3', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');

    // V1 is structurally identical to V2 but has no version field
    const v1Config = {
      globalSettings: {
        contextMenuTitle: 'V1 Legacy Menu',
        customGptUrl: 'https://chatgpt.com/g/g-mig03',
        autoSubmit: false,
        runAllEnabled: false,
        runAllShortcut: '',
        gptTitleMatch: 'ChatGPT',
        clearContext: false
      },
      actions: [{
        id: 'action_v1',
        title: 'Translate',
        prompt: 'Translate to English:',
        shortcut: '',
        enabled: true,
        order: 1
      }]
    };

    await page.evaluate((cfg) => new Promise(r => chrome.storage.sync.set({ config: cfg }, r)), v1Config);
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);

    const stored = await page.evaluate(() => new Promise(r => chrome.storage.sync.get('config', ({ config }) => r(config))));
    expect(stored.version).toBe(3);
    expect(stored.menus[0].name).toBe('V1 Legacy Menu');
    expect(stored.menus[0].autoSubmit).toBe(false);
    expect(stored.menus[0].actions[0].title).toBe('Translate');
    expect(stored.globalSettings.clearContext).toBe(false);
    await expect(page.locator('#error-banner')).toBeHidden();
    expect(await page.locator('#menuName').inputValue()).toBe('V1 Legacy Menu');
  });

  test('MIG-04: V2 actions and shortcuts are preserved verbatim in V3', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');

    const v2WithActions = {
      version: 2,
      globalSettings: {
        contextMenuTitle: 'Actions Menu',
        customGptUrl: 'https://chatgpt.com/g/g-mig04',
        autoSubmit: true,
        runAllEnabled: true,
        runAllShortcut: 'Ctrl+Shift+R',
        gptTitleMatch: 'ChatGPT',
        clearContext: true
      },
      actions: [
        { id: 'action_a', title: 'Action A', prompt: 'Do A:', shortcut: 'Ctrl+Shift+A', enabled: true, order: 1 },
        { id: 'action_b', title: 'Action B', prompt: 'Do B:', shortcut: '', enabled: false, order: 2 }
      ]
    };

    await page.evaluate((cfg) => new Promise(r => chrome.storage.sync.set({ config: cfg }, r)), v2WithActions);
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);

    const stored = await page.evaluate(() => new Promise(r => chrome.storage.sync.get('config', ({ config }) => r(config))));
    expect(stored.version).toBe(3);
    const menu = stored.menus[0];
    expect(menu.actions).toHaveLength(2);
    expect(menu.actions[0].title).toBe('Action A');
    expect(menu.actions[0].shortcut).toBe('Ctrl+Shift+A');
    expect(menu.actions[0].enabled).toBe(true);
    expect(menu.actions[1].title).toBe('Action B');
    expect(menu.actions[1].enabled).toBe(false);
    expect(menu.runAllEnabled).toBe(true);
    expect(menu.runAllShortcut).toBe('Ctrl+Shift+R');
  });

});
