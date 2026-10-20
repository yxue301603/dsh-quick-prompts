import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser', workers: 1, fullyParallel: false, timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:43179', headless: true, viewport: { width: 1280, height: 900 },
    ...(process.platform === 'win32' ? { channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' } : {}),
    screenshot: 'only-on-failure', trace: 'retain-on-failure',
  },
  webServer: { command: 'node tests/server.mjs', url: 'http://127.0.0.1:43179', reuseExistingServer: false, timeout: 30000 },
});
