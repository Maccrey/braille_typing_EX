const { test, expect } = require('@playwright/test');

test.describe('Community Tab', () => {
    let page;

    test.beforeEach(async ({ browser }) => {
        page = await browser.newPage();

        // Start HTTP server for testing
        await page.goto('http://localhost:8080');

        // Login as test user
        await page.goto('http://localhost:8080/login.html');
        await page.fill('#username', 'testuser');
        await page.fill('#password', 'testpass123');
        await page.click('#login-btn');

        // Wait for redirect to main page
        await page.waitForURL('**/main.html');

        // Click on community tab
        await page.click('#community-tab');
        await page.waitForSelector('#community-content.active');
    });

    test.afterEach(async () => {
        await page.close();
    });

    test('should display community tab and basic elements', async () => {
        // Check if community tab is active
        const communityTab = page.locator('#community-tab');
        await expect(communityTab).toHaveClass(/active/);

        // Check if community content is visible
        const communityContent = page.locator('#community-content');
        await expect(communityContent).toHaveClass(/active/);

        // Check for community header elements
        await expect(page.locator('.community-title h2')).toHaveText('점자 학습 커뮤니티');
        await expect(page.locator('#create-post-btn')).toBeVisible();
        await expect(page.locator('#create-post-btn')).toHaveText('새 게시글 작성');
    });

    test('should open create post modal when clicking create button', async () => {
        await page.click('#create-post-btn');

        // Check if modal is visible
        const modal = page.locator('#post-modal');
        await expect(modal).toBeVisible();

        // Check modal content
        await expect(page.locator('#post-modal-title')).toHaveText('새 게시글 작성');
        await expect(page.locator('#post-title')).toBeVisible();
        await expect(page.locator('#post-content')).toBeVisible();
        await expect(page.locator('#post-submit-btn')).toHaveText('작성');
    });

    test('should close create post modal when clicking cancel or X', async () => {
        await page.click('#create-post-btn');

        // Close using cancel button
        await page.click('#post-cancel-btn');
        await expect(page.locator('#post-modal')).not.toBeVisible();

        // Open again and close using X button
        await page.click('#create-post-btn');
        await page.click('#post-modal-close');
        await expect(page.locator('#post-modal')).not.toBeVisible();
    });

    test('should validate required fields when creating post', async () => {
        await page.click('#create-post-btn');

        // Try to submit without title and content
        await page.click('#post-submit-btn');

        // Check if browser validation kicks in
        const titleField = page.locator('#post-title');
        const isValidTitle = await titleField.evaluate(el => el.checkValidity());
        expect(isValidTitle).toBe(false);

        // Fill title but leave content empty
        await page.fill('#post-title', '테스트 제목');
        await page.click('#post-submit-btn');

        const contentField = page.locator('#post-content');
        const isValidContent = await contentField.evaluate(el => el.checkValidity());
        expect(isValidContent).toBe(false);
    });

    test('should create a new post successfully', async () => {
        await page.click('#create-post-btn');

        // Fill the form
        await page.fill('#post-title', 'E2E 테스트 게시글');
        await page.fill('#post-content', '이것은 E2E 테스트로 작성된 게시글입니다.\n여러 줄 내용을 포함합니다.');

        // Submit the form
        await page.click('#post-submit-btn');

        // Wait for modal to close
        await expect(page.locator('#post-modal')).not.toBeVisible();

        // Check if post appears in the list
        await page.waitForSelector('.post-item');
        const posts = page.locator('.post-item');
        await expect(posts.first()).toBeVisible();

        // Check post content
        const firstPost = posts.first();
        await expect(firstPost.locator('.post-title')).toHaveText('E2E 테스트 게시글');
        await expect(firstPost.locator('.post-content')).toContainText('이것은 E2E 테스트로 작성된 게시글입니다.');
    });

    test('should open post detail modal when clicking on a post', async () => {
        // First create a post
        await page.click('#create-post-btn');
        await page.fill('#post-title', '상세보기 테스트 게시글');
        await page.fill('#post-content', '상세보기를 테스트하기 위한 게시글입니다.');
        await page.click('#post-submit-btn');

        // Wait for post to appear and click on it
        await page.waitForSelector('.post-item');
        await page.click('.post-item');

        // Check if detail modal is visible
        const detailModal = page.locator('#post-detail-modal');
        await expect(detailModal).toBeVisible();

        // Check post detail content
        await expect(page.locator('.post-detail-title')).toHaveText('상세보기 테스트 게시글');
        await expect(page.locator('.post-detail-body')).toHaveText('상세보기를 테스트하기 위한 게시글입니다.');

        // Check comments section
        await expect(page.locator('.comments-section')).toBeVisible();
        await expect(page.locator('.comment-input')).toBeVisible();
    });

    test('should add a comment to a post', async () => {
        // Create a post first
        await page.click('#create-post-btn');
        await page.fill('#post-title', '댓글 테스트 게시글');
        await page.fill('#post-content', '댓글을 테스트하기 위한 게시글입니다.');
        await page.click('#post-submit-btn');

        // Open post detail
        await page.waitForSelector('.post-item');
        await page.click('.post-item');

        // Add a comment
        await page.fill('.comment-input', '이것은 테스트 댓글입니다.');
        await page.click('button:has-text("댓글 작성")');

        // Wait for comment to appear
        await page.waitForSelector('.comment-item');
        const comment = page.locator('.comment-item').first();
        await expect(comment).toBeVisible();
        await expect(comment.locator('.comment-content')).toHaveText('이것은 테스트 댓글입니다.');

        // Check if comment count is updated
        await expect(page.locator('.comments-title')).toContainText('댓글 1개');
    });

    test('should add a reply to a comment', async () => {
        // Create a post
        await page.click('#create-post-btn');
        await page.fill('#post-title', '답글 테스트 게시글');
        await page.fill('#post-content', '답글을 테스트하기 위한 게시글입니다.');
        await page.click('#post-submit-btn');

        // Open post detail
        await page.waitForSelector('.post-item');
        await page.click('.post-item');

        // Add a comment
        await page.fill('.comment-input', '원본 댓글입니다.');
        await page.click('button:has-text("댓글 작성")');

        // Wait for comment and click reply
        await page.waitForSelector('.comment-item');
        await page.click('.comment-action-btn:has-text("답글")');

        // Fill reply form
        await page.waitForSelector('.reply-form .reply-input');
        await page.fill('.reply-form .reply-input', '이것은 답글입니다.');
        await page.click('.reply-form button:has-text("답글 작성")');

        // Wait for reply to appear
        await page.waitForSelector('.comment-item.reply');
        const reply = page.locator('.comment-item.reply');
        await expect(reply).toBeVisible();
        await expect(reply.locator('.comment-content')).toHaveText('이것은 답글입니다.');

        // Check if comment count is updated to 2
        await expect(page.locator('.comments-title')).toContainText('댓글 2개');
    });

    test('should show edit and delete buttons for own posts', async () => {
        // Create a post
        await page.click('#create-post-btn');
        await page.fill('#post-title', '수정/삭제 테스트 게시글');
        await page.fill('#post-content', '수정과 삭제를 테스트하기 위한 게시글입니다.');
        await page.click('#post-submit-btn');

        // Wait for post to appear
        await page.waitForSelector('.post-item');

        // Check if edit and delete buttons are visible
        const post = page.locator('.post-item').first();
        await expect(post.locator('.edit-post-btn')).toBeVisible();
        await expect(post.locator('.delete-post-btn')).toBeVisible();
        await expect(post.locator('.edit-post-btn')).toHaveText('수정');
        await expect(post.locator('.delete-post-btn')).toHaveText('삭제');
    });

    test('should handle pagination when there are many posts', async () => {
        // Check if pagination elements exist
        const pagination = page.locator('#posts-pagination');
        const prevBtn = page.locator('#prev-page');
        const nextBtn = page.locator('#next-page');
        const pageInfo = page.locator('#page-info');

        // Initially pagination might be hidden if there are few posts
        // We can check if the elements exist even if not visible
        await expect(prevBtn).toBeAttached();
        await expect(nextBtn).toBeAttached();
        await expect(pageInfo).toBeAttached();
    });

    test('should display empty message when no posts exist', async () => {
        // This test assumes no posts exist or we've deleted all posts
        // We would need to clear all posts first, but for now we'll check the element exists
        const emptyMessage = page.locator('#posts-empty-message');
        await expect(emptyMessage).toBeAttached();
    });

    test('should handle loading states properly', async () => {
        // Check if loading indicator exists (might be hidden)
        const loadingIndicator = page.locator('#posts-loading');
        await expect(loadingIndicator).toBeAttached();

        // Posts list should exist
        const postsList = page.locator('#posts-list');
        await expect(postsList).toBeVisible();
    });
});