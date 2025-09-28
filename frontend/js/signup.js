const API_BASE_URL = '/api';

document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signup-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const submitButton = document.getElementById('signup-button');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    const loadingIndicator = document.getElementById('loading');
    const passwordStrength = document.getElementById('password-strength');
    const passwordToggle = document.getElementById('password-toggle');
    const confirmPasswordToggle = document.getElementById('confirm-password-toggle');

    // Form submission handler
    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Clear previous messages
        hideMessages();

        // Validate form
        const validationError = validateForm(username, password, confirmPassword);
        if (validationError) {
            showError(validationError);
            return;
        }

        // Show loading state
        setLoadingState(true);

        try {
            await handleSignup(username, password);
        } catch (error) {
            console.error('Signup error:', error);
        } finally {
            setLoadingState(false);
        }
    });

    // Real-time password validation
    passwordInput.addEventListener('input', function() {
        updatePasswordStrength(passwordInput.value);
        validatePasswordConfirmation();
    });

    // Real-time password confirmation validation
    confirmPasswordInput.addEventListener('input', function() {
        validatePasswordConfirmation();
    });

    // Real-time username validation
    usernameInput.addEventListener('input', function() {
        validateUsernameField();
    });

    // Password visibility toggle handlers
    passwordToggle.addEventListener('click', function() {
        togglePasswordVisibility(passwordInput, passwordToggle);
    });

    confirmPasswordToggle.addEventListener('click', function() {
        togglePasswordVisibility(confirmPasswordInput, confirmPasswordToggle);
    });

    function validateForm(username, password, confirmPassword) {
        if (!username && !password && !confirmPassword) {
            return '모든 필드를 입력해주세요.';
        }

        if (!username) {
            return '사용자명을 입력해주세요.';
        }

        if (username.length < 3) {
            return '사용자명은 3글자 이상이어야 합니다.';
        }

        if (!password) {
            return '비밀번호를 입력해주세요.';
        }

        if (password.length < 6) {
            return '비밀번호는 6글자 이상이어야 합니다.';
        }

        if (password !== confirmPassword) {
            return '비밀번호가 일치하지 않습니다.';
        }

        return null;
    }

    function validateUsernameField() {
        const username = usernameInput.value.trim();

        if (username.length === 0) {
            usernameInput.classList.remove('valid', 'invalid');
        } else if (username.length < 3) {
            usernameInput.classList.remove('valid');
            usernameInput.classList.add('invalid');
        } else {
            usernameInput.classList.remove('invalid');
            usernameInput.classList.add('valid');
        }
    }

    function validatePasswordConfirmation() {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (confirmPassword.length === 0) {
            confirmPasswordInput.classList.remove('valid', 'invalid');
        } else if (password === confirmPassword) {
            confirmPasswordInput.classList.remove('invalid');
            confirmPasswordInput.classList.add('valid');
        } else {
            confirmPasswordInput.classList.remove('valid');
            confirmPasswordInput.classList.add('invalid');
        }
    }

    function updatePasswordStrength(password) {
        if (password.length === 0) {
            passwordStrength.textContent = '';
            passwordStrength.className = 'password-strength';
            passwordInput.classList.remove('valid', 'invalid');
            return;
        }

        let strength = 0;
        const checks = [
            password.length >= 6,
            /[a-z]/.test(password),
            /[A-Z]/.test(password),
            /[0-9]/.test(password),
            /[^a-zA-Z0-9]/.test(password)
        ];

        strength = checks.filter(check => check).length;

        if (password.length < 6) {
            passwordStrength.textContent = '비밀번호가 너무 짧습니다';
            passwordStrength.className = 'password-strength weak';
            passwordInput.classList.remove('valid');
            passwordInput.classList.add('invalid');
        } else if (strength <= 2) {
            passwordStrength.textContent = '약함';
            passwordStrength.className = 'password-strength weak';
            passwordInput.classList.remove('invalid');
            passwordInput.classList.add('valid');
        } else if (strength <= 3) {
            passwordStrength.textContent = '보통';
            passwordStrength.className = 'password-strength medium';
            passwordInput.classList.remove('invalid');
            passwordInput.classList.add('valid');
        } else {
            passwordStrength.textContent = '강함';
            passwordStrength.className = 'password-strength strong';
            passwordInput.classList.remove('invalid');
            passwordInput.classList.add('valid');
        }
    }

    async function handleSignup(username, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    password
                })
            });

            const data = await response.json();

            if (response.ok) {
                showSuccess('회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.');

                // Redirect to login page after a short delay
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                // Handle specific error messages
                let errorMsg = '회원가입에 실패했습니다.';

                if (response.status === 400) {
                    if (data.error && data.error.includes('already exists')) {
                        errorMsg = '이미 존재하는 사용자명입니다.';
                    } else if (data.error) {
                        errorMsg = data.error;
                    }
                }

                showError(errorMsg);
            }
        } catch (error) {
            console.error('Network error:', error);
            showError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
        }
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
    }

    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
    }

    function hideMessages() {
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            submitButton.disabled = true;
            loadingIndicator.style.display = 'block';
        } else {
            submitButton.disabled = false;
            loadingIndicator.style.display = 'none';
        }
    }

    function togglePasswordVisibility(inputElement, toggleButton) {
        if (inputElement.type === 'password') {
            inputElement.type = 'text';
            toggleButton.textContent = '🙈';
            toggleButton.title = '비밀번호 숨기기';
        } else {
            inputElement.type = 'password';
            toggleButton.textContent = '👁️';
            toggleButton.title = '비밀번호 보기';
        }
    }
});