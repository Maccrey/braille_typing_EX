// 로컬스토리지 완전 정리 도구
(function() {
    'use strict';

    // 전역 정리 함수
    window.clearAllStorage = function() {
        console.log('🧹 Starting complete storage cleanup...');

        // 1. 로컬스토리지 완전 삭제
        localStorage.clear();

        // 2. 세션스토리지 삭제
        sessionStorage.clear();

        // 3. 모든 쿠키 삭제
        document.cookie.split(";").forEach(function(c) {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });

        // 4. 확인 로그
        console.log('✅ All storage cleared successfully');
        console.log('📊 localStorage items:', localStorage.length);
        console.log('📊 sessionStorage items:', sessionStorage.length);

        return true;
    };

    // 자동 정리 함수 (문제가 있는 토큰만)
    window.cleanupAuth = function() {
        console.log('🔍 Checking for problematic auth data...');

        const token = localStorage.getItem('authToken');
        let needsCleanup = false;

        if (token) {
            try {
                // JWT 구조 검증
                const parts = token.split('.');
                if (parts.length !== 3) {
                    console.log('❌ Invalid JWT structure');
                    needsCleanup = true;
                } else {
                    // 만료 검증
                    const payload = JSON.parse(atob(parts[1]));
                    const now = Math.floor(Date.now() / 1000);

                    if (!payload.exp) {
                        console.log('❌ Token has no expiration');
                        needsCleanup = true;
                    } else if (payload.exp <= now) {
                        console.log('❌ Token is expired');
                        needsCleanup = true;
                    } else {
                        console.log('✅ Token appears valid');
                    }
                }
            } catch (error) {
                console.log('❌ Token parsing error:', error.message);
                needsCleanup = true;
            }
        }

        if (needsCleanup) {
            console.log('🧹 Cleaning up problematic auth data...');
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            localStorage.removeItem('redirectCount');
            localStorage.removeItem('lastRedirect');
            console.log('✅ Auth cleanup completed');
            return true;
        }

        console.log('ℹ️ No cleanup needed');
        return false;
    };

    // 페이지 로드 시 자동 체크
    console.log('🔧 Storage cleaner loaded');

    // URL에 ?clear=true가 있으면 강제 정리
    if (window.location.search.includes('clear=true')) {
        console.log('🚨 Force clear requested via URL parameter');
        window.clearAllStorage();

        // URL에서 파라미터 제거하고 새로고침
        const url = new URL(window.location);
        url.searchParams.delete('clear');
        window.history.replaceState({}, '', url);
        window.location.reload();
    }

})();