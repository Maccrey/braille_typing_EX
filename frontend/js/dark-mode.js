// Dark Mode Utility
class DarkModeManager {
    constructor() {
        this.theme = 'light';
        this.init();
    }

    init() {
        // Load saved theme from localStorage
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.theme = savedTheme;
        } else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.theme = prefersDark ? 'dark' : 'light';
        }

        this.applyTheme();
        this.setupSystemThemeListener();
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        document.body.setAttribute('data-theme', this.theme);
        localStorage.setItem('theme', this.theme);

        // Force update of all elements
        this.forceThemeUpdate();

        // Update toggle switches on all pages
        this.updateToggleSwitches();
    }

    forceThemeUpdate() {
        // Force recalculation of CSS variables
        const root = document.documentElement;
        root.style.setProperty('--force-update', Math.random());

        // Apply theme to all existing elements
        const allElements = document.querySelectorAll('*');
        allElements.forEach(element => {
            if (this.theme === 'dark') {
                element.setAttribute('data-theme', 'dark');
            } else {
                element.removeAttribute('data-theme');
            }
        });

        // Force repaint
        setTimeout(() => {
            root.style.removeProperty('--force-update');
        }, 100);
    }

    toggle() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme();
    }

    setTheme(theme) {
        if (theme === 'light' || theme === 'dark') {
            this.theme = theme;
            this.applyTheme();
        }
    }

    isDark() {
        return this.theme === 'dark';
    }

    setupSystemThemeListener() {
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            // Only auto-switch if user hasn't manually set a preference
            const manualTheme = localStorage.getItem('theme');
            if (!manualTheme) {
                this.theme = e.matches ? 'dark' : 'light';
                this.applyTheme();
            }
        });
    }

    updateToggleSwitches() {
        const toggleSwitches = document.querySelectorAll('.toggle-switch');
        toggleSwitches.forEach(toggle => {
            if (this.isDark()) {
                toggle.classList.add('active');
            } else {
                toggle.classList.remove('active');
            }

            if (!toggle.dataset.darkModeBound) {
                toggle.addEventListener('click', () => {
                    this.toggle();
                });
                toggle.dataset.darkModeBound = 'true';
            }
        });

        const toggleLabels = document.querySelectorAll('.toggle-label');
        toggleLabels.forEach(label => {
            label.textContent = this.isDark() ? '다크모드' : '라이트모드';
            if (!label.dataset.darkModeBound) {
                label.addEventListener('click', () => {
                    this.toggle();
                });
                label.dataset.darkModeBound = 'true';
            }
        });

        const toggleContainers = document.querySelectorAll('.dark-mode-toggle');
        toggleContainers.forEach(container => {
            if (!container.dataset.darkModeBound) {
                container.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        this.toggle();
                    }
                });
                container.setAttribute('tabindex', '0');
                container.dataset.darkModeBound = 'true';
            }
        });
    }

    createToggleSwitch() {
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'dark-mode-toggle';

        toggleContainer.innerHTML = `
            <span class="toggle-label">${this.isDark() ? '다크모드' : '라이트모드'}</span>
            <div class="toggle-switch ${this.isDark() ? 'active' : ''}">
                <div class="toggle-slider"></div>
            </div>
        `;

        const toggleSwitch = toggleContainer.querySelector('.toggle-switch');
        toggleSwitch.addEventListener('click', () => {
            this.toggle();
        });

        return toggleContainer;
    }

    // Method to add toggle switch to specific element
    addToggleToElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            const toggle = this.createToggleSwitch();
            element.appendChild(toggle);
        }
    }

    // Method to add toggle switch to navigation or header
    addToggleToNavigation() {
        // Try to find common navigation elements
        const nav = document.querySelector('nav, .navbar, .header, .top-bar');
        if (nav) {
            const toggle = this.createToggleSwitch();
            nav.appendChild(toggle);
        }
    }
}

// Global dark mode instance
window.darkModeManager = new DarkModeManager();

// Helper functions for easy access
window.toggleDarkMode = () => window.darkModeManager.toggle();
window.setDarkMode = (enabled) => window.darkModeManager.setTheme(enabled ? 'dark' : 'light');
window.isDarkMode = () => window.darkModeManager.isDark();

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Apply theme immediately on page load
    window.darkModeManager.applyTheme();

    // Watch for dynamic content changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (window.darkModeManager.isDark()) {
                        node.setAttribute('data-theme', 'dark');
                        // Apply to all child elements as well
                        const children = node.querySelectorAll('*');
                        children.forEach(child => {
                            child.setAttribute('data-theme', 'dark');
                        });
                    }
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});

// Export for modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DarkModeManager;
}
