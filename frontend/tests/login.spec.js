const { test, expect } = require('@playwright/test');

test.describe('Login Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page before each test
    await page.goto('/login.html');
  });

  test('should display login form elements', async ({ page }) => {
    // Check if the page title is correct
    await expect(page).toHaveTitle(/점자 타자 연습기.*로그인/);

    // Check if login form exists
    const loginForm = page.locator('form#login-form');
    await expect(loginForm).toBeVisible();

    // Check if username input exists
    const usernameInput = page.locator('input[name="username"]');
    await expect(usernameInput).toBeVisible();
    await expect(usernameInput).toHaveAttribute('type', 'text');
    await expect(usernameInput).toHaveAttribute('placeholder', /사용자명/);

    // Check if password input exists
    const passwordInput = page.locator('input[name="password"]');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(passwordInput).toHaveAttribute('placeholder', /비밀번호/);

    // Check if login button exists
    const loginButton = page.locator('button[type="submit"]');
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toHaveText(/로그인/);

    // Check if signup link exists
    const signupLink = page.locator('a[href="signup.html"]');
    await expect(signupLink).toBeVisible();
    await expect(signupLink).toHaveText(/회원가입/);
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // Try to submit form with empty fields
    const loginButton = page.locator('button[type="submit"]');
    await loginButton.click();

    // Check for error messages
    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText(/사용자명과 비밀번호를 입력해주세요/);
  });

  test('should show validation error for empty username', async ({ page }) => {
    // Fill only password
    await page.fill('input[name="password"]', 'testpassword');

    // Try to submit
    const loginButton = page.locator('button[type="submit"]');
    await loginButton.click();

    // Check for error message
    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText(/사용자명을 입력해주세요/);
  });

  test('should show validation error for empty password', async ({ page }) => {
    // Fill only username
    await page.fill('input[name="username"]', 'testuser');

    // Try to submit
    const loginButton = page.locator('button[type="submit"]');
    await loginButton.click();

    // Check for error message
    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText(/비밀번호를 입력해주세요/);
  });

  test('should attempt login with valid credentials', async ({ page }) => {
    // Fill login form
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'testpassword123');

    // Submit form
    const loginButton = page.locator('button[type="submit"]');
    await loginButton.click();

    // Check for loading state
    const loadingIndicator = page.locator('.loading');
    await expect(loadingIndicator).toBeVisible();
    await expect(loadingIndicator).toHaveText(/로그인 중.../);
  });

  test('should handle login API error responses', async ({ page }) => {
    // Mock API response for invalid credentials
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid credentials' })
      });
    });

    // Fill login form with invalid credentials
    await page.fill('input[name="username"]', 'wronguser');
    await page.fill('input[name="password"]', 'wrongpassword');

    // Submit form
    const loginButton = page.locator('button[type="submit"]');
    await loginButton.click();

    // Check for error message
    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText(/잘못된 사용자명 또는 비밀번호입니다/);
  });

  test('should redirect to main page on successful login', async ({ page }) => {
    // Mock successful API response
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Login successful',
          token: 'fake-jwt-token',
          user: { id: 1, username: 'testuser' }
        })
      });
    });

    // Fill login form
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'testpassword123');

    // Submit form
    const loginButton = page.locator('button[type="submit"]');
    await loginButton.click();

    // Check for redirect to main page
    await expect(page).toHaveURL(/main\.html/);
  });

  test('should store JWT token in localStorage on successful login', async ({ page }) => {
    // Mock successful API response
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Login successful',
          token: 'fake-jwt-token-for-storage',
          user: { id: 1, username: 'testuser' }
        })
      });
    });

    // Fill and submit login form
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');

    // Wait for redirect and check localStorage
    await page.waitForURL(/main\.html/);

    const token = await page.evaluate(() => {
      return localStorage.getItem('authToken');
    });
    expect(token).toBe('fake-jwt-token-for-storage');

    const userData = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('userData') || '{}');
    });
    expect(userData.username).toBe('testuser');
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network error
    await page.route('**/api/auth/login', async route => {
      await route.abort('failed');
    });

    // Fill and submit form
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');

    // Check for network error message
    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText(/네트워크 오류가 발생했습니다/);
  });

  test('should navigate to signup page when signup link is clicked', async ({ page }) => {
    // Click signup link
    const signupLink = page.locator('a[href="signup.html"]');
    await signupLink.click();

    // Check for navigation to signup page
    await expect(page).toHaveURL(/signup\.html/);
  });
});