const { defineConfig, devices } = require('@playwright/test');

const useFileMode = process.env.PLAYWRIGHT_FILE_MODE === '1';
const httpPort = 4173;
const defaultBaseURL = `http://127.0.0.1:${httpPort}`;

if (!useFileMode) {
  process.env.PLAYWRIGHT_BASE_URL = defaultBaseURL;
  process.env.PLAYWRIGHT_FILE_MODE = '0';
} else {
  process.env.PLAYWRIGHT_BASE_URL = '';
}

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: useFileMode ? undefined : defaultBaseURL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  ...(useFileMode
    ? {}
    : {
        webServer: {
          command: `npx http-server -a 127.0.0.1 -p ${httpPort}`,
          port: httpPort,
          reuseExistingServer: !process.env.CI,
        },
      }),
});
