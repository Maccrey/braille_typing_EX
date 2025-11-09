const { test, expect } = require('@playwright/test');
const {
  useFirebaseMocks,
  gotoPage,
  disableProgrammaticNavigation
} = require('./helpers/testUtils');

const MOCK_USER = {
  email: 'tester@example.com',
  password: 'pass1234',
  username: 'tester',
  uid: 'mock-user-1',
  token: 'mock-token-1'
};

test.describe('Firebase Auth Flow', () => {
  test.beforeEach(async ({ page }) => {
    await useFirebaseMocks(page, {
      users: [MOCK_USER]
    });
    await disableProgrammaticNavigation(page);
  });

  test('shows login form elements', async ({ page }) => {
    await gotoPage(page, 'login.html');
    await expect(page.locator('h1')).toHaveText(/로그인/);
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#login-button')).toHaveText(/로그인/);
  });

  test('validates empty credentials', async ({ page }) => {
    await gotoPage(page, 'login.html');
    await page.click('#login-button');
    await expect(page.locator('#error-message')).toContainText('이메일과 비밀번호를 모두 입력해주세요.');
  });

  test('logs in with valid Firebase mock user', async ({ page }) => {
    await gotoPage(page, 'login.html');
    await page.fill('#email', MOCK_USER.email);
    await page.fill('#password', MOCK_USER.password);
    await page.click('#login-button');
    const lastTarget = await page.evaluate(() => window.__lastNavigationTarget);
    expect(lastTarget).toBe('main.html');

    const storedUser = await page.evaluate(() => JSON.parse(localStorage.getItem('userData')));
    expect(storedUser.email).toBe(MOCK_USER.email);
  });

  test('surfaces Firebase login errors', async ({ page }) => {
    await gotoPage(page, 'login.html');
    await page.fill('#email', 'unknown@example.com');
    await page.fill('#password', 'wrong');
    await page.click('#login-button');
    await expect(page.locator('#error-message')).toContainText('잘못된 사용자명 또는 비밀번호입니다');
  });

  test('navigates to signup page', async ({ page }) => {
    await gotoPage(page, 'login.html');
    await page.click('a[href="signup.html"]');
    await expect(page).toHaveURL(/signup\.html/);
  });
});

test.describe('Firebase Signup Flow', () => {
  test.beforeEach(async ({ page }) => {
    await useFirebaseMocks(page, {});
    await disableProgrammaticNavigation(page);
  });

  test('creates account via Firebase mock and redirects to main', async ({ page }) => {
    await gotoPage(page, 'signup.html');
    await page.fill('#email', 'new-user@example.com');
    await page.fill('#password', 'secret123');
    await page.fill('#confirmPassword', 'secret123');
    await page.click('#signup-button');
    const lastTarget = await page.evaluate(() => window.__lastNavigationTarget);
    expect(lastTarget).toBe('main.html');
  });

  test('shows validation error when passwords mismatch', async ({ page }) => {
    await gotoPage(page, 'signup.html');
    await page.fill('#email', 'new-user@example.com');
    await page.fill('#password', 'secret123');
    await page.fill('#confirmPassword', 'other123');
    await page.click('#signup-button');
    await expect(page.locator('#error-message')).toContainText('비밀번호가 일치하지 않습니다');
  });
});
