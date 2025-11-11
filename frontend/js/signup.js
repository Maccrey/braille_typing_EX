
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const signupButton = document.getElementById('signup-button');
    const errorMessage = document.getElementById('error-message');
    const loadingIndicator = document.getElementById('loading');

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    function hideError() {
        errorMessage.style.display = 'none';
    }

    function showLoading() {
        loadingIndicator.style.display = 'block';
        signupButton.disabled = true;
    }

    function hideLoading() {
        loadingIndicator.style.display = 'none';
        signupButton.disabled = false;
    }

    async function handleSignup(email, password, confirmPassword) {
        if (password !== confirmPassword) {
            showError('비밀번호가 일치하지 않습니다.');
            return;
        }

        showLoading();
        hideError();

        try {
            const username = email
                .trim()
                .replace(/[^\u3131-\u318E\uAC00-\uD7AFa-zA-Z0-9_-]/g, '_'); // keep only allowed chars
            await window.apiClient.signup(email, password, username);
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

    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = emailInput.value;
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            handleSignup(email, password, confirmPassword);
        });
    }

    const passwordToggle = document.getElementById('password-toggle');
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', () => {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
            passwordToggle.textContent = isPassword ? '🙈' : '👁️';
        });
    }

    const confirmPasswordToggle = document.getElementById('confirm-password-toggle');
    if (confirmPasswordToggle && confirmPasswordInput) {
        confirmPasswordToggle.addEventListener('click', () => {
            const isPassword = confirmPasswordInput.getAttribute('type') === 'password';
            confirmPasswordInput.setAttribute('type', isPassword ? 'text' : 'password');
            confirmPasswordToggle.textContent = isPassword ? '🙈' : '👁️';
        });
    }
});
