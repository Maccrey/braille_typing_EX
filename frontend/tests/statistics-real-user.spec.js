const { test, expect } = require('@playwright/test');

test.describe('Statistics Real User Flow', () => {

  test('should test statistics page with manual login flow', async ({ page }) => {
    // Listen to console logs
    page.on('console', msg => {
      console.log(`BROWSER ${msg.type()}: ${msg.text()}`);
    });

    // Create user and practice data via API first
    const uniqueUsername = `realuser_${Date.now()}`;
    const password = 'password123';

    const signupResponse = await page.request.post('http://localhost:3001/api/auth/signup', {
      data: { username: uniqueUsername, password }
    });

    const signupData = await signupResponse.json();
    console.log('✅ Created user:', uniqueUsername);

    // Add some practice data
    await page.request.post('http://localhost:3001/api/protected/practice/log', {
      headers: { 'Authorization': `Bearer ${signupData.token}` },
      data: { duration_seconds: 180, practiced_at: '2025-09-28' }
    });

    await page.request.post('http://localhost:3001/api/protected/practice/log', {
      headers: { 'Authorization': `Bearer ${signupData.token}` },
      data: { duration_seconds: 120, practiced_at: '2025-09-28' }
    });

    console.log('📝 Added practice data: 300 seconds total');

    // Verify API response
    const statsResponse = await page.request.get('http://localhost:3001/api/profile/stats', {
      headers: { 'Authorization': `Bearer ${signupData.token}` }
    });
    const apiStats = await statsResponse.json();
    console.log('📊 API Stats:', apiStats);

    // Now simulate real user flow: go to login page
    await page.goto('http://localhost:8080/login.html');

    // Fill login form
    await page.fill('input[name="username"]', uniqueUsername);
    await page.fill('input[name="password"]', password);

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for redirect to main page
    await page.waitForURL('**/main.html', { timeout: 10000 });
    console.log('✅ Logged in successfully');

    // Check main page statistics
    await page.waitForSelector('#practice-time', { timeout: 10000 });
    const mainPageTime = await page.textContent('#practice-time');
    console.log('🏠 Main page practice time:', mainPageTime);

    // Now go to statistics page
    await page.goto('http://localhost:8080/statistics.html');

    // Wait for statistics to load
    await page.waitForSelector('#statistics-content', { state: 'visible', timeout: 10000 });
    console.log('📊 Statistics page loaded');

    // Wait for statistics to be populated
    await page.waitForFunction(() => {
      const totalTime = document.getElementById('total-practice-time');
      return totalTime && totalTime.textContent !== '0분';
    }, { timeout: 15000 });

    // Get all statistics values
    const totalTime = await page.textContent('#total-practice-time');
    const totalSessions = await page.textContent('#total-sessions');
    const practiceDays = await page.textContent('#practice-days');
    const avgSession = await page.textContent('#average-session-time');

    console.log('📊 Final statistics display:', {
      totalTime, totalSessions, practiceDays, avgSession
    });

    // Verify statistics are correct
    expect(totalTime).toBe('5분'); // 300 seconds = 5 minutes
    expect(totalSessions).toBe('2회');
    expect(practiceDays).toBe('1일');
    expect(avgSession).toBe('3분'); // 300/2 = 150 seconds = 2.5 minutes rounded to 3

    console.log('✅ Statistics test passed!');
  });

  test('should test statistics page reload functionality', async ({ page }) => {
    // Create user and login normally
    const uniqueUsername = `reloadtest_${Date.now()}`;
    const password = 'password123';

    const signupResponse = await page.request.post('http://localhost:3001/api/auth/signup', {
      data: { username: uniqueUsername, password }
    });

    const signupData = await signupResponse.json();

    // Add practice data
    await page.request.post('http://localhost:3001/api/protected/practice/log', {
      headers: { 'Authorization': `Bearer ${signupData.token}` },
      data: { duration_seconds: 240, practiced_at: '2025-09-28' }
    });

    // Login through UI
    await page.goto('http://localhost:8080/login.html');
    await page.fill('input[name="username"]', uniqueUsername);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/main.html');

    // Go to statistics page
    await page.goto('http://localhost:8080/statistics.html');

    // Wait for content to load
    await page.waitForSelector('#statistics-content', { state: 'visible', timeout: 10000 });

    // Wait for statistics to be populated
    await page.waitForFunction(() => {
      const totalTime = document.getElementById('total-practice-time');
      return totalTime && totalTime.textContent === '4분';
    }, { timeout: 10000 });

    const totalTime = await page.textContent('#total-practice-time');
    console.log('📊 Statistics after normal load:', totalTime);

    expect(totalTime).toBe('4분'); // 240 seconds = 4 minutes

    // Test page reload
    await page.reload();
    await page.waitForSelector('#statistics-content', { state: 'visible', timeout: 10000 });

    // Wait for statistics to be populated after reload
    await page.waitForFunction(() => {
      const totalTime = document.getElementById('total-practice-time');
      return totalTime && totalTime.textContent === '4분';
    }, { timeout: 10000 });

    const totalTimeAfterReload = await page.textContent('#total-practice-time');
    console.log('📊 Statistics after reload:', totalTimeAfterReload);

    expect(totalTimeAfterReload).toBe('4분');

    console.log('✅ Reload test passed!');
  });
});