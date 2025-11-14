(function setupFirebaseAnalyticsHelpers() {
    if (typeof firebase === 'undefined' || typeof firebase.analytics !== 'function') {
        console.info('[Analytics] Firebase Analytics SDK가 로드되지 않았습니다.');
        return;
    }

    let analyticsInstance = null;
    try {
        analyticsInstance = firebase.analytics();
    } catch (error) {
        console.warn('[Analytics] Firebase Analytics 초기화 실패:', error);
        return;
    }

    if (!analyticsInstance) {
        console.warn('[Analytics] Firebase Analytics 인스턴스를 초기화할 수 없습니다.');
        return;
    }

    const basePageParams = () => ({
        page_location: window.location.href,
        page_path: window.location.pathname + window.location.search,
        page_title: document.title || window.location.pathname
    });

    // 수동 page_view 로그 (GA4 실시간 확인용)
    analyticsInstance.logEvent('page_view', basePageParams());

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
        },
        logPageView(extraParams = {}) {
            analyticsInstance.logEvent('page_view', {
                ...basePageParams(),
                ...extraParams
            });
        }
    };
})();
