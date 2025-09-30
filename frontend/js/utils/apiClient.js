// API client utility for session-based authentication
class ApiClient {
    constructor() {
        // Determine base URL based on environment
        const hostname = window.location.hostname;
        const port = window.location.port;

        console.log('🌐 Current location:', {
            hostname: hostname,
            port: port,
            origin: window.location.origin,
            href: window.location.href
        });

        this.baseUrl = ''; // API calls will be relative to the current origin

        this.currentUser = null;
        console.log('🔗 ApiClient baseUrl:', this.baseUrl || window.location.origin);
    }

    // Make authenticated API request
    async request(url, options = {}) {
        const token = localStorage.getItem('authToken');
        const requestOptions = {
            credentials: 'include', // Include cookies for session
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            },
            ...options
        };

        console.log('🔗 Making request to:', this.baseUrl + url, 'with token:', token ? 'Present' : 'None');
        const response = await fetch(this.baseUrl + url, requestOptions);

        if (response.status === 401) {
            // Clear current user and redirect to login
            this.currentUser = null;
            const currentPath = window.location.pathname;
            console.log('🔐 401 Unauthorized - current path:', currentPath);
            if (!currentPath.includes('login')) {
                console.log('🔄 Redirecting to login...');
                window.location.href = 'login.html';
            }
            throw new Error('Authentication required');
        }

        return response;
    }

    // Authentication methods
    async login(username, password) {
        const response = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            try {
                const data = await response.json();
                this.currentUser = data.user;

                // Store JWT token if provided
                if (data.token) {
                    localStorage.setItem('authToken', data.token);
                    console.log('✅ JWT token stored');
                }

                return data;
            } catch (jsonError) {
                console.error('JSON parsing error in success response:', jsonError);
                throw new Error('서버 응답 형식이 올바르지 않습니다.');
            }
        } else {
            try {
                const errorText = await response.text();
                console.error('Login failed - Status:', response.status, 'Response:', errorText);

                // Try to parse as JSON, fallback to text
                let errorMessage = 'Login failed';
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorData.message || 'Login failed';
                } catch {
                    errorMessage = errorText || `서버 오류 (${response.status})`;
                }

                throw new Error(errorMessage);
            } catch (parseError) {
                if (parseError instanceof Error && parseError.message !== 'Login failed') {
                    throw parseError;
                }
                throw new Error(`서버 연결 오류 (${response.status})`);
            }
        }
    }

    async signup(username, password) {
        const response = await this.request('/api/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json();
            this.currentUser = data.user;
            return data;
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Signup failed');
        }
    }

    async logout() {
        console.log('🔓 Starting logout process...');
        try {
            await this.request('/api/auth/logout', {
                method: 'POST'
            });
            console.log('✅ Server logout successful');
        } catch (error) {
            console.warn('Logout request failed:', error.message);
        } finally {
            // Complete cleanup regardless of server response
            this.currentUser = null;
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            sessionStorage.clear();
            console.log('🧹 Complete token cleanup done');

            // Force redirect
            window.location.href = 'login.html';
        }
    }

    async getCurrentUser() {
        if (this.currentUser) {
            return this.currentUser;
        }

        try {
            const response = await this.request('/api/auth/user');
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                return this.currentUser;
            }
        } catch (error) {
            console.warn('Failed to get current user:', error.message);
        }

        return null;
    }

    // Check if user is authenticated (simple version to avoid loops)
    async isAuthenticated() {
        if (this.currentUser) {
            return true;
        }

        try {
            const response = await this.request('/api/auth/user');
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                return true;
            }
        } catch (error) {
            console.warn('Authentication check failed:', error.message);
        }

        return false;
    }

    // API wrapper methods
    async get(url) {
        const response = await this.request(url);
        return response.json();
    }

    async post(url, data) {
        const response = await this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return response.json();
    }

    async put(url, data) {
        const response = await this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        return response.json();
    }

    async delete(url) {
        const response = await this.request(url, {
            method: 'DELETE'
        });
        return response.json();
    }
}

// Create global instance
window.apiClient = new ApiClient();

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiClient;
}