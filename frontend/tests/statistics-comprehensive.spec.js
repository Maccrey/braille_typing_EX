const { test, expect } = require('@playwright/test');

test.describe('Statistics Comprehensive Tests', () => {

  test('should create user, log practice, and verify statistics on both pages', async ({ page }) => {
    // Create a unique user for this test
    const uniqueUsername = `testuser_${Date.now()}`;
    const password = 'password123';

    // 1. Create user via API directly
    const signupResponse = await page.request.post('http://localhost:3001/api/auth/signup', {
      data: {
        username: uniqueUsername,
        password: password
      }
    });

    expect(signupResponse.ok()).toBe(true);
    const signupData = await signupResponse.json();
    const token = signupData.token;

    console.log('✅ User created:', uniqueUsername, 'with token:', !!token);

    // 2. Set token in localStorage
    await page.goto('http://localhost:8080/main.html');
    await page.evaluate((token) => {
      localStorage.setItem('authToken', token);
    }, token);

    // 3. Add practice sessions via API
    const practiceData = [
      { duration_seconds: 120, practiced_at: '2025-09-28' },
      { duration_seconds: 180, practiced_at: '2025-09-28' },
      { duration_seconds: 240, practiced_at: '2025-09-27' }
    ];

    for (const practice of practiceData) {
      const practiceResponse = await page.request.post('http://localhost:3001/api/protected/practice/log', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        data: practice
      });

      expect(practiceResponse.ok()).toBe(true);
      console.log('📝 Practice logged:', practice);
    }

    // 4. Test API response directly
    const statsResponse = await page.request.get('http://localhost:3001/api/profile/stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    expect(statsResponse.ok()).toBe(true);
    const statsData = await statsResponse.json();
    console.log('📊 API Stats:', statsData);

    // Verify API returns correct data
    expect(statsData.total_practice_time).toBe(540); // 120 + 180 + 240
    expect(statsData.total_practice_sessions).toBe(3);
    expect(statsData.total_practice_days).toBe(2); // 2 different days

    // 5. Test main page statistics display
    await page.goto('http://localhost:8080/main.html');

    // Wait for stats to load
    await page.waitForFunction(() => {
      const element = document.getElementById('practice-time');
      return element && element.textContent !== '0분' && element.textContent !== '0h';
    }, { timeout: 10000 });

    const mainPageTime = await page.textContent('#practice-time');
    console.log('🏠 Main page time:', mainPageTime);
    expect(mainPageTime).toBe('9분'); // 540 seconds = 9 minutes

    // 6. Test statistics page
    await page.goto('http://localhost:8080/statistics.html');

    // Wait for statistics to load
    await page.waitForFunction(() => {
      const totalTime = document.getElementById('total-practice-time');
      return totalTime && totalTime.textContent !== '0분';
    }, { timeout: 10000 });

    // Check all statistics elements
    const totalTime = await page.textContent('#total-practice-time');
    const totalSessions = await page.textContent('#total-sessions');
    const practiceDays = await page.textContent('#practice-days');
    const avgSession = await page.textContent('#average-session-time');

    console.log('📊 Statistics page display:', {
      totalTime,
      totalSessions,
      practiceDays,
      avgSession
    });

    // Verify statistics display
    expect(totalTime).toBe('9분');
    expect(totalSessions).toBe('3회');
    expect(practiceDays).toBe('2일');
    expect(avgSession).toBe('3분'); // 540/3 = 180 seconds = 3 minutes

    // Check weekly progress
    const weeklyTime = await page.textContent('#weekly-progress-text');
    const weeklyDays = await page.textContent('#daily-progress-text');

    console.log('📈 Weekly progress:', { weeklyTime, weeklyDays });
    expect(weeklyTime).toContain('9/300분');
    expect(weeklyDays).toContain('2/5일');
  });

  test('should debug API call flow in main page', async ({ page }) => {
    // Create user and token
    const uniqueUsername = `debuguser_${Date.now()}`;
    const signupResponse = await page.request.post('http://localhost:3001/api/auth/signup', {
      data: {
        username: uniqueUsername,
        password: 'password123'
      }
    });

    const signupData = await signupResponse.json();
    const token = signupData.token;

    // Set up page with token and logging
    await page.goto('http://localhost:8080/main.html');
    await page.evaluate((token) => {
      localStorage.setItem('authToken', token);
    }, token);

    // Add console logging to track API calls
    page.on('console', msg => {
      if (msg.text().includes('📊') || msg.text().includes('🔄') || msg.text().includes('⏰')) {
        console.log('BROWSER LOG:', msg.text());
      }
    });

    // Add practice data
    const practiceResponse = await page.request.post('http://localhost:3001/api/protected/practice/log', {
      headers: { 'Authorization': `Bearer ${token}` },
      data: { duration_seconds: 300, practiced_at: '2025-09-28' }
    });
    expect(practiceResponse.ok()).toBe(true);

    // Refresh page and watch for API calls
    await page.goto('http://localhost:8080/main.html');

    // Wait for and verify the stats load
    await page.waitForFunction(() => {
      const element = document.getElementById('practice-time');
      console.log('Current practice-time element text:', element ? element.textContent : 'null');
      return element && element.textContent === '5분';
    }, { timeout: 10000 });

    const finalTime = await page.textContent('#practice-time');
    console.log('✅ Final main page time display:', finalTime);
    expect(finalTime).toBe('5분');
  });
});