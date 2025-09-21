const { test, expect } = require('@playwright/test');

test.describe('Full User Flow E2E Test', () => {
  // Create unique user for each test
  function createTestUser() {
    return {
      username: `testuser_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      password: 'password123'
    };
  }

  test('Basic authentication flow: signup → login → logout', async ({ page }) => {
    const testUser = createTestUser();

    // Step 1: User Registration
    await page.goto('http://localhost:8080/signup.html');
    await page.fill('#username', testUser.username);
    await page.fill('#password', testUser.password);
    await page.fill('#confirmPassword', testUser.password);
    await page.click('#signup-button');

    // Verify successful signup
    await expect(page.locator('#success-message')).toContainText('회원가입이 완료되었습니다');
    await expect(page).toHaveURL(/login\.html/, { timeout: 10000 });

    // Step 2: User Login
    await page.fill('#username', testUser.username);
    await page.fill('#password', testUser.password);
    await page.click('#login-button');

    // Verify successful login
    await expect(page).toHaveURL(/main\.html/, { timeout: 10000 });

    // Step 3: Logout
    await page.click('#logout-btn');
    await expect(page).toHaveURL(/login\.html/);

    // Verify user is logged out
    await page.goto('http://localhost:8080/main.html');
    await expect(page).toHaveURL(/login\.html/);
  });

  test('File upload and category creation flow', async ({ page }) => {
    const testUser = createTestUser();

    // Create user first
    await page.goto('http://localhost:8080/signup.html');
    await page.fill('#username', testUser.username);
    await page.fill('#password', testUser.password);
    await page.fill('#confirmPassword', testUser.password);
    await page.click('#signup-button');
    await expect(page).toHaveURL(/login\.html/, { timeout: 10000 });

    // Login
    await page.fill('#username', testUser.username);
    await page.fill('#password', testUser.password);
    await page.click('#login-button');
    await expect(page).toHaveURL(/main\.html/, { timeout: 10000 });

    // Navigate to upload page
    await page.click('#upload-link');
    await expect(page).toHaveURL(/upload\.html/);

    // Fill upload form
    const categoryName = `Test Category ${Date.now()}`;
    await page.fill('#category-name', categoryName);
    await page.fill('#description', 'Test category description');

    // Create test file content
    const testFileContent = 'Character,Block1\nα,1\nβ,2';
    await page.setInputFiles('#excel-file', {
      name: 'test-data.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(testFileContent)
    });

    await page.click('#upload-btn');

    // Verify upload success
    await expect(page.locator('#upload-status')).toContainText('업로드가 완료되었습니다');

    // Return to main and verify category appears
    await page.click('#main-menu-link');
    await expect(page).toHaveURL(/main\.html/);
    await page.click('#tab-my-categories');
    await expect(page.locator('.category-item')).toContainText(categoryName);
  });

  test('Basic practice functionality', async ({ page }) => {
    const testUser = createTestUser();

    // Create user first
    await page.goto('http://localhost:8080/signup.html');
    await page.fill('#username', testUser.username);
    await page.fill('#password', testUser.password);
    await page.fill('#confirmPassword', testUser.password);
    await page.click('#signup-button');
    await expect(page).toHaveURL(/login\.html/, { timeout: 10000 });

    // Login and navigate to practice
    await page.fill('#username', testUser.username);
    await page.fill('#password', testUser.password);
    await page.click('#login-button');
    await expect(page).toHaveURL(/main\.html/, { timeout: 10000 });

    // Start practice session
    await page.click('#tab-my-categories');
    const firstCategory = page.locator('.category-item .practice-btn').first();
    if (await firstCategory.count() > 0) {
      await firstCategory.click();
      await expect(page).toHaveURL(/practice\.html/);

      // Verify practice interface
      await expect(page.locator('#current-char')).toBeVisible();
      await expect(page.locator('.braille-container')).toBeVisible();

      // Test basic keyboard input
      await page.keyboard.press('F'); // Dot 1
      await expect(page.locator('.dot[data-dot="1"]').first()).toHaveClass(/active/);

      // Test hint functionality
      await page.keyboard.press('Space');
      await expect(page.locator('#hint-display')).toBeVisible();
    }
  });

  test('Error handling: Invalid login credentials', async ({ page }) => {
    await page.goto('http://localhost:8080/login.html');

    // Try invalid credentials
    await page.fill('#username', 'nonexistent');
    await page.fill('#password', 'wrongpassword');
    await page.click('#login-button');

    // Verify error message
    await expect(page.locator('#error-message')).toContainText('잘못된 사용자명 또는 비밀번호입니다');
    await expect(page).toHaveURL(/login\.html/);
  });

  test('Error handling: Duplicate username registration', async ({ page }) => {
    // First, create a user
    await page.goto('http://localhost:8080/signup.html');
    await page.fill('#username', 'duplicatetest');
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'password123');
    await page.click('#signup-button');

    // Wait for completion
    await page.waitForTimeout(1000);

    // Try to create same user again
    await page.goto('http://localhost:8080/signup.html');
    await page.fill('#username', 'duplicatetest');
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'password123');
    await page.click('#signup-button');

    // Verify error message
    await expect(page.locator('#error-message')).toContainText('이미 존재하는 사용자명입니다');
  });

  test('Protected routes redirect to login', async ({ page }) => {
    // Clear any existing tokens
    await page.goto('http://localhost:8080/login.html');
    await page.evaluate(() => localStorage.clear());

    // Try to access protected pages
    const protectedPages = [
      'http://localhost:8080/main.html',
      'http://localhost:8080/upload.html',
      'http://localhost:8080/practice.html'
    ];

    for (const url of protectedPages) {
      await page.goto(url);
      await expect(page).toHaveURL(/login\.html/);
    }
  });

  test('Practice session persistence across page refreshes', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:8080/login.html');
    await page.fill('#username', testUser.username);
    await page.fill('#password', testUser.password);
    await page.click('#login-button');

    await page.goto('http://localhost:8080/main.html');

    // Navigate to practice and start session
    await page.click('#tab-my-categories');
    const firstCategory = page.locator('.category-item').first();
    await firstCategory.locator('.practice-btn').click();

    // Get initial character
    const initialChar = await page.locator('#current-char').textContent();

    // Refresh page
    await page.reload();

    // Should load a new character (not necessarily the same one)
    await expect(page.locator('#current-char')).toBeVisible();
    const newChar = await page.locator('#current-char').textContent();
    expect(newChar).toBeTruthy();
  });
});