const { test, expect } = require('@playwright/test');

test.describe('Statistics Final Fix Tests', () => {

  test('should create user with practice data and verify statistics display', async ({ page }) => {
    // 1. Create user and practice data via API
    const uniqueUsername = `statsfixtest_${Date.now()}`;

    // Create user
    const signupResponse = await page.request.post('http://localhost:3001/api/auth/signup', {
      data: {
        username: uniqueUsername,
        password: 'password123'
      }
    });

    expect(signupResponse.ok()).toBe(true);
    const signupData = await signupResponse.json();
    const token = signupData.token;
    console.log('✅ Created user:', uniqueUsername);

    // Add multiple practice sessions
    const practiceData = [
      { duration_seconds: 120, practiced_at: '2025-09-28' }, // 2 minutes
      { duration_seconds: 180, practiced_at: '2025-09-28' }, // 3 minutes
      { duration_seconds: 240, practiced_at: '2025-09-27' }  // 4 minutes
    ];

    for (const practice of practiceData) {
      const response = await page.request.post('http://localhost:3001/api/protected/practice/log', {
        headers: { 'Authorization': `Bearer ${token}` },
        data: practice
      });
      expect(response.ok()).toBe(true);
    }
    console.log('📝 Added practice data: 540 seconds total (9 minutes)');

    // 2. Test API directly to ensure data is correct
    const statsResponse = await page.request.get('http://localhost:3001/api/profile/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    expect(statsResponse.ok()).toBe(true);
    const statsData = await statsResponse.json();
    console.log('📊 API Stats Response:', statsData);

    expect(statsData.total_practice_time).toBe(540);
    expect(statsData.total_practice_sessions).toBe(3);
    expect(statsData.total_practice_days).toBe(2);

    // 3. Test main page statistics
    await page.goto('http://localhost:8080/main.html');

    // Set the auth token
    await page.evaluate((token) => {
      localStorage.setItem('authToken', token);
    }, token);

    // Refresh to trigger stats loading
    await page.reload();

    // Wait for the main page stats to load and display correctly
    let retryCount = 0;
    const maxRetries = 5;

    while (retryCount < maxRetries) {
      try {
        await page.waitForSelector('#practice-time', { timeout: 5000 });

        const practiceTimeText = await page.textContent('#practice-time');
        console.log(`🔄 Attempt ${retryCount + 1}: Main page practice time: "${practiceTimeText}"`);

        if (practiceTimeText && practiceTimeText === '9분') {
          console.log('✅ Main page shows correct practice time');
          break;
        }

        if (retryCount === maxRetries - 1) {
          // On final attempt, log debugging info
          const apiResponseDirect = await page.evaluate(async () => {
            const token = localStorage.getItem('authToken');
            try {
              const response = await fetch('/api/profile/stats', {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              const data = await response.json();
              return { ok: response.ok, data };
            } catch (error) {
              return { error: error.message };
            }
          });

          console.log('🔍 Frontend API call result:', apiResponseDirect);
          expect(practiceTimeText).toBe('9분');
        }

        retryCount++;
        await page.waitForTimeout(1000);
        await page.reload();

      } catch (error) {
        console.log(`❌ Attempt ${retryCount + 1} failed:`, error.message);
        retryCount++;
        if (retryCount >= maxRetries) throw error;
        await page.waitForTimeout(1000);
      }
    }

    // 4. Test statistics page
    await page.goto('http://localhost:8080/statistics.html');

    // Wait for statistics page to load
    await page.waitForSelector('#total-practice-time', { timeout: 10000 });

    // Check if loading indicator is present and wait for it to disappear
    const loadingIndicator = await page.locator('#loading-indicator');
    if (await loadingIndicator.isVisible()) {
      await page.waitForSelector('#loading-indicator', { state: 'hidden', timeout: 10000 });
    }

    // Wait for statistics content to be visible
    await page.waitForSelector('#statistics-content', { state: 'visible', timeout: 10000 });

    // Get all statistics values
    const totalTime = await page.textContent('#total-practice-time');
    const totalSessions = await page.textContent('#total-sessions');
    const practiceDays = await page.textContent('#practice-days');
    const avgSession = await page.textContent('#average-session-time');

    console.log('📊 Statistics page results:', {
      totalTime, totalSessions, practiceDays, avgSession
    });

    // Verify all statistics are correct
    expect(totalTime).toBe('9분'); // 540 seconds = 9 minutes
    expect(totalSessions).toBe('3회');
    expect(practiceDays).toBe('2일');
    expect(avgSession).toBe('3분'); // 540/3 = 180 seconds = 3 minutes

    console.log('✅ All statistics tests passed!');
  });

  test('should handle zero statistics correctly', async ({ page }) => {
    // Create new user with no practice data
    const uniqueUsername = `zerostats_${Date.now()}`;

    const signupResponse = await page.request.post('http://localhost:3001/api/auth/signup', {
      data: {
        username: uniqueUsername,
        password: 'password123'
      }
    });

    const signupData = await signupResponse.json();
    const token = signupData.token;

    // Test API returns zeros
    const statsResponse = await page.request.get('http://localhost:3001/api/profile/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const statsData = await statsResponse.json();
    expect(statsData.total_practice_time).toBe(0);
    expect(statsData.total_practice_sessions).toBe(0);

    // Test frontend displays zeros correctly
    await page.goto('http://localhost:8080/main.html');
    await page.evaluate((token) => {
      localStorage.setItem('authToken', token);
    }, token);
    await page.reload();

    await page.waitForSelector('#practice-time');
    const practiceTime = await page.textContent('#practice-time');
    expect(practiceTime).toBe('0분');

    console.log('✅ Zero statistics test passed');
  });
});