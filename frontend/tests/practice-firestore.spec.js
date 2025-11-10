const { test, expect } = require('@playwright/test');
const { useFirebaseMocks, gotoPage } = require('./helpers/testUtils');

const PRACTICE_MOCK = {
  initialUser: {
    uid: 'user-1',
    email: 'user@example.com',
    username: 'mock-user'
  },
  myCategories: [
    { id: 'cat-1', name: '내 카테고리', braille_count: 2 }
  ],
  brailleQueue: [
    {
      character: 'α',
      description: '알파',
      braille_pattern: [[1, 2]]
    },
    {
      character: 'β',
      description: '베타',
      braille_pattern: [[1], [2, 3]]
    }
  ]
};

const setupPracticePage = async page => {
  await useFirebaseMocks(page, PRACTICE_MOCK);
  await gotoPage(page, 'practice.html');
  await expect(page.locator('#current-char')).not.toHaveText('-');
};

test.describe('Practice page with Firebase data', () => {
  test('loads fallback category and renders braille data', async ({ page }) => {
    await setupPracticePage(page);
    await expect(page.locator('#current-char')).toHaveText('α');
    await expect(page.locator('#braille-blocks .braille-block')).toHaveCount(1);
  });

  test('fetches the next character via apiClient', async ({ page }) => {
    await setupPracticePage(page);
    await page.click('#next-btn');
    await expect(page.locator('#current-char')).toHaveText('β');
    await expect(page.locator('#braille-blocks .braille-block')).toHaveCount(2);
  });

  test('records practice sessions through apiClient', async ({ page }) => {
    await setupPracticePage(page);
    await page.evaluate(() => {
      window.braillePractice.practiceSessionData.charactersCompleted = 4;
      window.braillePractice.sessionStartTime = Date.now() - 15000;
    });
    await page.evaluate(() => window.braillePractice.endPracticeSession());
    const recordedSessions = await page.evaluate(() => window.__MOCK_API_STATE__.recordedSessions);
    expect(recordedSessions.length).toBeGreaterThan(0);
    expect(recordedSessions[0].charactersCompleted).toBe(4);
  });
});
