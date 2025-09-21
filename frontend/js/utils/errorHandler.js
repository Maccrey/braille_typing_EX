// Global error handling utilities for frontend

class ErrorHandler {
  static showError(message, container = null, duration = 5000) {
    const errorContainer = container || document.getElementById('error-message');

    if (errorContainer) {
      errorContainer.textContent = message;
      errorContainer.style.display = 'block';

      // Auto-hide after duration
      if (duration > 0) {
        setTimeout(() => {
          this.hideError(container);
        }, duration);
      }
    } else {
      // Fallback to alert if no container
      alert(message);
    }
  }

  static hideError(container = null) {
    const errorContainer = container || document.getElementById('error-message');
    if (errorContainer) {
      errorContainer.style.display = 'none';
      errorContainer.textContent = '';
    }
  }

  static showSuccess(message, container = null, duration = 3000) {
    const successContainer = container || document.getElementById('success-message');

    if (successContainer) {
      successContainer.textContent = message;
      successContainer.style.display = 'block';

      // Auto-hide after duration
      if (duration > 0) {
        setTimeout(() => {
          this.hideSuccess(container);
        }, duration);
      }
    }
  }

  static hideSuccess(container = null) {
    const successContainer = container || document.getElementById('success-message');
    if (successContainer) {
      successContainer.style.display = 'none';
      successContainer.textContent = '';
    }
  }

  static hideAllMessages() {
    this.hideError();
    this.hideSuccess();
  }

  static handleApiError(error, response = null) {
    console.error('API Error:', error);

    let message = '오류가 발생했습니다. 다시 시도해주세요.';

    if (response) {
      if (response.status === 400) {
        message = '입력 정보를 확인해주세요.';
      } else if (response.status === 401) {
        message = '로그인이 필요합니다.';
        // Redirect to login if unauthorized
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 2000);
      } else if (response.status === 403) {
        message = '접근 권한이 없습니다.';
      } else if (response.status === 404) {
        message = '요청하신 정보를 찾을 수 없습니다.';
      } else if (response.status === 429) {
        message = '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
      } else if (response.status >= 500) {
        message = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      }

      // Try to extract detailed error message from response
      response.json().then(data => {
        if (data.error) {
          this.showError(data.error);
        } else {
          this.showError(message);
        }

        // Show validation details if available
        if (data.details && Array.isArray(data.details)) {
          const detailsText = data.details.join('\n');
          this.showError(`${data.error}\n\n상세 오류:\n${detailsText}`);
        }
      }).catch(() => {
        this.showError(message);
      });
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      message = '네트워크 연결을 확인해주세요.';
      this.showError(message);
    } else {
      this.showError(message);
    }
  }

  static async makeApiCall(url, options = {}) {
    try {
      // Add auth token if available
      const token = localStorage.getItem('authToken');
      if (token) {
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${token}`
        };
      }

      // Add default headers
      options.headers = {
        'Content-Type': 'application/json',
        ...options.headers
      };

      const response = await fetch(url, options);

      if (!response.ok) {
        this.handleApiError(null, response);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      this.handleApiError(error);
      throw error;
    }
  }

  static validateForm(rules, data) {
    const errors = [];

    for (const field in rules) {
      const rule = rules[field];
      const value = data[field];

      if (rule.required && (!value || value.toString().trim() === '')) {
        errors.push(rule.message || `${field} 항목은 필수입니다.`);
        continue;
      }

      if (value && rule.minLength && value.toString().length < rule.minLength) {
        errors.push(rule.message || `${field}은(는) ${rule.minLength}글자 이상이어야 합니다.`);
      }

      if (value && rule.maxLength && value.toString().length > rule.maxLength) {
        errors.push(rule.message || `${field}은(는) ${rule.maxLength}글자 이하여야 합니다.`);
      }

      if (value && rule.pattern && !rule.pattern.test(value)) {
        errors.push(rule.message || `${field} 형식이 올바르지 않습니다.`);
      }

      if (rule.custom && typeof rule.custom === 'function') {
        const customError = rule.custom(value, data);
        if (customError) {
          errors.push(customError);
        }
      }
    }

    if (errors.length > 0) {
      this.showError(errors.join('\n'));
      return false;
    }

    return true;
  }

  static setLoading(isLoading, button = null, loadingIndicator = null) {
    const loadingEl = loadingIndicator || document.getElementById('loading');

    if (button) {
      button.disabled = isLoading;
      if (isLoading) {
        button.setAttribute('data-original-text', button.textContent);
        button.textContent = '처리 중...';
      } else {
        button.textContent = button.getAttribute('data-original-text') || button.textContent;
      }
    }

    if (loadingEl) {
      loadingEl.style.display = isLoading ? 'block' : 'none';
    }
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorHandler;
} else {
  window.ErrorHandler = ErrorHandler;
}