// tests/ui/action-url-field.spec.js
import { test, expect } from '../fixtures/extension.js';

test.describe('Action URL Override - Options UI', () => {

  test('UI-01: .action-custom-url input is visible for each action', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('UI-01 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-ui01');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    await expect(page.locator('.action-custom-url').first()).toBeVisible();
  });

  test('UI-02: placeholder shows the menu URL', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    const menuUrl = 'https://chatgpt.com/g/g-ui02';
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('UI-02 Menu');
    await page.locator('#customGptUrl').fill(menuUrl);
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    const placeholder = await page.locator('.action-custom-url').first().getAttribute('placeholder');
    expect(placeholder).toContain(menuUrl);
  });

  test('UI-03: stored action URL is rendered in field on fresh page load', async ({ extensionId, context }) => {
    const page = await context.newPage();
    const actionUrl = 'https://chatgpt.com/g/g-ui03-action';
    // Inject config with action.customGptUrl set
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.evaluate((actionUrl) => {
      const cfg = {
        version: 3,
        menus: [{
          id: 'menu_ui03',
          name: 'UI-03 Menu',
          customGptUrl: 'https://chatgpt.com/g/g-ui03-menu',
          autoSubmit: true,
          runAllEnabled: false,
          runAllShortcut: '',
          order: 1,
          actions: [{
            id: 'action_ui03',
            title: 'UI03 Action',
            prompt: 'p:',
            shortcut: '',
            enabled: true,
            order: 1,
            customGptUrl: actionUrl
          }]
        }],
        globalSettings: { gptTitleMatch: 'ChatGPT', clearContext: true }
      };
      return new Promise(resolve => chrome.storage.sync.set({ config: cfg }, resolve));
    }, actionUrl);
    // Fresh load — simulates what user sees after a save+reload
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    // Select the menu to reveal its actions
    await page.locator('.menu-item', { hasText: 'UI-03 Menu' }).click();
    await page.waitForTimeout(200);
    expect(await page.locator('.action-custom-url-enabled').first().isChecked()).toBe(true);
    expect(await page.locator('.action-custom-url').first().inputValue()).toBe(actionUrl);
  });

  test('UI-04: empty action URL renders as empty field on fresh page load', async ({ extensionId, context }) => {
    const page = await context.newPage();
    // Inject config with action.customGptUrl as empty string
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      const cfg = {
        version: 3,
        menus: [{
          id: 'menu_ui04',
          name: 'UI-04 Menu',
          customGptUrl: 'https://chatgpt.com/g/g-ui04-menu',
          autoSubmit: true,
          runAllEnabled: false,
          runAllShortcut: '',
          order: 1,
          actions: [{
            id: 'action_ui04',
            title: 'UI04 Action',
            prompt: 'p:',
            shortcut: '',
            enabled: true,
            order: 1,
            customGptUrl: ''
          }]
        }],
        globalSettings: { gptTitleMatch: 'ChatGPT', clearContext: true }
      };
      return new Promise(resolve => chrome.storage.sync.set({ config: cfg }, resolve));
    });
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    await page.locator('.menu-item', { hasText: 'UI-04 Menu' }).click();
    await page.waitForTimeout(200);
    await expect(page.locator('#error-banner')).toBeHidden();
    expect(await page.locator('.action-custom-url').first().inputValue()).toBe('');
    expect(await page.locator('.action-custom-url-enabled').first().isChecked()).toBe(false);
    expect(await page.locator('.action-custom-url').first().isDisabled()).toBe(true);
  });

  test('CB-01: new action renders with checkbox unchecked and field disabled', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('CB-01 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-cb01');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    expect(await page.locator('.action-custom-url-enabled').first().isChecked()).toBe(false);
    expect(await page.locator('.action-custom-url').first().isDisabled()).toBe(true);
  });

  test('CB-02: checking checkbox enables the URL field', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('CB-02 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-cb02');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    await page.locator('.action-custom-url-enabled').first().check();
    expect(await page.locator('.action-custom-url').first().isDisabled()).toBe(false);
    expect(await page.locator('.action-custom-url').first().isEnabled()).toBe(true);
  });

  test('CB-03: unchecking checkbox clears and disables the URL field', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('CB-03 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-cb03');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    // Enable and fill
    await page.locator('.action-custom-url-enabled').first().check();
    await page.locator('.action-custom-url').first().fill('https://chatgpt.com/g/g-cb03-action');
    // Now uncheck
    await page.locator('.action-custom-url-enabled').first().uncheck();
    expect(await page.locator('.action-custom-url').first().inputValue()).toBe('');
    expect(await page.locator('.action-custom-url').first().isDisabled()).toBe(true);
  });

});
