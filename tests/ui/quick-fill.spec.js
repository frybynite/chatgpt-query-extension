// tests/ui/quick-fill.spec.js
import { test, expect } from '../fixtures/extension.js';

test.describe('Quick Fill Dropdown - Menu Level', () => {

  test('QF-01: Quick Fill dropdown is visible in the menu URL form', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#quickFillMenu')).toBeVisible();
  });

  test('QF-02: label shows "(default for all actions)" hint', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    const labelText = await page.locator('label[for="customGptUrl"]').textContent();
    expect(labelText).toContain('default for all actions');
  });

  test('QF-03: old url-example buttons are gone', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    expect(await page.locator('.url-example').count()).toBe(0);
  });

  test('QF-04: selecting ChatGPT fills the URL field', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#quickFillMenu').selectOption({ label: 'ChatGPT' });
    expect(await page.locator('#customGptUrl').inputValue()).toBe('https://chatgpt.com');
  });

  test('QF-05: selecting ChatGPT Custom fills field and resets dropdown', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#quickFillMenu').selectOption({ label: 'ChatGPT Custom' });
    const value = await page.locator('#customGptUrl').inputValue();
    expect(value).toContain('chatgpt.com/g/');
    expect(value).toContain('<<your-gpt-id>>');
    // Dropdown resets to blank placeholder after selection
    expect(await page.locator('#quickFillMenu').inputValue()).toBe('');
  });

  test('QF-06: all 6 provider options are present in the dropdown', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    const options = await page.locator('#quickFillMenu option').allTextContents();
    expect(options).toContain('ChatGPT');
    expect(options).toContain('ChatGPT Custom');
    expect(options).toContain('Gemini');
    expect(options).toContain('Gemini Gems');
    expect(options).toContain('Claude');
    expect(options).toContain('Claude Project');
  });

});
