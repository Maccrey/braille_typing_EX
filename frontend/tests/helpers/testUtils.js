const path = require('path');
const { pathToFileURL } = require('url');

const frontendRoot = path.resolve(__dirname, '..', '..');
const fileMode = process.env.PLAYWRIGHT_FILE_MODE === '1';
const baseUrl = process.env.PLAYWRIGHT_BASE_URL;

async function useFirebaseMocks(page, config = {}) {
  const scriptPath = path.join(__dirname, 'mockFirebaseInit.js');
  await page.addInitScript(cfg => {
    window.__MOCK_FIREBASE_CONFIG__ = cfg;
  }, config);
  await page.addInitScript({ path: scriptPath });
}

async function gotoPage(page, relativePath) {
  const cleanPath = relativePath.replace(/^\/+/, '');

  if (!fileMode && baseUrl) {
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const targetUrl = new URL(cleanPath, normalizedBase).toString();
    await page.goto(targetUrl);
    return;
  }

  const absolutePath = path.join(frontendRoot, cleanPath);
  const fileUrl = pathToFileURL(absolutePath).href;
  await page.goto(fileUrl);
}

async function disableProgrammaticNavigation(page) {
  await page.addInitScript(() => {
    window.__TEST_MODE__ = true;
  });
}

module.exports = {
  useFirebaseMocks,
  gotoPage,
  disableProgrammaticNavigation,
  fileMode
};
