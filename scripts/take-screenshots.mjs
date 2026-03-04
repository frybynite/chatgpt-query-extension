/**
 * Screenshot generation script for Chrome Web Store store-screenshots/
 * Launches the extension, populates sample data, and captures 5 screenshots at 1280×800.
 *
 * Usage: node scripts/take-screenshots.mjs
 */

import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'store-screenshots');

// Sample config data — showcases multi-provider support and new features
const SAMPLE_CONFIG = {
  version: 3,
  menus: [
    {
      id: 'menu_screenshot_001',
      name: 'Company Research',
      customGptUrl: 'https://chatgpt.com/g/g-68dfbe5566c08191b14e16e520379add-company-profiler',
      autoSubmit: true,
      runAllEnabled: false,
      runAllShortcut: '',
      order: 1,
      actions: [
        {
          id: 'act_001',
          title: 'Company Summary',
          prompt: 'Provide a summary of the company found in the text including their core business and market:',
          shortcut: 'Alt+Shift+O',
          enabled: true,
          order: 1,
          customGptUrl: '',
        },
        {
          id: 'act_002',
          title: 'Revenue Analysis',
          prompt: 'Provide a 5-year prior and 5-year projected revenue analysis for the given company. Just provide the data, no details required',
          shortcut: 'Alt+Shift+P',
          enabled: true,
          order: 2,
          customGptUrl: '',
        },
        {
          id: 'act_003',
          title: 'Key Executives',
          prompt: 'List the key executives and their roles for the company mentioned in this text:',
          shortcut: '',
          enabled: true,
          order: 3,
          customGptUrl: '',
        },
      ],
    },
    {
      id: 'menu_screenshot_002',
      name: 'Job Search',
      customGptUrl: 'https://chatgpt.com',
      autoSubmit: true,
      runAllEnabled: true,
      runAllShortcut: 'Alt+Shift+H',
      order: 2,
      actions: [
        {
          id: 'act_004',
          title: 'Job Summary',
          prompt: 'Summarize the job posting against my resume, skills, etc.:',
          shortcut: 'Alt+Shift+J',
          enabled: true,
          order: 1,
          customGptUrl: '',
        },
        {
          id: 'act_005',
          title: 'Cover Letter',
          prompt: 'Write a tailored cover letter for this job posting based on my background and experience:',
          shortcut: 'Alt+Shift+K',
          enabled: true,
          order: 2,
          customGptUrl: 'https://claude.ai',
        },
        {
          id: 'act_006',
          title: 'Salary Research',
          prompt: 'Research typical salary ranges for this role and location based on the job posting:',
          shortcut: '',
          enabled: true,
          order: 3,
          customGptUrl: 'https://gemini.google.com/app',
        },
      ],
    },
    {
      id: 'menu_screenshot_003',
      name: 'Writing Assistant',
      customGptUrl: 'https://claude.ai',
      autoSubmit: true,
      runAllEnabled: false,
      runAllShortcut: '',
      order: 3,
      actions: [
        {
          id: 'act_007',
          title: 'Improve Writing',
          prompt: 'Improve the clarity, grammar, and style of this text while preserving the original meaning:',
          shortcut: 'Alt+Shift+W',
          enabled: true,
          order: 1,
          customGptUrl: '',
        },
        {
          id: 'act_008',
          title: 'Summarize',
          prompt: 'Provide a concise summary of the key points in this text:',
          shortcut: 'Alt+Shift+S',
          enabled: true,
          order: 2,
          customGptUrl: '',
        },
      ],
    },
  ],
  globalSettings: {
    gptTitleMatch: 'ChatGPT',
    clearContext: true,
  },
};

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'screenshots-chrome-'));

  console.log('Launching Chrome with extension...');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false, // need headed for extension context menus to work
    channel: 'chromium',
    args: [
      `--disable-extensions-except=${ROOT}`,
      `--load-extension=${ROOT}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1280,800',
    ],
    viewport: { width: 1280, height: 800 },
  });

  // Get extension ID
  let [bg] = context.serviceWorkers();
  if (!bg) {
    bg = await context.waitForEvent('serviceworker', { timeout: 15000 });
  }
  const extensionId = bg.url().split('/')[2];
  console.log(`Extension ID: ${extensionId}`);

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  // Navigate to options page first so we have the extension context
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.waitForLoadState('networkidle');
  await wait(500);

  // Inject sample config into storage via extension page context
  console.log('Injecting sample config into storage...');
  const result = await page.evaluate((config) => {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ config }, () => {
        if (chrome.runtime.lastError) {
          resolve({ error: chrome.runtime.lastError.message });
        } else {
          // Read back to verify
          chrome.storage.sync.get('config', (data) => {
            resolve({ ok: true, menus: data.config?.menus?.length ?? 0 });
          });
        }
      });
    });
  }, SAMPLE_CONFIG);
  console.log('  Storage result:', JSON.stringify(result));

  // Reload options page with new data
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.waitForLoadState('networkidle');
  await wait(1200);

  // ─── SCREENSHOT 01: Options page overview ───────────────────────────────
  // Select first menu (Company Research) — it may already be selected
  console.log('Taking screenshot 01 (options page overview)...');
  const firstMenuItem = page.locator('.menu-item').first();
  await firstMenuItem.click();
  await wait(500);

  await page.screenshot({ path: path.join(OUT_DIR, '01-options-page-overview.png'), fullPage: false });
  console.log('  ✓ 01-options-page-overview.png');

  // ─── SCREENSHOT 02: Menu with actions (scrolled to show action details) ──
  console.log('Taking screenshot 02 (menu with actions)...');
  // Scroll down to show the actions section
  await page.evaluate(() => window.scrollTo(0, 400));
  await wait(300);
  await page.screenshot({ path: path.join(OUT_DIR, '02-menu-with-actions.png'), fullPage: false });
  console.log('  ✓ 02-menu-with-actions.png');

  // ─── SCREENSHOT 03: Multiple menus (Job Search with Run All + action URL override) ──
  console.log('Taking screenshot 03 (multiple menus)...');
  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(200);

  // Select Job Search menu (second menu)
  const menuItems = page.locator('.menu-item');
  await menuItems.nth(1).click();
  await wait(500);

  await page.screenshot({ path: path.join(OUT_DIR, '03-multiple-menus.png'), fullPage: false });
  console.log('  ✓ 03-multiple-menus.png');

  // ─── SCREENSHOT 04: Complete interface (all 3 menus, Writing Assistant selected) ──
  console.log('Taking screenshot 04 (complete interface)...');
  // Select Writing Assistant (3rd menu)
  await menuItems.nth(2).click();
  await wait(500);

  await page.screenshot({ path: path.join(OUT_DIR, '04-complete-interface.png'), fullPage: false });
  console.log('  ✓ 04-complete-interface.png');

  // ─── SCREENSHOT 05: In action — simulated context menu overlay ────────────
  console.log('Taking screenshot 05 (in action — context menu simulation)...');
  // Navigate to a fake article page
  await page.goto('about:blank');
  await page.evaluate(() => {
    document.body.style.margin = '0';
    document.body.style.fontFamily = 'Georgia, serif';
    document.body.style.background = '#f9f9f9';
    document.body.innerHTML = `
      <div style="max-width:900px;margin:40px auto;background:#fff;padding:40px 48px;box-shadow:0 2px 12px rgba(0,0,0,0.07);">
        <p style="font-size:12px;color:#888;margin-bottom:8px;">TECHNOLOGY · 3 min read</p>
        <h1 style="font-size:28px;line-height:1.3;margin-bottom:16px;color:#111;">Bosch Reports Record €92B Revenue as AI and Electrification Drive Growth</h1>
        <p style="color:#555;font-size:14px;margin-bottom:24px;">March 4, 2026 · Reuters</p>
        <p style="font-size:16px;line-height:1.7;color:#222;margin-bottom:16px;">
          Robert Bosch GmbH, the German industrial conglomerate, announced record annual revenue of €92 billion for fiscal year 2025,
          driven by strong demand in its AI-powered automotive technologies and industrial automation divisions.
        </p>
        <p style="font-size:16px;line-height:1.7;color:#222;margin-bottom:16px;">
          <span id="selected-text" style="background:#b3d4fc;border-radius:2px;padding:1px 0;">At Bosch, we shape the future through innovation in technology and services that move people and improve their lives.</span>
          The Stuttgart-based company employs over 420,000 people worldwide and operates in more than 60 countries.
        </p>
        <p style="font-size:16px;line-height:1.7;color:#222;margin-bottom:16px;">
          CEO Stefan Hartung credited the company's transformation strategy, stating that investments in connected mobility
          and smart manufacturing have positioned Bosch as a leader in the industrial AI space.
        </p>
      </div>

      <!-- Simulated macOS context menu -->
      <div id="ctx-menu" style="
        position:fixed;
        top:190px;
        left:300px;
        background:#2b2b2b;
        border-radius:8px;
        box-shadow:0 8px 32px rgba(0,0,0,0.5);
        padding:4px 0;
        min-width:280px;
        font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;
        font-size:13px;
        color:#f0f0f0;
        z-index:1000;
      ">
        <div style="padding:6px 14px;color:#ccc;">Look Up "At Bosch, we shape the"</div>
        <div style="padding:6px 14px;">Copy</div>
        <div style="padding:6px 14px;">Copy Link to Highlight</div>
        <div style="padding:6px 14px;">Search Google for "At Bosch, we shape the"</div>
        <div style="padding:6px 14px;">Print...</div>
        <div style="padding:6px 14px;">Open in Reading Mode</div>
        <div style="padding:6px 14px;">Translate Selection to English</div>
        <div style="height:1px;background:#555;margin:4px 0;"></div>

        <!-- Extension entry with hover highlight -->
        <div id="ext-item" style="
          padding:6px 14px;
          display:flex;
          align-items:center;
          gap:8px;
          background:#3d5a80;
          border-radius:4px;
          margin:2px 4px;
          cursor:default;
        ">
          <img src="chrome-extension://EXTENSION_ID_PLACEHOLDER/icons/icon-16.png"
               onerror="this.style.display='none'"
               style="width:16px;height:16px;">
          <span style="color:#fff;font-weight:500;">AI Custom Prompts</span>
          <span style="margin-left:auto;color:#ccc;">▶</span>
        </div>

        <!-- Sub-menu floating right -->
        <div style="
          position:absolute;
          left:calc(100% - 4px);
          top:196px;
          background:#2b2b2b;
          border-radius:8px;
          box-shadow:0 8px 32px rgba(0,0,0,0.5);
          padding:4px 0;
          min-width:200px;
        ">
          <div style="padding:4px 14px;font-size:11px;color:#999;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Company Research</div>
          <div style="padding:6px 14px;display:flex;align-items:center;justify-content:space-between;">
            <span>Company Summary</span>
            <span style="margin-left:auto;color:#ccc;">▶</span>
          </div>
          <div style="padding:6px 14px;display:flex;align-items:center;justify-content:space-between;">
            <span>Revenue Analysis</span>
            <span style="margin-left:auto;color:#ccc;">▶</span>
          </div>
          <div style="padding:6px 14px;">Key Executives</div>
          <div style="height:1px;background:#555;margin:4px 0;"></div>
          <div style="padding:4px 14px;font-size:11px;color:#999;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Job Search</div>
          <div style="padding:6px 14px;">Job Summary</div>
          <div style="padding:6px 14px;">Cover Letter</div>
          <!-- Nested sub-menu for Company Summary -->
          <div style="
            position:absolute;
            left:calc(100% - 4px);
            top:32px;
            background:#2b2b2b;
            border-radius:8px;
            box-shadow:0 8px 32px rgba(0,0,0,0.5);
            padding:4px 0;
            min-width:180px;
          ">
            <div style="padding:6px 14px;background:#3d5a80;border-radius:4px;margin:2px 4px;color:#fff;">Company Summary</div>
            <div style="padding:6px 14px;">Revenue Analysis</div>
          </div>
        </div>

        <div style="height:1px;background:#555;margin:4px 0;"></div>
        <div style="padding:6px 14px;">Inspect</div>
        <div style="padding:6px 14px;display:flex;align-items:center;justify-content:space-between;">
          <span>Speech</span><span style="color:#ccc;">▶</span>
        </div>
        <div style="padding:6px 14px;display:flex;align-items:center;justify-content:space-between;">
          <span>Writing Tools</span><span style="color:#ccc;">▶</span>
        </div>
        <div style="padding:6px 14px;display:flex;align-items:center;justify-content:space-between;">
          <span>Services</span><span style="color:#ccc;">▶</span>
        </div>
      </div>
    `;
  });
  await wait(500);

  await page.screenshot({ path: path.join(OUT_DIR, '05-in-action.png'), fullPage: false });
  console.log('  ✓ 05-in-action.png');

  await context.close();

  // Cleanup
  try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}

  console.log(`\nDone! Screenshots saved to: ${OUT_DIR}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
