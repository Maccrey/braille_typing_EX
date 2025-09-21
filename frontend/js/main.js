// Main menu JavaScript functionality
class MainMenu {
    constructor() {
        this.currentTab = 'my-categories';
        this.categories = [];
        this.favorites = [];
        this.searchResults = [];
        this.userStats = {};
        this.attendanceData = {};
        this.currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
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

        // Month navigation buttons
        const prevMonthBtn = document.getElementById('prev-month');
        const nextMonthBtn = document.getElementById('next-month');

        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => this.navigateMonth('prev'));
        }
        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => this.navigateMonth('next'));
        }
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

    async loadAttendanceData() {
        try {
            this.showAttendanceLoading(true);

            // Set up month navigation event listeners when attendance tab is opened
            this.setupAttendanceEventListeners();

            // Load user stats and attendance data in parallel
            await Promise.all([
                this.loadUserStats(),
                this.loadMonthlyAttendance(this.currentMonth)
            ]);

            this.renderAttendanceCalendar();
            this.showAttendanceLoading(false);
        } catch (error) {
            console.error('Error loading attendance data:', error);
            this.showError('Failed to load attendance data');
            this.showAttendanceLoading(false);
        }
    }

    setupAttendanceEventListeners() {
        // Remove existing listeners first to avoid duplicates
        const prevMonthBtn = document.getElementById('prev-month');
        const nextMonthBtn = document.getElementById('next-month');

        if (prevMonthBtn && !prevMonthBtn.hasAttribute('data-listener-added')) {
            prevMonthBtn.addEventListener('click', () => this.navigateMonth('prev'));
            prevMonthBtn.setAttribute('data-listener-added', 'true');
        }
        if (nextMonthBtn && !nextMonthBtn.hasAttribute('data-listener-added')) {
            nextMonthBtn.addEventListener('click', () => this.navigateMonth('next'));
            nextMonthBtn.setAttribute('data-listener-added', 'true');
        }
    }

    async loadUserStats() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('http://localhost:3000/api/profile/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user stats');
            }

            this.userStats = await response.json();
            this.updateStatsDisplay();
        } catch (error) {
            console.error('Error loading user stats:', error);
            throw error;
        }
    }

    async loadMonthlyAttendance(month) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`http://localhost:3000/api/profile/attendance?month=${month}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch attendance data');
            }

            this.attendanceData = await response.json();
        } catch (error) {
            console.error('Error loading attendance data:', error);
            throw error;
        }
    }

    updateStatsDisplay() {
        const stats = this.userStats;

        // Format total practice time
        const totalHours = Math.floor(stats.total_practice_time / 3600);
        const totalMinutes = Math.floor((stats.total_practice_time % 3600) / 60);
        const practiceTimeText = totalHours > 0 ? `${totalHours}시간 ${totalMinutes}분` : `${totalMinutes}분`;

        // Format average daily practice
        const avgMinutes = Math.floor(stats.average_daily_practice / 60);
        const avgTimeText = `${avgMinutes}분`;

        // Format longest session
        const longestMinutes = Math.floor(stats.longest_session / 60);
        const longestTimeText = `${longestMinutes}분`;

        document.getElementById('total-practice-time').textContent = practiceTimeText;
        document.getElementById('total-attendance-days').textContent = `${stats.total_attendance_days}일`;
        document.getElementById('average-daily-practice').textContent = avgTimeText;
        document.getElementById('longest-session').textContent = longestTimeText;
        document.getElementById('stats-period').textContent = stats.stats_period;

        // Calculate and display streak information
        this.calculateStreakInfo();
    }

    calculateStreakInfo() {
        const attendanceDates = this.attendanceData.attendance_dates || [];
        if (attendanceDates.length === 0) {
            document.getElementById('current-streak').textContent = '0일';
            document.getElementById('longest-streak').textContent = '0일';
            return;
        }

        // Calculate current streak
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;

        const today = new Date();
        const sortedDates = attendanceDates.sort().reverse();

        // Check if practiced today or yesterday for current streak
        const todayStr = today.toISOString().slice(0, 10);
        const yesterdayStr = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        if (sortedDates.includes(todayStr) || sortedDates.includes(yesterdayStr)) {
            let streakDate = sortedDates.includes(todayStr) ? new Date(todayStr) : new Date(yesterdayStr);

            for (const dateStr of sortedDates) {
                const date = new Date(dateStr);
                const expectedDate = new Date(streakDate.getTime() - currentStreak * 24 * 60 * 60 * 1000);

                if (date.toISOString().slice(0, 10) === expectedDate.toISOString().slice(0, 10)) {
                    currentStreak++;
                } else {
                    break;
                }
            }
        }

        // Calculate longest streak
        tempStreak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
            const currentDate = new Date(sortedDates[i]);
            const prevDate = new Date(sortedDates[i - 1]);
            const dayDiff = (prevDate - currentDate) / (24 * 60 * 60 * 1000);

            if (dayDiff === 1) {
                tempStreak++;
            } else {
                longestStreak = Math.max(longestStreak, tempStreak);
                tempStreak = 1;
            }
        }
        longestStreak = Math.max(longestStreak, tempStreak);

        document.getElementById('current-streak').textContent = `${currentStreak}일`;
        document.getElementById('longest-streak').textContent = `${longestStreak}일`;
    }

    renderAttendanceCalendar() {
        const currentMonthDate = new Date(this.currentMonth + '-01');
        document.getElementById('current-month').textContent =
            `${currentMonthDate.getFullYear()}년 ${currentMonthDate.getMonth() + 1}월`;

        this.generateCalendarGrid();
        this.highlightAttendanceDates();
        this.showNoAttendanceMessage();
    }

    generateCalendarGrid() {
        const calendarGrid = document.getElementById('calendar-grid');
        const currentMonthDate = new Date(this.currentMonth + '-01');

        // Get first day of month and number of days
        const firstDay = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1);
        const lastDay = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

        // Clear existing grid
        calendarGrid.innerHTML = '';

        // Add weekday headers
        const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
        weekdays.forEach(day => {
            const header = document.createElement('div');
            header.className = 'weekday-header';
            header.textContent = day;
            calendarGrid.appendChild(header);
        });

        // Add empty cells for days before month starts
        for (let i = 0; i < startDayOfWeek; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'date-cell empty';
            calendarGrid.appendChild(emptyCell);
        }

        // Add date cells for the month
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);

        for (let day = 1; day <= daysInMonth; day++) {
            const dateCell = document.createElement('div');
            dateCell.className = 'date-cell';
            dateCell.textContent = day;
            dateCell.setAttribute('data-date', day);

            // Check if this is today
            const cellDateStr = `${this.currentMonth}-${day.toString().padStart(2, '0')}`;
            if (cellDateStr === todayStr) {
                dateCell.classList.add('current-date');
            }

            calendarGrid.appendChild(dateCell);
        }
    }

    highlightAttendanceDates() {
        const attendanceDates = this.attendanceData.attendance_dates || [];

        attendanceDates.forEach(dateStr => {
            const date = new Date(dateStr);
            if (dateStr.startsWith(this.currentMonth)) {
                const day = date.getDate();
                const dateCell = document.querySelector(`.date-cell[data-date="${day}"]`);
                if (dateCell) {
                    dateCell.classList.add('attended');
                }
            }
        });
    }

    showNoAttendanceMessage() {
        const attendanceDates = this.attendanceData.attendance_dates || [];
        const noAttendanceMessage = document.getElementById('no-attendance-message');

        if (attendanceDates.length === 0) {
            noAttendanceMessage.style.display = 'block';
        } else {
            noAttendanceMessage.style.display = 'none';
        }
    }

    async navigateMonth(direction) {
        const currentDate = new Date(this.currentMonth + '-01');
        if (direction === 'prev') {
            currentDate.setMonth(currentDate.getMonth() - 1);
        } else {
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        this.currentMonth = currentDate.toISOString().slice(0, 7);

        try {
            await this.loadMonthlyAttendance(this.currentMonth);
            this.renderAttendanceCalendar();
        } catch (error) {
            console.error('Error loading month data:', error);
            this.showError('Failed to load month data');
        }
    }

    showAttendanceLoading(show) {
        const loadingIndicator = document.getElementById('calendar-loading');
        if (loadingIndicator) {
            loadingIndicator.style.display = show ? 'block' : 'none';
        }
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
    } else if (tabName === 'attendance' && mainMenu) {
        mainMenu.loadAttendanceData();
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