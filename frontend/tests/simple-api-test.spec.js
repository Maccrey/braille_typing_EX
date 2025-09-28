const { test, expect } = require('@playwright/test');

test.describe('Simple API Test', () => {

  test('should test API configuration and calls', async ({ page }) => {
    // Listen to console logs
    const logs = [];
    page.on('console', msg => {
      logs.push(`${msg.type()}: ${msg.text()}`);
      console.log(`BROWSER ${msg.type()}: ${msg.text()}`);
    });

    // Listen to network requests
    const requests = [];
    page.on('request', request => {
      requests.push({ url: request.url(), method: request.method() });
      console.log(`REQUEST: ${request.method()} ${request.url()}`);
    });

    // Listen to responses
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`RESPONSE: ${response.status()} ${response.url()}`);
      }
    });

    // Create a test user
    const uniqueUsername = `simpletest_${Date.now()}`;
    const signupResponse = await page.request.post('http://localhost:3001/api/auth/signup', {
      data: {
        username: uniqueUsername,
        password: 'password123'
      }
    });

    const signupData = await signupResponse.json();
    const token = signupData.token;
    console.log('✅ Created user with token');

    // Add practice data
    await page.request.post('http://localhost:3001/api/protected/practice/log', {
      headers: { 'Authorization': `Bearer ${token}` },
      data: { duration_seconds: 300, practiced_at: '2025-09-28' }
    });
    console.log('📝 Added practice data');

    // Go to main page
    await page.goto('http://localhost:8080/main.html');

    // Set token in localStorage
    await page.evaluate((token) => {
      localStorage.setItem('authToken', token);
      console.log('🔑 Token set in localStorage:', !!token);
    }, token);

    // Test the getApiUrl function
    const apiUrl = await page.evaluate(() => {
      if (typeof getApiUrl === 'function') {
        return getApiUrl('/api/profile/stats');
      } else {
        return 'getApiUrl function not found';
      }
    });
    console.log('🔗 API URL resolved to:', apiUrl);

    // Manually test the API call
    const apiResult = await page.evaluate(async () => {
      try {
        const token = localStorage.getItem('authToken');
        console.log('Making API call with token:', !!token);

        const url = typeof getApiUrl === 'function' ? getApiUrl('/api/profile/stats') : 'http://localhost:3001/api/profile/stats';
        console.log('Using URL:', url);

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (!response.ok) {
          const text = await response.text();
          console.log('Response text:', text);
          return { error: `HTTP ${response.status}: ${text}` };
        }

        const data = await response.json();
        console.log('Response data:', data);
        return { success: true, data };

      } catch (error) {
        console.error('API call error:', error);
        return { error: error.message };
      }
    });

    console.log('🧪 API test result:', apiResult);

    // Now reload the page and see if statistics load
    await page.reload();
    await page.waitForTimeout(2000);

    const practiceTime = await page.textContent('#practice-time');
    console.log('📊 Practice time displayed:', practiceTime);

    // Print all logs for debugging
    console.log('\n=== BROWSER LOGS ===');
    logs.forEach(log => console.log(log));

    console.log('\n=== NETWORK REQUESTS ===');
    requests.forEach(req => console.log(`${req.method} ${req.url}`));

    expect(apiResult.error).toBeUndefined();
    expect(apiResult.data).toBeDefined();
    expect(practiceTime).toBe('5분');
  });
});