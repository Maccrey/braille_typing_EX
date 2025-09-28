const { test, expect } = require('@playwright/test');

test.describe('Statistics Fix Tests', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    // Clear localStorage to start fresh
    await page.goto('http://localhost:8080');
    await page.evaluate(() => localStorage.clear());
  });

  test('should show correct statistics after practice session', async () => {
    // First register a new user
    await page.goto('http://localhost:8080/signup.html');

    const uniqueUsername = `testuser_${Date.now()}`;
    await page.fill('input[type="text"]', uniqueUsername);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect to main page
    await page.waitForURL('**/main.html');

    // Log some practice sessions
    const token = await page.evaluate(() => localStorage.getItem('authToken'));
    console.log('🔑 Using token:', token ? 'exists' : 'missing');

    // Add practice sessions via API
    const practiceData = [
      { duration_seconds: 120, practiced_at: '2025-09-28' },
      { duration_seconds: 180, practiced_at: '2025-09-28' }
    ];

    for (const practice of practiceData) {
      const response = await page.evaluate(async (practiceData) => {
        const token = localStorage.getItem('authToken');
        const res = await fetch('/api/protected/practice/log', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(practiceData)
        });
        return { ok: res.ok, status: res.status, data: await res.json() };
      }, practice);

      console.log('📝 Practice log response:', response);
      expect(response.ok).toBe(true);
    }

    // Navigate to statistics page
    await page.goto('http://localhost:8080/statistics.html');

    // Wait for statistics to load
    await page.waitForFunction(() => {
      const totalTime = document.getElementById('total-practice-time');
      return totalTime && totalTime.textContent !== '0분';
    }, { timeout: 10000 });

    // Check statistics display
    const totalTime = await page.textContent('#total-practice-time');
    const totalSessions = await page.textContent('#total-sessions');
    const practiceDays = await page.textContent('#practice-days');
    const weeklyTime = await page.textContent('#weekly-progress-text');
    const weeklyDays = await page.textContent('#daily-progress-text');

    console.log('📊 Statistics display:', {
      totalTime,
      totalSessions,
      practiceDays,
      weeklyTime,
      weeklyDays
    });

    // Verify the statistics show non-zero values
    expect(totalTime).not.toBe('0분');
    expect(totalSessions).not.toBe('0회');
    expect(practiceDays).not.toBe('0일');

    // Check that it shows 5 minutes total (300 seconds = 5 minutes)
    expect(totalTime).toBe('5분');
    expect(totalSessions).toBe('2회');
    expect(practiceDays).toBe('1일');

    // Check weekly progress
    expect(weeklyTime).toContain('5/300분');
    expect(weeklyDays).toContain('1/5일');
  });

  test('should debug API responses', async () => {
    // Register and login
    await page.goto('http://localhost:8080/signup.html');

    const uniqueUsername = `debuguser_${Date.now()}`;
    await page.fill('input[type="text"]', uniqueUsername);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/main.html');

    // Test API directly
    const apiResponse = await page.evaluate(async () => {
      const token = localStorage.getItem('authToken');
      console.log('🔑 Token available:', !!token);

      const response = await fetch('/api/profile/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('📊 API Response:', data);
      return { ok: response.ok, data };
    });

    console.log('🔍 API test result:', apiResponse);
    expect(apiResponse.ok).toBe(true);
    expect(apiResponse.data).toHaveProperty('total_practice_time');
    expect(apiResponse.data).toHaveProperty('weekly_practice_time');
    expect(apiResponse.data).toHaveProperty('weekly_practice_days');
  });
});