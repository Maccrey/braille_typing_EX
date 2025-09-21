const { test, expect } = require('@playwright/test');

test.describe('Braille Practice Backspace Handling', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication in localStorage first
    await page.goto('/practice.html');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'fake-token-for-testing');
      localStorage.setItem('userData', JSON.stringify({ username: 'testuser' }));
    });

    // Mock the braille API response with a pattern that requires 4 dots to avoid auto-validation
    await page.route('**/api/protected/braille/*/random', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          character: 'test',
          braille_pattern: '[[1, 2, 3, 4]]'
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

  test('should remove last activated dot with Backspace', async ({ page }) => {
    // Input multiple dots
    await page.keyboard.press('f'); // dot 1
    await page.keyboard.press('d'); // dot 2
    await page.keyboard.press('l'); // dot 6

    // Verify all dots are active
    const dot1 = page.locator('.dot[data-dot-number="1"]');
    const dot2 = page.locator('.dot[data-dot-number="2"]');
    const dot6 = page.locator('.dot[data-dot-number="6"]');

    await expect(dot1).toHaveClass(/active/);
    await expect(dot2).toHaveClass(/active/);
    await expect(dot6).toHaveClass(/active/);

    // Press Backspace to remove last dot (dot 6)
    await page.keyboard.press('Backspace');

    // Last dot should be removed, others remain
    await expect(dot1).toHaveClass(/active/);
    await expect(dot2).toHaveClass(/active/);
    await expect(dot6).not.toHaveClass(/active/);
  });

  test('should remove dots in reverse order of input', async ({ page }) => {
    // Input dots in specific order
    await page.keyboard.press('l'); // dot 6 (first)
    await page.keyboard.press('f'); // dot 1 (second)
    await page.keyboard.press('d'); // dot 2 (third)

    const dot1 = page.locator('.dot[data-dot-number="1"]');
    const dot2 = page.locator('.dot[data-dot-number="2"]');
    const dot6 = page.locator('.dot[data-dot-number="6"]');

    // First backspace should remove dot 2 (last input)
    await page.keyboard.press('Backspace');
    await expect(dot1).toHaveClass(/active/);
    await expect(dot2).not.toHaveClass(/active/);
    await expect(dot6).toHaveClass(/active/);

    // Second backspace should remove dot 1 (second input)
    await page.keyboard.press('Backspace');
    await expect(dot1).not.toHaveClass(/active/);
    await expect(dot2).not.toHaveClass(/active/);
    await expect(dot6).toHaveClass(/active/);

    // Third backspace should remove dot 6 (first input)
    await page.keyboard.press('Backspace');
    await expect(dot1).not.toHaveClass(/active/);
    await expect(dot2).not.toHaveClass(/active/);
    await expect(dot6).not.toHaveClass(/active/);
  });

  test('should handle backspace when no dots are active', async ({ page }) => {
    // Press Backspace with no active dots (should not cause errors)
    await page.keyboard.press('Backspace');

    // No dots should be active
    const activeDots = page.locator('.dot.active');
    await expect(activeDots).toHaveCount(0);

    // Add a dot and then remove it
    await page.keyboard.press('f'); // dot 1
    const dot1 = page.locator('.dot[data-dot-number="1"]');
    await expect(dot1).toHaveClass(/active/);

    // Remove it with backspace
    await page.keyboard.press('Backspace');
    await expect(dot1).not.toHaveClass(/active/);

    // Try backspace again with no dots
    await page.keyboard.press('Backspace');
    await expect(activeDots).toHaveCount(0);
  });

  test('should not affect correct or wrong dots', async ({ page }) => {
    // Input correct pattern and validate (complete the 4-dot pattern)
    await page.keyboard.press('f'); // dot 1
    await page.keyboard.press('d'); // dot 2
    await page.keyboard.press('s'); // dot 3
    await page.keyboard.press('j'); // dot 4

    // Wait for validation (auto-validation when pattern is complete)
    await page.waitForTimeout(100);

    const dot1 = page.locator('.dot[data-dot-number="1"]');
    const dot2 = page.locator('.dot[data-dot-number="2"]');
    const dot3 = page.locator('.dot[data-dot-number="3"]');
    const dot4 = page.locator('.dot[data-dot-number="4"]');

    // Dots should be marked as correct
    await expect(dot1).toHaveClass(/correct/);
    await expect(dot2).toHaveClass(/correct/);
    await expect(dot3).toHaveClass(/correct/);
    await expect(dot4).toHaveClass(/correct/);

    // Backspace should not affect correct dots
    await page.keyboard.press('Backspace');
    await expect(dot1).toHaveClass(/correct/);
    await expect(dot2).toHaveClass(/correct/);
    await expect(dot3).toHaveClass(/correct/);
    await expect(dot4).toHaveClass(/correct/);
  });

  test('should work with multi-block characters', async ({ page }) => {
    // Mock multi-block response with longer patterns to avoid auto-validation
    await page.route('**/api/protected/braille/*/random', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          character: 'multi',
          braille_pattern: '[[1, 2, 5, 6], [3, 4]]'
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

    // Complete first block to progress to second
    await page.keyboard.press('f'); // dot 1
    await page.keyboard.press('d'); // dot 2
    await page.keyboard.press('k'); // dot 5
    await page.keyboard.press('l'); // dot 6

    // Wait for first block completion and progression
    await page.waitForTimeout(200);

    // Input partial dots in second block
    await page.keyboard.press('s'); // dot 3

    const secondBlockDot3 = page.locator('.braille-block[data-block-index="1"] .dot[data-dot-number="3"]');

    // Dot should be active
    await expect(secondBlockDot3).toHaveClass(/active/);

    // Backspace should remove last dot from current block
    await page.keyboard.press('Backspace');
    await expect(secondBlockDot3).not.toHaveClass(/active/);
  });

  test('should maintain input order tracking correctly', async ({ page }) => {
    // Input dots in non-sequential order (only 3 dots to avoid auto-validation)
    await page.keyboard.press('j'); // dot 4
    await page.keyboard.press('f'); // dot 1
    await page.keyboard.press('l'); // dot 6

    const dot1 = page.locator('.dot[data-dot-number="1"]');
    const dot4 = page.locator('.dot[data-dot-number="4"]');
    const dot6 = page.locator('.dot[data-dot-number="6"]');

    // All should be active
    await expect(dot1).toHaveClass(/active/);
    await expect(dot4).toHaveClass(/active/);
    await expect(dot6).toHaveClass(/active/);

    // Remove in reverse order of input
    // First backspace removes dot 6 (last input)
    await page.keyboard.press('Backspace');
    await expect(dot6).not.toHaveClass(/active/);
    await expect(dot1).toHaveClass(/active/);
    await expect(dot4).toHaveClass(/active/);

    // Second backspace removes dot 1 (second input)
    await page.keyboard.press('Backspace');
    await expect(dot1).not.toHaveClass(/active/);
    await expect(dot4).toHaveClass(/active/);

    // Third backspace removes dot 4 (first input)
    await page.keyboard.press('Backspace');
    await expect(dot4).not.toHaveClass(/active/);
  });

  test('should not interfere with other keyboard shortcuts', async ({ page }) => {
    // Input some dots
    await page.keyboard.press('f'); // dot 1
    await page.keyboard.press('d'); // dot 2

    const dot1 = page.locator('.dot[data-dot-number="1"]');
    const dot2 = page.locator('.dot[data-dot-number="2"]');

    await expect(dot1).toHaveClass(/active/);
    await expect(dot2).toHaveClass(/active/);

    // Use Space key for hints (should not trigger backspace)
    await page.keyboard.press('Space');

    // Dots should still be active, and may also have hint highlighting
    await expect(dot1).toHaveClass(/active/);
    await expect(dot2).toHaveClass(/active/);

    // Escape should clear all (not single backspace)
    await page.keyboard.press('Escape');

    // Should clear active but may retain hint highlighting
    await expect(dot1).not.toHaveClass(/^dot active/);
    await expect(dot2).not.toHaveClass(/^dot active/);
  });

  test('should provide visual feedback during backspace', async ({ page }) => {
    // Input dots
    await page.keyboard.press('f'); // dot 1
    await page.keyboard.press('d'); // dot 2
    await page.keyboard.press('s'); // dot 3

    const dot3 = page.locator('.dot[data-dot-number="3"]');
    await expect(dot3).toHaveClass(/active/);

    // Backspace should immediately remove the visual class
    await page.keyboard.press('Backspace');
    await expect(dot3).not.toHaveClass(/active/);
  });

  test('should work correctly with hint highlighting', async ({ page }) => {
    // Enable hints
    await page.keyboard.press('Space');

    // Input a dot
    await page.keyboard.press('f'); // dot 1

    const dot1 = page.locator('.dot[data-dot-number="1"]');

    // Should have both active and hint-active classes
    await expect(dot1).toHaveClass(/active/);
    await expect(dot1).toHaveClass(/hint-active/);

    // Backspace should remove active class but not hint highlighting
    await page.keyboard.press('Backspace');

    // Check that active class is removed (but hint-active should remain)
    const classNames = await dot1.getAttribute('class');
    expect(classNames).not.toContain(' active');
    expect(classNames).toContain('hint-active');
  });
});