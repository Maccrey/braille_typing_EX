const { test, expect } = require('@playwright/test');

test.describe('Attendance Calendar UI', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication in localStorage
    await page.goto('/main.html');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'fake-token-for-testing');
      localStorage.setItem('userData', JSON.stringify({ username: 'testuser' }));
    });

    // Mock the profile stats API
    await page.route('**/api/profile/stats', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_practice_time: 3600, // 1 hour
          total_attendance_days: 5,
          average_daily_practice: 720, // 12 minutes
          longest_session: 1800, // 30 minutes
          first_practice_date: '2025-09-15',
          last_practice_date: '2025-09-21',
          stats_period: '2025-09-15 ~ 2025-09-21'
        })
      });
    });

    // Mock attendance data API
    await page.route('**/api/profile/attendance', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          attendance_dates: [
            '2025-09-15',
            '2025-09-17',
            '2025-09-19',
            '2025-09-20',
            '2025-09-21'
          ],
          current_month: '2025-09',
          total_days: 5
        })
      });
    });

    // Navigate to main page
    await page.goto('/main.html');

    // Switch to attendance tab
    await page.click('#attendance-tab');
  });

  test('should display attendance calendar section', async ({ page }) => {
    // Should have attendance calendar container
    const calendarSection = page.locator('#attendance-calendar');
    await expect(calendarSection).toBeVisible();

    // Should have calendar title
    const calendarTitle = page.locator('#calendar-title');
    await expect(calendarTitle).toContainText('출석 달력');

    // Should have current month display
    const monthDisplay = page.locator('#current-month');
    await expect(monthDisplay).toBeVisible();
  });

  test('should display calendar grid with dates', async ({ page }) => {
    // Should have calendar grid
    const calendarGrid = page.locator('#calendar-grid');
    await expect(calendarGrid).toBeVisible();

    // Should have weekday headers
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    for (const day of weekdays) {
      await expect(page.locator('.weekday-header', { hasText: day })).toBeVisible();
    }

    // Should have date cells
    const dateCells = page.locator('.date-cell');
    await expect(dateCells).toHaveCount(35); // 5 weeks * 7 days
  });

  test('should highlight attendance dates', async ({ page }) => {
    // Wait for calendar to load
    await page.waitForSelector('#calendar-grid');

    // Attendance dates should have special styling
    const attendanceDates = ['15', '17', '19', '20', '21'];

    for (const date of attendanceDates) {
      const dateCell = page.locator(`.date-cell[data-date="${date}"]`);
      await expect(dateCell).toHaveClass(/attended/);
    }
  });

  test('should show current date with special styling', async ({ page }) => {
    // Mock current date
    await page.addInitScript(() => {
      // Override Date to return a fixed date
      const mockDate = new Date('2025-09-21');
      Date.now = () => mockDate.getTime();
      global.Date = class extends Date {
        constructor(...args) {
          if (args.length === 0) {
            return mockDate;
          }
          return new Date(...args);
        }
        static now() {
          return mockDate.getTime();
        }
      };
    });

    await page.reload();
    await page.click('#attendance-tab');
    await page.waitForSelector('#calendar-grid');

    // Current date should have special styling
    const currentDateCell = page.locator('.date-cell[data-date="21"]');
    await expect(currentDateCell).toHaveClass(/current-date/);
  });

  test('should display statistics summary', async ({ page }) => {
    // Should have stats summary section
    const statsSection = page.locator('#stats-summary');
    await expect(statsSection).toBeVisible();

    // Should display key statistics
    await expect(page.locator('#total-practice-time')).toContainText('1시간');
    await expect(page.locator('#total-attendance-days')).toContainText('5일');
    await expect(page.locator('#average-daily-practice')).toContainText('12분');
  });

  test('should support month navigation', async ({ page }) => {
    // Should have month navigation buttons
    const prevMonthBtn = page.locator('#prev-month');
    const nextMonthBtn = page.locator('#next-month');

    await expect(prevMonthBtn).toBeVisible();
    await expect(nextMonthBtn).toBeVisible();

    // Click next month button and wait for API call
    await nextMonthBtn.click();

    // Wait for navigation to complete
    await page.waitForFunction(() => {
      const monthElement = document.getElementById('current-month');
      return monthElement && monthElement.textContent.includes('10월');
    }, { timeout: 10000 });

    // Should navigate to next month
    const monthDisplay = page.locator('#current-month');
    await expect(monthDisplay).toContainText('2025년 10월');
  });

  test('should show attendance streak information', async ({ page }) => {
    // Should display streak information
    const streakInfo = page.locator('#streak-info');
    await expect(streakInfo).toBeVisible();

    // Should show current streak
    await expect(page.locator('#current-streak')).toBeVisible();
    await expect(page.locator('#longest-streak')).toBeVisible();
  });

  test('should handle empty attendance data', async ({ page }) => {
    // Clear all existing routes first
    await page.unroute('**/api/profile/attendance');
    await page.unroute('**/api/profile/stats');

    // Mock empty attendance data
    await page.route('**/api/profile/attendance', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          attendance_dates: [],
          current_month: '2025-09',
          total_days: 0
        })
      });
    });

    // Mock stats with no attendance
    await page.route('**/api/profile/stats', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_practice_time: 0,
          total_attendance_days: 0,
          average_daily_practice: 0,
          longest_session: 0,
          stats_period: 'N/A ~ N/A'
        })
      });
    });

    await page.reload();
    await page.click('#attendance-tab');
    await page.waitForSelector('#calendar-grid');

    // No dates should be highlighted
    const attendedCells = page.locator('.date-cell.attended');
    await expect(attendedCells).toHaveCount(0);

    // Should show appropriate message
    await expect(page.locator('#no-attendance-message')).toContainText('아직 출석 기록이 없습니다');
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.reload();
    await page.click('#attendance-tab');
    await page.waitForSelector('#calendar-grid');

    // Calendar should still be visible and properly sized
    const calendarSection = page.locator('#attendance-calendar');
    await expect(calendarSection).toBeVisible();

    // Grid should adapt to mobile layout
    const calendarGrid = page.locator('#calendar-grid');
    const gridWidth = await calendarGrid.evaluate(el => el.offsetWidth);
    expect(gridWidth).toBeLessThan(375);
  });

  test('should show loading state while fetching data', async ({ page }) => {
    // Delay the API responses
    await page.route('**/api/profile/attendance', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          attendance_dates: ['2025-09-21'],
          current_month: '2025-09',
          total_days: 1
        })
      });
    });

    await page.route('**/api/profile/stats', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_practice_time: 3600,
          total_attendance_days: 1,
          average_daily_practice: 720,
          longest_session: 1800,
          first_practice_date: '2025-09-21',
          last_practice_date: '2025-09-21',
          stats_period: '2025-09-21 ~ 2025-09-21'
        })
      });
    });

    await page.reload();

    // Switch to attendance tab to trigger loading
    await page.click('#attendance-tab');

    // Should show loading indicator
    const loadingIndicator = page.locator('#calendar-loading');
    await expect(loadingIndicator).toBeVisible();

    // After loading, calendar should appear
    await page.waitForSelector('#calendar-grid', { timeout: 2000 });
    await expect(loadingIndicator).not.toBeVisible();
  });
});