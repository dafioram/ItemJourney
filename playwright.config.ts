import { defineConfig, devices } from '@playwright/test';
import chromium from '@sparticuz/chromium';

// This sandbox's network policy blocks Playwright's normal browser download
// (cdn.playwright.dev is not on the egress allowlist). @sparticuz/chromium
// ships a real Chromium binary as part of the npm package itself, so it
// installs from the registry with no extra download step. We drive that
// binary with Playwright's own test runner and APIs.
//
// @sparticuz/chromium's default args are tuned for one-shot Lambda
// invocations and are actively wrong here: `--single-process` makes
// sequential multi-context test runs hang/crash after a few tests, and a
// hardcoded `--headless='shell'` silently overrides Playwright's own
// `headless` option (so a "headed" project would have quietly stayed
// headless-shell underneath). Both are stripped below.
//
// The "headed" project runs with headless: false under Xvfb (see
// package.json's "test:e2e" script), which is what actually exercises the
// real compositing/paint pipeline - this is what catches things like
// `display: none` or clipped/overlapping elements that a `--headless`
// run can paper over.
const executablePath = await chromium.executablePath();
const baseArgs = chromium.args.filter((a) => !a.startsWith('--single-process') && !a.startsWith('--headless'));

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'headed',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        launchOptions: {
          executablePath,
          headless: false,
          args: baseArgs,
        },
      },
    },
    {
      name: 'headless-smoke',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        launchOptions: {
          executablePath,
          headless: true,
          args: baseArgs,
        },
      },
    },
  ],
});
