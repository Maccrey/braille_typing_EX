
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
        this.passwordAdInitialized = false;
        this.kakaoAdScriptAppended = false;
        this.currentEditingCategoryId = null;
        this.currentBrailleCount = 0;
        this.currentBrailleEntries = [];
        this.brailleFormMode = 'create';
        this.editingBrailleEntryId = null;
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
        this.setupPasswordModalEvents();
        this.setupEditModalEvents();
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
        const languageBadge = this.getCategoryLanguageBadge(category);

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
                <div class="category-name">${languageBadge}${this.escapeHtml(category.name)}</div>
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

    getCategoryLanguageBadge(category) {
        const code = this.getCategoryLanguageCode(category);
        if (!code) {
            return '';
        }
        const label = this.getCategoryLanguageLabel(category);
        const titleAttr = label ? ` title="${this.escapeHtml(label)}"` : '';
        return `<span class="category-language-tag"${titleAttr}>${this.escapeHtml(code)}</span>`;
    }

    getCategoryLanguageCode(category) {
        if (!category) {
            return '';
        }
        const rawCode = category.language_code || category.languageCode || category.language?.code || category.country_code || category.countryCode;
        if (!rawCode || typeof rawCode !== 'string') {
            return '';
        }
        return rawCode.trim().toUpperCase().slice(0, 5);
    }

    getCategoryLanguageLabel(category) {
        if (!category) {
            return '';
        }
        const rawLabel = category.language_label || category.languageLabel || category.language?.label || category.language?.name;
        if (!rawLabel || typeof rawLabel !== 'string') {
            return '';
        }
        return rawLabel.trim();
    }

    setupPasswordModalEvents() {
        const openBtn = document.getElementById('change-password-btn');
        if (openBtn) {
            openBtn.addEventListener('click', () => this.openPasswordModal());
        }

        const closeBtn = document.getElementById('password-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closePasswordModal());
        }

        const cancelBtn = document.getElementById('password-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closePasswordModal());
        }

        const modal = document.getElementById('password-modal');
        if (modal) {
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    this.closePasswordModal();
                }
            });
        }

        const form = document.getElementById('password-change-form');
        if (form) {
            form.addEventListener('submit', (event) => this.handlePasswordChange(event));
        }

        document.querySelectorAll('.password-toggle').forEach(toggleBtn => {
            toggleBtn.addEventListener('click', () => this.togglePasswordVisibility(toggleBtn));
        });
    }

    openPasswordModal() {
        const modal = document.getElementById('password-modal');
        if (!modal) return;
        this.resetPasswordForm();
        modal.style.display = 'block';
        this.initializePasswordAdSlot();
    }

    closePasswordModal() {
        const modal = document.getElementById('password-modal');
        if (!modal) return;
        modal.style.display = 'none';
        this.resetPasswordForm();
    }

    resetPasswordForm() {
        const form = document.getElementById('password-change-form');
        if (form) {
            form.reset();
            form.querySelectorAll('input[type="text"]').forEach(input => {
                input.type = 'password';
            });
        }
    }

    initializePasswordAdSlot() {
        if (this.passwordAdInitialized) {
            return;
        }

        const slot = document.getElementById('password-kakao-ad');
        if (!slot) {
            return;
        }

        const isMobile = window.matchMedia('(max-width: 600px)').matches;
        const config = isMobile
            ? { unit: 'DAN-VRHTV0WQziQ2VDGz', width: 320, height: 50 }
            : { unit: 'DAN-Briry0jF71lQmw1Y', width: 728, height: 90 };

        slot.innerHTML = `
            <ins class="kakao_ad_area"
                style="display:block;width:${config.width}px;height:${config.height}px;max-width:100%;margin:0 auto;"
                data-ad-unit="${config.unit}"
                data-ad-width="${config.width}"
                data-ad-height="${config.height}"></ins>
        `;

        this.loadKakaoAdScript();
        this.passwordAdInitialized = true;
    }

    loadKakaoAdScript() {
        if (this.kakaoAdScriptAppended) {
            return;
        }

        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = '//t1.daumcdn.net/kas/static/ba.min.js';
        script.async = true;
        script.dataset.kakaoAdScript = 'password';

        script.onerror = () => {
            console.error('Failed to load Kakao ad script for password modal.');
            this.kakaoAdScriptAppended = false;
            this.passwordAdInitialized = false;
            script.remove();
        };

        document.body.appendChild(script);
        this.kakaoAdScriptAppended = true;
    }

    async handlePasswordChange(event) {
        event.preventDefault();

        const currentPasswordInput = document.getElementById('current-password');
        const newPasswordInput = document.getElementById('new-password');
        const confirmPasswordInput = document.getElementById('confirm-password');
        const submitBtn = document.getElementById('password-submit-btn');

        if (!currentPasswordInput || !newPasswordInput || !confirmPasswordInput || !submitBtn) {
            return;
        }

        const currentPassword = currentPasswordInput.value.trim();
        const newPassword = newPasswordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        if (!currentPassword || !newPassword || !confirmPassword) {
            alert('모든 필드를 입력해주세요.');
            return;
        }

        if (newPassword.length < 6) {
            alert('새 패스워드는 6자 이상이어야 합니다.');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('새 패스워드가 일치하지 않습니다.');
            return;
        }

        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '변경 중...';

        try {
            await window.apiClient.changePassword(currentPassword, newPassword);
            alert('패스워드가 변경되었습니다.');
            this.closePasswordModal();
        } catch (error) {
            console.error('Password change failed:', error);
            alert(error.message || '패스워드 변경에 실패했습니다.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    togglePasswordVisibility(button) {
        if (!button) return;
        const container = button.closest('.password-input-container');
        if (!container) return;
        const input = container.querySelector('input');
        if (!input) return;

        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        button.setAttribute('aria-pressed', String(isPassword));
    }

    startPractice(categoryId) {
        window.location.href = `practice.html?categoryId=${categoryId}`;
    }

    editCategory(categoryId) {
        this.openCategoryEditModal(categoryId);
    }

    deleteCategory(categoryId) {
        this.confirmAndDeleteCategory(categoryId);
    }

    toggleFavorite(categoryId) {
        console.log('toggleFavorite not implemented yet', categoryId);
    }

    setupEditModalEvents() {
        const modal = document.getElementById('edit-modal');
        const closeBtn = document.getElementById('edit-modal-close');
        const cancelBtn = document.getElementById('edit-cancel-btn');
        const form = document.getElementById('edit-category-form');
        const addBrailleBtn = document.getElementById('add-braille-item');
        const addBrailleCancelBtn = document.getElementById('braille-add-cancel');
        const addBrailleSaveBtn = document.getElementById('braille-add-save');
        const braillePatternInput = document.getElementById('braille-pattern-input');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeEditModal());
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeEditModal());
        }
        if (modal) {
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    this.closeEditModal();
                }
            });
        }
        if (form) {
            form.addEventListener('submit', (event) => this.handleCategoryUpdate(event));
        }
        if (addBrailleBtn) {
            addBrailleBtn.addEventListener('click', () => {
                if (this.isBrailleFormVisible() && this.brailleFormMode === 'create') {
                    this.closeBrailleForm();
                } else {
                    this.openBrailleForm('create');
                }
            });
        }
        if (addBrailleCancelBtn) {
            addBrailleCancelBtn.addEventListener('click', () => this.closeBrailleForm());
        }
        if (addBrailleSaveBtn) {
            addBrailleSaveBtn.addEventListener('click', () => this.handleBrailleAddSubmit());
        }
        if (braillePatternInput) {
            braillePatternInput.addEventListener('input', (event) => this.updateBraillePatternPreview(event.target.value));
            this.updateBraillePatternPreview(braillePatternInput.value);
        }
    }

    isBrailleFormVisible() {
        const form = document.getElementById('braille-add-form');
        return form ? form.dataset.visible === 'true' : false;
    }

    openBrailleForm(mode = 'create', entry = null) {
        const form = document.getElementById('braille-add-form');
        const button = document.getElementById('add-braille-item');
        const characterInput = document.getElementById('braille-character-input');
        const patternInput = document.getElementById('braille-pattern-input');
        const descriptionInput = document.getElementById('braille-description-input');
        const statusText = document.getElementById('braille-form-status');
        const saveBtn = document.getElementById('braille-add-save');

        if (!form) {
            return;
        }

        form.style.display = 'block';
        form.dataset.visible = 'true';
        form.dataset.mode = mode;
        form.dataset.entryId = entry?.id || '';

        this.brailleFormMode = mode;
        this.editingBrailleEntryId = mode === 'edit' ? (entry?.id || null) : null;

        if (mode === 'edit' && entry) {
            if (characterInput) {
                characterInput.value = entry.character || '';
            }
            if (patternInput) {
                patternInput.value = this.patternArrayToInputValue(entry.braille_pattern);
            }
            if (descriptionInput) {
                descriptionInput.value = entry.description || '';
            }
        } else {
            this.resetBrailleAddForm();
        }

        if (statusText) {
            statusText.textContent = mode === 'edit' ? '선택한 항목을 수정합니다.' : '새 항목을 추가합니다.';
        }
        if (saveBtn) {
            saveBtn.textContent = mode === 'edit' ? '항목 수정' : '항목 추가';
        }
        if (button) {
            button.dataset.originalLabel = button.dataset.originalLabel || button.textContent;
            button.textContent = mode === 'edit' ? '수정 취소' : '입력창 닫기';
        }

        if (patternInput) {
            this.updateBraillePatternPreview(patternInput.value);
        }
    }

    closeBrailleForm() {
        const form = document.getElementById('braille-add-form');
        const button = document.getElementById('add-braille-item');
        const statusText = document.getElementById('braille-form-status');
        const saveBtn = document.getElementById('braille-add-save');
        if (!form) {
            return;
        }

        form.style.display = 'none';
        form.dataset.visible = 'false';
        form.dataset.mode = 'create';
        form.dataset.entryId = '';
        this.brailleFormMode = 'create';
        this.editingBrailleEntryId = null;
        this.resetBrailleAddForm();
        this.updateBraillePatternPreview('');

        if (statusText) {
            statusText.textContent = '새 항목을 추가합니다.';
        }
        if (saveBtn) {
            saveBtn.textContent = '항목 추가';
        }
        if (button && button.dataset.originalLabel) {
            button.textContent = button.dataset.originalLabel;
        }
    }

    resetBrailleAddForm() {
        const characterInput = document.getElementById('braille-character-input');
        const patternInput = document.getElementById('braille-pattern-input');
        const descriptionInput = document.getElementById('braille-description-input');
        if (characterInput) {
            characterInput.value = '';
        }
        if (patternInput) {
            patternInput.value = '';
        }
        if (descriptionInput) {
            descriptionInput.value = '';
        }
    }

    async handleBrailleAddSubmit() {
        if (!this.currentEditingCategoryId) {
            alert('먼저 카테고리를 불러온 뒤 다시 시도해주세요.');
            return;
        }

        const characterInput = document.getElementById('braille-character-input');
        const patternInput = document.getElementById('braille-pattern-input');
        const descriptionInput = document.getElementById('braille-description-input');
        const saveBtn = document.getElementById('braille-add-save');
        const form = document.getElementById('braille-add-form');

        if (!characterInput || !patternInput || !saveBtn) {
            alert('점자 항목 입력 폼을 찾을 수 없습니다.');
            return;
        }

        const character = characterInput.value.trim();
        if (!character) {
            alert('문자를 입력해주세요.');
            characterInput.focus();
            return;
        }

        const patternMeta = this.parseBraillePatternInputWithMeta(patternInput.value);
        const pattern = patternMeta.blocks;
        if (pattern.length === 0) {
            alert('유효한 점자 패턴을 입력해주세요. (예: 1 2 / 3 4)');
            patternInput.focus();
            return;
        }

        const description = descriptionInput ? descriptionInput.value.trim() : '';

        const mode = form?.dataset.mode || this.brailleFormMode || 'create';
        const entryId = form?.dataset.entryId || this.editingBrailleEntryId;
        const isEditMode = mode === 'edit' && !!entryId;

        if (!window.apiClient) {
            alert('점자 항목 편집 기능을 사용할 수 없습니다. 페이지를 새로고침해주세요.');
            return;
        }

        saveBtn.disabled = true;
        const originalText = saveBtn.textContent;
        saveBtn.textContent = isEditMode ? '수정 중...' : '추가 중...';

        try {
            if (isEditMode) {
                if (typeof window.apiClient.updateBrailleEntry !== 'function') {
                    throw new Error('점자 항목 수정 기능을 사용할 수 없습니다.');
                }
                await window.apiClient.updateBrailleEntry(entryId, {
                    character,
                    description,
                    braillePattern: pattern
                });
                alert('점자 항목이 수정되었습니다.');
            } else {
                if (typeof window.apiClient.addBrailleEntry !== 'function') {
                    throw new Error('점자 항목 추가 기능을 사용할 수 없습니다.');
                }
                await window.apiClient.addBrailleEntry(this.currentEditingCategoryId, {
                    character,
                    description,
                    braillePattern: pattern
                });
                alert('새 점자 항목이 추가되었습니다.');
            }

            await this.loadBrailleEntries(this.currentEditingCategoryId);
            await this.loadMyCategories();
            this.closeBrailleForm();
        } catch (error) {
            console.error('Failed to add braille entry:', error);
            alert(error.message || '점자 항목을 추가하지 못했습니다.');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    }

    parseBraillePatternInput(input) {
        return this.parseBraillePatternInputWithMeta(input).blocks;
    }

    parseBraillePatternInputWithMeta(input) {
        const result = {
            blocks: [],
            invalidTokens: [],
            hasInput: !!(input && input.trim())
        };

        if (!input) {
            return result;
        }

        const normalized = input.replace(/\r?\n+/g, '/');

        const blocks = normalized
            .split(/[/|]+/)
            .map(block => block.trim())
            .filter(Boolean)
            .map(block => {
                const tokens = block.split(/[^0-9]+/).filter(Boolean);
                const seen = new Set();
                const filtered = [];
                tokens.forEach(token => {
                    const value = parseInt(token, 10);
                    if (!Number.isInteger(value) || value < 1 || value > 6) {
                        result.invalidTokens.push(token);
                        return;
                    }
                    if (!seen.has(value)) {
                        seen.add(value);
                        filtered.push(value);
                    }
                });
                return filtered.sort((a, b) => a - b);
            })
            .filter(block => block.length > 0);

        result.blocks = blocks;
        return result;
    }

    updateBraillePatternPreview(rawValue) {
        const previewEl = document.getElementById('braille-pattern-preview');
        if (!previewEl) {
            return;
        }

        if (!rawValue || !rawValue.trim()) {
            previewEl.textContent = '예: 1 2 / 3 4';
            previewEl.classList.remove('error');
            return;
        }

        const { blocks, invalidTokens } = this.parseBraillePatternInputWithMeta(rawValue);
        if (blocks.length === 0) {
            previewEl.textContent = '유효한 패턴을 입력해주세요. (사용 가능한 점은 1~6)';
            previewEl.classList.add('error');
            return;
        }

        const formatted = blocks
            .map(block => block.join(' '))
            .join(' | ');

        let message = `미리보기: ${formatted}`;
        if (invalidTokens.length > 0) {
            message += ` (무시된 값: ${invalidTokens.join(', ')})`;
        }

        previewEl.textContent = message;
        previewEl.classList.toggle('error', invalidTokens.length > 0);
    }

    patternArrayToInputValue(pattern) {
        if (!Array.isArray(pattern) || pattern.length === 0) {
            return '';
        }
        return pattern.map(block => (Array.isArray(block) ? block.join(' ') : '')).filter(Boolean).join(' / ');
    }

    formatBraillePattern(pattern) {
        if (!Array.isArray(pattern) || pattern.length === 0) {
            return '패턴 정보 없음';
        }
        return pattern.map(block => block.join(' ')).join(' | ');
    }

    async openCategoryEditModal(categoryId) {
        if (!categoryId) {
            return;
        }

        try {
            const category = this.categories.find(cat => cat.id === categoryId) || await window.apiClient.getCategory(categoryId);
            if (!category) {
                alert('카테고리를 찾을 수 없습니다.');
                return;
            }

            this.currentEditingCategoryId = categoryId;
            this.populateEditForm(category);
            const modal = document.getElementById('edit-modal');
            if (modal) {
                modal.style.display = 'block';
            }
        } catch (error) {
            console.error('Failed to load category for editing:', error);
            alert(error.message || '카테고리를 불러오지 못했습니다.');
        }
    }

    populateEditForm(category) {
        const nameInput = document.getElementById('edit-category-name');
        const descInput = document.getElementById('edit-category-description');
        const publicCheckbox = document.getElementById('edit-category-public');
        const brailleContainer = document.getElementById('braille-data-container');

        if (nameInput) {
            nameInput.value = category.name || '';
        }
        if (descInput) {
            descInput.value = category.description || '';
        }
        if (publicCheckbox) {
            publicCheckbox.checked = !!category.is_public;
        }
        if (brailleContainer) {
            brailleContainer.innerHTML = `
                <div class="loading-indicator" style="display:block;">
                    점자 데이터를 불러오는 중...
                </div>
            `;
        }
        this.closeBrailleForm();
        this.currentBrailleEntries = [];
        this.currentBrailleCount = category && typeof category.braille_count === 'number' ? category.braille_count : 0;
        this.loadBrailleEntries(category.id);
    }

    async loadBrailleEntries(categoryId) {
        const container = document.getElementById('braille-data-container');
        if (!categoryId) {
            if (container) {
                container.innerHTML = '<div class="braille-empty">카테고리를 선택해주세요.</div>';
            }
            return;
        }

        if (container) {
            container.innerHTML = `
                <div class="loading-indicator" style="display:block;">
                    점자 데이터를 불러오는 중...
                </div>
            `;
        }

        if (!window.apiClient || typeof window.apiClient.getBrailleEntries !== 'function') {
            if (container) {
                container.innerHTML = '<div class="braille-empty">점자 데이터를 불러올 수 없습니다. 페이지를 새로고침해주세요.</div>';
            }
            return;
        }

        try {
            const entries = await window.apiClient.getBrailleEntries(categoryId);
            this.currentBrailleEntries = Array.isArray(entries) ? entries : [];
            this.currentBrailleCount = this.currentBrailleEntries.length;
            this.renderBrailleEntries();
        } catch (error) {
            console.error('Failed to load braille entries:', error);
            if (container) {
                container.innerHTML = '<div class="braille-empty">점자 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</div>';
            }
        }
    }

    renderBrailleEntries() {
        const container = document.getElementById('braille-data-container');
        if (!container) {
            return;
        }

        const count = this.currentBrailleEntries.length;
        const entriesHtml = count > 0
            ? `<div class="braille-entries-list">${this.currentBrailleEntries.map(entry => this.createBrailleEntryHTML(entry)).join('')}</div>`
            : '<div class="braille-empty">등록된 점자 항목이 없습니다. 아래 입력창에서 새 항목을 추가해보세요.</div>';

        container.innerHTML = `
            <div class="braille-summary">
                현재 등록된 점자 항목: <strong class="braille-summary-count">${count}</strong>개입니다.<br>
                목록에서 항목을 선택해 바로 수정하거나 삭제할 수 있습니다.
            </div>
            ${entriesHtml}
        `;
    }

    createBrailleEntryHTML(entry) {
        const patternText = this.formatBraillePattern(entry.braille_pattern);
        const description = entry.description ? `<div class="braille-entry-description">${this.escapeHtml(entry.description)}</div>` : '';
        return `
            <div class="braille-entry" data-entry-id="${entry.id}">
                <div class="braille-entry-info">
                    <div class="braille-entry-char">${this.escapeHtml(entry.character || '')}</div>
                    <div class="braille-entry-pattern">${this.escapeHtml(patternText)}</div>
                    ${description}
                </div>
                <div class="braille-entry-actions">
                    <button type="button" class="btn edit-btn" onclick="mainMenu.editBrailleEntry('${entry.id}')">수정</button>
                    <button type="button" class="btn delete-btn" onclick="mainMenu.deleteBrailleEntry('${entry.id}')">삭제</button>
                </div>
            </div>
        `;
    }

    closeEditModal() {
        const modal = document.getElementById('edit-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        const form = document.getElementById('edit-category-form');
        if (form) {
            form.reset();
        }
        const brailleContainer = document.getElementById('braille-data-container');
        if (brailleContainer) {
            brailleContainer.innerHTML = `
                <div class="loading-indicator" style="display:block;">
                    점자 데이터를 불러오는 중...
                </div>
            `;
        }
        this.closeBrailleForm();
        this.currentBrailleCount = 0;
        this.currentBrailleEntries = [];
        this.currentEditingCategoryId = null;
    }

    async handleCategoryUpdate(event) {
        if (event) {
            event.preventDefault();
        }

        if (!this.currentEditingCategoryId) {
            alert('수정할 카테고리를 찾을 수 없습니다.');
            return;
        }

        const nameInput = document.getElementById('edit-category-name');
        const descInput = document.getElementById('edit-category-description');
        const publicCheckbox = document.getElementById('edit-category-public');
        const submitBtn = document.querySelector('#edit-category-form button[type="submit"]');

        if (!nameInput || !descInput || !publicCheckbox || !submitBtn) {
            alert('수정 양식을 찾을 수 없습니다.');
            return;
        }

        const name = nameInput.value.trim();
        const description = descInput.value.trim();
        const isPublic = publicCheckbox.checked;

        if (!name) {
            alert('카테고리 이름을 입력해주세요.');
            nameInput.focus();
            return;
        }

        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = '저장 중...';

        try {
            await window.apiClient.updateCategory(this.currentEditingCategoryId, {
                name,
                description,
                is_public: isPublic
            });

            await this.loadMyCategories();
            this.closeEditModal();
            alert('카테고리가 수정되었습니다.');
        } catch (error) {
            console.error('Failed to update category:', error);
            alert(error.message || '카테고리를 수정하지 못했습니다.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    editBrailleEntry(entryId) {
        if (!entryId) {
            return;
        }
        const entry = this.currentBrailleEntries.find(item => item.id === entryId);
        if (!entry) {
            alert('선택한 점자 항목을 찾을 수 없습니다.');
            return;
        }
        this.openBrailleForm('edit', entry);
    }

    async deleteBrailleEntry(entryId) {
        if (!entryId) {
            return;
        }
        const entry = this.currentBrailleEntries.find(item => item.id === entryId);
        const targetCategoryId = entry?.category_id || this.currentEditingCategoryId;
        const message = entry
            ? `'${entry.character}' 항목을 삭제하시겠습니까? 삭제 후에는 되돌릴 수 없습니다.`
            : '선택한 점자 항목을 삭제하시겠습니까?';
        if (!window.confirm(message)) {
            return;
        }

        if (!window.apiClient || typeof window.apiClient.deleteBrailleEntry !== 'function') {
            alert('점자 항목 삭제 기능을 사용할 수 없습니다. 페이지를 새로고침해주세요.');
            return;
        }

        try {
            await window.apiClient.deleteBrailleEntry(entryId);
            alert('점자 항목이 삭제되었습니다.');
            await this.loadBrailleEntries(targetCategoryId);
            await this.loadMyCategories();
        } catch (error) {
            console.error('Failed to delete braille entry:', error);
            alert(error.message || '점자 항목을 삭제하지 못했습니다.');
        }
    }

    async confirmAndDeleteCategory(categoryId) {
        if (!categoryId) {
            return;
        }

        const category = this.categories.find(cat => cat.id === categoryId);
        const message = category
            ? `"${category.name}" 카테고리를 삭제하시겠습니까? 삭제 시 목록에서 숨겨지며 다시 사용할 수 없습니다.`
            : '선택한 카테고리를 삭제하시겠습니까?';

        if (!window.confirm(message)) {
            return;
        }

        this.showLoading(true);

        try {
            await window.apiClient.deleteCategory(categoryId);
            await this.loadMyCategories();
            alert('카테고리가 삭제되었습니다.');
        } catch (error) {
            console.error('Failed to delete category:', error);
            alert(error.message || '카테고리를 삭제하지 못했습니다.');
        } finally {
            this.showLoading(false);
        }
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
