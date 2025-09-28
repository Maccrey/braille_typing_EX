const { test, expect } = require('@playwright/test');

test.describe('Statistics Page Debug', () => {

  test('should debug statistics page API calls', async ({ page }) => {
    // Listen to console logs
    page.on('console', msg => {
      console.log(`BROWSER ${msg.type()}: ${msg.text()}`);
    });

    // Listen to network requests
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log(`REQUEST: ${request.method()} ${request.url()}`);
      }
    });

    // Listen to responses
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`RESPONSE: ${response.status()} ${response.url()}`);
      }
    });

    // Create a test user with practice data
    const uniqueUsername = `statspage_${Date.now()}`;

    const signupResponse = await page.request.post('http://localhost:3001/api/auth/signup', {
      data: {
        username: uniqueUsername,
        password: 'password123'
      }
    });

    const signupData = await signupResponse.json();
    const token = signupData.token;
    console.log('✅ Created user:', uniqueUsername);

    // Add practice data
    await page.request.post('http://localhost:3001/api/protected/practice/log', {
      headers: { 'Authorization': `Bearer ${token}` },
      data: { duration_seconds: 180, practiced_at: '2025-09-28' }
    });
    console.log('📝 Added practice data: 180 seconds');

    // Verify API returns correct data
    const statsResponse = await page.request.get('http://localhost:3001/api/profile/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const statsData = await statsResponse.json();
    console.log('📊 API Stats Response:', statsData);

    // Go to statistics page
    await page.goto('http://localhost:8080/statistics.html');

    // Set token in localStorage
    await page.evaluate((token) => {
      localStorage.setItem('authToken', token);
    }, token);

    // Reload to trigger stats loading
    await page.reload();

    // Wait for the page to load
    await page.waitForSelector('#total-practice-time', { timeout: 10000 });

    // Wait a bit for API calls to complete
    await page.waitForTimeout(3000);

    // Check all statistics elements
    const totalTime = await page.textContent('#total-practice-time');
    const totalSessions = await page.textContent('#total-sessions');
    const practiceDays = await page.textContent('#practice-days');
    const avgSession = await page.textContent('#average-session-time');
    const weeklyTime = await page.textContent('#weekly-progress-text');
    const weeklyDays = await page.textContent('#daily-progress-text');

    console.log('📊 Statistics page display:', {
      totalTime,
      totalSessions,
      practiceDays,
      avgSession,
      weeklyTime,
      weeklyDays
    });

    // Check if recent sessions are loading
    const sessionsList = await page.locator('#sessions-list').innerHTML();
    console.log('📅 Recent sessions HTML length:', sessionsList.length);

    // Check for error messages
    const errorMessage = await page.locator('#error-message');
    const isErrorVisible = await errorMessage.isVisible();
    if (isErrorVisible) {
      const errorText = await errorMessage.textContent();
      console.log('❌ Error message visible:', errorText);
    }

    // Check loading indicator
    const loadingIndicator = await page.locator('#loading-indicator');
    const isLoadingVisible = await loadingIndicator.isVisible();
    console.log('⏳ Loading indicator visible:', isLoadingVisible);

    // Manually test the API call from browser
    const browserApiTest = await page.evaluate(async () => {
      try {
        const token = localStorage.getItem('authToken');
        console.log('Testing API call with token:', !!token);

        const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
        const apiUrl = baseUrl + '/api/profile/stats';
        console.log('Using API URL:', apiUrl);

        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (!response.ok) {
          return { error: `HTTP ${response.status}` };
        }

        const data = await response.json();
        console.log('Response data:', data);
        return { success: true, data };

      } catch (error) {
        console.error('API call error:', error);
        return { error: error.message };
      }
    });

    console.log('🧪 Browser API test result:', browserApiTest);

    // Verify the stats should be correct
    expect(statsData.total_practice_time).toBe(180);
    expect(totalTime).toBe('3분'); // 180 seconds = 3 minutes
  });
});