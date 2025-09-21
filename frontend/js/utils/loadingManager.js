// Loading state management utility for better UX

class LoadingManager {
  constructor() {
    this.activeRequests = new Set();
    this.loadingOverlay = null;
    this.init();
  }

  init() {
    // Create global loading overlay
    this.createLoadingOverlay();

    // Add loading styles
    this.addLoadingStyles();
  }

  createLoadingOverlay() {
    if (document.getElementById('global-loading-overlay')) {
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'global-loading-overlay';
    overlay.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <div class="loading-text">로딩 중...</div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.loadingOverlay = overlay;
  }

  addLoadingStyles() {
    if (document.getElementById('loading-styles')) {
      return;
    }

    const styles = document.createElement('style');
    styles.id = 'loading-styles';
    styles.textContent = `
      #global-loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        backdrop-filter: blur(2px);
      }

      #global-loading-overlay.active {
        display: flex;
      }

      .loading-spinner {
        background: white;
        padding: 2rem;
        border-radius: 10px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      }

      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .loading-text {
        color: #333;
        font-size: 0.9rem;
        font-weight: 500;
      }

      .btn-loading {
        position: relative;
        pointer-events: none;
        opacity: 0.7;
      }

      .btn-loading::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 16px;
        height: 16px;
        margin: -8px 0 0 -8px;
        border: 2px solid transparent;
        border-top: 2px solid currentColor;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      .skeleton {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
      }

      @keyframes loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      .loading-dots::after {
        content: '';
        animation: dots 1.5s steps(4, end) infinite;
      }

      @keyframes dots {
        0%, 20% { content: ''; }
        40% { content: '.'; }
        60% { content: '..'; }
        80%, 100% { content: '...'; }
      }
    `;

    document.head.appendChild(styles);
  }

  showGlobalLoading(text = '로딩 중...') {
    if (this.loadingOverlay) {
      const textElement = this.loadingOverlay.querySelector('.loading-text');
      if (textElement) {
        textElement.textContent = text;
      }
      this.loadingOverlay.classList.add('active');
    }
  }

  hideGlobalLoading() {
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.remove('active');
    }
  }

  setButtonLoading(button, isLoading, originalText = null) {
    if (!button) return;

    if (isLoading) {
      if (!button.hasAttribute('data-original-text')) {
        button.setAttribute('data-original-text', button.textContent);
      }
      button.textContent = originalText || '처리 중...';
      button.classList.add('btn-loading');
      button.disabled = true;
    } else {
      const original = button.getAttribute('data-original-text');
      if (original) {
        button.textContent = original;
        button.removeAttribute('data-original-text');
      }
      button.classList.remove('btn-loading');
      button.disabled = false;
    }
  }

  showSkeletonLoader(container, count = 3) {
    if (!container) return;

    const skeletons = Array.from({ length: count }, () =>
      '<div class="skeleton" style="height: 20px; margin: 10px 0; border-radius: 4px;"></div>'
    ).join('');

    container.innerHTML = `<div class="skeleton-container">${skeletons}</div>`;
  }

  hideSkeletonLoader(container) {
    if (!container) return;

    const skeletonContainer = container.querySelector('.skeleton-container');
    if (skeletonContainer) {
      skeletonContainer.remove();
    }
  }

  trackRequest(requestId) {
    this.activeRequests.add(requestId);
    if (this.activeRequests.size === 1) {
      this.showGlobalLoading();
    }
  }

  completeRequest(requestId) {
    this.activeRequests.delete(requestId);
    if (this.activeRequests.size === 0) {
      this.hideGlobalLoading();
    }
  }

  async wrapApiCall(apiCall, options = {}) {
    const requestId = Date.now() + Math.random();
    const {
      button = null,
      container = null,
      showGlobal = false,
      loadingText = '로딩 중...',
      showSkeleton = false
    } = options;

    try {
      // Start loading states
      if (showGlobal) {
        this.trackRequest(requestId);
      }

      if (button) {
        this.setButtonLoading(button, true, loadingText);
      }

      if (showSkeleton && container) {
        this.showSkeletonLoader(container);
      }

      // Execute API call
      const result = await apiCall();

      return result;

    } catch (error) {
      console.error('API call failed:', error);
      throw error;

    } finally {
      // Clean up loading states
      if (showGlobal) {
        this.completeRequest(requestId);
      }

      if (button) {
        this.setButtonLoading(button, false);
      }

      if (showSkeleton && container) {
        this.hideSkeletonLoader(container);
      }
    }
  }

  // Performance monitoring
  measurePerformance(name, fn) {
    return async (...args) => {
      const start = performance.now();
      try {
        const result = await fn(...args);
        const end = performance.now();
        console.log(`${name} took ${(end - start).toFixed(2)}ms`);
        return result;
      } catch (error) {
        const end = performance.now();
        console.log(`${name} failed after ${(end - start).toFixed(2)}ms`);
        throw error;
      }
    };
  }

  // Debounce utility for search inputs
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Throttle utility for scroll events
  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}

// Create global instance
const loadingManager = new LoadingManager();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LoadingManager;
} else {
  window.LoadingManager = LoadingManager;
  window.loadingManager = loadingManager;
}