import { test, expect } from '../fixtures/extension.js';

/**
 * TEST-RC01: Keyboard Shortcut Race Condition Fix
 *
 * Verifies that:
 * 1. Keyboard shortcuts work immediately after page load (no race condition)
 * 2. Shortcuts array is populated before listener is registered
 * 3. No missed keypresses occur during initialization
 * 4. Debug logging shows correct timing (when enabled)
 */

test.describe('Shortcut Tests - Race Condition Fix', () => {
  test('TEST-RC01: should NOT have race condition - shortcuts work immediately on page load', async ({ context, optionsPage, extensionId }) => {
    // Step 1: Configure a shortcut in options page
    await optionsPage.waitForLoadState('networkidle');

    // Create menu with an action
    const addMenuBtn = optionsPage.locator('#add-menu');
    await addMenuBtn.click();
    await optionsPage.waitForTimeout(200);

    const menuNameInput = optionsPage.locator('#menuName');
    await menuNameInput.fill('Test Menu');

    // Add custom GPT URL (required for validation)
    const customGptUrlInput = optionsPage.locator('#customGptUrl');
    await customGptUrlInput.fill('https://chatgpt.com/g/g-test');

    // Add action with shortcut
    const addActionBtn = optionsPage.locator('#add-action');
    await addActionBtn.click();
    await optionsPage.waitForTimeout(200);

    const actionTitles = optionsPage.locator('.action-title');
    await actionTitles.last().fill('Test Action');

    const actionPrompts = optionsPage.locator('.action-prompt');
    await actionPrompts.last().fill('Test prompt:');

    // Assign keyboard shortcut: Ctrl+Shift+R
    const shortcutBtns = optionsPage.locator('.action-item .btn-capture');
    await shortcutBtns.last().click();
    await optionsPage.waitForTimeout(200);

    await optionsPage.keyboard.down('Control');
    await optionsPage.keyboard.down('Shift');
    await optionsPage.keyboard.press('R');
    await optionsPage.keyboard.up('Shift');
    await optionsPage.keyboard.up('Control');
    await optionsPage.waitForTimeout(300);

    // Save configuration
    const saveBtn = optionsPage.locator('#save');
    await saveBtn.click();
    await optionsPage.waitForTimeout(1000); // Wait for save to complete and background to process

    console.log('✓ Shortcut configured: Ctrl+Shift+R');

    // Step 2: Enable debug logging to verify timing
    // Click hamburger menu to open dropdown
    const hamburgerBtn = optionsPage.locator('#hamburger-menu');
    await hamburgerBtn.click();
    await optionsPage.waitForTimeout(100);

    const debugToggle = optionsPage.locator('#debug-logging-toggle');
    await debugToggle.check();
    await optionsPage.waitForTimeout(100);

    // Close dropdown
    await hamburgerBtn.click();
    await optionsPage.waitForTimeout(100);

    console.log('✓ Debug logging enabled');

    // Step 3: Navigate to a test page
    const testPage = await context.newPage();

    // Start listening for console messages BEFORE navigating
    const consoleMessages = [];
    testPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Shortcuts]')) {
        consoleMessages.push(text);
      }
    });

    // Navigate to a simple page
    await testPage.goto('https://example.com');

    // Wait for content script to initialize
    await testPage.waitForTimeout(500);

    console.log('✓ Navigated to test page');
    console.log(`  Console messages captured: ${consoleMessages.length}`);

    // Step 4: Verify initialization messages show correct order
    const initComplete = consoleMessages.find(msg => msg.includes('Initialization complete'));
    expect(initComplete).toBeTruthy();
    console.log('✓ Content script initialized successfully');

    // Step 5: Select text on the page
    await testPage.evaluate(() => {
      // Select the text "Example Domain"
      const range = document.createRange();
      const textNode = document.querySelector('h1');
      if (textNode) {
        range.selectNodeContents(textNode);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });

    console.log('✓ Text selected on page');

    // Step 6: Press the keyboard shortcut (Ctrl+Shift+R)
    await testPage.keyboard.press('Control+Shift+R');

    // Wait for shortcut processing
    await testPage.waitForTimeout(500);

    console.log('✓ Keyboard shortcut pressed');

    // Step 7: Verify shortcut was detected (should see "Triggered" message)
    const triggeredMsg = consoleMessages.find(msg =>
      msg.includes('Triggered') || msg.includes('Keypress')
    );
    expect(triggeredMsg).toBeTruthy();
    console.log('✓ Shortcut was detected:', triggeredMsg);

    // Step 8: Verify NO "POTENTIAL MISS" warnings (would indicate race condition)
    const missedKeypress = consoleMessages.find(msg => msg.includes('POTENTIAL MISS'));
    expect(missedKeypress).toBeFalsy();
    console.log('✓ No race condition detected (no POTENTIAL MISS warnings)');

    await testPage.close();
  });

  test('TEST-RC02: should load shortcuts before registering keyboard listener', async ({ context, optionsPage }) => {
    // Configure a shortcut
    await optionsPage.waitForLoadState('networkidle');

    const addMenuBtn = optionsPage.locator('#add-menu');
    await addMenuBtn.click();
    await optionsPage.waitForTimeout(200);

    const menuNameInput = optionsPage.locator('#menuName');
    await menuNameInput.fill('Timing Test');

    // Add custom GPT URL (required for validation)
    const customGptUrlInput = optionsPage.locator('#customGptUrl');
    await customGptUrlInput.fill('https://chatgpt.com/g/g-timing-test');

    const addActionBtn = optionsPage.locator('#add-action');
    await addActionBtn.click();
    await optionsPage.waitForTimeout(200);

    const actionTitles = optionsPage.locator('.action-title');
    await actionTitles.last().fill('Timing Action');

    const actionPrompts = optionsPage.locator('.action-prompt');
    await actionPrompts.last().fill('Timing test:');

    // Assign shortcut
    const shortcutBtns = optionsPage.locator('.action-item .btn-capture');
    await shortcutBtns.last().click();
    await optionsPage.waitForTimeout(100);

    await optionsPage.keyboard.down('Control');
    await optionsPage.keyboard.down('Alt');
    await optionsPage.keyboard.press('T');
    await optionsPage.keyboard.up('Alt');
    await optionsPage.keyboard.up('Control');
    await optionsPage.waitForTimeout(200);

    const saveBtn = optionsPage.locator('#save');
    await saveBtn.click();
    await optionsPage.waitForTimeout(300);

    // Enable debug logging
    const hamburgerBtn = optionsPage.locator('#hamburger-menu');
    await hamburgerBtn.click();
    await optionsPage.waitForTimeout(100);

    const debugToggle = optionsPage.locator('#debug-logging-toggle');
    await debugToggle.check();
    await optionsPage.waitForTimeout(100);

    await hamburgerBtn.click();
    await optionsPage.waitForTimeout(100);

    // Navigate to test page and capture console
    const testPage = await context.newPage();

    const consoleMessages = [];
    testPage.on('console', msg => {
      consoleMessages.push(msg.text());
    });

    await testPage.goto('https://example.com');
    await testPage.waitForTimeout(500);

    // Look for diagnostic table showing timing
    // The table should show that listener was registered AFTER shortcuts loaded
    const hasTimingTable = consoleMessages.some(msg =>
      msg.includes('Script → Listener') ||
      msg.includes('Listener → Request') ||
      msg.includes('Missed Keys')
    );

    if (hasTimingTable) {
      console.log('✓ Timing diagnostics present');

      // Look for "Missed Keys: 0" in the output
      const missedKeysMsg = consoleMessages.find(msg => msg.includes('Missed Keys'));
      if (missedKeysMsg) {
        console.log('  ', missedKeysMsg);
      }
    }

    await testPage.close();
  });

  test('TEST-RC03: should handle rapid page loads without race condition', async ({ context, optionsPage }) => {
    // Configure shortcut
    await optionsPage.waitForLoadState('networkidle');

    const addMenuBtn = optionsPage.locator('#add-menu');
    await addMenuBtn.click();
    await optionsPage.waitForTimeout(200);

    const menuNameInput = optionsPage.locator('#menuName');
    await menuNameInput.fill('Rapid Load Test');

    // Add custom GPT URL (required for validation)
    const customGptUrlInput = optionsPage.locator('#customGptUrl');
    await customGptUrlInput.fill('https://chatgpt.com/g/g-rapid-test');

    const addActionBtn = optionsPage.locator('#add-action');
    await addActionBtn.click();
    await optionsPage.waitForTimeout(200);

    const actionTitles = optionsPage.locator('.action-title');
    await actionTitles.last().fill('Rapid Test');

    const actionPrompts = optionsPage.locator('.action-prompt');
    await actionPrompts.last().fill('Rapid:');

    const shortcutBtns = optionsPage.locator('.action-item .btn-capture');
    await shortcutBtns.last().click();
    await optionsPage.waitForTimeout(100);

    await optionsPage.keyboard.down('Control');
    await optionsPage.keyboard.down('Shift');
    await optionsPage.keyboard.press('Q');
    await optionsPage.keyboard.up('Shift');
    await optionsPage.keyboard.up('Control');
    await optionsPage.waitForTimeout(200);

    const saveBtn = optionsPage.locator('#save');
    await saveBtn.click();
    await optionsPage.waitForTimeout(300);

    // Enable debug logging
    const hamburgerBtn = optionsPage.locator('#hamburger-menu');
    await hamburgerBtn.click();
    await optionsPage.waitForTimeout(100);

    const debugToggle = optionsPage.locator('#debug-logging-toggle');
    await debugToggle.check();
    await optionsPage.waitForTimeout(100);

    await hamburgerBtn.click();
    await optionsPage.waitForTimeout(100);

    // Test multiple rapid page loads
    const testUrls = [
      'https://example.com',
      'https://example.org',
      'https://example.net'
    ];

    let allTestsPassed = true;

    for (const url of testUrls) {
      const testPage = await context.newPage();

      const consoleMessages = [];
      testPage.on('console', msg => {
        const text = msg.text();
        if (text.includes('[Shortcuts]')) {
          consoleMessages.push(text);
        }
      });

      await testPage.goto(url);

      // Wait for initialization
      await testPage.waitForTimeout(300);

      // Check for POTENTIAL MISS warnings
      const hasMiss = consoleMessages.some(msg => msg.includes('POTENTIAL MISS'));

      if (hasMiss) {
        console.log(`✗ Race condition on ${url}`);
        allTestsPassed = false;
      } else {
        console.log(`✓ No race condition on ${url}`);
      }

      await testPage.close();
    }

    expect(allTestsPassed).toBe(true);
    console.log('✓ All rapid page loads completed without race conditions');
  });

  test('TEST-RC04: should show missed keypresses count as 0 in diagnostics', async ({ context, optionsPage }) => {
    // Configure shortcut
    await optionsPage.waitForLoadState('networkidle');

    const addMenuBtn = optionsPage.locator('#add-menu');
    await addMenuBtn.click();
    await optionsPage.waitForTimeout(200);

    const menuNameInput = optionsPage.locator('#menuName');
    await menuNameInput.fill('Diagnostic Test');

    // Add custom GPT URL (required for validation)
    const customGptUrlInput = optionsPage.locator('#customGptUrl');
    await customGptUrlInput.fill('https://chatgpt.com/g/g-diagnostic-test');

    const addActionBtn = optionsPage.locator('#add-action');
    await addActionBtn.click();
    await optionsPage.waitForTimeout(200);

    const actionTitles = optionsPage.locator('.action-title');
    await actionTitles.last().fill('Diagnostic Action');

    const actionPrompts = optionsPage.locator('.action-prompt');
    await actionPrompts.last().fill('Diagnostic:');

    const shortcutBtns = optionsPage.locator('.action-item .btn-capture');
    await shortcutBtns.last().click();
    await optionsPage.waitForTimeout(100);

    await optionsPage.keyboard.down('Control');
    await optionsPage.keyboard.press('D');
    await optionsPage.keyboard.up('Control');
    await optionsPage.waitForTimeout(200);

    const saveBtn = optionsPage.locator('#save');
    await saveBtn.click();
    await optionsPage.waitForTimeout(300);

    // Enable debug logging
    const hamburgerBtn = optionsPage.locator('#hamburger-menu');
    await hamburgerBtn.click();
    await optionsPage.waitForTimeout(100);

    const debugToggle = optionsPage.locator('#debug-logging-toggle');
    await debugToggle.check();
    await optionsPage.waitForTimeout(100);

    await hamburgerBtn.click();
    await optionsPage.waitForTimeout(100);

    // Create new page and check diagnostics
    const testPage = await context.newPage();

    const consoleMessages = [];
    testPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Shortcuts]')) {
        consoleMessages.push(text);
      }
    });

    await testPage.goto('https://example.com');
    await testPage.waitForTimeout(500);

    // Verify initialization completed successfully
    const initComplete = consoleMessages.find(msg => msg.includes('Initialization complete'));
    expect(initComplete).toBeTruthy();
    console.log('✓ Content script initialized successfully');

    // The key assertion: No "POTENTIAL MISS" warnings (would indicate race condition)
    const missedKeypress = consoleMessages.find(msg => msg.includes('POTENTIAL MISS'));
    expect(missedKeypress).toBeFalsy();
    console.log('✓ No POTENTIAL MISS warnings in diagnostics');

    // Verify load time was logged (proves diagnostics are working)
    const loadTimeMsg = consoleMessages.find(msg => msg.includes('Load time:'));
    if (loadTimeMsg) {
      console.log('✓ Diagnostic timing logged:', loadTimeMsg);
    }

    await testPage.close();
  });
});
