const { test, expect } = require('@playwright/test');

test.describe('Braille Practice Hint Functionality', () => {
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

  test('should toggle hint display with hint button', async ({ page }) => {
    const hintButton = page.locator('#hint-btn');

    // Initially hints should be hidden
    const hints = page.locator('.hint-overlay');
    await expect(hints.first()).not.toBeVisible();

    // Click hint button to show hints
    await hintButton.click();

    // Hints should now be visible
    await expect(hints.first()).toBeVisible();
    await expect(hintButton).toContainText(/힌트 끄기/);

    // Click again to hide hints
    await hintButton.click();

    // Hints should be hidden again
    await expect(hints.first()).not.toBeVisible();
    await expect(hintButton).toContainText(/힌트 켜기/);
  });

  test('should toggle hint display with Space key', async ({ page }) => {
    const hints = page.locator('.hint-overlay');
    const hintButton = page.locator('#hint-btn');

    // Initially hints should be hidden
    await expect(hints.first()).not.toBeVisible();
    await expect(hintButton).toContainText(/힌트/);

    // Press Space key to show hints
    await page.keyboard.press('Space');

    // Hints should now be visible
    await expect(hints.first()).toBeVisible();
    await expect(hintButton).toContainText(/힌트 끄기/);

    // Press Space again to hide hints
    await page.keyboard.press('Space');

    // Hints should be hidden again
    await expect(hints.first()).not.toBeVisible();
    await expect(hintButton).toContainText(/힌트 켜기/);
  });

  test('should display correct dot numbers in hints', async ({ page }) => {
    // Enable hints
    await page.click('#hint-btn');

    // Check that hint overlays show correct dot numbers
    const dot1Hint = page.locator('.dot[data-dot-number="1"] .hint-overlay');
    const dot2Hint = page.locator('.dot[data-dot-number="2"] .hint-overlay');
    const dot3Hint = page.locator('.dot[data-dot-number="3"] .hint-overlay');
    const dot4Hint = page.locator('.dot[data-dot-number="4"] .hint-overlay');
    const dot5Hint = page.locator('.dot[data-dot-number="5"] .hint-overlay');
    const dot6Hint = page.locator('.dot[data-dot-number="6"] .hint-overlay');

    await expect(dot1Hint).toContainText('1');
    await expect(dot2Hint).toContainText('2');
    await expect(dot3Hint).toContainText('3');
    await expect(dot4Hint).toContainText('4');
    await expect(dot5Hint).toContainText('5');
    await expect(dot6Hint).toContainText('6');
  });

  test('should highlight correct dots when hints are enabled', async ({ page }) => {
    // Enable hints
    await page.click('#hint-btn');

    // For pattern [[1, 6]], dots 1 and 6 should be highlighted
    const dot1 = page.locator('.dot[data-dot-number="1"]');
    const dot6 = page.locator('.dot[data-dot-number="6"]');
    const dot2 = page.locator('.dot[data-dot-number="2"]');

    // Check if correct dots have hint highlighting
    await expect(dot1).toHaveClass(/hint-active/);
    await expect(dot6).toHaveClass(/hint-active/);
    await expect(dot2).not.toHaveClass(/hint-active/);
  });

  test('should handle multi-block character hints', async ({ page }) => {
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

    await page.waitForSelector('.braille-block', { timeout: 5000 });

    // Enable hints
    await page.click('#hint-btn');

    // Only current block (first block) should highlight dots 1 and 2
    const firstBlockDot1 = page.locator('.braille-block[data-block-index="0"] .dot[data-dot-number="1"]');
    const firstBlockDot2 = page.locator('.braille-block[data-block-index="0"] .dot[data-dot-number="2"]');
    const firstBlockDot3 = page.locator('.braille-block[data-block-index="0"] .dot[data-dot-number="3"]');

    await expect(firstBlockDot1).toHaveClass(/hint-active/);
    await expect(firstBlockDot2).toHaveClass(/hint-active/);
    await expect(firstBlockDot3).not.toHaveClass(/hint-active/);

    // Second block should NOT be highlighted yet (not current block)
    const secondBlockDot3 = page.locator('.braille-block[data-block-index="1"] .dot[data-dot-number="3"]');
    const secondBlockDot4 = page.locator('.braille-block[data-block-index="1"] .dot[data-dot-number="4"]');

    await expect(secondBlockDot3).not.toHaveClass(/hint-active/);
    await expect(secondBlockDot4).not.toHaveClass(/hint-active/);
  });

  test('should maintain hint state across different interactions', async ({ page }) => {
    // Enable hints
    await page.keyboard.press('Space');

    const hints = page.locator('.hint-overlay');
    await expect(hints.first()).toBeVisible();

    // Input some dots - hints should still be visible
    await page.keyboard.press('f'); // dot 1
    await expect(hints.first()).toBeVisible();

    // Load next character - hints should remain enabled
    await page.click('#next-btn');
    await page.waitForTimeout(500);

    // Hints should still be visible for new character
    await expect(hints.first()).toBeVisible();
  });

  test('should hide hint numbers when hints are disabled', async ({ page }) => {
    // Enable hints first
    await page.click('#hint-btn');
    const hints = page.locator('.hint-overlay');
    await expect(hints.first()).toBeVisible();

    // Disable hints
    await page.click('#hint-btn');

    // All hint overlays should be hidden
    const allHints = page.locator('.hint-overlay');
    const count = await allHints.count();

    for (let i = 0; i < count; i++) {
      await expect(allHints.nth(i)).not.toBeVisible();
    }
  });

  test('should update hint highlighting when moving to next block', async ({ page }) => {
    // Mock multi-block response
    await page.route('**/api/protected/braille/*/random', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          character: 'γ',
          braille_pattern: '[[1], [2]]'
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

    // Enable hints
    await page.click('#hint-btn');

    // Initially first block should have hints for dot 1
    const firstBlockDot1 = page.locator('.braille-block[data-block-index="0"] .dot[data-dot-number="1"]');
    await expect(firstBlockDot1).toHaveClass(/hint-active/);

    // Complete first block
    await page.keyboard.press('f'); // dot 1

    // Wait for progression to second block
    await page.waitForTimeout(100);

    // Second block should now have hints for dot 2
    const secondBlockDot2 = page.locator('.braille-block[data-block-index="1"] .dot[data-dot-number="2"]');
    await expect(secondBlockDot2).toHaveClass(/hint-active/);
  });

  test('should have proper CSS styling for hint overlays', async ({ page }) => {
    // Enable hints
    await page.click('#hint-btn');

    const hintOverlay = page.locator('.hint-overlay').first();

    // Check basic styling
    const position = await hintOverlay.evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        position: style.position,
        display: style.display
      };
    });

    expect(position.position).toBe('absolute');
    expect(position.display).toBe('block');
  });

  test('should prevent hint key conflicts with braille input', async ({ page }) => {
    // Press Space key (should toggle hints, not input braille)
    await page.keyboard.press('Space');

    // No dots should be activated
    const activeDots = page.locator('.dot.active');
    await expect(activeDots).toHaveCount(0);

    // But hints should be visible
    const hints = page.locator('.hint-overlay');
    await expect(hints.first()).toBeVisible();
  });

  test('should show hint button text correctly', async ({ page }) => {
    const hintButton = page.locator('#hint-btn');

    // Initially should show "힌트" or "힌트 켜기"
    await expect(hintButton).toContainText(/힌트/);

    // After enabling
    await hintButton.click();
    await expect(hintButton).toContainText(/힌트 끄기/);

    // After disabling
    await hintButton.click();
    await expect(hintButton).toContainText(/힌트 켜기/);
  });
});