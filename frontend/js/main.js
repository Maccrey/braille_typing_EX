// Main menu JavaScript functionality

// Helper function to get the correct API base URL
function getApiBaseUrl() {
    // For development (localhost)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3001';
    }

    // For file:// protocol (opening HTML files directly) - use production server
    if (window.location.protocol === 'file:') {
        return 'https://typing.maccrey.com';
    }

    // For production - use the same domain with no port
    return window.location.origin;
}

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
        console.log('🚀 MainMenu init starting...');
        console.log('🌐 Current URL:', window.location.href);
        console.log('🔍 Auth token exists:', !!localStorage.getItem('authToken'));

        // Check authentication before proceeding
        if (!this.authChecked) {
            await this.checkAuth();
            this.authChecked = true;
        }

        this.setupEventListeners();
        await this.loadInitialData();
    }

    async checkAuth() {
        try {
            console.log('🔍 Checking authentication...');

            // Check if we have a token
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.log('❌ No token found, redirecting to login');
                this.redirectToLogin();
                return;
            }

            // Validate token locally ONLY (same as index.html - proven working)
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const currentTime = Math.floor(Date.now() / 1000);

                if (payload.exp && payload.exp <= currentTime) {
                    console.log('❌ Token expired, redirecting to login');
                    this.redirectToLogin();
                    return;
                }

                // Token is valid, use local validation only
                console.log('✅ Token validated locally:', payload.username);
                this.currentUser = {
                    id: payload.userId,
                    username: payload.username,
                    role: payload.role || 'user'
                };

                // Show admin button if user is admin
                this.updateAdminButtonVisibility();

                // Skip server validation completely to avoid 401 loop
                console.log('✅ Authentication successful (local validation)');

            } catch (tokenError) {
                console.log('❌ Invalid token format, redirecting to login');
                this.redirectToLogin();
                return;
            }

        } catch (error) {
            console.error('Auth check failed:', error);
            console.log('❌ Auth check error, redirecting to login');
            this.redirectToLogin();
        }
    }

    redirectToLogin() {
        // Clear any stored auth data
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');

        // Always use relative path for better compatibility
        window.location.href = 'login.html';
    }

    setupEventListeners() {
        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());

        // Password change button
        document.getElementById('change-password-btn').addEventListener('click', () => this.showPasswordModal());

        // Admin button
        document.getElementById('admin-btn').addEventListener('click', () => this.showAdminModal());

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

        // Check-in/Check-out buttons
        const checkinBtn = document.getElementById('checkin-btn');
        const checkoutBtn = document.getElementById('checkout-btn');

        if (checkinBtn) {
            checkinBtn.addEventListener('click', () => this.handleCheckIn());
        }
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => this.handleCheckOut());
        }
    }

    async loadInitialData() {
        this.showLoading(true);
        try {
            // Try to load data, but don't fail if server is unreachable
            try {
                await this.loadMyCategories();
                await this.loadUserStats();
            } catch (serverError) {
                console.warn('⚠️ Server data loading failed, using fallback data:', serverError.message);
                // Set default/empty data
                this.categories = [];
                this.updateCategoryStats();
                this.renderCategories();

                // Set default stats
                document.getElementById('practice-time').textContent = '0분';
            }
            this.showLoading(false);
        } catch (error) {
            console.error('❌ Fatal error in loadInitialData:', error);
            this.showError('앱을 초기화하는데 문제가 발생했습니다.');
            this.showLoading(false);
        }
    }

    async loadMyCategories() {
        try {
            const token = localStorage.getItem('authToken');

            if (!token) {
                console.log('No auth token found, redirecting to login');
                this.redirectToLogin();
                return;
            }

            // Construct API URL dynamically based on environment
            const apiUrl = getApiBaseUrl() + '/api/protected/categories/my';

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.status === 401) {
                console.log('Unauthorized, removing invalid token and redirecting to login');
                this.redirectToLogin();
                return;
            }

            if (response.status === 503) {
                throw new Error('Service temporarily unavailable');
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch categories');
            }

            const data = await response.json();
            this.categories = data.categories;
            this.updateCategoryStats();
            this.renderCategories();
        } catch (error) {
            console.error('Error loading categories:', error);

            if (error.name === 'AbortError') {
                console.warn('⏰ Request timeout - server may be slow');
                this.showError('서버 응답이 지연되고 있습니다. 네트워크 연결을 확인해주세요.');
            } else if (error.message.includes('Service temporarily unavailable')) {
                this.showError('서비스가 일시적으로 중단되었습니다. 잠시 후 다시 시도해주세요.');
            } else {
                this.showError('카테고리를 불러오는데 실패했습니다.');
            }

            // Set empty categories as fallback
            this.categories = [];
            this.updateCategoryStats();
            this.renderCategories();

            throw error;
        }
    }

    async loadFavorites() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(getApiBaseUrl() + '/api/protected/favorites', {
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
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${getApiBaseUrl()}/api/protected/categories/search?q=${encodeURIComponent(query || '')}`, {
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

    async loadAllPublicCategories() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${getApiBaseUrl()}/api/protected/categories/search?q=`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load public categories');
            }

            const data = await response.json();
            this.searchResults = data.categories;
            this.renderSearchResults();
        } catch (error) {
            console.error('Error loading public categories:', error);
            this.showError('공개 카테고리를 불러오는데 실패했습니다.');
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
            if (!token) {
                console.warn('⚠️ No auth token found, using default stats');
                document.getElementById('practice-time').textContent = '0분';
                return;
            }

            console.log('🔄 Loading user stats from API...');
            // Construct API URL dynamically based on environment
            const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin;
            const apiUrl = baseUrl + '/api/profile/stats';
            console.log('🔗 Using API URL:', apiUrl);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout for production stability

            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                // Handle specific server errors
                if (response.status === 502) {
                    console.warn('🔧 Server temporarily unavailable (502). Using cached/default data.');
                    document.getElementById('practice-time').textContent = '0분';
                    return;
                }
                const errorText = await response.text();
                throw new Error(`API request failed: ${response.status} - ${errorText}`);
            }

            const stats = await response.json();
            console.log('📊 Received stats:', stats);

            // Validate stats object has required fields
            if (typeof stats !== 'object' || stats === null) {
                throw new Error('Invalid stats response format');
            }

            // Use the correct field name from API response
            const practiceTimeSeconds = stats.total_practice_time || 0;
            console.log('⏰ Practice time in seconds:', practiceTimeSeconds);

            this.updatePracticeTimeDisplay(practiceTimeSeconds);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('⏰ Request timeout - server may be down');
            } else {
                console.error('❌ Error loading user stats:', error);
            }
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
        const searchInput = document.getElementById('search-input');

        if (this.searchResults.length === 0) {
            container.innerHTML = '';
            if (searchInput && searchInput.value.trim()) {
                emptyMessage.textContent = '검색 결과가 없습니다. 다른 검색어를 시도해보세요.';
            } else {
                emptyMessage.textContent = '현재 공개된 카테고리가 없습니다.';
            }
            emptyMessage.style.display = 'block';
        } else {
            emptyMessage.style.display = 'none';
            container.innerHTML = this.searchResults.map(category => this.createCategoryHTML(category, 'search')).join('');
        }
    }

    createCategoryHTML(category, type) {
        // Check if user owns this category - don't show favorite button for own categories
        const currentUserId = this.getCurrentUserId();
        const isOwnCategory = category.created_by === currentUserId;

        const favoriteButton = (type === 'search' && !isOwnCategory) ? `
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
            const response = await fetch(getApiBaseUrl() + '/api/protected/favorites', {
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

            // Load monthly attendance data and daily ranking
            await Promise.all([
                this.loadMonthlyAttendance(this.currentMonth),
                this.loadDailyRanking()
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

    // Removed loadUserStatsForAttendance() - not needed for calendar display only

    async loadMonthlyAttendance(month) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${getApiBaseUrl()}/api/profile/attendance?month=${month}`, {
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

    // Removed updateStatsDisplay() function - no longer needed for calendar display only

    async loadDailyRanking(date = null) {
        try {
            const token = localStorage.getItem('authToken');
            const queryParam = date ? `?date=${date}` : '';
            const response = await fetch(`${getApiBaseUrl()}/api/profile/ranking/daily${queryParam}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch daily ranking');
            }

            this.dailyRanking = await response.json();
            console.log('🏆 Daily ranking response:', this.dailyRanking);
            this.renderDailyRanking();
        } catch (error) {
            console.error('Error loading daily ranking:', error);
            this.showRankingError();
        }
    }

    renderDailyRanking() {
        const rankingList = document.getElementById('ranking-list');
        const noRankingMessage = document.getElementById('no-ranking-message');
        const rankingTitle = document.getElementById('ranking-title');

        // Always update title with date if available
        if (this.dailyRanking && this.dailyRanking.date) {
            const dateStr = new Date(this.dailyRanking.date).toLocaleDateString('ko-KR', {
                month: 'long',
                day: 'numeric'
            });
            rankingTitle.textContent = `${dateStr} 사용자 랭킹`;
        }

        if (!this.dailyRanking || this.dailyRanking.ranking.length === 0) {
            rankingList.style.display = 'none';
            noRankingMessage.style.display = 'block';
            return;
        }

        noRankingMessage.style.display = 'none';
        rankingList.style.display = 'block';

        // Generate ranking HTML
        rankingList.innerHTML = this.dailyRanking.ranking.map(user => {
            const rankClass = user.rank <= 3 ? `top-3 rank-${user.rank}` : '';
            return `
                <div class="ranking-item ${rankClass}">
                    <div class="rank-number">${user.rank}</div>
                    <div class="ranking-user-info">
                        <div class="ranking-username">${user.username}</div>
                        <div class="ranking-score">${user.practice_time_text} (${user.practice_sessions}회)</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    showRankingLoading(show) {
        const loadingEl = document.getElementById('ranking-loading');
        if (loadingEl) {
            loadingEl.style.display = show ? 'block' : 'none';
        }
    }

    showRankingError() {
        const rankingList = document.getElementById('ranking-list');
        const noRankingMessage = document.getElementById('no-ranking-message');

        if (rankingList && noRankingMessage) {
            rankingList.style.display = 'none';
            noRankingMessage.style.display = 'block';
            noRankingMessage.textContent = '랭킹 데이터를 불러오는데 실패했습니다.';
        }
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

            // Add click event to show ranking for that date
            dateCell.addEventListener('click', () => {
                this.showRankingLoading(true);
                this.loadDailyRanking(cellDateStr).finally(() => {
                    this.showRankingLoading(false);
                });
            });

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

    getCurrentUserId() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) return null;

            // Decode JWT token to get user ID
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.userId;
        } catch (error) {
            console.error('Error decoding token:', error);
            return null;
        }
    }

    async deleteCategory(categoryId) {
        if (!confirm('정말로 이 카테고리를 삭제하시겠습니까? 모든 관련 데이터가 삭제되며 복구할 수 없습니다.')) {
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${getApiBaseUrl()}/api/protected/categories/${categoryId}`, {
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
            const response = await fetch(`${getApiBaseUrl()}/api/protected/categories/${categoryId}/braille-data`, {
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
                <textarea class="braille-description-input" placeholder="문자 설명 (선택사항)"
                         onchange="mainMenu.updateBrailleDescription(${index}, this.value)">${this.escapeHtml(item.description || '')}</textarea>
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
            braille_pattern: [[]],
            description: ''
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

    updateBrailleDescription(index, value) {
        if (this.currentBrailleData[index]) {
            this.currentBrailleData[index].description = value;
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
            const categoryResponse = await fetch(`${getApiBaseUrl()}/api/protected/categories/${this.currentEditingCategoryId}`, {
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
                const brailleResponse = await fetch(`${getApiBaseUrl()}/api/protected/categories/${this.currentEditingCategoryId}/braille-data`, {
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

    showSuccess(message) {
        console.log('Success:', message);
        alert(message); // You can replace this with a better notification system
    }

    async logout() {
        console.log('🔓 Logout button clicked');
        try {
            // Simple and reliable logout - clear all auth data and redirect
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            sessionStorage.clear();
            console.log('✅ Local logout completed');

            // Redirect to login page
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect even if cleanup fails
            window.location.href = 'login.html';
        }
    }

    // Password change functionality
    showPasswordModal() {
        const modal = document.getElementById('password-modal');
        modal.style.display = 'block';
        this.setupPasswordModalEventListeners();
    }

    hidePasswordModal() {
        const modal = document.getElementById('password-modal');
        modal.style.display = 'none';
        this.clearPasswordForm();
    }

    setupPasswordModalEventListeners() {
        // Close modal events
        const closeBtn = document.getElementById('password-modal-close');
        const cancelBtn = document.getElementById('password-cancel-btn');

        closeBtn.onclick = () => this.hidePasswordModal();
        cancelBtn.onclick = () => this.hidePasswordModal();

        // Form submit event
        const form = document.getElementById('password-change-form');
        form.onsubmit = (e) => this.handlePasswordChange(e);

        // Click outside to close
        const modal = document.getElementById('password-modal');
        modal.onclick = (e) => {
            if (e.target === modal) {
                this.hidePasswordModal();
            }
        };

        // Password toggle functionality
        this.setupPasswordToggle('current-password', 'current-password-toggle');
        this.setupPasswordToggle('new-password', 'new-password-toggle');
        this.setupPasswordToggle('confirm-password', 'confirm-password-toggle');
    }

    setupPasswordToggle(inputId, toggleId) {
        const passwordInput = document.getElementById(inputId);
        const passwordToggle = document.getElementById(toggleId);

        if (passwordInput && passwordToggle) {
            passwordToggle.onclick = () => {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);

                // Update icon
                passwordToggle.textContent = type === 'password' ? '👁️' : '🙈';
                passwordToggle.title = type === 'password' ? '비밀번호 보기' : '비밀번호 숨기기';
            };
        }
    }

    clearPasswordForm() {
        // Clear password values
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';

        // Reset password field types and icons to initial state
        const passwordFields = [
            { input: 'current-password', toggle: 'current-password-toggle' },
            { input: 'new-password', toggle: 'new-password-toggle' },
            { input: 'confirm-password', toggle: 'confirm-password-toggle' }
        ];

        passwordFields.forEach(({ input, toggle }) => {
            const passwordInput = document.getElementById(input);
            const passwordToggle = document.getElementById(toggle);

            if (passwordInput && passwordToggle) {
                passwordInput.setAttribute('type', 'password');
                passwordToggle.textContent = '👁️';
                passwordToggle.title = '비밀번호 보기';
            }
        });
    }

    async handlePasswordChange(e) {
        e.preventDefault();

        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            this.showError('모든 필드를 입력해주세요.');
            return;
        }

        if (newPassword.length < 6) {
            this.showError('새 패스워드는 최소 6자 이상이어야 합니다.');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showError('새 패스워드와 확인 패스워드가 일치하지 않습니다.');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                this.redirectToLogin();
                return;
            }

            const response = await fetch(`${getApiBaseUrl()}/api/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '패스워드 변경에 실패했습니다.');
            }

            this.showSuccess(data.message || '패스워드가 성공적으로 변경되었습니다.');
            this.hidePasswordModal();

        } catch (error) {
            console.error('Password change error:', error);
            this.showError(error.message || '패스워드 변경 중 오류가 발생했습니다.');
        }
    }

    // Admin functionality
    updateAdminButtonVisibility() {
        const adminBtn = document.getElementById('admin-btn');
        if (this.currentUser && this.currentUser.role === 'admin') {
            adminBtn.style.display = 'inline-block';
            console.log('✅ Admin button shown for admin user');
        } else {
            adminBtn.style.display = 'none';
            console.log('ℹ️ Admin button hidden for non-admin user');
        }
    }

    showAdminModal() {
        const modal = document.getElementById('admin-modal');
        modal.style.display = 'block';
        this.setupAdminModalEventListeners();
        this.loadAdminData();
    }

    hideAdminModal() {
        const modal = document.getElementById('admin-modal');
        modal.style.display = 'none';
    }

    setupAdminModalEventListeners() {
        // Close modal events
        const closeBtn = document.getElementById('admin-modal-close');
        const adminCloseBtn = document.getElementById('admin-close-btn');

        closeBtn.onclick = () => this.hideAdminModal();
        adminCloseBtn.onclick = () => this.hideAdminModal();

        // Download backup button
        const downloadBtn = document.getElementById('download-backup-btn');
        downloadBtn.onclick = () => this.downloadDatabaseBackup();

        // File upload elements
        this.setupFileUpload();

        // Click outside to close
        const modal = document.getElementById('admin-modal');
        modal.onclick = (e) => {
            if (e.target === modal) {
                this.hideAdminModal();
            }
        };
    }

    async loadAdminData() {
        try {
            // Load system stats and users list in parallel
            await Promise.all([
                this.loadSystemStats(),
                this.loadUsersList()
            ]);
        } catch (error) {
            console.error('Error loading admin data:', error);
            this.showError('관리자 데이터를 불러오는데 실패했습니다.');
        }
    }

    async loadSystemStats() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${getApiBaseUrl()}/api/admin/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load system stats');
            }

            const data = await response.json();
            this.renderSystemStats(data.stats);

        } catch (error) {
            console.error('Error loading system stats:', error);
            document.getElementById('system-stats').innerHTML =
                '<p style="color: #dc3545;">시스템 통계를 불러오는데 실패했습니다.</p>';
        }
    }

    renderSystemStats(stats) {
        const container = document.getElementById('system-stats');

        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${stats.users?.count || 0}</div>
                    <div class="stat-label">사용자</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.categories?.count || 0}</div>
                    <div class="stat-label">카테고리</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.braille_data?.count || 0}</div>
                    <div class="stat-label">점자 데이터</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.practice_logs?.count || 0}</div>
                    <div class="stat-label">연습 세션</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.posts?.count || 0}</div>
                    <div class="stat-label">게시글</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${Math.round((stats.totalPracticeTime || 0) / 60)}</div>
                    <div class="stat-label">총 연습시간(분)</div>
                </div>
            </div>
            ${stats.recentActivity ? `
                <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #ddd; margin-top: 15px;">
                    <h4 style="margin: 0 0 10px 0; color: #333;">최근 7일 활동</h4>
                    <p style="margin: 5px 0; color: #666;">연습 세션: ${stats.recentActivity.practiceSessionsLast7Days}회</p>
                    <p style="margin: 5px 0; color: #666;">연습 시간: ${Math.round(stats.recentActivity.practiceTimeLast7Days / 60)}분</p>
                </div>
            ` : ''}
        `;
    }

    async loadUsersList() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${getApiBaseUrl()}/api/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load users list');
            }

            const data = await response.json();
            this.renderUsersList(data.users);

        } catch (error) {
            console.error('Error loading users list:', error);
            document.getElementById('users-list').innerHTML =
                '<p style="color: #dc3545;">사용자 목록을 불러오는데 실패했습니다.</p>';
        }
    }

    renderUsersList(users) {
        const container = document.getElementById('users-list');

        if (!users || users.length === 0) {
            container.innerHTML = '<p style="color: #666;">등록된 사용자가 없습니다.</p>';
            return;
        }

        container.innerHTML = `
            <table class="users-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>사용자명</th>
                        <th>역할</th>
                        <th>가입일</th>
                        <th>최근 활동</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.id}</td>
                            <td>${this.escapeHtml(user.username)}</td>
                            <td>
                                <span class="role-badge ${user.role || 'user'}">
                                    ${user.role === 'admin' ? '관리자' : '사용자'}
                                </span>
                            </td>
                            <td>${user.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '-'}</td>
                            <td>${user.updated_at ? new Date(user.updated_at).toLocaleDateString('ko-KR') : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async downloadDatabaseBackup() {
        try {
            const token = localStorage.getItem('authToken');

            // Show loading state
            const downloadBtn = document.getElementById('download-backup-btn');
            const originalText = downloadBtn.textContent;
            downloadBtn.textContent = '📥 다운로드 중...';
            downloadBtn.disabled = true;

            const response = await fetch(`${getApiBaseUrl()}/api/admin/backup/download`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to download backup');
            }

            // Get the filename from response headers or create one
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'braille-typing-db-backup.json';

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            // Create download link
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            this.showSuccess('데이터베이스 백업 다운로드가 완료되었습니다.');

        } catch (error) {
            console.error('Error downloading database backup:', error);
            this.showError('데이터베이스 백업 다운로드에 실패했습니다.');
        } finally {
            // Restore button state
            const downloadBtn = document.getElementById('download-backup-btn');
            downloadBtn.textContent = '📥 데이터베이스 백업 다운로드';
            downloadBtn.disabled = false;
        }
    }

    setupFileUpload() {
        const fileInput = document.getElementById('backup-file-input');
        const dropZone = document.getElementById('file-drop-zone');
        const restoreBtn = document.getElementById('restore-backup-btn');
        const removeFileBtn = document.getElementById('remove-file-btn');

        // Click to select file
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        // Handle file selection
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files[0]);
        });

        // Drag and drop handlers
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelection(files[0]);
            }
        });

        // Remove file button
        removeFileBtn.addEventListener('click', () => {
            this.clearFileSelection();
        });

        // Restore button
        restoreBtn.addEventListener('click', () => {
            this.showRestoreConfirmation();
        });
    }

    handleFileSelection(file) {
        if (!file) return;

        // Validate file type
        if (!file.name.endsWith('.json') && file.type !== 'application/json') {
            this.showError('JSON 파일만 업로드할 수 있습니다.');
            return;
        }

        // Validate file size (50MB limit)
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showError('파일 크기는 50MB를 초과할 수 없습니다.');
            return;
        }

        this.selectedBackupFile = file;
        this.updateFileDisplay();
    }

    updateFileDisplay() {
        const dropZone = document.getElementById('file-drop-zone');
        const fileInfo = document.getElementById('selected-file-info');
        const fileName = document.getElementById('selected-file-name');
        const restoreBtn = document.getElementById('restore-backup-btn');

        if (this.selectedBackupFile) {
            dropZone.classList.add('has-file');
            fileInfo.style.display = 'flex';
            fileName.textContent = `📄 ${this.selectedBackupFile.name} (${this.formatFileSize(this.selectedBackupFile.size)})`;
            restoreBtn.style.display = 'inline-block';
        } else {
            dropZone.classList.remove('has-file');
            fileInfo.style.display = 'none';
            restoreBtn.style.display = 'none';
        }
    }

    clearFileSelection() {
        this.selectedBackupFile = null;
        document.getElementById('backup-file-input').value = '';
        this.updateFileDisplay();
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    showRestoreConfirmation() {
        const confirmMessage = `
데이터베이스 복구를 진행하시겠습니까?

⚠️ 주의사항:
- 현재 모든 데이터가 삭제됩니다
- 백업 파일의 데이터로 완전히 교체됩니다
- 이 작업은 되돌릴 수 없습니다

복구를 진행하려면 "확인"을 클릭하세요.
        `;

        if (confirm(confirmMessage)) {
            this.performDatabaseRestore();
        }
    }

    async performDatabaseRestore() {
        if (!this.selectedBackupFile) {
            this.showError('복구할 백업 파일을 선택해주세요.');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const restoreBtn = document.getElementById('restore-backup-btn');

            // Show loading state
            const originalText = restoreBtn.textContent;
            restoreBtn.textContent = '🔄 복구 중...';
            restoreBtn.disabled = true;

            // Create FormData
            const formData = new FormData();
            formData.append('backupFile', this.selectedBackupFile);

            const response = await fetch(`${getApiBaseUrl()}/api/admin/backup/restore`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || '데이터베이스 복구에 실패했습니다.');
            }

            const result = await response.json();

            // Show success message
            const successMessage = `
✅ 데이터베이스 복구가 완료되었습니다!

📊 복구 결과:
- 총 복구된 레코드: ${result.totalRecords}개
- 복구 완료 시간: ${new Date(result.restoredAt).toLocaleString('ko-KR')}

복구된 테이블:
${Object.entries(result.restoredTables).map(([table, count]) =>
    `  • ${table}: ${count}개`
).join('\n')}

페이지를 새로고침하여 변경사항을 확인하세요.
            `;

            alert(successMessage);

            // Clear file selection
            this.clearFileSelection();

            // Refresh admin data
            await this.loadAdminData();

        } catch (error) {
            console.error('Database restore error:', error);
            this.showError(error.message || '데이터베이스 복구 중 오류가 발생했습니다.');
        } finally {
            // Restore button state
            const restoreBtn = document.getElementById('restore-backup-btn');
            restoreBtn.textContent = '🔄 데이터베이스 복구 실행';
            restoreBtn.disabled = false;
        }
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
    } else if (tabName === 'search' && mainMenu) {
        mainMenu.loadAllPublicCategories();
    } else if (tabName === 'community' && communityManager) {
        communityManager.loadPosts();
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

// Handle both normal load and dynamic script load
function initMainMenu() {
    if (!mainMenu) {
        console.log('🚀 Initializing MainMenu...');
        mainMenu = new MainMenu();
    }
}

// If DOM is already loaded (dynamic script load), initialize immediately
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMainMenu);
} else {
    // DOM is already loaded, initialize immediately
    initMainMenu();
}