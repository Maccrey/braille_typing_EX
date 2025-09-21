const { test, expect } = require('@playwright/test');

test.describe('Signup Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to signup page before each test
    await page.goto('/signup.html');
  });

  test('should display signup form elements', async ({ page }) => {
    // Check if the page title is correct
    await expect(page).toHaveTitle(/점자 타자 연습기.*회원가입/);

    // Check if signup form exists
    const signupForm = page.locator('form#signup-form');
    await expect(signupForm).toBeVisible();

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

    // Check if confirm password input exists
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');
    await expect(confirmPasswordInput).toBeVisible();
    await expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    await expect(confirmPasswordInput).toHaveAttribute('placeholder', /비밀번호 확인/);

    // Check if signup button exists
    const signupButton = page.locator('button[type="submit"]');
    await expect(signupButton).toBeVisible();
    await expect(signupButton).toHaveText(/회원가입/);

    // Check if login link exists
    const loginLink = page.locator('a[href="login.html"]');
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveText(/로그인/);
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // Try to submit form with empty fields
    const signupButton = page.locator('button[type="submit"]');
    await signupButton.click();

    // Check for error messages
    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText(/모든 필드를 입력해주세요/);
  });

  test('should show validation error for empty username', async ({ page }) => {
    // Fill only password fields
    await page.fill('input[name="password"]', 'testpassword123');
    await page.fill('input[name="confirmPassword"]', 'testpassword123');

    // Try to submit
    const signupButton = page.locator('button[type="submit"]');
    await signupButton.click();

    // Check for error message
    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText(/사용자명을 입력해주세요/);
  });

  test('should show validation error for short username', async ({ page }) => {
    // Fill with short username
    await page.fill('input[name="username"]', 'ab');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.fill('input[name="confirmPassword"]', 'testpassword123');

    // Try to submit
    const signupButton = page.locator('button[type="submit"]');
    await signupButton.click();

    // Check for error message
    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText(/사용자명은 3글자 이상이어야 합니다/);
  });

  test('should show validation error for empty password', async ({ page }) => {
    // Fill only username
    await page.fill('input[name="username"]', 'testuser');

    // Try to submit
    const signupButton = page.locator('button[type="submit"]');
    await signupButton.click();

    // Check for error message
    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText(/비밀번호를 입력해주세요/);
  });

  test('should show validation error for short password', async ({ page }) => {
    // Fill with short password
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', '123');
    await page.fill('input[name="confirmPassword"]', '123');

    // Try to submit
    const signupButton = page.locator('button[type="submit"]');
    await signupButton.click();

    // Check for error message
    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText(/비밀번호는 6글자 이상이어야 합니다/);
  });

  test('should show validation error for password mismatch', async ({ page }) => {
    // Fill with mismatched passwords
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.fill('input[name="confirmPassword"]', 'differentpassword');

    // Try to submit
    const signupButton = page.locator('button[type="submit"]');
    await signupButton.click();

    // Check for error message
    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText(/비밀번호가 일치하지 않습니다/);
  });

  test('should attempt signup with valid credentials', async ({ page }) => {
    // Fill signup form
    await page.fill('input[name="username"]', 'newuser');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.fill('input[name="confirmPassword"]', 'testpassword123');

    // Submit form
    const signupButton = page.locator('button[type="submit"]');
    await signupButton.click();

    // Check for loading state
    const loadingIndicator = page.locator('.loading');
    await expect(loadingIndicator).toBeVisible();
    await expect(loadingIndicator).toHaveText(/회원가입 중.../);
  });

  test('should handle signup API error responses', async ({ page }) => {
    // Mock API response for duplicate username
    await page.route('**/api/auth/signup', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Username already exists' })
      });
    });

    // Fill signup form
    await page.fill('input[name="username"]', 'existinguser');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.fill('input[name="confirmPassword"]', 'testpassword123');

    // Submit form
    const signupButton = page.locator('button[type="submit"]');
    await signupButton.click();

    // Check for error message
    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText(/이미 존재하는 사용자명입니다/);
  });

  test('should redirect to login page on successful signup', async ({ page }) => {
    // Mock successful API response
    await page.route('**/api/auth/signup', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'User created successfully',
          userId: 1
        })
      });
    });

    // Fill signup form
    await page.fill('input[name="username"]', 'newuser');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.fill('input[name="confirmPassword"]', 'testpassword123');

    // Submit form
    const signupButton = page.locator('button[type="submit"]');
    await signupButton.click();

    // Check for redirect to login page
    await expect(page).toHaveURL(/login\.html/);
  });

  test('should show success message before redirect', async ({ page }) => {
    // Mock successful API response
    await page.route('**/api/auth/signup', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'User created successfully',
          userId: 1
        })
      });
    });

    // Fill signup form
    await page.fill('input[name="username"]', 'newuser');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.fill('input[name="confirmPassword"]', 'testpassword123');

    // Submit form
    const signupButton = page.locator('button[type="submit"]');
    await signupButton.click();

    // Check for success message
    const successMessage = page.locator('.success-message');
    await expect(successMessage).toBeVisible();
    await expect(successMessage).toHaveText(/회원가입이 완료되었습니다/);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network error
    await page.route('**/api/auth/signup', async route => {
      await route.abort('failed');
    });

    // Fill and submit form
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.fill('input[name="confirmPassword"]', 'testpassword123');
    await page.click('button[type="submit"]');

    // Check for network error message
    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText(/네트워크 오류가 발생했습니다/);
  });

  test('should navigate to login page when login link is clicked', async ({ page }) => {
    // Click login link
    const loginLink = page.locator('a[href="login.html"]');
    await loginLink.click();

    // Check for navigation to login page
    await expect(page).toHaveURL(/login\.html/);
  });

  test('should show real-time validation for password confirmation', async ({ page }) => {
    // Fill password
    await page.fill('input[name="password"]', 'testpassword123');

    // Fill different confirm password
    await page.fill('input[name="confirmPassword"]', 'different');

    // Check for real-time validation (if implemented)
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');
    await expect(confirmPasswordInput).toHaveClass(/invalid|error/);
  });
});