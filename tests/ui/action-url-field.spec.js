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

  test('UI-03: value persists after save and reload', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    const actionUrl = 'https://chatgpt.com/g/g-ui03-action';
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('UI-03 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-ui03-menu');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    await page.locator('.action-title').first().fill('UI03 Action');
    await page.locator('.action-prompt').first().fill('p:');
    await page.locator('.action-custom-url').first().fill(actionUrl);
    await page.locator('#save').click();
    await page.waitForTimeout(500);
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    expect(await page.locator('.action-custom-url').first().inputValue()).toBe(actionUrl);
  });

  test('UI-04: clearing value saves empty (falls back to menu URL)', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('UI-04 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-ui04-menu');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    await page.locator('.action-title').first().fill('UI04 Action');
    await page.locator('.action-prompt').first().fill('p:');
    await page.locator('.action-custom-url').first().fill('https://chatgpt.com/g/g-ui04-action');
    await page.locator('#save').click();
    await page.waitForTimeout(500);
    await page.locator('.action-custom-url').first().clear();
    await page.locator('#save').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#error-banner')).toBeHidden();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    expect(await page.locator('.action-custom-url').first().inputValue()).toBe('');
  });

});
