import { test, expect } from '../fixtures/extension.js';

/**
 * Provider routing tests — verify that Gemini URLs are accepted alongside ChatGPT.
 */

test.describe('Provider Routing Tests', () => {
  test('Gemini app URL is accepted in customGptUrl field', async ({ extensionId, context }) => {
    const optionsPage = await context.newPage();
    await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
    await optionsPage.waitForLoadState('networkidle');

    const addMenuBtn = optionsPage.locator('#add-menu');
    await addMenuBtn.click();
    await optionsPage.waitForTimeout(300);

    const menuNameInput = optionsPage.locator('#menuName');
    const customGptUrlInput = optionsPage.locator('#customGptUrl');
    const saveBtn = optionsPage.locator('#save');

    await menuNameInput.fill('Gemini Test');
    await customGptUrlInput.fill('https://gemini.google.com/app');
    await saveBtn.click();

    // Config must save without validation error
    await optionsPage.waitForTimeout(500);
    const errorVisible = await optionsPage.locator('#error-banner').isVisible();
    expect(errorVisible).toBe(false);
  });

  test('Gemini Gem URL is accepted in customGptUrl field', async ({ extensionId, context }) => {
    const optionsPage = await context.newPage();
    await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
    await optionsPage.waitForLoadState('networkidle');

    const addMenuBtn = optionsPage.locator('#add-menu');
    await addMenuBtn.click();
    await optionsPage.waitForTimeout(300);

    const menuNameInput = optionsPage.locator('#menuName');
    const customGptUrlInput = optionsPage.locator('#customGptUrl');
    const saveBtn = optionsPage.locator('#save');

    await menuNameInput.fill('Gemini Gem Test');
    await customGptUrlInput.fill('https://gemini.google.com/gem/b87733ee8076');
    await saveBtn.click();

    await optionsPage.waitForTimeout(500);
    const errorVisible = await optionsPage.locator('#error-banner').isVisible();
    expect(errorVisible).toBe(false);
  });

  test('Non-supported URL is rejected by validation', async ({ extensionId, context }) => {
    const optionsPage = await context.newPage();
    await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
    await optionsPage.waitForLoadState('networkidle');

    const addMenuBtn = optionsPage.locator('#add-menu');
    await addMenuBtn.click();
    await optionsPage.waitForTimeout(300);

    const menuNameInput = optionsPage.locator('#menuName');
    const customGptUrlInput = optionsPage.locator('#customGptUrl');
    const saveBtn = optionsPage.locator('#save');

    await menuNameInput.fill('Invalid URL Test');
    await customGptUrlInput.fill('https://example.com/');
    await saveBtn.click();

    await optionsPage.waitForTimeout(500);
    const errorVisible = await optionsPage.locator('#error-banner').isVisible();
    expect(errorVisible).toBe(true);
  });
});
