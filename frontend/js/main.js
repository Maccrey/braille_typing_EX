// Main menu JavaScript functionality
class MainMenu {
    constructor() {
        this.currentTab = 'my-categories';
        this.categories = [];
        this.favorites = [];
        this.searchResults = [];
        this.init();
    }

    async init() {
        this.checkAuth();
        this.setupEventListeners();
        await this.loadInitialData();
    }

    checkAuth() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
    }

    setupEventListeners() {
        // Logout button
        document.getElementById('logout-btn').addEventListener('click', this.logout);

        // Search input
        const searchInput = document.getElementById('search-input');
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.performSearch(e.target.value);
            }, 300);
        });
    }

    async loadInitialData() {
        this.showLoading(true);
        try {
            await this.loadMyCategories();
            this.showLoading(false);
        } catch (error) {
            this.showError('Failed to load categories. Please try again.');
            this.showLoading(false);
        }
    }

    async loadMyCategories() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('http://localhost:3000/api/protected/categories/my', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch categories');
            }

            const data = await response.json();
            this.categories = data.categories;
            this.updateCategoryStats();
            this.renderCategories();
        } catch (error) {
            console.error('Error loading categories:', error);
            throw error;
        }
    }

    async loadFavorites() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('http://localhost:3000/api/protected/favorites', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch favorites');
            }

            const data = await response.json();
            this.favorites = data.categories;
            this.renderFavorites();
        } catch (error) {
            console.error('Error loading favorites:', error);
            this.showError('Failed to load favorites');
        }
    }

    async performSearch(query) {
        if (!query.trim()) {
            this.searchResults = [];
            this.renderSearchResults();
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`http://localhost:3000/api/protected/categories/search?q=${encodeURIComponent(query)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to search categories');
            }

            const data = await response.json();
            this.searchResults = data.categories;
            this.renderSearchResults();
        } catch (error) {
            console.error('Error searching categories:', error);
            this.showError('Failed to search categories');
        }
    }

    updateCategoryStats() {
        const totalCategories = this.categories.length;
        const totalCharacters = this.categories.reduce((sum, cat) => sum + (cat.braille_count || 0), 0);

        document.getElementById('total-categories').textContent = totalCategories;
        document.getElementById('total-characters').textContent = totalCharacters;
        // Practice time would come from user stats API
        document.getElementById('practice-time').textContent = '0h';
    }

    renderCategories() {
        const container = document.getElementById('category-list');
        const emptyMessage = document.getElementById('empty-message');

        if (this.categories.length === 0) {
            container.innerHTML = '';
            emptyMessage.style.display = 'block';
        } else {
            emptyMessage.style.display = 'none';
            container.innerHTML = this.categories.map(category => this.createCategoryHTML(category, 'my')).join('');
        }
    }

    renderFavorites() {
        const container = document.getElementById('favorites-list');
        const emptyMessage = document.getElementById('favorites-empty-message');

        if (this.favorites.length === 0) {
            container.innerHTML = '';
            emptyMessage.style.display = 'block';
        } else {
            emptyMessage.style.display = 'none';
            container.innerHTML = this.favorites.map(category => this.createCategoryHTML(category, 'favorite')).join('');
        }
    }

    renderSearchResults() {
        const container = document.getElementById('search-results');
        const emptyMessage = document.getElementById('search-empty-message');

        if (this.searchResults.length === 0) {
            container.innerHTML = '';
            emptyMessage.style.display = 'block';
        } else {
            emptyMessage.style.display = 'none';
            container.innerHTML = this.searchResults.map(category => this.createCategoryHTML(category, 'search')).join('');
        }
    }

    createCategoryHTML(category, type) {
        const favoriteButton = type === 'search' ? `
            <button class="btn favorite-btn" onclick="mainMenu.toggleFavorite(${category.id})">
                Add to Favorites
            </button>
        ` : '';

        const practiceButton = `
            <button class="btn practice-btn" onclick="mainMenu.startPractice(${category.id})">
                Practice
            </button>
        `;

        return `
            <div class="category-item" data-category-id="${category.id}">
                <div class="category-name">${this.escapeHtml(category.name)}</div>
                <div class="category-description">${this.escapeHtml(category.description || '')}</div>
                <div class="category-count">${category.braille_count || 0} characters</div>
                <div class="category-actions">
                    ${favoriteButton}
                    ${practiceButton}
                </div>
            </div>
        `;
    }

    async toggleFavorite(categoryId) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('http://localhost:3000/api/protected/favorites', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ categoryId })
            });

            if (response.ok) {
                this.showSuccess('Category added to favorites!');
                // Refresh search results to update button state
                const searchInput = document.getElementById('search-input');
                if (searchInput.value.trim()) {
                    await this.performSearch(searchInput.value);
                }
            } else {
                const error = await response.json();
                this.showError(error.error || 'Failed to add to favorites');
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
            this.showError('Failed to add to favorites');
        }
    }

    startPractice(categoryId) {
        // Navigate to practice page with category ID
        window.location.href = `practice.html?categoryId=${categoryId}`;
    }

    showLoading(show) {
        const loadingIndicator = document.getElementById('loading-indicator');
        loadingIndicator.style.display = show ? 'block' : 'none';
    }

    showError(message) {
        const errorElement = document.getElementById('error-message');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }

    showSuccess(message) {
        // Create a temporary success message
        const successElement = document.createElement('div');
        successElement.className = 'error-message';
        successElement.style.background = '#4CAF50';
        successElement.textContent = message;
        successElement.style.display = 'block';

        const container = document.querySelector('.tab-content');
        container.insertBefore(successElement, container.firstChild);

        setTimeout(() => {
            successElement.remove();
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = 'login.html';
    }
}

// Tab switching functionality (global function called from HTML)
function switchTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Hide all content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Activate selected tab and content
    document.getElementById(`${tabName}-tab`).classList.add('active');
    document.getElementById(`${tabName}-content`).classList.add('active');

    // Load appropriate data
    if (tabName === 'favorites' && mainMenu) {
        mainMenu.loadFavorites();
    }

    // Update current tab
    if (mainMenu) {
        mainMenu.currentTab = tabName;
    }
}

// Initialize main menu when page loads
let mainMenu;
document.addEventListener('DOMContentLoaded', () => {
    mainMenu = new MainMenu();
});