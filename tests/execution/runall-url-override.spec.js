// tests/execution/runall-url-override.spec.js
import { test, expect } from '../fixtures/extension.js';

/**
 * RA-URL-01: Run All must honour per-action URL override
 *
 * Bug: runAllActions() always passes menu.customGptUrl to chrome.tabs.create and
 * tryInjectWithTiming(), ignoring action.customGptUrl.  executeAction() already
 * handles the override correctly — runAllActions must match that behaviour.
 */
test.describe('Run All - per-action URL override', () => {
  test('RA-URL-01: opens each action tab with the correct effective URL', async ({ context, extensionId }) => {
    // ── Setup ──────────────────────────────────────────────────────────────
    const pages = context.pages();
    const page = pages.length > 0 ? pages[0] : await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');

    const menuId = 'menu_ra_url_override_test';

    // Config: 2 actions.
    //   act1 — no override   → should open menu URL  (chatgpt.com)
    //   act2 — URL override  → should open gemini.google.com/app
    await page.evaluate((config) => {
      return new Promise((resolve) => chrome.storage.sync.set({ config }, resolve));
    }, {
      version: 3,
      menus: [{
        id: menuId,
        name: 'Run All URL Override Test',
        customGptUrl: 'https://chatgpt.com',
        autoSubmit: false,
        runAllEnabled: true,
        runAllShortcut: '',
        order: 1,
        actions: [
          {
            id: 'act1',
            title: 'Action 1 - no override',
            prompt: 'Prompt 1:',
            shortcut: '',
            enabled: true,
            order: 1,
            customGptUrl: '',
          },
          {
            id: 'act2',
            title: 'Action 2 - Gemini override',
            prompt: 'Prompt 2:',
            shortcut: '',
            enabled: true,
            order: 2,
            customGptUrl: 'https://gemini.google.com/app',
          },
        ],
      }],
      globalSettings: { gptTitleMatch: 'ChatGPT', clearContext: true },
    });

    // ── Capture new tab URLs as they are created ───────────────────────────
    const openedUrls = [];
    const pageHandler = async (newPage) => {
      // Wait for navigation to start so we get the real URL, not about:blank
      await newPage.waitForURL((url) => url.toString() !== 'about:blank', { timeout: 3000 })
        .catch(() => {});
      openedUrls.push(newPage.url());
    };
    context.on('page', pageHandler);

    // ── Trigger Run All via the same message path used by keyboard shortcuts ─
    await page.evaluate((mId) => {
      chrome.runtime.sendMessage({
        type: 'EXECUTE_SHORTCUT',
        actionId: { menuId: mId, actionId: 'runAll' },
        selectionText: 'test selection text',
      });
    }, menuId);

    // ── Wait for both tabs to be created (chrome.tabs.create is fast) ──────
    const deadline = Date.now() + 8000;
    while (openedUrls.length < 2 && Date.now() < deadline) {
      await page.waitForTimeout(200);
    }
    context.removeListener('page', pageHandler);

    // Close the AI tabs so they don't pollute subsequent tests
    for (const p of context.pages()) {
      if (p !== page) await p.close().catch(() => {});
    }

    // ── Assertions ─────────────────────────────────────────────────────────
    expect(openedUrls.length).toBe(2);

    // act1 has no override → must use menu URL (chatgpt.com)
    expect(openedUrls.some((url) => url.startsWith('https://chatgpt.com')),
      `Expected one tab to open chatgpt.com, got: ${JSON.stringify(openedUrls)}`
    ).toBe(true);

    // act2 has override → must use gemini.google.com, NOT chatgpt.com
    expect(openedUrls.some((url) => url.startsWith('https://gemini.google.com')),
      `Expected one tab to open gemini.google.com, got: ${JSON.stringify(openedUrls)}`
    ).toBe(true);

    console.log('✓ Run All opened tabs with correct URLs:', openedUrls);
  });
});
