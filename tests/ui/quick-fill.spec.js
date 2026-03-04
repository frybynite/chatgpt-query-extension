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
    const options = await optionsPage.locator('#quickFillMenu option').allTextContents();
    expect(options.filter(o => o.trim() !== '')).toHaveLength(6);
    expect(options).toContain('ChatGPT');
    expect(options).toContain('ChatGPT Custom');
    expect(options).toContain('Gemini');
    expect(options).toContain('Gemini Gems');
    expect(options).toContain('Claude');
    expect(options).toContain('Claude Project');
  });

});
