const { test, expect } = require('@playwright/test');

test.describe('Statistics Direct Test', () => {

  test('should test statistics page directly with token', async ({ page }) => {
    // Create user and practice data
    const uniqueUsername = `directtest_${Date.now()}`;

    const signupResponse = await page.request.post('http://localhost:3001/api/auth/signup', {
      data: { username: uniqueUsername, password: 'password123' }
    });

    const signupData = await signupResponse.json();
    const token = signupData.token;

    // Add practice data (multiple sessions like the user reported)
    await page.request.post('http://localhost:3001/api/protected/practice/log', {
      headers: { 'Authorization': `Bearer ${token}` },
      data: { duration_seconds: 120, practiced_at: '2025-09-28' }
    });

    await page.request.post('http://localhost:3001/api/protected/practice/log', {
      headers: { 'Authorization': `Bearer ${token}` },
      data: { duration_seconds: 120, practiced_at: '2025-09-28' }
    });

    console.log('📝 Added practice data: 240 seconds (4 minutes) total');

    // Verify API returns correct data
    const statsResponse = await page.request.get('http://localhost:3001/api/profile/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const apiStats = await statsResponse.json();
    console.log('📊 API Stats Response:', apiStats);

    // Go directly to statistics page
    await page.goto('http://localhost:8080/statistics.html');

    // Set token in localStorage immediately
    await page.evaluate((token) => {
      localStorage.setItem('authToken', token);
      console.log('🔑 Token set in localStorage');
    }, token);

    // Listen to console and network logs
    page.on('console', msg => {
      if (msg.text().includes('🔄') || msg.text().includes('📊') || msg.text().includes('❌') || msg.text().includes('⚠️')) {
        console.log(`BROWSER: ${msg.text()}`);
      }
    });

    // Trigger statistics loading by calling the reload method
    await page.evaluate(() => {
      if (window.statisticsManager && typeof window.statisticsManager.reloadStatistics === 'function') {
        console.log('📊 Calling reloadStatistics manually');
        window.statisticsManager.reloadStatistics();
      } else {
        console.log('⚠️ StatisticsManager not available, trying to initialize');
        // Try to reinitialize
        if (typeof StatisticsManager !== 'undefined') {
          window.statisticsManager = new StatisticsManager();
        }
      }
    });

    // Wait for statistics content to be visible
    await page.waitForSelector('#statistics-content', { state: 'visible', timeout: 10000 });

    // Wait for actual data to load
    await page.waitForTimeout(3000);

    // Check if statistics are populated
    const totalTime = await page.textContent('#total-practice-time');
    const totalSessions = await page.textContent('#total-sessions');
    const practiceDays = await page.textContent('#practice-days');
    const avgSession = await page.textContent('#average-session-time');
    const weeklyTime = await page.textContent('#weekly-progress-text');
    const weeklyDays = await page.textContent('#daily-progress-text');

    console.log('📊 Statistics values:', {
      totalTime, totalSessions, practiceDays, avgSession, weeklyTime, weeklyDays
    });

    // Also check recent sessions
    const sessionsList = await page.locator('#sessions-list').innerHTML();
    const hasRecentSessions = sessionsList.length > 100; // Should have content if sessions loaded
    console.log('📅 Recent sessions loaded:', hasRecentSessions);

    // Check for error messages
    const errorMsg = await page.locator('#error-message');
    const isErrorVisible = await errorMsg.isVisible();
    if (isErrorVisible) {
      const errorText = await errorMsg.textContent();
      console.log('❌ Error message:', errorText);
    }

    // Test that the data is correct
    expect(totalTime).toBe('4분'); // 240 seconds = 4 minutes
    expect(totalSessions).toBe('2회');
    expect(practiceDays).toBe('1일');

    console.log('✅ Direct statistics test completed');
  });

  test('should manually trigger statistics load', async ({ page }) => {
    // Create user and add practice data
    const uniqueUsername = `manualtest_${Date.now()}`;

    const signupResponse = await page.request.post('http://localhost:3001/api/auth/signup', {
      data: { username: uniqueUsername, password: 'password123' }
    });

    const signupData = await signupResponse.json();
    const token = signupData.token;

    // Add practice data
    await page.request.post('http://localhost:3001/api/protected/practice/log', {
      headers: { 'Authorization': `Bearer ${token}` },
      data: { duration_seconds: 180, practiced_at: '2025-09-28' }
    });

    // Go to statistics page and set token
    await page.goto('http://localhost:8080/statistics.html');
    await page.evaluate((token) => {
      localStorage.setItem('authToken', token);
    }, token);

    // Wait for page load
    await page.waitForTimeout(1000);

    // Manually trigger statistics loading by calling the API directly in browser
    const result = await page.evaluate(async () => {
      try {
        const token = localStorage.getItem('authToken');
        console.log('Making manual API call...');

        const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
        const response = await fetch(baseUrl + '/api/profile/stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          return { error: `HTTP ${response.status}` };
        }

        const data = await response.json();
        console.log('API response:', data);

        // Manually update the DOM
        if (data.total_practice_time) {
          const minutes = Math.round(data.total_practice_time / 60);
          document.getElementById('total-practice-time').textContent = `${minutes}분`;
          document.getElementById('total-sessions').textContent = `${data.total_practice_sessions}회`;
          document.getElementById('practice-days').textContent = `${data.total_practice_days}일`;

          const avgMinutes = data.total_practice_sessions > 0
            ? Math.round(data.total_practice_time / data.total_practice_sessions / 60)
            : 0;
          document.getElementById('average-session-time').textContent = `${avgMinutes}분`;

          // Show the statistics content
          document.getElementById('statistics-content').style.display = 'block';
          document.getElementById('loading-indicator').style.display = 'none';

          console.log('Updated DOM with statistics');
        }

        return { success: true, data };
      } catch (error) {
        console.error('API call error:', error);
        return { error: error.message };
      }
    });

    console.log('🧪 Manual API result:', result);

    // Check the updated values
    const totalTime = await page.textContent('#total-practice-time');
    const totalSessions = await page.textContent('#total-sessions');

    console.log('📊 Final values:', { totalTime, totalSessions });

    expect(result.success).toBe(true);
    expect(totalTime).toBe('3분'); // 180 seconds = 3 minutes
    expect(totalSessions).toBe('1회');

    console.log('✅ Manual trigger test passed');
  });
});