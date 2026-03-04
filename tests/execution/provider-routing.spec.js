import { test, expect } from '../fixtures/extension.js';

/**
 * Provider routing tests — verify that Gemini and Claude URLs are accepted alongside ChatGPT.
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

  test('claude.ai URL is accepted in customGptUrl field', async ({ extensionId, context }) => {
    const optionsPage = await context.newPage();
    await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
    await optionsPage.waitForLoadState('networkidle');

    const addMenuBtn = optionsPage.locator('#add-menu');
    await addMenuBtn.click();
    await optionsPage.waitForTimeout(300);

    const menuNameInput = optionsPage.locator('#menuName');
    const customGptUrlInput = optionsPage.locator('#customGptUrl');
    const saveBtn = optionsPage.locator('#save');

    await menuNameInput.fill('Claude Test');
    await customGptUrlInput.fill('https://claude.ai');
    await saveBtn.click();

    await optionsPage.waitForTimeout(500);
    const errorVisible = await optionsPage.locator('#error-banner').isVisible();
    expect(errorVisible).toBe(false);
  });

  test('claude.ai project URL is accepted in customGptUrl field', async ({ extensionId, context }) => {
    const optionsPage = await context.newPage();
    await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
    await optionsPage.waitForLoadState('networkidle');

    const addMenuBtn = optionsPage.locator('#add-menu');
    await addMenuBtn.click();
    await optionsPage.waitForTimeout(300);

    const menuNameInput = optionsPage.locator('#menuName');
    const customGptUrlInput = optionsPage.locator('#customGptUrl');
    const saveBtn = optionsPage.locator('#save');

    await menuNameInput.fill('Claude Project Test');
    await customGptUrlInput.fill('https://claude.ai/project/019cb5d4-406b-7158-930f-c78f862b4916');
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
