// 무한 루프 방지를 위한 강력한 보호 장치
(function() {
    'use strict';

    console.log('🛡️ Anti-loop protection loaded');

    // 즉시 문제가 있는 토큰 정리
    function cleanupBadTokens() {
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                // JWT 구조 체크
                const parts = token.split('.');
                if (parts.length !== 3) {
                    console.log('🗑️ Invalid token format, removing');
                    localStorage.clear();
                    return true;
                }

                // 페이로드 파싱 및 만료 체크
                const payload = JSON.parse(atob(parts[1]));
                const now = Math.floor(Date.now() / 1000);

                if (!payload.exp || payload.exp <= now) {
                    console.log('🗑️ Expired token detected, clearing all storage');
                    localStorage.clear();
                    sessionStorage.clear();
                    return true;
                }
            } catch (error) {
                console.log('🗑️ Token parsing failed, clearing all storage');
                localStorage.clear();
                sessionStorage.clear();
                return true;
            }
        }
        return false;
    }

    // 페이지 로드 시 즉시 실행
    const tokenWasCleaned = cleanupBadTokens();

    // 페이지 전환 카운터
    let redirectCount = parseInt(localStorage.getItem('redirectCount') || '0');
    const MAX_REDIRECTS = 2;  // 더 엄격하게 2번으로 제한
    const RESET_TIME = 20000; // 20초

    // 타임스탬프 체크
    const lastRedirect = parseInt(localStorage.getItem('lastRedirect') || '0');
    const now = Date.now();

    // 20초가 지났으면 카운터 리셋
    if (now - lastRedirect > RESET_TIME) {
        redirectCount = 0;
        localStorage.setItem('redirectCount', '0');
    }

    // 최대 리디렉션 횟수 초과 시 루프 차단
    if (redirectCount >= MAX_REDIRECTS) {
        console.log('🚨 Too many redirects detected! Breaking infinite loop.');
        localStorage.clear();
        sessionStorage.clear();

        // 강제로 로그인 페이지 표시
        if (window.location.pathname !== '/login.html') {
            alert('무한 루프가 감지되어 로그인 페이지로 이동합니다.');
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