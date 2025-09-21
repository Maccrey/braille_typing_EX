const { test, expect } = require('@playwright/test');

test.describe('Basic Frontend Tests', () => {
  test('page loads successfully', async ({ page }) => {
    await page.goto('/');

    // Check if the page title is correct
    await expect(page).toHaveTitle('점자 타자 연습기');

    // Check if main heading exists
    await expect(page.locator('h1')).toHaveText('점자 타자 연습기');

    // Check if app status indicator exists
    await expect(page.getByTestId('app-status')).toBeVisible();
    await expect(page.getByTestId('app-status')).toHaveText('애플리케이션이 정상적으로 로드되었습니다.');

    // Check if main content area exists
    await expect(page.getByTestId('page-content')).toBeVisible();
  });

  test('page has correct styling and layout', async ({ page }) => {
    await page.goto('/');

    // Check if container exists and has proper styling
    const container = page.locator('.container');
    await expect(container).toBeVisible();

    // Check if status section has proper styling
    const status = page.locator('.status');
    await expect(status).toBeVisible();
  });
});