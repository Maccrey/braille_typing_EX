(function setupFirebaseAnalyticsHelpers() {
    if (typeof firebase === 'undefined' || typeof firebase.analytics !== 'function') {
        console.info('[Analytics] Firebase Analytics SDK가 로드되지 않았습니다.');
        return;
    }

    const analyticsInstance = firebase.analytics();
    if (!analyticsInstance) {
        console.warn('[Analytics] Firebase Analytics 인스턴스를 초기화할 수 없습니다.');
        return;
    }

    window.analytics = window.analytics || {
        trackEvent(eventName, params = {}) {
            if (!eventName) {
                console.warn('[Analytics] eventName이 필요합니다.');
                return;
            }
            analyticsInstance.logEvent(eventName, params);
        },
        setUserId(userId) {
            if (!userId) {
                return;
            }
            analyticsInstance.setUserId(userId);
        },
        setCurrentScreen(screenName) {
            if (!screenName) {
                return;
            }
            analyticsInstance.setCurrentScreen(screenName);
        }
    };
})();
