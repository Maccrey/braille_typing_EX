// 무한 루프 방지를 위한 강력한 보호 장치
(function() {
    'use strict';

    console.log('🛡️ Anti-loop protection loaded');

    // 페이지 전환 카운터
    let redirectCount = parseInt(localStorage.getItem('redirectCount') || '0');
    const MAX_REDIRECTS = 3;
    const RESET_TIME = 30000; // 30초

    // 타임스탬프 체크
    const lastRedirect = parseInt(localStorage.getItem('lastRedirect') || '0');
    const now = Date.now();

    // 30초가 지났으면 카운터 리셋
    if (now - lastRedirect > RESET_TIME) {
        redirectCount = 0;
        localStorage.setItem('redirectCount', '0');
    }

    // 최대 리디렉션 횟수 초과 시 루프 차단
    if (redirectCount >= MAX_REDIRECTS) {
        console.log('🚨 Too many redirects detected! Breaking infinite loop.');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('redirectCount');
        localStorage.removeItem('lastRedirect');

        // 강제로 로그인 페이지 표시
        if (window.location.pathname !== '/login.html') {
            window.location.href = '/login.html';
        }
        return;
    }

    // 리디렉션 추적 함수
    window.trackRedirect = function(from, to) {
        redirectCount++;
        localStorage.setItem('redirectCount', redirectCount.toString());
        localStorage.setItem('lastRedirect', Date.now().toString());
        console.log(`🔄 Redirect ${redirectCount}/${MAX_REDIRECTS}: ${from} → ${to}`);
    };

    // 페이지별 보호 로직
    const currentPath = window.location.pathname;

    if (currentPath === '/' || currentPath === '/index.html') {
        console.log('🏠 Index page protection active');

        // 5초 후에도 리디렉션이 안 됐으면 강제로 로그인 옵션 표시
        setTimeout(() => {
            const pageContent = document.getElementById('page-content');
            if (pageContent && pageContent.style.display === 'none') {
                console.log('🔧 Forcing login options display');
                pageContent.style.display = 'block';
                pageContent.style.opacity = '1';

                const appStatus = document.getElementById('app-status');
                if (appStatus) {
                    appStatus.innerHTML = '🎉 애플리케이션이 정상적으로 로드되었습니다!';
                }
            }
        }, 5000);
    }

    if (currentPath === '/main.html') {
        console.log('🏛️ Main page protection active');

        // 3초 후에도 인증이 안 됐으면 강제로 로그인으로 이동
        setTimeout(() => {
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.log('🔧 No auth token, forcing redirect to login');
                window.trackRedirect('main.html', 'login.html');
                window.location.href = '/login.html';
            }
        }, 3000);
    }

    if (currentPath === '/login.html') {
        console.log('🔐 Login page protection active');

        // 로그인 페이지에서는 리디렉션 카운터 리셋
        localStorage.setItem('redirectCount', '0');
    }

})();