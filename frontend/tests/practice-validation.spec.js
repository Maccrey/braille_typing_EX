const { test, expect } = require('@playwright/test');

test.describe('Braille Practice Validation System', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication in localStorage first
    await page.goto('/practice.html');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'fake-token-for-testing');
      localStorage.setItem('userData', JSON.stringify({ username: 'testuser' }));
    });

    // Mock the braille API response with single block
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

  test('should validate correct single block input', async ({ page }) => {
    // Input correct pattern: dots 1 and 6 for 'α'
    await page.keyboard.press('f'); // dot 1
    await page.keyboard.press('l'); // dot 6

    // Should show correct feedback
    const dot1 = page.locator('.braille-block .dot[data-dot-number="1"]');
    const dot6 = page.locator('.braille-block .dot[data-dot-number="6"]');

    await expect(dot1).toHaveClass(/correct/);
    await expect(dot6).toHaveClass(/correct/);
  });

  test('should validate incorrect single block input', async ({ page }) => {
    // Input incorrect pattern: dots 1 and 2 (wrong for 'α')
    await page.keyboard.press('f'); // dot 1
    await page.keyboard.press('d'); // dot 2

    // Should show wrong feedback
    const dot1 = page.locator('.braille-block .dot[data-dot-number="1"]');
    const dot2 = page.locator('.braille-block .dot[data-dot-number="2"]');

    await expect(dot1).toHaveClass(/wrong/);
    await expect(dot2).toHaveClass(/wrong/);
  });

  test('should clear wrong feedback after timeout', async ({ page }) => {
    // Input incorrect pattern
    await page.keyboard.press('f'); // dot 1
    await page.keyboard.press('d'); // dot 2

    const dot1 = page.locator('.braille-block .dot[data-dot-number="1"]');
    const dot2 = page.locator('.braille-block .dot[data-dot-number="2"]');

    // Should show wrong initially
    await expect(dot1).toHaveClass(/wrong/);
    await expect(dot2).toHaveClass(/wrong/);

    // Wait for timeout (500ms)
    await page.waitForTimeout(600);

    // Should clear wrong class and reset to active
    await expect(dot1).not.toHaveClass(/wrong/);
    await expect(dot2).not.toHaveClass(/wrong/);
    await expect(dot1).not.toHaveClass(/active/);
    await expect(dot2).not.toHaveClass(/active/);
  });

  test('should handle multi-block character validation', async ({ page }) => {
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

    // Input correct first block: dots 1 and 2
    await page.keyboard.press('f'); // dot 1
    await page.keyboard.press('d'); // dot 2

    // First block should be correct
    const firstBlockDot1 = page.locator('.braille-block[data-block-index="0"] .dot[data-dot-number="1"]');
    const firstBlockDot2 = page.locator('.braille-block[data-block-index="0"] .dot[data-dot-number="2"]');

    await expect(firstBlockDot1).toHaveClass(/correct/);
    await expect(firstBlockDot2).toHaveClass(/correct/);

    // Should automatically progress to second block
    await page.waitForTimeout(100);

    // Input correct second block: dots 3 and 4
    await page.keyboard.press('s'); // dot 3
    await page.keyboard.press('j'); // dot 4

    // Second block should be correct
    const secondBlockDot3 = page.locator('.braille-block[data-block-index="1"] .dot[data-dot-number="3"]');
    const secondBlockDot4 = page.locator('.braille-block[data-block-index="1"] .dot[data-dot-number="4"]');

    await expect(secondBlockDot3).toHaveClass(/correct/);
    await expect(secondBlockDot4).toHaveClass(/correct/);
  });

  test('should show completion message when all blocks are correct', async ({ page }) => {
    // Input correct pattern: dots 1 and 6
    await page.keyboard.press('f'); // dot 1
    await page.keyboard.press('l'); // dot 6

    // Should show completion feedback
    const progressIndicator = page.locator('#progress-indicator');
    await expect(progressIndicator).toContainText(/정답/);
  });

  test('should auto-progress to next character after completion', async ({ page }) => {
    // Mock API for subsequent calls
    await page.route('**/api/protected/braille/*/random', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          character: 'β',
          braille_pattern: '[[1, 2]]'
        })
      });
    });

    // Complete first character
    await page.keyboard.press('f'); // dot 1
    await page.keyboard.press('l'); // dot 6

    // Wait for completion message
    const progressIndicator = page.locator('#progress-indicator');
    await expect(progressIndicator).toContainText(/정답/);

    // Wait for auto-progression
    await page.waitForTimeout(1500); // Auto-progress delay

    // Should load new character
    const currentChar = page.locator('#current-char');
    await expect(currentChar).toContainText('β');
  });

  test('should handle partial input correctly', async ({ page }) => {
    // Input only one dot (incomplete)
    await page.keyboard.press('f'); // dot 1

    const dot1 = page.locator('.braille-block .dot[data-dot-number="1"]');

    // Should remain active (not validated yet)
    await expect(dot1).toHaveClass(/active/);
    await expect(dot1).not.toHaveClass(/correct/);
    await expect(dot1).not.toHaveClass(/wrong/);
  });

  test('should validate only when input count matches pattern count', async ({ page }) => {
    // Input one dot (should not validate yet)
    await page.keyboard.press('f'); // dot 1

    const dot1 = page.locator('.braille-block .dot[data-dot-number="1"]');
    await expect(dot1).toHaveClass(/active/);

    // Add second dot to complete the pattern
    await page.keyboard.press('l'); // dot 6

    // Now should validate as correct
    await expect(dot1).toHaveClass(/correct/);

    const dot6 = page.locator('.braille-block .dot[data-dot-number="6"]');
    await expect(dot6).toHaveClass(/correct/);
  });

  test('should handle extra dots in input', async ({ page }) => {
    // Input wrong pattern with too many dots
    await page.keyboard.press('f'); // dot 1
    await page.keyboard.press('d'); // dot 2
    await page.keyboard.press('s'); // dot 3 (extra - pattern only needs 1,6)

    // Should validate as wrong because pattern doesn't match
    const dots = page.locator('.braille-block .dot.wrong');
    await expect(dots).toHaveCount(3); // All dots should be marked wrong
  });

  test('should reset validation state when starting new character', async ({ page }) => {
    // Input wrong pattern first
    await page.keyboard.press('f'); // dot 1
    await page.keyboard.press('d'); // dot 2 (wrong)

    // Wait for wrong feedback
    const dot1 = page.locator('.braille-block .dot[data-dot-number="1"]');
    await expect(dot1).toHaveClass(/wrong/);

    // Load next character manually
    await page.click('#next-btn');
    await page.waitForTimeout(500);

    // All dots should be reset (no active/correct/wrong classes)
    const activeDots = page.locator('.braille-block .dot.active');
    const correctDots = page.locator('.braille-block .dot.correct');
    const wrongDots = page.locator('.braille-block .dot.wrong');

    await expect(activeDots).toHaveCount(0);
    await expect(correctDots).toHaveCount(0);
    await expect(wrongDots).toHaveCount(0);
  });

  test('should update progress indicator during validation', async ({ page }) => {
    const progressIndicator = page.locator('#progress-indicator');

    // Initially should show character info
    await expect(progressIndicator).toContainText('α');

    // Input correct pattern
    await page.keyboard.press('f'); // dot 1
    await page.keyboard.press('l'); // dot 6

    // Should show success message
    await expect(progressIndicator).toContainText(/정답/);
  });

  test('should handle validation in current block only', async ({ page }) => {
    // Mock multi-block character
    await page.route('**/api/protected/braille/*/random', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          character: 'γ',
          braille_pattern: '[[1, 2], [4, 5]]'
        })
      });
    });

    // Reload practice
    await page.evaluate(() => {
      if (typeof window.braillePractice && window.braillePractice.loadNextCharacter) {
        window.braillePractice.loadNextCharacter();
      }
    });

    await page.waitForSelector('.braille-block', { timeout: 5000 });

    // Input correct first block
    await page.keyboard.press('f'); // dot 1
    await page.keyboard.press('d'); // dot 2

    // Only first block should show feedback
    const firstBlock = page.locator('.braille-block[data-block-index="0"]');
    const secondBlock = page.locator('.braille-block[data-block-index="1"]');

    await expect(firstBlock.locator('.dot.correct')).toHaveCount(2);
    await expect(secondBlock.locator('.dot.correct')).toHaveCount(0);
  });
});