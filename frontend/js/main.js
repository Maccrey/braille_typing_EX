
class MainMenu {
    constructor() {
        this.currentTab = 'my-categories';
        this.categories = [];
        this.favorites = [];
        this.allPublicCategories = [];
        this.searchResults = [];
        this.userStats = {};
        this.attendanceData = {};
        this.dailyRanking = [];
        this.currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
        this.currentUser = null;
        this.communityManager = new CommunityManager();
        this.init();
    }

    async init() {
        await this.checkAuth();
        this.setupEventListeners();
        this.loadInitialData();
    }

    async checkAuth() {
        try {
            const user = await window.apiClient.getCurrentUser();
            if (user) {
                this.currentUser = user;
                this.updateAdminButtonVisibility();
            } else {
                this.redirectToLogin();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.redirectToLogin();
        }
    }

    redirectToLogin() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = 'login.html';
    }

    setupEventListeners() {
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.performSearch(e.target.value);
            });
        }
        document.getElementById('prev-month').addEventListener('click', () => this.navigateMonth('prev'));
        document.getElementById('next-month').addEventListener('click', () => this.navigateMonth('next'));
    }

    async loadInitialData() {
        this.showLoading(true);
        try {
            await this.loadMyCategories();
            await this.loadUserStats();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('데이터 로딩에 실패했습니다.');
        } finally {
            this.showLoading(false);
        }
    }

    async loadMyCategories() {
        try {
            this.categories = await window.apiClient.getMyCategories();
            this.updateCategoryStats();
            this.renderCategories();
        } catch (error) {
            console.error('Error loading categories:', error);
            this.showError('카테고리를 불러오는데 실패했습니다.');
        }
    }

    async loadUserStats() {
        try {
            const stats = await window.apiClient.getUserStats();
            this.updatePracticeTimeDisplay(stats.total_practice_time);
        } catch (error) {
            console.error('Error loading user stats:', error);
            this.showError('사용자 통계를 불러오는데 실패했습니다.');
        }
    }

    async loadFavorites() {
        try {
            this.favorites = await window.apiClient.getFavorites();
            this.renderFavorites();
        } catch (error) {
            console.error('Error loading favorites:', error);
            this.showError('즐겨찾기를 불러오는데 실패했습니다.');
        }
    }

    async loadAllPublicCategories() {
        try {
            this.allPublicCategories = await window.apiClient.getPublicCategories();
            this.searchResults = this.allPublicCategories;
            this.renderSearchResults();
        } catch (error) {
            console.error('Error loading public categories:', error);
            this.showError('공개 카테고리를 불러오는데 실패했습니다.');
        }
    }

    performSearch(query) {
        if (!query) {
            this.searchResults = this.allPublicCategories;
        } else {
            const lowerCaseQuery = query.toLowerCase();
            this.searchResults = this.allPublicCategories.filter(category => {
                return category.name.toLowerCase().includes(lowerCaseQuery) || 
                       (category.description && category.description.toLowerCase().includes(lowerCaseQuery));
            });
        }
        this.renderSearchResults();
    }

    async loadAttendanceData() {
        try {
            this.attendanceData = await window.apiClient.getAttendance();
            this.renderAttendanceCalendar();
            await this.loadDailyRanking();
        } catch (error) {
            console.error('Error loading attendance data:', error);
            this.showError('출석 데이터를 불러오는데 실패했습니다.');
        }
    }

    renderAttendanceCalendar() {
        const calendarGrid = document.getElementById('calendar-grid');
        const currentMonthEl = document.getElementById('current-month');
        
        const year = parseInt(this.currentMonth.split('-')[0]);
        const month = parseInt(this.currentMonth.split('-')[1]);

        currentMonthEl.textContent = `${year}년 ${month}월`;

        const firstDay = new Date(year, month - 1, 1).getDay();
        const daysInMonth = new Date(year, month, 0).getDate();

        calendarGrid.innerHTML = '';

        for (let i = 0; i < firstDay; i++) {
            calendarGrid.innerHTML += `<div class="date-cell empty"></div>`;
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month - 1, i);
            const dateString = date.toISOString().split('T')[0];
            const isAttended = this.attendanceData.attendance_dates.includes(dateString);
            calendarGrid.innerHTML += `<div class="date-cell ${isAttended ? 'attended' : ''}">${i}</div>`;
        }
    }

    async loadDailyRanking() {
        const loadingEl = document.getElementById('ranking-loading');
        const listEl = document.getElementById('ranking-list');
        const emptyEl = document.getElementById('no-ranking-message');

        if (!loadingEl || !listEl || !emptyEl) {
            return;
        }

        loadingEl.style.display = 'block';
        emptyEl.style.display = 'none';
        listEl.innerHTML = '';

        try {
            this.dailyRanking = await window.apiClient.getDailyRanking(10);
            this.renderDailyRanking();
        } catch (error) {
            console.error('Error loading daily ranking:', error);
            listEl.innerHTML = '<div class="ranking-error">랭킹을 불러오는데 실패했습니다.</div>';
        } finally {
            loadingEl.style.display = 'none';
        }
    }

    renderDailyRanking() {
        const listEl = document.getElementById('ranking-list');
        const emptyEl = document.getElementById('no-ranking-message');

        if (!listEl || !emptyEl) {
            return;
        }

        if (!Array.isArray(this.dailyRanking) || this.dailyRanking.length === 0) {
            emptyEl.style.display = 'block';
            listEl.innerHTML = '';
            return;
        }

        emptyEl.style.display = 'none';

        listEl.innerHTML = this.dailyRanking.map(entry => {
            const durationText = this.formatDuration(entry.total_duration);
            const sessionText = `${entry.sessions || 0}회 연습`;
            const rankClass = entry.rank <= 3 ? ` top-3 rank-${entry.rank}` : '';
            const safeName = this.escapeHtml(entry.username || '사용자');
            return `
                <div class="ranking-item${rankClass}">
                    <div class="rank-number">${entry.rank}</div>
                    <div class="ranking-user-info">
                        <div class="ranking-username">${safeName}</div>
                        <div class="ranking-score">${sessionText} · ${durationText}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    formatDuration(totalSeconds = 0) {
        const seconds = Math.max(0, Math.floor(totalSeconds));
        const minutes = Math.floor(seconds / 60);
        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return `${hours}시간 ${remainingMinutes}분`;
        }
        return `${minutes}분`;
    }

    navigateMonth(direction) {
        const d = new Date(this.currentMonth + '-01');
        if (direction === 'prev') {
            d.setMonth(d.getMonth() - 1);
        } else {
            d.setMonth(d.getMonth() + 1);
        }
        this.currentMonth = d.toISOString().slice(0, 7);
        this.loadAttendanceData();
    }

    updatePracticeTimeDisplay(totalSeconds) {
        const totalMinutes = Math.round(totalSeconds / 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        let timeText;
        if (hours > 0) {
            timeText = `${hours}시간 ${minutes}분`;
        } else {
            timeText = `${minutes}분`;
        }
        document.getElementById('practice-time').textContent = timeText;
    }

    updateCategoryStats() {
        const totalCategories = this.categories.length;
        const totalCharacters = this.categories.reduce((sum, cat) => sum + (cat.braille_count || 0), 0);

        document.getElementById('total-categories').textContent = totalCategories;
        document.getElementById('total-characters').textContent = totalCharacters;
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
        const isOwnCategory = category.created_by === this.currentUser.uid;

        const favoriteButton = (type === 'search' && !isOwnCategory) ? `
            <button class="btn favorite-btn" onclick="mainMenu.toggleFavorite('${category.id}')">
                즐겨찾기 추가
            </button>
        ` : '';

        const practiceButton = `
            <button class="btn practice-btn" onclick="mainMenu.startPractice('${category.id}')">
                연습하기
            </button>
        `;

        const ownerButtons = type === 'my' ? `
            <div class="owner-actions">
                <button class="btn edit-btn" onclick="mainMenu.editCategory('${category.id}')">
                    수정
                </button>
                <button class="btn delete-btn" onclick="mainMenu.deleteCategory('${category.id}')">
                    삭제
                </button>
            </div>
        ` : '';

        return `
            <div class="category-item" data-category-id="${category.id}">
                <div class="category-name">${this.escapeHtml(category.name)}</div>
                <div class="category-description">${this.escapeHtml(category.description || '')}</div>
                <div class="category-count">${category.braille_count || 0}개 문자</div>
                <div class="category-actions">
                    ${favoriteButton}
                    ${practiceButton}
                    ${ownerButtons}
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text ?? '';
        return div.innerHTML;
    }

    startPractice(categoryId) {
        window.location.href = `practice.html?categoryId=${categoryId}`;
    }

    editCategory(categoryId) {
        console.log('editCategory not implemented yet', categoryId);
    }

    deleteCategory(categoryId) {
        console.log('deleteCategory not implemented yet', categoryId);
    }

    toggleFavorite(categoryId) {
        console.log('toggleFavorite not implemented yet', categoryId);
    }

    async logout() {
        try {
            if (window.apiClient && typeof window.apiClient.logout === 'function') {
                await window.apiClient.logout();
                return;
            }
            throw new Error('Logout API not available');
        } catch (error) {
            console.error('Logout failed, clearing session manually:', error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            sessionStorage.clear();
            window.location.href = 'login.html';
        }
    }

    updateAdminButtonVisibility() {
        const adminBtn = document.getElementById('admin-btn');
        if (this.currentUser && this.currentUser.role === 'admin') {
            adminBtn.style.display = 'inline-block';
        } else {
            adminBtn.style.display = 'none';
        }
    }

    showLoading(show) {
        const loadingIndicator = document.getElementById('loading-indicator');
        if(loadingIndicator) loadingIndicator.style.display = show ? 'block' : 'none';
    }

    showError(message) {
        const errorElement = document.getElementById('error-message');
        if(errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }
}

let mainMenu;

document.addEventListener('DOMContentLoaded', () => {
    mainMenu = new MainMenu();
});

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
    document.getElementById(`${tabName}-content`).classList.add('active');

    if (mainMenu) {
        mainMenu.currentTab = tabName;
        if (tabName === 'favorites') {
            mainMenu.loadFavorites();
        } else if (tabName === 'search') {
            mainMenu.loadAllPublicCategories();
        } else if (tabName === 'community') {
            mainMenu.communityManager.loadPosts();
        } else if (tabName === 'attendance') {
            mainMenu.loadAttendanceData();
        }
    }
}
