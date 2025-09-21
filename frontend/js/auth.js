// Authentication JavaScript for login functionality

// API base URL - adjust based on your backend setup
const API_BASE_URL = 'http://localhost:3000/api';

// DOM elements
const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');
const loadingIndicator = document.getElementById('loading');
const loginButton = document.getElementById('login-button');

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

        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Store authentication data
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));

            // Redirect to main page
            window.location.href = 'main.html';
        } else {
            // Handle API errors
            if (response.status === 401) {
                showError('잘못된 사용자명 또는 비밀번호입니다.');
            } else {
                showError(data.error || '로그인 중 오류가 발생했습니다.');
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
        hideLoading();
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
function checkAuthentication() {
    const token = localStorage.getItem('authToken');

    if (token) {
        // User is already logged in, redirect to main page
        window.location.href = 'main.html';
    }
}

// Initialize the page
function initializePage() {
    // Check if user is already logged in
    checkAuthentication();

    // Add form submission handler
    if (loginForm) {
        loginForm.addEventListener('submit', handleFormSubmit);
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