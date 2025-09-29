// 간단한 무한 루프 테스트
const { chromium } = require('playwright');

async function testLoginLoop() {
    console.log('🚀 Testing login redirect loop...');

    const browser = await chromium.launch({
        headless: false,
        devtools: true
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // 콘솔 로그 캡처
    page.on('console', msg => {
        console.log(`🖥️ [${msg.type()}]`, msg.text());
    });

    // 페이지 에러 캡처
    page.on('pageerror', error => {
        console.error('📛 Page error:', error.message);
    });

    try {
        console.log('📂 Loading index page...');
        await page.goto('http://localhost:8082/index.html', {
            waitUntil: 'networkidle',
            timeout: 10000
        });

        // 5초 기다려서 리디렉션 확인
        await page.waitForTimeout(5000);

        const currentUrl = page.url();
        console.log('🌐 Current URL after 5 seconds:', currentUrl);

        if (currentUrl.includes('index.html') || currentUrl.endsWith('/')) {
            console.log('✅ No infinite loop - stayed on index/home page');
        } else if (currentUrl.includes('main.html')) {
            console.log('✅ Successfully redirected to main page (user was authenticated)');
        } else if (currentUrl.includes('login.html')) {
            console.log('⚠️ Redirected to login page - checking for loop...');

            // login 페이지에서 5초 더 기다려서 또 리디렉션 되는지 확인
            await page.waitForTimeout(5000);
            const finalUrl = page.url();

            if (finalUrl === currentUrl) {
                console.log('✅ No infinite loop - stayed on login page');
            } else {
                console.log('❌ Infinite loop detected! Final URL:', finalUrl);
            }
        }

        console.log('🧪 Testing login functionality...');

        // 로그인 페이지로 이동
        await page.goto('http://localhost:8082/login.html');
        await page.waitForTimeout(1000);

        // 로그인 폼 확인
        const usernameInput = await page.$('#username');
        const passwordInput = await page.$('#password');
        const loginButton = await page.$('#login-button');

        if (usernameInput && passwordInput && loginButton) {
            console.log('✅ Login form elements found');

            // 테스트 로그인 시도
            await page.fill('#username', 'testuser');
            await page.fill('#password', 'testpass');

            console.log('🔐 Attempting login...');
            await page.click('#login-button');

            // 응답 기다리기
            await page.waitForTimeout(3000);

            const loginUrl = page.url();
            console.log('🌐 URL after login attempt:', loginUrl);

        } else {
            console.log('❌ Login form elements not found');
        }

    } catch (error) {
        console.error('❌ Test error:', error.message);
    } finally {
        await browser.close();
    }
}

testLoginLoop().catch(console.error);