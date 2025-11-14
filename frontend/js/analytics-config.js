// Google Analytics 4 설정
// measurementId 값을 실제 GA4 측정 ID로 교체하면 자동으로 활성화됩니다.
(function initializeAnalyticsConfig() {
    const DEFAULT_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // TODO: 실제 측정 ID로 변경

    const userConfig = window.__ANALYTICS_CONFIG || {};
    const measurementId = userConfig.measurementId || DEFAULT_MEASUREMENT_ID;
    const enabled = typeof userConfig.enabled === 'boolean'
        ? userConfig.enabled
        : measurementId !== DEFAULT_MEASUREMENT_ID;

    window.__ANALYTICS_CONFIG = {
        measurementId,
        enabled,
        debugMode: typeof userConfig.debugMode === 'boolean'
            ? userConfig.debugMode
            : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'),
        dataLayerName: userConfig.dataLayerName || 'dataLayer'
    };
})();

