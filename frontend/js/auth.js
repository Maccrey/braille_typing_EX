// Authentication JavaScript for login functionality

// Helper function to get the correct API base URL
function getApiBaseUrl() {
    // For development (localhost)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3001';
    }

    // For production - use the same domain
    return window.location.origin;
}

const API_BASE_URL = getApiBaseUrl() + '/api';

// DOM elements
const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');
const loadingIndicator = document.getElementById('loading');
const loginButton = document.getElementById('login-button');
const passwordInput = document.getElementById('password');
const passwordToggle = document.getElementById('password-toggle');

// Utility functions
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

function hideError() {
    errorMessage.style.display = 'none';
}

function showLoading() {
    loadingIndicator.style.display = 'block';
    loginButton.disabled = true;
}

function hideLoading() {
    loadingIndicator.style.display = 'none';
    loginButton.disabled = false;
}

// Validation functions
function validateForm(username, password) {
    if (!username && !password) {
        showError('사용자명과 비밀번호를 입력해주세요.');
        return false;
    }

    if (!username) {
        showError('사용자명을 입력해주세요.');
        return false;
    }

    if (!password) {
        showError('비밀번호를 입력해주세요.');
        return false;
    }

    return true;
}

// Login function
async function handleLogin(username, password) {
    try {
        showLoading();
        hideError();

        const data = await apiClient.login(username, password);

        // Redirect to main page
        window.location.href = 'main.html';

    } catch (error) {
        console.error('Login error:', error);
        if (error.message.includes('Invalid credentials')) {
            showError('잘못된 사용자명 또는 비밀번호입니다.');
        } else {
            showError(error.message || '네트워크 오류가 발생했습니다. 다시 시도해주세요.');
        }
    } finally {
        hideLoading();
    }
}

// Password toggle functionality
function togglePassword() {
    if (passwordInput && passwordToggle) {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);

        // Update icon
        passwordToggle.textContent = type === 'password' ? '👁️' : '🙈';
        passwordToggle.title = type === 'password' ? '비밀번호 보기' : '비밀번호 숨기기';
    }
}

// Form submission handler
function handleFormSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const username = formData.get('username') ? formData.get('username').trim() : '';
    const password = formData.get('password') ? formData.get('password').trim() : '';

    if (validateForm(username, password)) {
        handleLogin(username, password);
    }
}

// Check if user is already logged in with improved validation (무한 루프 방지 강화)
async function checkAuthentication() {
    console.log('🔐 Checking authentication on login page');
    const token = localStorage.getItem('authToken');

    if (!token || !token.includes('.')) {
        console.log('ℹ️ No valid token found, staying on login page');
        return;
    }

    try {
        console.log('🔍 Validating token structure...');
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);

        console.log('🕐 Token expiry check:', payload.exp, 'vs', currentTime);

        if (payload.exp && payload.exp <= currentTime) {
            console.log('⏰ Token expired, removing and staying on login page');
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            return;
        }

        console.log('✅ Token appears valid, checking with server...');

        // 타임아웃이 있는 서버 검증
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // Increased for production stability

        try {
            const authResponse = await fetch('/api/auth/user', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (authResponse.ok) {
                const userData = await authResponse.json();
                console.log('✅ User already authenticated:', userData.user?.username);
                console.log('🔄 Redirecting to main page...');

                // 무한 루프 방지를 위한 딜레이
                setTimeout(() => {
                    if (window.trackRedirect) {
                        window.trackRedirect('login.html', 'main.html');
                    }
                    window.location.href = 'main.html';
                }, 100);
            } else {
                console.log('❌ Server authentication failed:', authResponse.status);
                localStorage.removeItem('authToken');
                localStorage.removeItem('userData');
            }
        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                console.log('🚨 Authentication check timeout');
            } else {
                console.log('🚨 Server connection failed:', fetchError.message);
            }
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
        }
    } catch (error) {
        console.log('❌ Token parsing failed:', error.message);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
    }
}

// Initialize the page
function initializePage() {
    // Check if user is already logged in, ONLY on the login page
    const currentPath = window.location.pathname;
    if (currentPath.includes('login.html') || currentPath === '/' || currentPath === '/index.html') {
        checkAuthentication();
    }

    // Add form submission handler
    if (loginForm) {
        loginForm.addEventListener('submit', handleFormSubmit);
    }

    // Set up password toggle event listener
    if (passwordToggle) {
        passwordToggle.addEventListener('click', togglePassword);
    }

    // Focus on username input
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.focus();
    }
}

// Run initialization when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}