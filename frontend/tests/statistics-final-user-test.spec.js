const { test, expect } = require('@playwright/test');

test.describe('Statistics Final User Test', () => {

  test('should simulate user practice and verify statistics', async ({ page }) => {
    // Create user and add practice data like a real user would have
    const uniqueUsername = `finaluser_${Date.now()}`;

    const signupResponse = await page.request.post('http://localhost:3001/api/auth/signup', {
      data: { username: uniqueUsername, password: 'password123' }
    });

    const signupData = await signupResponse.json();
    const token = signupData.token;

    // Add practice data that matches the user's report (2 minutes + 2 minutes = 4 minutes total)
    await page.request.post('http://localhost:3001/api/protected/practice/log', {
      headers: { 'Authorization': `Bearer ${token}` },
      data: { duration_seconds: 120, practiced_at: '2025-09-28' }
    });

    await page.request.post('http://localhost:3001/api/protected/practice/log', {
      headers: { 'Authorization': `Bearer ${token}` },
      data: { duration_seconds: 120, practiced_at: '2025-09-28' }
    });

    console.log('📝 Added practice data matching user report: 2분 + 2분 = 4분');

    // Verify API response
    const statsResponse = await page.request.get('http://localhost:3001/api/profile/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const apiStats = await statsResponse.json();
    console.log('📊 API Stats:', {
      total_practice_time: apiStats.total_practice_time,
      total_practice_sessions: apiStats.total_practice_sessions,
      total_practice_days: apiStats.total_practice_days
    });

    // Go to statistics page and set token (simulating logged-in user)
    await page.goto('http://localhost:8080/statistics.html');

    await page.evaluate((token) => {
      localStorage.setItem('authToken', token);
      console.log('🔑 User token set');
    }, token);

    // Reload page to simulate user refreshing the page
    await page.reload();

    // Wait for statistics content to be visible
    await page.waitForSelector('#statistics-content', { state: 'visible', timeout: 10000 });

    // Wait for statistics to load (either via initial load or delayed load)
    await page.waitForFunction(() => {
      const totalTime = document.getElementById('total-practice-time');
      return totalTime && totalTime.textContent !== '0분';
    }, { timeout: 15000 });

    // Get all the statistics that were showing as 0 in the user's report
    const totalTime = await page.textContent('#total-practice-time');
    const totalSessions = await page.textContent('#total-sessions');
    const avgSession = await page.textContent('#average-session-time');
    const practiceDays = await page.textContent('#practice-days');
    const weeklyTime = await page.textContent('#weekly-progress-text');
    const weeklyDays = await page.textContent('#daily-progress-text');

    console.log('📊 User Statistics Display:');
    console.log(`총 연습 시간: ${totalTime}`);
    console.log(`총 연습 세션: ${totalSessions}`);
    console.log(`평균 세션 시간: ${avgSession}`);
    console.log(`연습한 일수: ${practiceDays}`);
    console.log(`주간 연습 시간: ${weeklyTime}`);
    console.log(`주간 연습 일수: ${weeklyDays}`);

    // Check that recent sessions are also showing
    const sessionsList = await page.locator('#sessions-list').innerHTML();
    const hasRecentSessions = sessionsList.includes('점자 연습');
    console.log('📅 최근 연습 기록 표시됨:', hasRecentSessions);

    // Verify all statistics are correctly displayed (not 0)
    expect(totalTime).toBe('4분'); // 240 seconds = 4 minutes
    expect(totalSessions).toBe('2회'); // 2 sessions
    expect(practiceDays).toBe('1일'); // 1 day
    expect(avgSession).toBe('2분'); // 240/2 = 120 seconds = 2 minutes
    expect(weeklyTime).toContain('4/300분'); // weekly progress
    expect(weeklyDays).toContain('1/5일'); // weekly days
    expect(hasRecentSessions).toBe(true); // recent sessions should show

    console.log('✅ All statistics fixed - no more 0 values!');
  });

  test('should handle page refresh correctly', async ({ page }) => {
    // Create user with practice data
    const uniqueUsername = `refreshtest_${Date.now()}`;

    const signupResponse = await page.request.post('http://localhost:3001/api/auth/signup', {
      data: { username: uniqueUsername, password: 'password123' }
    });

    const signupData = await signupResponse.json();
    const token = signupData.token;

    // Add some practice data
    await page.request.post('http://localhost:3001/api/protected/practice/log', {
      headers: { 'Authorization': `Bearer ${token}` },
      data: { duration_seconds: 180, practiced_at: '2025-09-28' }
    });

    // Visit statistics page with token already set (simulating returning user)
    await page.goto('http://localhost:8080/statistics.html');
    await page.evaluate((token) => {
      localStorage.setItem('authToken', token);
    }, token);

    // Initial load
    await page.waitForSelector('#statistics-content', { state: 'visible', timeout: 10000 });
    await page.waitForFunction(() => {
      const totalTime = document.getElementById('total-practice-time');
      return totalTime && totalTime.textContent === '3분';
    }, { timeout: 10000 });

    let totalTime = await page.textContent('#total-practice-time');
    console.log('📊 Initial load - Total time:', totalTime);

    // Refresh page (common user action)
    await page.reload();

    // Should still work after refresh
    await page.waitForSelector('#statistics-content', { state: 'visible', timeout: 10000 });
    await page.waitForFunction(() => {
      const totalTime = document.getElementById('total-practice-time');
      return totalTime && totalTime.textContent === '3분';
    }, { timeout: 10000 });

    totalTime = await page.textContent('#total-practice-time');
    console.log('📊 After refresh - Total time:', totalTime);

    expect(totalTime).toBe('3분');
    console.log('✅ Page refresh test passed');
  });
});