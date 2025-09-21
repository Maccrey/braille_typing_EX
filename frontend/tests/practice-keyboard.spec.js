const { test, expect } = require('@playwright/test');

test.describe('Braille Practice Keyboard Input Handling', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication in localStorage first
    await page.goto('/practice.html');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'fake-token-for-testing');
      localStorage.setItem('userData', JSON.stringify({ username: 'testuser' }));
    });

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

    // Navigate to practice page after setting auth
    await page.goto('/practice.html');

    // Start practice to load braille blocks
    await page.evaluate(() => {
      if (typeof window.startPractice === 'function') {
        window.startPractice(1);
      }
    });

    // Wait for braille blocks to be created
    await page.waitForSelector('.braille-block', { timeout: 5000 });
  });

  test('should map F key to dot 1', async ({ page }) => {
    // Press F key
    await page.keyboard.press('f');

    // Check if dot 1 is activated
    const dot1 = page.locator('.braille-block .dot[data-dot-number="1"]');
    await expect(dot1).toHaveClass(/active/);
  });

  test('should map D key to dot 2', async ({ page }) => {
    await page.keyboard.press('d');

    const dot2 = page.locator('.braille-block .dot[data-dot-number="2"]');
    await expect(dot2).toHaveClass(/active/);
  });

  test('should map S key to dot 3', async ({ page }) => {
    await page.keyboard.press('s');

    const dot3 = page.locator('.braille-block .dot[data-dot-number="3"]');
    await expect(dot3).toHaveClass(/active/);
  });

  test('should map J key to dot 4', async ({ page }) => {
    await page.keyboard.press('j');

    const dot4 = page.locator('.braille-block .dot[data-dot-number="4"]');
    await expect(dot4).toHaveClass(/active/);
  });

  test('should map K key to dot 5', async ({ page }) => {
    await page.keyboard.press('k');

    const dot5 = page.locator('.braille-block .dot[data-dot-number="5"]');
    await expect(dot5).toHaveClass(/active/);
  });

  test('should map L key to dot 6', async ({ page }) => {
    await page.keyboard.press('l');

    const dot6 = page.locator('.braille-block .dot[data-dot-number="6"]');
    await expect(dot6).toHaveClass(/active/);
  });

  test('should handle multiple key presses', async ({ page }) => {
    // Press F and L keys (dots 1 and 6)
    await page.keyboard.press('f');
    await page.keyboard.press('l');

    // Check if both dots are activated
    const dot1 = page.locator('.braille-block .dot[data-dot-number="1"]');
    const dot6 = page.locator('.braille-block .dot[data-dot-number="6"]');

    await expect(dot1).toHaveClass(/active/);
    await expect(dot6).toHaveClass(/active/);
  });

  test('should handle uppercase and lowercase keys', async ({ page }) => {
    // Test uppercase
    await page.keyboard.press('F');
    const dot1 = page.locator('.braille-block .dot[data-dot-number="1"]');
    await expect(dot1).toHaveClass(/active/);

    // Clear and test lowercase
    await page.keyboard.press('Escape');
    await page.keyboard.press('f');
    await expect(dot1).toHaveClass(/active/);
  });

  test('should ignore non-braille keys', async ({ page }) => {
    // Press non-braille keys
    await page.keyboard.press('a');
    await page.keyboard.press('z');
    await page.keyboard.press('1');

    // Check that no dots are activated
    const dots = page.locator('.braille-block .dot.active');
    await expect(dots).toHaveCount(0);
  });

  test('should toggle dots when pressed again', async ({ page }) => {
    const dot1 = page.locator('.braille-block .dot[data-dot-number="1"]');

    // First press - should activate
    await page.keyboard.press('f');
    await expect(dot1).toHaveClass(/active/);

    // Second press - should deactivate
    await page.keyboard.press('f');
    await expect(dot1).not.toHaveClass(/active/);

    // Third press - should activate again
    await page.keyboard.press('f');
    await expect(dot1).toHaveClass(/active/);
  });

  test('should clear all dots with Escape key', async ({ page }) => {
    // Press multiple keys
    await page.keyboard.press('f');
    await page.keyboard.press('d');
    await page.keyboard.press('l');

    // Verify dots are active
    const activeDots = page.locator('.braille-block .dot.active');
    await expect(activeDots).toHaveCount(3);

    // Press Escape to clear
    await page.keyboard.press('Escape');

    // Verify all dots are cleared
    await expect(activeDots).toHaveCount(0);
  });

  test('should handle multi-block characters correctly', async ({ page }) => {
    // Mock multi-block response
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

    // Reload practice
    await page.evaluate(() => {
      if (typeof window.braillePractice && window.braillePractice.loadNextCharacter) {
        window.braillePractice.loadNextCharacter();
      }
    });

    // Wait for new blocks
    await page.waitForSelector('.braille-block', { timeout: 5000 });

    // Should have 2 blocks
    const blocks = page.locator('.braille-block');
    await expect(blocks).toHaveCount(2);

    // Press F (dot 1) - should only affect first block
    await page.keyboard.press('f');

    const firstBlockDot1 = page.locator('.braille-block[data-block-index="0"] .dot[data-dot-number="1"]');
    const secondBlockDot1 = page.locator('.braille-block[data-block-index="1"] .dot[data-dot-number="1"]');

    await expect(firstBlockDot1).toHaveClass(/active/);
    await expect(secondBlockDot1).not.toHaveClass(/active/);
  });

  test('should provide visual feedback for key presses', async ({ page }) => {
    // Press F key and check for immediate visual feedback
    await page.keyboard.press('f');

    const dot1 = page.locator('.braille-block .dot[data-dot-number="1"]');

    // Should have active class (this is the main test)
    await expect(dot1).toHaveClass(/active/);

    // Additional visual feedback check - just verify class exists
    const hasActiveClass = await dot1.evaluate(el => {
      return el.classList.contains('active');
    });

    expect(hasActiveClass).toBe(true);
  });

  test('should handle rapid key presses correctly', async ({ page }) => {
    // Rapidly press multiple keys
    await page.keyboard.press('f');
    await page.keyboard.press('d');
    await page.keyboard.press('s');
    await page.keyboard.press('j');
    await page.keyboard.press('k');
    await page.keyboard.press('l');

    // All dots should be active
    const activeDots = page.locator('.braille-block .dot.active');
    await expect(activeDots).toHaveCount(6);
  });

  test('should maintain dot state across different interactions', async ({ page }) => {
    // Press some keys
    await page.keyboard.press('f');
    await page.keyboard.press('l');

    // Click hint button (should not affect dot state)
    await page.click('#hint-btn');

    // Dots should still be active
    const dot1 = page.locator('.braille-block .dot[data-dot-number="1"]');
    const dot6 = page.locator('.braille-block .dot[data-dot-number="6"]');

    await expect(dot1).toHaveClass(/active/);
    await expect(dot6).toHaveClass(/active/);
  });
});