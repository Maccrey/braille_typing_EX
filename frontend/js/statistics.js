// Statistics page JavaScript
class StatisticsManager {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuthenticationAndLoad();
    }

    async checkAuthenticationAndLoad() {
        try {
            const user = await window.apiClient.getCurrentUser();
            if (!user) {
                throw new Error('로그인이 필요합니다.');
            }
            await this.loadStatistics();
            return true;
        } catch (error) {
            console.warn('⚠️ Failed to load user session:', error.message || error);
            this.showDefaultState();
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            return false;
        }
    }

    showDefaultState() {
        // Hide loading, show content with default values
        this.hideLoading();
        this.hideError();
        document.getElementById('statistics-content').style.display = 'block';
        this.refreshAdSlots();
        console.log('📊 Showing default statistics state');
    }

    bindEvents() {
        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            window.apiClient.logout();
        });
    }

    // Method to reload statistics (can be called after token is set)
    reloadStatistics() {
        console.log('🔄 Reloading statistics');
        this.loadStatistics();
    }

    async loadStatistics() {
        try {
            this.showLoading();
            const stats = await window.apiClient.getUserStats({ recentLimit: 10, maxLogs: 500 });
            this.displayStatistics(stats);
            await this.loadRecentSessions(stats.recent_sessions);
        } catch (error) {
            console.error('Error loading statistics:', error);
            this.showError('통계를 불러오는 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
        }
    }

    displayStatistics(stats) {
        this.hideLoading();
        this.hideError();

        // Show statistics content
        document.getElementById('statistics-content').style.display = 'block';
        this.refreshAdSlots();

        // Update main statistics cards
        this.updateMainStats(stats);

        // Update progress charts
        this.updateProgressCharts(stats);
    }

    updateMainStats(stats) {
        console.log('🔄 Updating main stats with:', stats);

        // Total practice time - use the same field name as profile API
        const totalMinutes = Math.round((stats.total_practice_time || 0) / 60);
        document.getElementById('total-practice-time').textContent =
            totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}시간 ${totalMinutes % 60}분` : `${totalMinutes}분`;

        // Total sessions - use actual practice sessions
        const totalSessions = stats.total_practice_sessions || 0;
        console.log('📊 Setting total sessions to:', totalSessions);
        document.getElementById('total-sessions').textContent = `${totalSessions}회`;

        // Average session time - calculate average per session
        const avgSessionMinutes = stats.total_practice_sessions > 0
            ? Math.round((stats.total_practice_time || 0) / stats.total_practice_sessions / 60)
            : 0;
        console.log('📊 Setting average session time to:', avgSessionMinutes);
        document.getElementById('average-session-time').textContent = `${avgSessionMinutes}분`;

        // Practice days - use actual practice days
        const practiceDays = stats.total_practice_days || 0;
        console.log('📊 Setting practice days to:', practiceDays);
        document.getElementById('practice-days').textContent = `${practiceDays}일`;
    }

    updateProgressCharts(stats) {
        console.log('📈 Updating progress charts with:', {
            weekly_practice_time: stats.weekly_practice_time,
            weekly_practice_days: stats.weekly_practice_days
        });

        // Weekly practice time goal (300 minutes = 5 hours)
        const weeklyGoal = 300;
        // Use actual weekly practice time from last 7 days
        const weeklyTime = Math.round((stats.weekly_practice_time || 0) / 60);
        const weeklyProgress = Math.min((weeklyTime / weeklyGoal) * 100, 100);

        console.log('🎯 Weekly time progress:', {
            weeklyTime,
            weeklyGoal,
            weeklyProgress: `${weeklyProgress}%`
        });

        document.getElementById('weekly-progress-text').textContent = `${weeklyTime}/${weeklyGoal}분`;
        document.getElementById('weekly-progress-bar').style.width = `${weeklyProgress}%`;

        // Weekly practice days goal (5 days)
        const dailyGoal = 5;
        // Use actual weekly practice days from last 7 days
        const weeklyDays = stats.weekly_practice_days || 0;
        const dailyProgress = Math.min((weeklyDays / dailyGoal) * 100, 100);

        console.log('🎯 Weekly days progress:', {
            weeklyDays,
            dailyGoal,
            dailyProgress: `${dailyProgress}%`
        });

        document.getElementById('daily-progress-text').textContent = `${weeklyDays}/${dailyGoal}일`;
        document.getElementById('daily-progress-bar').style.width = `${dailyProgress}%`;
    }

    async loadRecentSessions(preloadedSessions = null) {
        try {
            const sessions = preloadedSessions || await window.apiClient.getRecentPracticeSessions(10);
            this.displayRecentSessions(sessions);
        } catch (error) {
            console.error('Error loading recent sessions:', error);
            document.getElementById('sessions-empty').style.display = 'block';
        }
    }

    displayRecentSessions(sessions) {
        const sessionsList = document.getElementById('sessions-list');
        const emptyState = document.getElementById('sessions-empty');

        if (!sessions || sessions.length === 0) {
            emptyState.style.display = 'block';
            sessionsList.innerHTML = '';
            return;
        }

        emptyState.style.display = 'none';

        sessionsList.innerHTML = sessions.map(session => {
            const date = new Date(session.date);
            const formattedDate = date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short'
            });

            const durationSeconds = session.duration_seconds ?? session.duration ?? 0;
            const duration = Math.round(durationSeconds / 60);
            const formattedDuration = duration >= 60 ?
                `${Math.floor(duration / 60)}시간 ${duration % 60}분` :
                `${duration}분`;

            return `
                <div class="session-item">
                    <div>
                        <div class="session-date">${formattedDate}</div>
                        <div class="session-details">점자 연습</div>
                    </div>
                    <div class="session-duration">${formattedDuration}</div>
                </div>
            `;
        }).join('');

        if (window.__TEST_MODE__) {
            window.__lastRenderedSessions = sessions.map(s => ({ ...s }));
        }
    }

    showLoading() {
        document.getElementById('loading-indicator').style.display = 'block';
        this.hideError();
    }

    hideLoading() {
        document.getElementById('loading-indicator').style.display = 'none';
    }

    showError(message) {
        const errorEl = document.getElementById('error-message');
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        this.hideLoading();
    }

    hideError() {
        document.getElementById('error-message').style.display = 'none';
    }

    refreshAdSlots() {
        if (typeof window.scheduleStatisticsAdRefresh === 'function') {
            window.scheduleStatisticsAdRefresh();
            return;
        }

        if (window.kakaoAdFit && typeof window.kakaoAdFit.load === 'function') {
            try {
                window.kakaoAdFit.load();
            } catch (error) {
                console.warn('Failed to refresh Kakao ads:', error);
            }
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.statisticsManager = new StatisticsManager();
});

// Also expose StatisticsManager for debugging/testing
window.StatisticsManager = StatisticsManager;
