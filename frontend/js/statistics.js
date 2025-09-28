// Statistics page JavaScript
class StatisticsManager {
    constructor() {
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.bindEvents();
        this.loadStatistics();
    }

    checkAuthentication() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    bindEvents() {
        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('authToken');
            window.location.href = 'login.html';
        });
    }

    async loadStatistics() {
        try {
            this.showLoading();

            const token = localStorage.getItem('authToken');

            // Use the same API as main.js for consistency
            const response = await fetch('/api/profile/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load statistics');
            }

            const stats = await response.json();
            this.displayStatistics(stats);

        } catch (error) {
            console.error('Error loading statistics:', error);
            this.showError('통계를 불러오는 중 오류가 발생했습니다: ' + error.message);
        }
    }

    displayStatistics(stats) {
        this.hideLoading();
        this.hideError();

        // Show statistics content
        document.getElementById('statistics-content').style.display = 'block';

        // Update main statistics cards
        this.updateMainStats(stats);

        // Update progress charts
        this.updateProgressCharts(stats);

        // Load recent practice sessions
        this.loadRecentSessions();
    }

    updateMainStats(stats) {
        // Total practice time - use the same field name as profile API
        const totalMinutes = Math.round((stats.total_practice_time || 0) / 60);
        document.getElementById('total-practice-time').textContent =
            totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}시간 ${totalMinutes % 60}분` : `${totalMinutes}분`;

        // Total sessions - use actual practice sessions
        document.getElementById('total-sessions').textContent = `${stats.total_practice_sessions || 0}회`;

        // Average session time - calculate average per session
        const avgSessionMinutes = stats.total_practice_sessions > 0
            ? Math.round((stats.total_practice_time || 0) / stats.total_practice_sessions / 60)
            : 0;
        document.getElementById('average-session-time').textContent = `${avgSessionMinutes}분`;

        // Practice days - use actual practice days
        document.getElementById('practice-days').textContent = `${stats.total_practice_days || 0}일`;
    }

    updateProgressCharts(stats) {
        // Weekly practice time goal (300 minutes = 5 hours)
        const weeklyGoal = 300;
        // Use average daily practice * 7 as approximation for weekly time
        const weeklyTime = Math.round(((stats.average_daily_practice || 0) * 7) / 60);
        const weeklyProgress = Math.min((weeklyTime / weeklyGoal) * 100, 100);

        document.getElementById('weekly-progress-text').textContent = `${weeklyTime}/${weeklyGoal}분`;
        document.getElementById('weekly-progress-bar').style.width = `${weeklyProgress}%`;

        // Weekly practice days goal (5 days)
        const dailyGoal = 5;
        // Use actual practice days as a better estimate
        const weeklyDays = Math.min(stats.total_practice_days || 0, 7);
        const dailyProgress = Math.min((weeklyDays / dailyGoal) * 100, 100);

        document.getElementById('daily-progress-text').textContent = `${weeklyDays}/${dailyGoal}일`;
        document.getElementById('daily-progress-bar').style.width = `${dailyProgress}%`;
    }

    async loadRecentSessions() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/protected/practice-logs?limit=10', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load recent sessions');
            }

            const sessions = await response.json();
            this.displayRecentSessions(sessions);

        } catch (error) {
            console.error('Error loading recent sessions:', error);
            // Show empty state if no sessions
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

            const duration = Math.round(session.duration / 60);
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
    }

    showLoading() {
        document.getElementById('loading-indicator').style.display = 'block';
        document.getElementById('statistics-content').style.display = 'none';
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new StatisticsManager();
});