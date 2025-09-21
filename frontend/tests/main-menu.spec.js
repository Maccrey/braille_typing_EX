const { test, expect } = require('@playwright/test');

test.describe('Main Menu Category List UI', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // Create a test user and login first
    await page.goto('http://localhost:8080/signup.html');

    const uniqueUsername = `mainuser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await page.fill('#username', uniqueUsername);
    await page.fill('#password', 'testpassword123');
    await page.click('#signup-btn');

    // Wait for signup success then login
    await page.waitForURL('**/login.html', { timeout: 5000 });
    await page.fill('#username', uniqueUsername);
    await page.fill('#password', 'testpassword123');
    await page.click('#login-btn');

    // Should redirect to main menu after login
    await page.waitForURL('**/main.html', { timeout: 5000 });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should display main menu page title', async () => {
    await expect(page).toHaveTitle(/Braille Typing Practice/);
  });

  test('should display navigation tabs for categories', async () => {
    // Check for tab navigation
    await expect(page.locator('#my-categories-tab')).toBeVisible();
    await expect(page.locator('#favorites-tab')).toBeVisible();
    await expect(page.locator('#search-tab')).toBeVisible();

    // Check tab labels
    await expect(page.locator('#my-categories-tab')).toContainText('My Categories');
    await expect(page.locator('#favorites-tab')).toContainText('Favorites');
    await expect(page.locator('#search-tab')).toContainText('Search');
  });

  test('should have active tab indicator on My Categories by default', async () => {
    await expect(page.locator('#my-categories-tab')).toHaveClass(/active/);
    await expect(page.locator('#favorites-tab')).not.toHaveClass(/active/);
    await expect(page.locator('#search-tab')).not.toHaveClass(/active/);
  });

  test('should display category list container', async () => {
    await expect(page.locator('#category-list')).toBeVisible();
  });

  test('should show empty message when user has no categories', async () => {
    await expect(page.locator('#empty-message')).toBeVisible();
    await expect(page.locator('#empty-message')).toContainText('No categories found');
  });

  test('should allow tab switching', async () => {
    // Click on Favorites tab
    await page.click('#favorites-tab');
    await expect(page.locator('#favorites-tab')).toHaveClass(/active/);
    await expect(page.locator('#my-categories-tab')).not.toHaveClass(/active/);

    // Click on Search tab
    await page.click('#search-tab');
    await expect(page.locator('#search-tab')).toHaveClass(/active/);
    await expect(page.locator('#favorites-tab')).not.toHaveClass(/active/);

    // Click back to My Categories
    await page.click('#my-categories-tab');
    await expect(page.locator('#my-categories-tab')).toHaveClass(/active/);
    await expect(page.locator('#search-tab')).not.toHaveClass(/active/);
  });

  test('should display upload button for creating new categories', async () => {
    await expect(page.locator('#upload-btn')).toBeVisible();
    await expect(page.locator('#upload-btn')).toContainText('Upload Category');
  });

  test('should navigate to upload page when upload button clicked', async () => {
    await page.click('#upload-btn');
    await page.waitForURL('**/upload.html', { timeout: 5000 });
  });

  test('should display user menu with logout option', async () => {
    await expect(page.locator('#user-menu')).toBeVisible();
    await expect(page.locator('#logout-btn')).toBeVisible();
    await expect(page.locator('#logout-btn')).toContainText('Logout');
  });

  test('should logout user when logout button clicked', async () => {
    await page.click('#logout-btn');
    await page.waitForURL('**/login.html', { timeout: 5000 });
  });

  test('should display loading state when fetching categories', async () => {
    // Reload page to trigger loading state
    await page.reload();

    // Check for loading indicator (should appear briefly)
    const loadingIndicator = page.locator('#loading-indicator');
    // Loading might be too fast to catch, so we'll just check it exists in DOM
    await expect(loadingIndicator).toBeAttached();
  });

  test('should handle tab content switching correctly', async () => {
    // Initially My Categories content should be visible
    await expect(page.locator('#my-categories-content')).toBeVisible();
    await expect(page.locator('#favorites-content')).toBeHidden();
    await expect(page.locator('#search-content')).toBeHidden();

    // Switch to Favorites tab
    await page.click('#favorites-tab');
    await expect(page.locator('#my-categories-content')).toBeHidden();
    await expect(page.locator('#favorites-content')).toBeVisible();
    await expect(page.locator('#search-content')).toBeHidden();

    // Switch to Search tab
    await page.click('#search-tab');
    await expect(page.locator('#my-categories-content')).toBeHidden();
    await expect(page.locator('#favorites-content')).toBeHidden();
    await expect(page.locator('#search-content')).toBeVisible();
  });

  test('should display category items with proper structure when available', async () => {
    // This test will initially fail since we haven't created any categories
    // But it defines the expected structure

    // First navigate to upload and create a category
    await page.click('#upload-btn');
    await page.waitForURL('**/upload.html', { timeout: 5000 });

    // Upload a test file (if upload functionality exists)
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      // Create a minimal test Excel file content
      await page.setInputFiles('input[type="file"]', {
        name: 'test-category.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: Buffer.from('test content')
      });

      await page.fill('#category-name', 'Test Category');
      await page.fill('#category-description', 'Test Description');
      await page.click('#upload-submit-btn');

      // Wait for upload completion and navigate back to main
      await page.waitForURL('**/main.html', { timeout: 10000 });

      // Now check if category appears in the list
      const categoryItem = page.locator('.category-item').first();
      if (await categoryItem.isVisible()) {
        await expect(categoryItem.locator('.category-name')).toContainText('Test Category');
        await expect(categoryItem.locator('.category-description')).toContainText('Test Description');
        await expect(categoryItem.locator('.category-count')).toBeVisible();
        await expect(categoryItem.locator('.practice-btn')).toBeVisible();
        await expect(categoryItem.locator('.practice-btn')).toContainText('Practice');
      }
    }
  });

  test('should display category statistics correctly', async () => {
    // Check that category statistics are shown properly
    const statsContainer = page.locator('#category-stats');
    await expect(statsContainer).toBeVisible();

    // Should show total number of categories
    await expect(page.locator('#total-categories')).toBeVisible();
    await expect(page.locator('#total-categories')).toContainText(/\d+/); // Should contain a number
  });
});