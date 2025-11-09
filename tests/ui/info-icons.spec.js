import { test, expect } from '../fixtures/extension.js';

/**
 * Tests for Info Icon Popups
 *
 * Verifies that:
 * 1. Info icons (ⓘ) appear next to form fields
 * 2. Clicking info icon shows popup with help text
 * 3. Popup can be closed via close button
 * 4. Popup closes when clicking outside
 * 5. Only one popup is open at a time
 * 6. All expected fields have info icons
 */

test.describe('UI Tests - Info Icons', () => {
  test('should show info icon for Menu Name field', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('networkidle');

    // Select a menu
    const menuItems = optionsPage.locator('.menu-item');
    await menuItems.first().click();
    await optionsPage.waitForTimeout(200);

    // Find info icon for Menu Name
    const menuNameLabel = optionsPage.locator('label[for="menuName"]');
    const infoIcon = menuNameLabel.locator('.info-icon');
    await expect(infoIcon).toBeVisible();
    await expect(infoIcon).toContainText('ⓘ');
    console.log('✓ Info icon visible for Menu Name');
  });

  test('should show popup when clicking Menu Name info icon', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('networkidle');

    // Select a menu
    const menuItems = optionsPage.locator('.menu-item');
    await menuItems.first().click();
    await optionsPage.waitForTimeout(200);

    // Click info icon
    const menuNameLabel = optionsPage.locator('label[for="menuName"]');
    const infoIcon = menuNameLabel.locator('.info-icon');
    await infoIcon.click();
    await optionsPage.waitForTimeout(200);

    // Verify popup appears
    const popup = optionsPage.locator('#menuNameInfo');
    await expect(popup).toBeVisible();
    await expect(popup).toHaveClass(/show/);

    const popupContent = popup.locator('.info-popup-content');
    await expect(popupContent).toBeVisible();

    const popupText = await popupContent.textContent();
    expect(popupText).toContain('right-click context menu');
    console.log(`✓ Popup shown with text: "${popupText}"`);

    // Close popup
    const closeBtn = popup.locator('.info-popup-close');
    await closeBtn.click();
    await optionsPage.waitForTimeout(200);

    // Verify popup is closed
    await expect(popup).not.toHaveClass(/show/);
    console.log('✓ Popup closed via close button');
  });

  test('should show info icons for all expected fields', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('networkidle');

    // Select a menu
    const menuItems = optionsPage.locator('.menu-item');
    await menuItems.first().click();
    await optionsPage.waitForTimeout(200);

    // Enable Run All to make Run All Shortcut visible
    const runAllEnabled = optionsPage.locator('#runAllEnabled');
    await runAllEnabled.check();
    await optionsPage.waitForTimeout(200);

    // Check for info icons
    const expectedFields = [
      { label: 'Menu Name', selector: 'label[for="menuName"]' },
      { label: 'ChatGPT URL', selector: 'label[for="customGptUrl"]' },
      { label: 'Auto Submit', selector: 'label:has(input#autoSubmit)' },
      { label: 'Run All Enabled', selector: 'label:has(input#runAllEnabled)' },
      { label: 'Run All Shortcut', selector: 'label[for="runAllShortcut"]' }
    ];

    for (const field of expectedFields) {
      const label = optionsPage.locator(field.selector);
      const infoIcon = label.locator('.info-icon');
      await expect(infoIcon).toBeVisible({ timeout: 1000 });
      console.log(`✓ Info icon found for ${field.label}`);
    }
  });

  test('should close popup when clicking outside', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('networkidle');

    // Select a menu
    const menuItems = optionsPage.locator('.menu-item');
    await menuItems.first().click();
    await optionsPage.waitForTimeout(200);

    // Open popup
    const menuNameLabel = optionsPage.locator('label[for="menuName"]');
    const infoIcon = menuNameLabel.locator('.info-icon');
    await infoIcon.click();
    await optionsPage.waitForTimeout(200);

    // Verify popup is open
    const popup = optionsPage.locator('#menuNameInfo');
    await expect(popup).toHaveClass(/show/);

    // Click outside (on the menu name input)
    const menuNameInput = optionsPage.locator('#menuName');
    await menuNameInput.click();
    await optionsPage.waitForTimeout(200);

    // Verify popup is closed
    await expect(popup).not.toHaveClass(/show/);
    console.log('✓ Popup closed when clicking outside');
  });

  test('should only show one popup at a time', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('networkidle');

    // Select a menu
    const menuItems = optionsPage.locator('.menu-item');
    await menuItems.first().click();
    await optionsPage.waitForTimeout(200);

    // Open first popup
    const menuNameLabel = optionsPage.locator('label[for="menuName"]');
    const menuNameInfoIcon = menuNameLabel.locator('.info-icon');
    await menuNameInfoIcon.click();
    await optionsPage.waitForTimeout(200);

    const menuNamePopup = optionsPage.locator('#menuNameInfo');
    await expect(menuNamePopup).toHaveClass(/show/);

    // Open second popup
    const customGptUrlLabel = optionsPage.locator('label[for="customGptUrl"]');
    const customGptUrlInfoIcon = customGptUrlLabel.locator('.info-icon');
    await customGptUrlInfoIcon.click();
    await optionsPage.waitForTimeout(200);

    // First popup should be closed, second should be open
    await expect(menuNamePopup).not.toHaveClass(/show/);
    
    const customGptUrlPopup = optionsPage.locator('#customGptUrlInfo');
    await expect(customGptUrlPopup).toHaveClass(/show/);
    console.log('✓ Only one popup open at a time');
  });

  test('should change info icon color on hover', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('networkidle');

    // Select a menu
    const menuItems = optionsPage.locator('.menu-item');
    await menuItems.first().click();
    await optionsPage.waitForTimeout(200);

    const menuNameLabel = optionsPage.locator('label[for="menuName"]');
    const infoIcon = menuNameLabel.locator('.info-icon');

    // Get initial color
    const initialColor = await infoIcon.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    // Hover over icon
    await infoIcon.hover();
    await optionsPage.waitForTimeout(200);

    // Get color after hover
    const hoverColor = await infoIcon.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    // Colors should be different (hover should be blue)
    expect(hoverColor).not.toBe(initialColor);
    console.log(`✓ Info icon color changes on hover: ${initialColor} -> ${hoverColor}`);
  });
});

