import { test, expect } from '../fixtures/extension.js';

/**
 * Tests for Shortcut Tooltips
 *
 * Verifies that:
 * 1. Shortcut tooltips appear on hover
 * 2. Tooltip shows word version of shortcuts (e.g., "Option+P" for "⌥+P")
 * 3. Tooltip appears quickly (150ms delay)
 * 4. Tooltip disappears on mouse leave
 * 5. Tooltip works for action shortcuts
 * 6. Tooltip works for Run All shortcut
 */

test.describe('UI Tests - Shortcut Tooltips', () => {
  test('should show tooltip when hovering over shortcut input', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('networkidle');

    // Create a menu with an action
    const addMenuBtn = optionsPage.locator('#add-menu');
    await addMenuBtn.click();
    await optionsPage.waitForTimeout(200);

    // Set a valid URL
    const customGptUrlInput = optionsPage.locator('#customGptUrl');
    await customGptUrlInput.clear();
    await customGptUrlInput.fill('https://chatgpt.com/g/g-test123');

    // Add an action
    const addActionBtn = optionsPage.locator('#add-action');
    await addActionBtn.click();
    await optionsPage.waitForTimeout(200);

    // Assign a shortcut
    const shortcutBtn = optionsPage.locator('.action-item .btn-capture').last();
    await shortcutBtn.click();
    await optionsPage.waitForTimeout(100);

    // Press a shortcut combination
    await optionsPage.keyboard.down('Control');
    await optionsPage.keyboard.press('P');
    await optionsPage.keyboard.up('Control');
    await optionsPage.waitForTimeout(300);

    // Find the shortcut input
    const shortcutInput = optionsPage.locator('.action-item .action-shortcut').last();
    const shortcutValue = await shortcutInput.inputValue();
    expect(shortcutValue).toBeTruthy();
    console.log(`Shortcut assigned: ${shortcutValue}`);

    // Hover over the shortcut input
    await shortcutInput.hover();
    await optionsPage.waitForTimeout(300); // Wait for tooltip to appear

    // Check for tooltip element
    const tooltip = shortcutInput.locator('..').locator('.shortcut-tooltip');
    await expect(tooltip).toBeVisible({ timeout: 1000 });

    const tooltipText = await tooltip.textContent();
    expect(tooltipText).toBeTruthy();
    console.log(`✓ Tooltip appeared with text: "${tooltipText}"`);

    // Tooltip should contain word version (e.g., "Control" or "Ctrl")
    expect(tooltipText.toLowerCase()).toMatch(/control|ctrl/);
  });

  test('should hide tooltip when mouse leaves shortcut input', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('networkidle');

    // Create a menu with an action
    const addMenuBtn = optionsPage.locator('#add-menu');
    await addMenuBtn.click();
    await optionsPage.waitForTimeout(200);

    const customGptUrlInput = optionsPage.locator('#customGptUrl');
    await customGptUrlInput.clear();
    await customGptUrlInput.fill('https://chatgpt.com/g/g-test123');

    const addActionBtn = optionsPage.locator('#add-action');
    await addActionBtn.click();
    await optionsPage.waitForTimeout(200);

    // Assign a shortcut
    const shortcutBtn = optionsPage.locator('.action-item .btn-capture').last();
    await shortcutBtn.click();
    await optionsPage.waitForTimeout(100);

    await optionsPage.keyboard.down('Alt');
    await optionsPage.keyboard.press('X');
    await optionsPage.keyboard.up('Alt');
    await optionsPage.waitForTimeout(300);

    const shortcutInput = optionsPage.locator('.action-item .action-shortcut').last();

    // Hover to show tooltip
    await shortcutInput.hover();
    await optionsPage.waitForTimeout(300);

    const tooltip = shortcutInput.locator('..').locator('.shortcut-tooltip');
    await expect(tooltip).toBeVisible();

    // Move mouse away
    const menuNameInput = optionsPage.locator('#menuName');
    await menuNameInput.hover();
    await optionsPage.waitForTimeout(400); // Give more time for tooltip to hide

    // Tooltip should be hidden (check for .show class removal or visibility)
    // The tooltip element might still exist but should not have .show class
    const tooltipClasses = await tooltip.getAttribute('class') || '';
    expect(tooltipClasses).not.toContain('show');
    
    // Also verify opacity is 0 or element is not visible
    const opacity = await tooltip.evaluate((el) => {
      return window.getComputedStyle(el).opacity;
    });
    expect(parseFloat(opacity)).toBeLessThan(1);
    console.log('✓ Tooltip hidden when mouse leaves');
  });

  test('should show tooltip for Run All shortcut', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('networkidle');

    // Select a menu
    const menuItems = optionsPage.locator('.menu-item');
    await menuItems.first().click();
    await optionsPage.waitForTimeout(200);

    // Enable Run All
    const runAllEnabled = optionsPage.locator('#runAllEnabled');
    await runAllEnabled.check();
    await optionsPage.waitForTimeout(200);

    // Assign Run All shortcut
    const runAllShortcutBtn = optionsPage.locator('#runAllShortcutBtn');
    await runAllShortcutBtn.click();
    await optionsPage.waitForTimeout(100);

    await optionsPage.keyboard.down('Control');
    await optionsPage.keyboard.press('Shift');
    await optionsPage.keyboard.press('R');
    await optionsPage.keyboard.up('Control');
    await optionsPage.keyboard.up('Shift');
    await optionsPage.waitForTimeout(300);

    const runAllShortcutInput = optionsPage.locator('#runAllShortcut');
    const shortcutValue = await runAllShortcutInput.inputValue();
    expect(shortcutValue).toBeTruthy();

    // Hover over Run All shortcut input
    await runAllShortcutInput.hover();
    await optionsPage.waitForTimeout(300);

    // Check for tooltip
    const tooltip = runAllShortcutInput.locator('..').locator('.shortcut-tooltip');
    await expect(tooltip).toBeVisible({ timeout: 1000 });

    const tooltipText = await tooltip.textContent();
    expect(tooltipText).toBeTruthy();
    console.log(`✓ Run All shortcut tooltip: "${tooltipText}"`);
  });

  test('should show tooltip on focus as well as hover', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('networkidle');

    // Create a menu with an action
    const addMenuBtn = optionsPage.locator('#add-menu');
    await addMenuBtn.click();
    await optionsPage.waitForTimeout(200);

    const customGptUrlInput = optionsPage.locator('#customGptUrl');
    await customGptUrlInput.clear();
    await customGptUrlInput.fill('https://chatgpt.com/g/g-test123');

    const addActionBtn = optionsPage.locator('#add-action');
    await addActionBtn.click();
    await optionsPage.waitForTimeout(200);

    // Assign a shortcut
    const shortcutBtn = optionsPage.locator('.action-item .btn-capture').last();
    await shortcutBtn.click();
    await optionsPage.waitForTimeout(100);

    await optionsPage.keyboard.down('Meta');
    await optionsPage.keyboard.press('K');
    await optionsPage.keyboard.up('Meta');
    await optionsPage.waitForTimeout(300);

    const shortcutInput = optionsPage.locator('.action-item .action-shortcut').last();

    // Focus the input (tab to it)
    await shortcutInput.focus();
    await optionsPage.waitForTimeout(300);

    // Check for tooltip
    const tooltip = shortcutInput.locator('..').locator('.shortcut-tooltip');
    await expect(tooltip).toBeVisible({ timeout: 1000 });
    console.log('✓ Tooltip appears on focus');
  });
});

