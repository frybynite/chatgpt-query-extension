import { test, expect } from '../fixtures/extension.js';

/**
 * TEST-UI-POPUP: Popup Interface
 *
 * Verifies that:
 * 1. Popup loads successfully
 * 2. Extension icon is visible
 * 3. Extension name and version are displayed correctly
 * 4. Privacy Policy link is present
 * 5. "Change Settings" button opens the options page
 */

test.describe('UI Tests - Popup', () => {
  test('should display popup with correct content', async ({ context, extensionId }) => {
    // Open popup page
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await popupPage.waitForLoadState('networkidle');

    // Verify popup icon is visible
    const icon = popupPage.locator('.popup-icon');
    await expect(icon).toBeVisible();
    console.log('✓ Extension icon is visible');

    // Verify extension name is displayed
    const title = popupPage.locator('.popup-title h1');
    await expect(title).toBeVisible();
    await expect(title).toHaveText('ChatGPT Custom Prompts');
    console.log('✓ Extension name is displayed');

    // Verify version is displayed and matches manifest
    const version = popupPage.locator('.version');
    await expect(version).toBeVisible();
    const versionText = await version.textContent();
    expect(versionText).toMatch(/^v\d+\.\d+\.\d+$/); // Format: v3.1.0
    console.log(`✓ Version displayed: ${versionText}`);

    // Verify Privacy Policy link exists
    const privacyLink = popupPage.locator('.privacy-link');
    await expect(privacyLink).toBeVisible();
    await expect(privacyLink).toHaveText('Privacy Policy');
    const href = await privacyLink.getAttribute('href');
    expect(href).toBe('PRIVACY.md');
    console.log('✓ Privacy Policy link is present');

    // Verify Change Settings button exists
    const settingsBtn = popupPage.locator('#settings-btn');
    await expect(settingsBtn).toBeVisible();
    await expect(settingsBtn).toHaveText('Change Settings');
    console.log('✓ Change Settings button is present');
  });

  test('should open options page when Change Settings is clicked', async ({ context, extensionId }) => {
    // Open popup page
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await popupPage.waitForLoadState('networkidle');

    // Wait for new page to be created when button is clicked
    const [optionsPage] = await Promise.all([
      context.waitForEvent('page'),
      popupPage.locator('#settings-btn').click(),
    ]);

    // Wait for options page to load
    await optionsPage.waitForLoadState('networkidle');

    // Verify options page opened correctly
    expect(optionsPage.url()).toContain('options.html');
    console.log('✓ Options page opened successfully');

    // Verify options page has expected content
    const header = optionsPage.locator('header h1');
    await expect(header).toBeVisible();
    await expect(header).toHaveText('ChatGPT Custom Prompts');
    console.log('✓ Options page content loaded correctly');
  });

  test('should have correct version from manifest', async ({ context, extensionId }) => {
    // Open popup page
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await popupPage.waitForLoadState('networkidle');

    // Get version from popup
    const version = popupPage.locator('.version');
    const versionText = await version.textContent();
    console.log(`Popup version: ${versionText}`);

    // Get version from manifest using page context
    const manifestVersion = await popupPage.evaluate(() => {
      return chrome.runtime.getManifest().version;
    });
    console.log(`Manifest version: ${manifestVersion}`);

    // Compare versions
    expect(versionText).toBe(`v${manifestVersion}`);
    console.log('✓ Popup version matches manifest version');
  });
});
