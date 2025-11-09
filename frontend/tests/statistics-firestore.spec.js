const { test, expect } = require('@playwright/test');
const { useFirebaseMocks, gotoPage, disableProgrammaticNavigation } = require('./helpers/testUtils');

const STAT_MOCK = {
  initialUser: {
    uid: 'stat-user',
    email: 'stat@example.com',
    username: 'stat-user'
  },
  stats: {
    total_practice_time: 3600, // seconds
    total_practice_sessions: 8,
    total_practice_days: 5,
    weekly_practice_time: 900,
    weekly_practice_days: 3,
    recent_sessions: [
      { id: 'log-1', date: '2025-01-01T00:00:00Z', duration: 300 },
      { id: 'log-2', date: '2025-01-02T00:00:00Z', duration: 600 }
    ]
  },
  attendanceDates: ['2025-01-01', '2025-01-02']
};

test.describe('Statistics dashboard (Firebase)', () => {
  test.beforeEach(async ({ page }) => {
    await useFirebaseMocks(page, STAT_MOCK);
    await disableProgrammaticNavigation(page);
  });

  test('renders aggregated statistics from mock Firestore data', async ({ page }) => {
    await gotoPage(page, 'statistics.html');
    await expect(page.locator('#total-practice-time')).toContainText('1시간 0분');
    await expect(page.locator('#total-sessions')).toContainText('8회');
    await expect(page.locator('#practice-days')).toContainText('5일');
    await expect(page.locator('#weekly-progress-text')).toContainText('15/300분');
  });

  test('lists recent practice sessions', async ({ page }) => {
    await gotoPage(page, 'statistics.html');
    await page.waitForFunction(() => Array.isArray(window.__lastRenderedSessions) && window.__lastRenderedSessions.length === 2);
    const sessions = page.locator('#sessions-list .session-item');
    await expect(sessions).toHaveCount(2);
    await expect(sessions.first()).toContainText('점자 연습');
  });
});
