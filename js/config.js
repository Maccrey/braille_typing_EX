// API 설정
const API_CONFIG = {
    // Development mode - use explicit backend URL
    // Production mode - use relative path (same domain)
    BASE_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:3001' : window.location.origin,

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