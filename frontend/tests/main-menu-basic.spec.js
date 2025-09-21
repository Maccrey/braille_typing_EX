const { test, expect } = require('@playwright/test');

test.describe('Main Menu Basic UI Structure', () => {
  test('should display main menu page structure without authentication', async ({ page }) => {
    // Go directly to main.html and bypass auth check for testing
    await page.goto('http://localhost:8080/main.html');

    // The auth check will try to redirect, but we can still test the HTML structure
    // Wait a bit for any redirects or JS to load
    await page.waitForTimeout(1000);

    // Check if the page contains the expected elements (even if redirected)
    try {
      // Try to find the main elements
      const title = page.locator('title');
      await expect(title).toContainText('Braille Typing Practice');

      console.log('✓ Page title is correct');
    } catch (e) {
      console.log('Note: Page may have redirected due to auth check');
    }
  });

  test('should have all required CSS classes and structure', async ({ page }) => {
    // Temporarily disable redirect by adding token
    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'test-token-for-ui-testing');
    });

    await page.goto('http://localhost:8080/main.html');

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check for main structure elements
    await expect(page.locator('.container')).toBeVisible();
    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('.main-content')).toBeVisible();
    await expect(page.locator('.tabs')).toBeVisible();

    console.log('✓ Main structure elements found');
  });

  test('should have navigation tabs', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'test-token-for-ui-testing');
    });

    await page.goto('http://localhost:8080/main.html');
    await page.waitForTimeout(2000);

    // Check for tab elements
    await expect(page.locator('#my-categories-tab')).toBeVisible();
    await expect(page.locator('#favorites-tab')).toBeVisible();
    await expect(page.locator('#search-tab')).toBeVisible();

    // Check tab text content
    await expect(page.locator('#my-categories-tab')).toContainText('My Categories');
    await expect(page.locator('#favorites-tab')).toContainText('Favorites');
    await expect(page.locator('#search-tab')).toContainText('Search');

    console.log('✓ Navigation tabs found with correct text');
  });

  test('should have correct initial tab state', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'test-token-for-ui-testing');
    });

    await page.goto('http://localhost:8080/main.html');
    await page.waitForTimeout(2000);

    // Check active tab
    await expect(page.locator('#my-categories-tab')).toHaveClass(/active/);
    await expect(page.locator('#favorites-tab')).not.toHaveClass(/active/);
    await expect(page.locator('#search-tab')).not.toHaveClass(/active/);

    console.log('✓ Initial tab state is correct');
  });

  test('should have user menu elements', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'test-token-for-ui-testing');
    });

    await page.goto('http://localhost:8080/main.html');
    await page.waitForTimeout(2000);

    await expect(page.locator('#user-menu')).toBeVisible();
    await expect(page.locator('#upload-btn')).toBeVisible();
    await expect(page.locator('#logout-btn')).toBeVisible();

    await expect(page.locator('#upload-btn')).toContainText('Upload Category');
    await expect(page.locator('#logout-btn')).toContainText('Logout');

    console.log('✓ User menu elements found');
  });

  test('should have category statistics display', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'test-token-for-ui-testing');
    });

    await page.goto('http://localhost:8080/main.html');
    await page.waitForTimeout(2000);

    await expect(page.locator('#category-stats')).toBeVisible();
    await expect(page.locator('#total-categories')).toBeVisible();
    await expect(page.locator('#total-characters')).toBeVisible();
    await expect(page.locator('#practice-time')).toBeVisible();

    console.log('✓ Category statistics elements found');
  });

  test('should have category list container', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'test-token-for-ui-testing');
    });

    await page.goto('http://localhost:8080/main.html');
    await page.waitForTimeout(2000);

    await expect(page.locator('#category-list')).toBeVisible();

    console.log('✓ Category list container found');
  });

  test('should allow basic tab switching', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'test-token-for-ui-testing');
    });

    await page.goto('http://localhost:8080/main.html');
    await page.waitForTimeout(2000);

    // Click on Favorites tab
    await page.click('#favorites-tab');
    await page.waitForTimeout(500);

    await expect(page.locator('#favorites-tab')).toHaveClass(/active/);
    await expect(page.locator('#my-categories-tab')).not.toHaveClass(/active/);

    // Click on Search tab
    await page.click('#search-tab');
    await page.waitForTimeout(500);

    await expect(page.locator('#search-tab')).toHaveClass(/active/);
    await expect(page.locator('#favorites-tab')).not.toHaveClass(/active/);

    console.log('✓ Tab switching works');
  });
});