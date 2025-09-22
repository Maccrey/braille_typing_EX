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
            await this.loadUserStats();
            this.showLoading(false);
        } catch (error) {
            this.showError('데이터를 불러오는데 실패했습니다. 다시 시도해주세요.');
            this.showLoading(false);
        }
    }

    async loadMyCategories() {
        try {
            const token = localStorage.getItem('authToken');

            if (!token) {
                console.log('No auth token found, redirecting to login');
                window.location.href = 'login.html';
                return;
            }

            const response = await fetch('http://localhost:3000/api/protected/categories/my', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                console.log('Unauthorized, removing invalid token and redirecting to login');
                localStorage.removeItem('authToken');
                localStorage.removeItem('userData');
                window.location.href = 'login.html';
                return;
            }

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
            this.showError('즐겨찾기를 불러오는데 실패했습니다.');
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
            this.showError('카테고리 검색에 실패했습니다.');
        }
    }

    updateCategoryStats() {
        const totalCategories = this.categories.length;
        const totalCharacters = this.categories.reduce((sum, cat) => sum + (cat.braille_count || 0), 0);

        document.getElementById('total-categories').textContent = totalCategories;
        document.getElementById('total-characters').textContent = totalCharacters;
    }

    async loadUserStats() {
        try {
            const token = localStorage.getItem('authToken');
            console.log('🔄 Loading user stats from API...');
            const response = await fetch('http://localhost:3000/api/profile/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load user stats');
            }

            const stats = await response.json();
            console.log('📊 Received stats:', stats);

            // Use the correct field name from API response
            const practiceTimeSeconds = stats.total_practice_time || 0;
            console.log('⏰ Practice time in seconds:', practiceTimeSeconds);

            this.updatePracticeTimeDisplay(practiceTimeSeconds);
        } catch (error) {
            console.error('❌ Error loading user stats:', error);
            // Show default value on error
            document.getElementById('practice-time').textContent = '0분';
        }
    }

    updatePracticeTimeDisplay(totalSeconds) {
        console.log('🔄 Updating practice time display with:', totalSeconds, 'seconds');

        const totalMinutes = Math.round(totalSeconds / 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        console.log('📊 Calculated time:', {
            totalSeconds,
            totalMinutes,
            hours,
            minutes
        });

        let timeText;
        if (hours > 0) {
            timeText = `${hours}시간 ${minutes}분`;
        } else {
            timeText = `${minutes}분`;
        }

        console.log('📝 Setting time display to:', timeText);
        const practiceTimeElement = document.getElementById('practice-time');

        if (practiceTimeElement) {
            practiceTimeElement.textContent = timeText;
            console.log('✅ Practice time display updated successfully');
        } else {
            console.error('❌ Could not find practice-time element');
        }
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
                즐겨찾기 추가
            </button>
        ` : '';

        const practiceButton = `
            <button class="btn practice-btn" onclick="mainMenu.startPractice(${category.id})">
                연습하기
            </button>
        `;

        // Owner buttons for my categories only
        const ownerButtons = type === 'my' ? `
            <div class="owner-actions">
                <button class="btn edit-btn" onclick="mainMenu.editCategory(${category.id})">
                    수정
                </button>
                <button class="btn delete-btn" onclick="mainMenu.deleteCategory(${category.id})">
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
                this.showSuccess('즐겨찾기에 추가되었습니다!');
                // Refresh search results to update button state
                const searchInput = document.getElementById('search-input');
                if (searchInput.value.trim()) {
                    await this.performSearch(searchInput.value);
                }
            } else {
                const error = await response.json();
                this.showError(error.error || '즐겨찾기 추가에 실패했습니다.');
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
            this.showError('즐겨찾기 추가에 실패했습니다.');
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
                this.loadUserStatsForAttendance(),
                this.loadMonthlyAttendance(this.currentMonth)
            ]);

            this.renderAttendanceCalendar();
            this.showAttendanceLoading(false);
        } catch (error) {
            console.error('Error loading attendance data:', error);
            this.showError('출석 데이터를 불러오는데 실패했습니다.');
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

    async loadUserStatsForAttendance() {
        try {
            const token = localStorage.getItem('authToken');
            console.log('🔄 Loading user stats for attendance...');
            const response = await fetch('http://localhost:3000/api/profile/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user stats');
            }

            this.userStats = await response.json();
            console.log('📊 Received attendance stats:', this.userStats);
            this.updateStatsDisplay();
        } catch (error) {
            console.error('❌ Error loading user stats for attendance:', error);
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
        console.log('📊 Updating attendance stats display with:', stats);

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

        console.log('📝 Setting attendance stats:', {
            practiceTimeText,
            avgTimeText,
            longestTimeText,
            attendanceDays: stats.total_attendance_days
        });

        const totalPracticeTimeEl = document.getElementById('total-practice-time');
        const totalAttendanceDaysEl = document.getElementById('total-attendance-days');
        const avgDailyPracticeEl = document.getElementById('average-daily-practice');

        if (totalPracticeTimeEl) {
            totalPracticeTimeEl.textContent = practiceTimeText;
        } else {
            console.error('❌ Could not find total-practice-time element');
        }

        if (totalAttendanceDaysEl) {
            totalAttendanceDaysEl.textContent = `${stats.total_attendance_days}일`;
        } else {
            console.error('❌ Could not find total-attendance-days element');
        }

        if (avgDailyPracticeEl) {
            avgDailyPracticeEl.textContent = avgTimeText;
        } else {
            console.error('❌ Could not find average-daily-practice element');
        }

        // Additional stats elements that might not exist in all views
        const longestSessionEl = document.getElementById('longest-session');
        const statsPeriodEl = document.getElementById('stats-period');

        if (longestSessionEl) {
            longestSessionEl.textContent = longestTimeText;
        }

        if (statsPeriodEl && stats.stats_period) {
            statsPeriodEl.textContent = stats.stats_period;
        }

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
            this.showError('월별 데이터를 불러오는데 실패했습니다.');
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

    async deleteCategory(categoryId) {
        if (!confirm('정말로 이 카테고리를 삭제하시겠습니까? 모든 관련 데이터가 삭제되며 복구할 수 없습니다.')) {
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`http://localhost:3000/api/protected/categories/${categoryId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.showSuccess('카테고리가 성공적으로 삭제되었습니다.');
                await this.loadMyCategories(); // Refresh the list
            } else {
                const error = await response.json();
                this.showError(error.error || '카테고리 삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            this.showError('카테고리 삭제에 실패했습니다.');
        }
    }

    async editCategory(categoryId) {
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) {
            this.showError('카테고리를 찾을 수 없습니다.');
            return;
        }

        // Populate the modal form
        document.getElementById('edit-category-name').value = category.name;
        document.getElementById('edit-category-description').value = category.description || '';
        document.getElementById('edit-category-public').checked = !!category.is_public;

        // Store category ID for submission
        this.currentEditingCategoryId = categoryId;

        // Show the modal
        this.showEditModal();

        // Load braille data
        await this.loadBrailleDataForEdit(categoryId);
    }

    showEditModal() {
        const modal = document.getElementById('edit-modal');
        modal.style.display = 'block';

        // Setup modal event listeners
        this.setupEditModalListeners();
    }

    hideEditModal() {
        const modal = document.getElementById('edit-modal');
        modal.style.display = 'none';
        this.currentEditingCategoryId = null;
        this.currentBrailleData = null;

        // Reset braille data container
        const container = document.getElementById('braille-data-container');
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">점자 데이터를 불러오는 중...</div>';
    }

    setupEditModalListeners() {
        // Close button
        document.getElementById('edit-modal-close').onclick = () => this.hideEditModal();

        // Cancel button
        document.getElementById('edit-cancel-btn').onclick = () => this.hideEditModal();

        // Click outside modal to close
        window.onclick = (event) => {
            const modal = document.getElementById('edit-modal');
            if (event.target === modal) {
                this.hideEditModal();
            }
        };

        // Add new braille item button
        document.getElementById('add-braille-item').onclick = () => this.addBrailleItem();

        // Form submission
        document.getElementById('edit-category-form').onsubmit = (e) => {
            e.preventDefault();
            this.submitCategoryEdit();
        };
    }

    async loadBrailleDataForEdit(categoryId) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`http://localhost:3000/api/protected/categories/${categoryId}/braille-data`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.currentBrailleData = data.brailleData;
                this.renderBrailleDataEditor();
            } else {
                throw new Error('Failed to load braille data');
            }
        } catch (error) {
            console.error('Error loading braille data:', error);
            this.showError('점자 데이터를 불러오는데 실패했습니다.');
        }
    }

    renderBrailleDataEditor() {
        const container = document.getElementById('braille-data-container');

        if (!this.currentBrailleData || this.currentBrailleData.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">점자 데이터가 없습니다.</div>';
            return;
        }

        container.innerHTML = this.currentBrailleData.map((item, index) => this.createBrailleItemHTML(item, index)).join('');
    }

    createBrailleItemHTML(item, index) {
        const blocksHTML = item.braille_pattern.map((block, blockIndex) => `
            <div class="braille-block" data-block-index="${blockIndex}">
                <div class="braille-block-header">
                    <span class="braille-block-title">블록 ${blockIndex + 1}</span>
                    <button type="button" class="braille-block-remove" onclick="mainMenu.removeBrailleBlock(${index}, ${blockIndex})">×</button>
                </div>
                <input type="text" class="braille-dots-input" value="${block.join(',')}"
                       placeholder="점 번호 (예: 1,2,3)"
                       onchange="mainMenu.updateBrailleBlock(${index}, ${blockIndex}, this.value)">
            </div>
        `).join('');

        return `
            <div class="braille-item" data-item-index="${index}">
                <div class="braille-item-header">
                    <span class="braille-item-title">문자: ${this.escapeHtml(item.character)}</span>
                    <button type="button" class="braille-remove-btn" onclick="mainMenu.removeBrailleItem(${index})">삭제</button>
                </div>
                <input type="text" class="braille-character-input" value="${this.escapeHtml(item.character)}"
                       placeholder="문자 입력"
                       onchange="mainMenu.updateBrailleCharacter(${index}, this.value)">
                <div class="braille-pattern-section">
                    ${blocksHTML}
                    <button type="button" class="add-braille-block" onclick="mainMenu.addBrailleBlock(${index})">+ 블록 추가</button>
                </div>
            </div>
        `;
    }

    addBrailleItem() {
        if (!this.currentBrailleData) {
            this.currentBrailleData = [];
        }

        this.currentBrailleData.push({
            character: '',
            braille_pattern: [[]]
        });

        this.renderBrailleDataEditor();
    }

    removeBrailleItem(index) {
        if (confirm('이 항목을 삭제하시겠습니까?')) {
            this.currentBrailleData.splice(index, 1);
            this.renderBrailleDataEditor();
        }
    }

    updateBrailleCharacter(index, value) {
        if (this.currentBrailleData[index]) {
            this.currentBrailleData[index].character = value;
        }
    }

    addBrailleBlock(itemIndex) {
        if (this.currentBrailleData[itemIndex]) {
            this.currentBrailleData[itemIndex].braille_pattern.push([]);
            this.renderBrailleDataEditor();
        }
    }

    removeBrailleBlock(itemIndex, blockIndex) {
        if (this.currentBrailleData[itemIndex] && this.currentBrailleData[itemIndex].braille_pattern.length > 1) {
            this.currentBrailleData[itemIndex].braille_pattern.splice(blockIndex, 1);
            this.renderBrailleDataEditor();
        } else {
            this.showError('적어도 하나의 블록이 필요합니다.');
        }
    }

    updateBrailleBlock(itemIndex, blockIndex, value) {
        if (this.currentBrailleData[itemIndex] && this.currentBrailleData[itemIndex].braille_pattern[blockIndex] !== undefined) {
            const dots = value.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d >= 1 && d <= 6);
            this.currentBrailleData[itemIndex].braille_pattern[blockIndex] = dots;
        }
    }

    async submitCategoryEdit() {
        const name = document.getElementById('edit-category-name').value.trim();
        const description = document.getElementById('edit-category-description').value.trim();
        const isPublic = document.getElementById('edit-category-public').checked;

        if (!name) {
            this.showError('카테고리 이름을 입력해주세요.');
            return;
        }

        if (name.length > 100) {
            this.showError('카테고리 이름은 100자 이하로 입력해주세요.');
            return;
        }

        // Validate braille data
        if (this.currentBrailleData) {
            for (let i = 0; i < this.currentBrailleData.length; i++) {
                const item = this.currentBrailleData[i];
                if (!item.character || !item.character.trim()) {
                    this.showError(`${i + 1}번째 항목의 문자를 입력해주세요.`);
                    return;
                }

                if (!item.braille_pattern || item.braille_pattern.length === 0) {
                    this.showError(`${i + 1}번째 항목의 점자 패턴을 입력해주세요.`);
                    return;
                }

                for (let j = 0; j < item.braille_pattern.length; j++) {
                    const block = item.braille_pattern[j];
                    if (!Array.isArray(block)) {
                        this.showError(`${i + 1}번째 항목의 ${j + 1}번째 블록이 올바르지 않습니다.`);
                        return;
                    }
                }
            }
        }

        try {
            const token = localStorage.getItem('authToken');

            // Update category information
            const categoryResponse = await fetch(`http://localhost:3000/api/protected/categories/${this.currentEditingCategoryId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    description,
                    isPublic
                })
            });

            if (!categoryResponse.ok) {
                const error = await categoryResponse.json();
                throw new Error(error.error || '카테고리 수정에 실패했습니다.');
            }

            // Update braille data if available
            if (this.currentBrailleData && this.currentBrailleData.length > 0) {
                const brailleResponse = await fetch(`http://localhost:3000/api/protected/categories/${this.currentEditingCategoryId}/braille-data`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        brailleData: this.currentBrailleData
                    })
                });

                if (!brailleResponse.ok) {
                    const error = await brailleResponse.json();
                    throw new Error(error.error || '점자 데이터 수정에 실패했습니다.');
                }
            }

            this.showSuccess('카테고리와 점자 데이터가 성공적으로 수정되었습니다.');
            this.hideEditModal();
            await this.loadMyCategories(); // Refresh the list

        } catch (error) {
            console.error('Error updating category:', error);
            this.showError(error.message || '카테고리 수정에 실패했습니다.');
        }
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