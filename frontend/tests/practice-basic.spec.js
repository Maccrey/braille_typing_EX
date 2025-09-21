const { test, expect } = require('@playwright/test');

test.describe('Basic Braille Practice UI Structure', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication in localStorage first
    await page.goto('/practice.html');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'fake-token-for-testing');
      localStorage.setItem('userData', JSON.stringify({ username: 'testuser' }));
    });

    // Navigate to practice page after setting auth
    await page.goto('/practice.html');
  });

  test('should display practice page title', async ({ page }) => {
    // Check if the page title is correct
    await expect(page).toHaveTitle(/점자 타자 연습기.*연습하기/);
  });

  test('should display practice container', async ({ page }) => {
    // Check if practice container exists
    const practiceContainer = page.locator('#practice-container');
    await expect(practiceContainer).toBeVisible();
  });

  test('should display character display area', async ({ page }) => {
    // Check if character display exists
    const characterDisplay = page.locator('#character-display');
    await expect(characterDisplay).toBeVisible();
    await expect(characterDisplay).toContainText('');
  });

  test('should display current character element', async ({ page }) => {
    // Check if current character display exists
    const currentChar = page.locator('#current-char');
    await expect(currentChar).toBeVisible();
  });

  test('should display braille blocks container', async ({ page }) => {
    // Check if braille blocks container exists
    const brailleBlocks = page.locator('#braille-blocks');
    await expect(brailleBlocks).toBeVisible();
  });

  test('should display control buttons', async ({ page }) => {
    // Check if control buttons exist
    const nextButton = page.locator('#next-btn');
    const hintButton = page.locator('#hint-btn');
    const backButton = page.locator('#back-btn');

    await expect(nextButton).toBeVisible();
    await expect(hintButton).toBeVisible();
    await expect(backButton).toBeVisible();

    await expect(nextButton).toContainText(/다음/);
    await expect(hintButton).toContainText(/힌트/);
    await expect(backButton).toContainText(/메인으로/);
  });

  test('should display keyboard mapping help', async ({ page }) => {
    // Check if keyboard mapping is displayed
    const keyboardHelp = page.locator('#keyboard-help');
    await expect(keyboardHelp).toBeVisible();
    await expect(keyboardHelp).toContainText('키보드 매핑');
    await expect(keyboardHelp).toContainText('F');
    await expect(keyboardHelp).toContainText('D');
    await expect(keyboardHelp).toContainText('S');
    await expect(keyboardHelp).toContainText('J');
    await expect(keyboardHelp).toContainText('K');
    await expect(keyboardHelp).toContainText('L');
  });

  test('should display progress indicator', async ({ page }) => {
    // Check if progress indicator exists
    const progressIndicator = page.locator('#progress-indicator');
    await expect(progressIndicator).toBeVisible();
  });

  test('should load braille data when practice starts', async ({ page }) => {
    // Mock the braille API response
    await page.route('**/api/protected/braille/*/random', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          character: 'α',
          braille_pattern: '[[1, 6]]'
        })
      });
    });

    // Simulate starting practice (this would be triggered by category selection)
    await page.evaluate(() => {
      // Simulate the practice initialization
      if (typeof window.startPractice === 'function') {
        window.startPractice(1); // category ID 1
      }
    });

    // Check if character is displayed
    const currentChar = page.locator('#current-char');
    await expect(currentChar).toContainText('α');
  });

  test('should create braille blocks dynamically', async ({ page }) => {
    // Mock the braille API response with multi-block pattern
    await page.route('**/api/protected/braille/*/random', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          character: 'β',
          braille_pattern: '[[1, 2], [3, 4]]'
        })
      });
    });

    // Simulate starting practice
    await page.evaluate(() => {
      if (typeof window.startPractice === 'function') {
        window.startPractice(1);
      }
    });

    // Check if braille blocks are created
    const brailleBlocks = page.locator('#braille-blocks .braille-block');
    await expect(brailleBlocks).toHaveCount(2);

    // Check if each block has 6 dots
    const firstBlock = brailleBlocks.nth(0);
    const dots = firstBlock.locator('.dot');
    await expect(dots).toHaveCount(6);
  });

  test('should handle API error gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/protected/braille/*/random', async route => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'No braille data found' })
      });
    });

    // Try to start practice
    await page.evaluate(() => {
      if (typeof window.startPractice === 'function') {
        window.startPractice(1);
      }
    });

    // Check for error message
    const errorMessage = page.locator('#error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/오류가 발생했습니다/);
  });

  test('should have proper CSS classes for braille blocks', async ({ page }) => {
    // Mock simple braille response
    await page.route('**/api/protected/braille/*/random', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          character: 'α',
          braille_pattern: '[[1]]'
        })
      });
    });

    // Start practice
    await page.evaluate(() => {
      if (typeof window.startPractice === 'function') {
        window.startPractice(1);
      }
    });

    // Check CSS classes
    const brailleBlock = page.locator('#braille-blocks .braille-block').first();
    await expect(brailleBlock).toHaveClass(/braille-block/);

    const dots = brailleBlock.locator('.dot');
    await expect(dots.first()).toHaveClass(/dot/);
  });

  test('should navigate back to main page', async ({ page }) => {
    const backButton = page.locator('#back-btn');
    await backButton.click();

    // Should navigate to main page
    await expect(page).toHaveURL(/main\.html/);
  });
});