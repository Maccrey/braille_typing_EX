// Authentication JavaScript for login functionality

// API base URL - use relative paths for production
const API_BASE_URL = '/api';

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

// Check if user is already logged in
async function checkAuthentication() {
    try {
        const isAuth = await apiClient.isAuthenticated();
        if (isAuth) {
            // User is already logged in, redirect to main page
            console.log('✅ User already authenticated, redirecting to main');
            window.location.href = 'main.html';
        }
    } catch (error) {
        console.log('Not authenticated, staying on login page');
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