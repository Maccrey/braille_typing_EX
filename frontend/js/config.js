// API 설정
const API_CONFIG = {
    // Development mode - use explicit backend URL
    // Production mode - use relative path (same domain)
    BASE_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:3001'
        : (window.location.protocol === 'file:')
            ? 'https://typing.maccrey.com'
            : window.location.origin,

    // API 엔드포인트
    ENDPOINTS: {
        AUTH: {
            LOGIN: '/api/auth/login',
            REGISTER: '/api/auth/register',
            REFRESH: '/api/auth/refresh'
        },
        PRACTICE: {
            LOG: '/api/practice/log',
            STATS: '/api/practice/stats'
        },
        PROFILE: {
            STATS: '/api/profile/stats',
            ATTENDANCE: '/api/profile/attendance'
        },
        PROTECTED: {
            CATEGORIES: '/api/protected/categories',
            BRAILLE_DATA: '/api/protected/braille-data',
            UPLOAD: '/api/protected/upload',
            DOWNLOAD_TEMPLATE: '/api/protected/download-template',
            FAVORITES: '/api/protected/favorites'
        },
        POSTS: {
            LIST: '/api/posts',
            CREATE: '/api/posts',
            DETAIL: '/api/posts'
        },
        COMMENTS: {
            LIST: '/api/comments',
            CREATE: '/api/comments'
        }
    }
};

// API 호출 헬퍼 함수
function getApiUrl(endpoint) {
    return API_CONFIG.BASE_URL + endpoint;
}

// 기존 코드와의 호환성을 위한 함수
function getApiBaseUrl() {
    // For development (localhost)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3001';
    }

    // For file:// protocol (opening HTML files directly) - use production server
    if (window.location.protocol === 'file:') {
        return 'https://typing.maccrey.com';
    }

    // For production - use the same domain
    return window.location.origin;
}