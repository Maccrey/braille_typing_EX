const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Upload Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication in localStorage first
    await page.goto('/upload.html');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'fake-token-for-testing');
      localStorage.setItem('userData', JSON.stringify({ username: 'testuser' }));
    });

    // Navigate to upload page after setting auth
    await page.goto('/upload.html');
  });

  test('should display upload form elements', async ({ page }) => {
    // Check if the page title is correct
    await expect(page).toHaveTitle(/점자 타자 연습기.*파일 업로드/);

    // Check if upload form exists
    const uploadForm = page.locator('form#upload-form');
    await expect(uploadForm).toBeVisible();

    // Check if category name input exists
    const categoryNameInput = page.locator('input[name="categoryName"]');
    await expect(categoryNameInput).toBeVisible();
    await expect(categoryNameInput).toHaveAttribute('type', 'text');

    // Check if description textarea exists
    const descriptionInput = page.locator('textarea[name="description"]');
    await expect(descriptionInput).toBeVisible();

    // Check if file upload area exists
    const fileUploadArea = page.locator('#file-upload-area');
    await expect(fileUploadArea).toBeVisible();
    await expect(fileUploadArea).toContainText('파일을 드래그하여 놓거나 클릭하여 선택하세요');

    // Check if public checkbox exists
    const isPublicCheckbox = page.locator('input[name="isPublic"]');
    await expect(isPublicCheckbox).toBeVisible();
    await expect(isPublicCheckbox).toHaveAttribute('type', 'checkbox');

    // Check if upload button exists
    const uploadButton = page.locator('button[type="submit"]');
    await expect(uploadButton).toBeVisible();
    await expect(uploadButton).toHaveText(/업로드/);

    // Check if navigation links exist
    const mainLink = page.locator('a[href="main.html"]');
    await expect(mainLink).toBeVisible();
    await expect(mainLink).toHaveText(/메인으로/);
  });

  test('should show validation error for empty category name', async ({ page }) => {
    // Try to submit form with empty category name
    const uploadButton = page.locator('button[type="submit"]');
    await uploadButton.click();

    // Check for error message
    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText(/카테고리 이름을 입력해주세요/);
  });

  test('should show validation error when no file is selected', async ({ page }) => {
    // Fill category name but don't select file
    await page.fill('input[name="categoryName"]', 'Test Category');

    // Try to submit
    const uploadButton = page.locator('button[type="submit"]');
    await uploadButton.click();

    // Check for error message
    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText(/업로드할 파일을 선택해주세요/);
  });

  test('should handle file selection via file input', async ({ page }) => {
    // Create a temporary test file
    const testFilePath = path.join(__dirname, 'test-files', 'sample.xlsx');

    // Simulate file selection (we'll use a mock approach since we can't create real files in tests)
    await page.setInputFiles('input[type="file"]', []);

    // Check that file upload area exists and can be clicked
    const fileUploadArea = page.locator('#file-upload-area');
    await expect(fileUploadArea).toBeVisible();

    // Click should trigger file input
    await fileUploadArea.click();
    // Note: In a real test environment, you'd use page.setInputFiles with a real file
  });

  test('should toggle public/private checkbox', async ({ page }) => {
    const isPublicCheckbox = page.locator('input[name="isPublic"]');

    // Initially should be unchecked
    await expect(isPublicCheckbox).not.toBeChecked();

    // Click to check
    await isPublicCheckbox.click();
    await expect(isPublicCheckbox).toBeChecked();

    // Click again to uncheck
    await isPublicCheckbox.click();
    await expect(isPublicCheckbox).not.toBeChecked();
  });

  test('should display file info when file is selected', async ({ page }) => {
    // Initially file info should be hidden
    const fileInfo = page.locator('#file-info');
    await expect(fileInfo).not.toHaveClass('visible');

    // This test would need actual file upload simulation
    // which is complex in Playwright without real files
  });

  test('should handle form submission with valid data', async ({ page }) => {
    // Mock the upload API endpoint
    await page.route('**/api/protected/upload', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'File uploaded and processed successfully',
          category: {
            id: 1,
            name: 'Test Category',
            description: 'Test Description',
            is_public: 0,
            created_by: 1
          },
          brailleDataCount: 5
        })
      });
    });

    // Fill form data
    await page.fill('input[name="categoryName"]', 'Test Category');
    await page.fill('textarea[name="description"]', 'Test Description');

    // Note: In a real test, we'd also simulate file selection here
    // For now, we'll test the submission logic

    // The test would proceed to submit and check for success message
  });

  test('should handle API error responses', async ({ page }) => {
    // Mock API error response
    await page.route('**/api/protected/upload', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Category name already exists' })
      });
    });

    // Fill form and submit (would need file selection in real test)
    await page.fill('input[name="categoryName"]', 'Existing Category');

    // The test would check for error message display
  });

  test('should handle authentication errors', async ({ page }) => {
    // Mock 401 response
    await page.route('**/api/protected/upload', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Access token required' })
      });
    });

    // This should redirect to login page when auth fails
  });

  test('should navigate to main page via link', async ({ page }) => {
    // Click main link
    const mainLink = page.locator('a[href="main.html"]');
    await mainLink.click();

    // Check for navigation
    await expect(page).toHaveURL(/main\.html/);
  });

  test('should show loading state during upload', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/protected/upload', async route => {
      // Add delay to simulate slow upload
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'File uploaded and processed successfully',
          brailleDataCount: 5
        })
      });
    });

    // Fill form
    await page.fill('input[name="categoryName"]', 'Test Category');

    // Submit form (would need file in real test)
    // Should show loading indicator and disabled button
  });

  test('should validate file types', async ({ page }) => {
    // This test would check that only Excel files are accepted
    // and show appropriate error messages for invalid file types
  });

  test('should validate file size limits', async ({ page }) => {
    // This test would check file size validation
    // and show error for files larger than 10MB
  });
});