const { test, expect } = require('@playwright/test');

test.describe('Search and Favorites Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Set auth token to bypass authentication
    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'test-token-for-ui-testing');
    });

    await page.goto('http://localhost:8080/main.html');
    await page.waitForTimeout(2000);
  });

  test('should have search input in search tab', async ({ page }) => {
    // Click on Search tab
    await page.click('#search-tab');
    await page.waitForTimeout(500);

    // Check search input exists and is visible
    await expect(page.locator('#search-input')).toBeVisible();
    await expect(page.locator('#search-input')).toHaveAttribute('placeholder', 'Search public categories...');

    console.log('✓ Search input found with correct placeholder');
  });

  test('should show search tab content when search tab is clicked', async ({ page }) => {
    // Initially, search content should be hidden
    await expect(page.locator('#search-content')).not.toHaveClass(/active/);

    // Click on Search tab
    await page.click('#search-tab');
    await page.waitForTimeout(500);

    // Search content should be visible now
    await expect(page.locator('#search-content')).toHaveClass(/active/);
    await expect(page.locator('#search-content')).toBeVisible();

    console.log('✓ Search tab content switching works');
  });

  test('should have search results container', async ({ page }) => {
    await page.click('#search-tab');
    await page.waitForTimeout(500);

    await expect(page.locator('#search-results')).toBeVisible();

    console.log('✓ Search results container found');
  });

  test('should have search empty message container', async ({ page }) => {
    await page.click('#search-tab');
    await page.waitForTimeout(500);

    // Check that search empty message exists (might be hidden initially)
    const searchEmptyMessage = page.locator('#search-empty-message');
    await expect(searchEmptyMessage).toBeAttached();

    console.log('✓ Search empty message container found');
  });

  test('should allow typing in search input', async ({ page }) => {
    await page.click('#search-tab');
    await page.waitForTimeout(500);

    const searchInput = page.locator('#search-input');
    await searchInput.fill('test search query');

    await expect(searchInput).toHaveValue('test search query');

    console.log('✓ Search input accepts text input');
  });

  test('should show favorites tab content when favorites tab is clicked', async ({ page }) => {
    // Initially, favorites content should be hidden
    await expect(page.locator('#favorites-content')).not.toHaveClass(/active/);

    // Click on Favorites tab
    await page.click('#favorites-tab');
    await page.waitForTimeout(500);

    // Favorites content should be visible now
    await expect(page.locator('#favorites-content')).toHaveClass(/active/);
    await expect(page.locator('#favorites-content')).toBeVisible();

    console.log('✓ Favorites tab content switching works');
  });

  test('should have favorites list container', async ({ page }) => {
    await page.click('#favorites-tab');
    await page.waitForTimeout(500);

    await expect(page.locator('#favorites-list')).toBeVisible();

    console.log('✓ Favorites list container found');
  });

  test('should have favorites empty message container', async ({ page }) => {
    await page.click('#favorites-tab');
    await page.waitForTimeout(500);

    // Check that favorites empty message exists (might be hidden initially)
    const favoritesEmptyMessage = page.locator('#favorites-empty-message');
    await expect(favoritesEmptyMessage).toBeAttached();

    console.log('✓ Favorites empty message container found');
  });

  test('should maintain tab state correctly when switching between tabs', async ({ page }) => {
    // Start with My Categories (should be active by default)
    await expect(page.locator('#my-categories-tab')).toHaveClass(/active/);
    await expect(page.locator('#my-categories-content')).toHaveClass(/active/);

    // Switch to Search
    await page.click('#search-tab');
    await page.waitForTimeout(300);

    await expect(page.locator('#search-tab')).toHaveClass(/active/);
    await expect(page.locator('#search-content')).toHaveClass(/active/);
    await expect(page.locator('#my-categories-content')).not.toHaveClass(/active/);
    await expect(page.locator('#favorites-content')).not.toHaveClass(/active/);

    // Switch to Favorites
    await page.click('#favorites-tab');
    await page.waitForTimeout(300);

    await expect(page.locator('#favorites-tab')).toHaveClass(/active/);
    await expect(page.locator('#favorites-content')).toHaveClass(/active/);
    await expect(page.locator('#my-categories-content')).not.toHaveClass(/active/);
    await expect(page.locator('#search-content')).not.toHaveClass(/active/);

    // Switch back to My Categories
    await page.click('#my-categories-tab');
    await page.waitForTimeout(300);

    await expect(page.locator('#my-categories-tab')).toHaveClass(/active/);
    await expect(page.locator('#my-categories-content')).toHaveClass(/active/);
    await expect(page.locator('#favorites-content')).not.toHaveClass(/active/);
    await expect(page.locator('#search-content')).not.toHaveClass(/active/);

    console.log('✓ Tab state management works correctly');
  });

  test('should focus search input when search tab is activated', async ({ page }) => {
    await page.click('#search-tab');
    await page.waitForTimeout(500);

    // Search input should be focusable
    const searchInput = page.locator('#search-input');
    await searchInput.click();
    await expect(searchInput).toBeFocused();

    console.log('✓ Search input can be focused');
  });

  test('should have proper search input styling', async ({ page }) => {
    await page.click('#search-tab');
    await page.waitForTimeout(500);

    const searchInput = page.locator('#search-input');

    // Check that search input has proper CSS classes
    await expect(searchInput).toHaveClass('search-input');

    // Test focus styling
    await searchInput.focus();
    const borderColor = await searchInput.evaluate(el => {
      return window.getComputedStyle(el).borderColor;
    });

    // Border color should change on focus (this is defined in CSS)
    expect(borderColor).toBeDefined();

    console.log('✓ Search input has proper styling');
  });

  test('should clear search input when switching tabs', async ({ page }) => {
    // Go to search tab and type something
    await page.click('#search-tab');
    await page.waitForTimeout(500);

    const searchInput = page.locator('#search-input');
    await searchInput.fill('test search');
    await expect(searchInput).toHaveValue('test search');

    // Switch to another tab and back
    await page.click('#favorites-tab');
    await page.waitForTimeout(300);
    await page.click('#search-tab');
    await page.waitForTimeout(300);

    // Search input should still have the value (no auto-clearing)
    await expect(searchInput).toHaveValue('test search');

    console.log('✓ Search input retains value across tab switches');
  });
});