
// Authentication JavaScript for login functionality

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const loadingIndicator = document.getElementById('loading');
    const loginButton = document.getElementById('login-button');
    const passwordInput = document.getElementById('password');
    const passwordToggle = document.getElementById('password-toggle');

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

    async function handleLogin(email, password) {
        if (!email || !password) {
            showError('이메일과 비밀번호를 모두 입력해주세요.');
            return;
        }

        showLoading();
        hideError();

        try {
            await window.apiClient.login(email, password);
            if (window.__TEST_MODE__) {
                window.__lastNavigationTarget = 'main.html';
            } else {
                window.location.href = 'main.html';
            }
        } catch (error) {
            showError(error.message);
        } finally {
            hideLoading();
        }
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginForm.email.value;
            const password = loginForm.password.value;
            handleLogin(email, password);
        });
    }

    if (passwordToggle) {
        passwordToggle.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            passwordToggle.textContent = type === 'password' ? '👁️' : '🙈';
        });
    }

    // Check if user is already logged in
            auth.onAuthStateChanged(user => {
                if (user) {
                    console.log('User is already logged in. Redirecting to main.html');
                    if (window.__TEST_MODE__) {
                        window.__lastNavigationTarget = 'main.html';
                    } else {
                        window.location.href = 'main.html';
                    }
                }
            });
});
