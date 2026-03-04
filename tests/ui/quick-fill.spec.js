// tests/ui/quick-fill.spec.js
/**
 * Quick Fill Dropdown Tests — Menu Level
 *
 * Verifies the Quick Fill <select> beside the menu-level AI Assistant URL
 * input: presence, all 6 provider options, fill-on-select behaviour,
 * dropdown reset after selection, and removal of old url-example buttons.
 */
import { test, expect } from '../fixtures/extension.js';

test.describe('Quick Fill Dropdown - Menu Level', () => {

  test('QF-01: Quick Fill dropdown is visible in the menu URL form', async ({ optionsPage }) => {
    await expect(optionsPage.locator('#quickFillMenu')).toBeVisible();
  });

  test('QF-02: label shows "(default for all actions)" hint', async ({ optionsPage }) => {
    const labelText = await optionsPage.locator('label[for="customGptUrl"]').textContent();
    expect(labelText).toContain('default for all actions');
  });

  test('QF-03: old url-example buttons are gone', async ({ optionsPage }) => {
    expect(await optionsPage.locator('.url-example').count()).toBe(0);
  });

  test('QF-04: selecting ChatGPT fills the URL field', async ({ optionsPage }) => {
    await optionsPage.locator('#customGptUrl').clear();
    await optionsPage.locator('#quickFillMenu').selectOption({ label: 'ChatGPT' });
    await expect(optionsPage.locator('#customGptUrl')).toHaveValue('https://chatgpt.com');
  });

  test('QF-05: selecting ChatGPT Custom fills field and resets dropdown', async ({ optionsPage }) => {
    await optionsPage.locator('#quickFillMenu').selectOption({ label: 'ChatGPT Custom' });
    const value = await optionsPage.locator('#customGptUrl').inputValue();
    expect(value).toContain('chatgpt.com/g/');
    expect(value).toContain('<<your-gpt-id>>');
    // Dropdown resets to blank placeholder after selection
    await expect(optionsPage.locator('#quickFillMenu')).toHaveValue('');
  });

  test('QF-06: all 6 provider options are present in the dropdown', async ({ optionsPage }) => {
    const providerOptions = await optionsPage.locator('#quickFillMenu option:not([value=""])').allTextContents();
    expect(providerOptions).toHaveLength(6);
    expect(providerOptions).toContain('ChatGPT');
    expect(providerOptions).toContain('ChatGPT Custom');
    expect(providerOptions).toContain('Gemini');
    expect(providerOptions).toContain('Gemini Gems');
    expect(providerOptions).toContain('Claude');
    expect(providerOptions).toContain('Claude Project');
  });

});

test.describe('Quick Fill Dropdown - Action Level', () => {

  test('QF-07: action Quick Fill dropdown exists and is disabled when checkbox unchecked', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('QF-07 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-qf07');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    const dropdown = page.locator('.action-quick-fill').first();
    await expect(dropdown).toBeVisible();
    expect(await dropdown.isDisabled()).toBe(true);
  });

  test('QF-08: action Quick Fill dropdown is enabled when checkbox is checked', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('QF-08 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-qf08');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    await page.locator('.action-custom-url-enabled').first().check();
    expect(await page.locator('.action-quick-fill').first().isDisabled()).toBe(false);
  });

  test('QF-09: unchecking checkbox disables the action Quick Fill dropdown', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('QF-09 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-qf09');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    await page.locator('.action-custom-url-enabled').first().check();
    await page.locator('.action-custom-url-enabled').first().uncheck();
    expect(await page.locator('.action-quick-fill').first().isDisabled()).toBe(true);
  });

  test('QF-10: selecting from action Quick Fill fills the action URL field', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('QF-10 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-qf10');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    await page.locator('.action-custom-url-enabled').first().check();
    await page.locator('.action-custom-url').first().clear();
    await page.locator('.action-quick-fill').first().selectOption({ label: 'Gemini' });
    await expect(page.locator('.action-custom-url').first()).toHaveValue('https://gemini.google.com/app');
    // Dropdown resets after selection
    await expect(page.locator('.action-quick-fill').first()).toHaveValue('');
  });

  test('QF-11: action label shows "(for this action only)" hint', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    const labelText = await page.locator('.action-item label:has(.action-custom-url-enabled)').textContent();
    expect(labelText).toContain('for this action only');
    expect(labelText).not.toContain('optional');
  });

});
