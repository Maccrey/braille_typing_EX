(() => {
  const config = window.__MOCK_FIREBASE_CONFIG__ || {};
  const state = {
    currentUser: config.initialUser || null,
    recordedSessions: [],
    brailleQueue: Array.isArray(config.brailleQueue) ? [...config.brailleQueue] : []
  };
  window.__MOCK_API_STATE__ = state;

  function createDefaultUser(email = 'tester@example.com', username = 'tester') {
    return {
      uid: `mock-${Date.now()}`,
      email,
      username,
      role: 'user'
    };
  }

  function resolveUser(email, password) {
    const users = config.users || [];
    return users.find(user => user.email === email && (!password || user.password === password));
  }

  function persistUser(userData, token = 'mock-token') {
    state.currentUser = userData;
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(userData));
  }

  function toRecentSessions(fromStats) {
    if (Array.isArray(fromStats)) {
      return fromStats;
    }
    return state.recordedSessions.map(session => ({
      id: `mock-log-${state.recordedSessions.indexOf(session)}`,
      date: new Date().toISOString(),
      duration: session.durationSeconds || 0,
      category_id: session.categoryId || null,
      characters_completed: session.charactersCompleted || 0
    }));
  }

  const authStub = {
    currentUser: state.currentUser,
    onAuthStateChanged(callback) {
      setTimeout(() => callback(state.currentUser), 0);
      return () => {};
    },
    signInWithEmailAndPassword(email, password) {
      const matched = resolveUser(email, password) || state.currentUser;
      this.currentUser = matched;
      state.currentUser = matched;
      return Promise.resolve({ user: matched });
    },
    createUserWithEmailAndPassword(email) {
      const user = createDefaultUser(email);
      this.currentUser = user;
      state.currentUser = user;
      return Promise.resolve({ user });
    },
    async signOut() {
      this.currentUser = null;
      state.currentUser = null;
    }
  };

  window.firebase = window.firebase || {};
  window.firebase.initializeApp = () => {};
  window.firebase.auth = () => authStub;
  window.firebase.firestore = window.firebase.firestore || {};
  window.firebase.firestore.FieldValue = {
    increment: value => ({ __increment: value })
  };
  window.firebase.firestore.Timestamp = {
    now: () => ({ toDate: () => new Date() })
  };
  window.firebase.firestore.FieldPath = {
    documentId: () => ({ __fieldPath: 'documentId' })
  };
  window.firebase.firestore = Object.assign(() => ({}), window.firebase.firestore);
  window.firebase.storage = () => ({ ref: () => ({}) });

  window.__createMockApiClient = function () {
    return {
      login: async (email, password) => {
        const matched = resolveUser(email, password);
        if (!matched) {
          throw new Error(config.loginErrorMessage || '잘못된 사용자명 또는 비밀번호입니다.');
        }
        const userData = {
          uid: matched.uid || `mock-${Date.now()}`,
          email: matched.email,
          username: matched.username || matched.email.split('@')[0]
        };
        persistUser(userData, matched.token || 'mock-token');
        return { user: userData, token: matched.token || 'mock-token' };
      },
      signup: async (email, password, username) => {
        const userData = createDefaultUser(email, username || email.split('@')[0]);
        persistUser(userData, 'mock-token');
        return { user: userData, token: 'mock-token' };
      },
      logout: async () => {
        state.currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      },
      getCurrentUser: async () => state.currentUser,
      getMyCategories: async () => config.myCategories || [],
      getPublicCategories: async () => config.publicCategories || [],
      getFavorites: async () => config.favorites || [],
      getAttendance: async () => ({ attendance_dates: config.attendanceDates || [] }),
      getUserStats: async () => config.stats || {
        total_practice_time: 0,
        total_practice_sessions: 0,
        total_practice_days: 0,
        weekly_practice_time: 0,
        weekly_practice_days: 0,
        recent_sessions: toRecentSessions(config.recentSessions)
      },
      getRecentPracticeSessions: async () => config.recentSessions || toRecentSessions(),
      getRandomBrailleCharacter: async () => {
        if (state.brailleQueue.length > 0) {
          return state.brailleQueue.shift();
        }
        return config.defaultBraille || {
          character: '가',
          description: '기본 문자',
          braille_pattern: [[1]]
        };
      },
      recordPracticeSession: async payload => {
        state.recordedSessions.push(payload);
      },
      getPosts: async () => config.posts || [],
      getComments: async () => config.comments || [],
      get: async (collection, docId) => {
        const dataList = config[collection] || [];
        const found = dataList.find(item => item.id === docId);
        if (!found) {
          throw new Error('Mock document not found');
        }
        return found;
      }
    };
  };
})();
