(function setupGoogleAnalytics() {
    const config = window.__ANALYTICS_CONFIG || {};
    const measurementId = config.measurementId;

    if (!config.enabled || !measurementId || measurementId === 'G-XXXXXXXXXX') {
        console.info('[Analytics] GA4 비활성화 상태입니다. measurementId를 설정하세요.');
        return;
    }

    const dataLayerName = config.dataLayerName || 'dataLayer';
    window[dataLayerName] = window[dataLayerName] || [];

    function gtag() {
        window[dataLayerName].push(arguments);
    }

    window.gtag = window.gtag || gtag;

    const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${measurementId}"]`);
    if (existingScript) {
        return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.onload = () => {
        gtag('js', new Date());
        gtag('config', measurementId, {
            send_page_view: false,
            debug_mode: !!config.debugMode
        });
        gtag('event', 'page_view', {
            page_location: window.location.href,
            page_path: window.location.pathname,
            page_title: document.title
        });
    };
    script.onerror = () => {
        console.error('[Analytics] GA4 스크립트를 불러오지 못했습니다.');
    };

    document.head.appendChild(script);

    window.analytics = window.analytics || {
        trackEvent(eventName, params = {}) {
            if (!eventName) {
                console.warn('[Analytics] eventName이 필요합니다.');
                return;
            }
            gtag('event', eventName, params);
        },
        setUserId(userId) {
            if (!userId) {
                return;
            }
            gtag('config', measurementId, { user_id: userId });
        }
    };
})();

