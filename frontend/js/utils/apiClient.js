// Firebase-based API client with Firestore helpers
const FirestoreFieldValue = firebase.firestore.FieldValue;
const FirestoreTimestamp = firebase.firestore.Timestamp;
const FirestoreFieldPath = firebase.firestore.FieldPath;

class FirebaseApiClient {
    constructor() {
        this.auth = auth;
        this.db = db;
        this.storage = storage;
        this.currentUser = null;
        this.brailleCache = new Map(); // Cache braille data per category
        this.publicCategoryCache = [];

        // Keep local cache in sync with Firebase auth state
        this.auth.onAuthStateChanged(async user => {
            if (user) {
                try {
                    await this.loadUserProfile(user);
                } catch (error) {
                    console.error('Failed to load user profile', error);
                }
            } else {
                this.currentUser = null;
                localStorage.removeItem('authToken');
                localStorage.removeItem('userData');
            }
        });
    }

    getLocalDateKey(date = new Date()) {
        const timezoneOffsetMs = date.getTimezoneOffset() * 60000;
        const localDate = new Date(date.getTime() - timezoneOffsetMs);
        return localDate.toISOString().split('T')[0];
    }

    async loadUserProfile(firebaseUser) {
        if (!firebaseUser) {
            return null;
        }

        const docRef = this.db.collection('users').doc(firebaseUser.uid);
        const snapshot = await docRef.get();

        if (snapshot.exists) {
            const profile = { uid: firebaseUser.uid, email: firebaseUser.email, ...snapshot.data() };
            await this.persistUser(firebaseUser, profile);
            return profile;
        }

        const username = (firebaseUser.email || '').split('@')[0] || 'user';
        const profile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            username,
            role: 'user',
            createdAt: FirestoreTimestamp.now()
        };

        await docRef.set(profile, { merge: true });
        await this.persistUser(firebaseUser, profile);
        return profile;
    }

    async persistUser(firebaseUser, profile) {
        this.currentUser = profile;
        localStorage.setItem('userData', JSON.stringify(profile));
        if (firebaseUser && firebaseUser.getIdToken) {
            const token = await firebaseUser.getIdToken();
            localStorage.setItem('authToken', token);
        }
    }

    async ensureFirebaseUser(requireAuth = true) {
        if (this.auth.currentUser) {
            return this.auth.currentUser;
        }

        return new Promise((resolve, reject) => {
            const unsubscribe = this.auth.onAuthStateChanged(user => {
                unsubscribe();
                if (user) {
                    resolve(user);
                } else if (requireAuth) {
                    reject(new Error('Authentication required'));
                } else {
                    resolve(null);
                }
            }, error => {
                unsubscribe();
                if (requireAuth) {
                    reject(error);
                } else {
                    resolve(null);
                }
            });
        });
    }

    async ensureUserProfile() {
        if (this.currentUser) {
            return this.currentUser;
        }
        const firebaseUser = await this.ensureFirebaseUser(true);
        return this.loadUserProfile(firebaseUser);
    }

    // Authentication methods
    async login(email, password) {
        try {
            const credential = await this.auth.signInWithEmailAndPassword(email, password);
            const profile = await this.loadUserProfile(credential.user);
            const token = await credential.user.getIdToken();
            localStorage.setItem('authToken', token);
            return { user: profile, token };
        } catch (error) {
            console.error('Login failed:', error);
            throw new Error(this.getFirebaseAuthErrorMessage(error));
        }
    }

    async signup(email, password, username) {
        try {
            const credential = await this.auth.createUserWithEmailAndPassword(email, password);
            const profile = {
                uid: credential.user.uid,
                email: credential.user.email,
                username,
                role: 'user',
                createdAt: FirestoreTimestamp.now()
            };
            await this.db.collection('users').doc(credential.user.uid).set(profile, { merge: true });
            await this.persistUser(credential.user, profile);
            const token = await credential.user.getIdToken();
            localStorage.setItem('authToken', token);
            return { user: profile, token };
        } catch (error) {
            console.error('Signup failed:', error);
            throw new Error(this.getFirebaseAuthErrorMessage(error));
        }
    }

    async logout() {
        try {
            await this.auth.signOut();
        } catch (error) {
            console.warn('Firebase logout failed:', error.message);
        } finally {
            this.currentUser = null;
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            sessionStorage.clear();
            window.location.href = 'login.html';
        }
    }

    async changePassword(currentPassword, newPassword) {
        if (!currentPassword || !newPassword) {
            throw new Error('현재 패스워드와 새 패스워드를 모두 입력해주세요.');
        }

        try {
            const firebaseUser = await this.ensureFirebaseUser(true);
            if (!firebaseUser.email) {
                throw new Error('계정 이메일 정보를 찾을 수 없습니다.');
            }

            const credential = firebase.auth.EmailAuthProvider.credential(
                firebaseUser.email,
                currentPassword
            );

            await firebaseUser.reauthenticateWithCredential(credential);
            await firebaseUser.updatePassword(newPassword);
            return true;
        } catch (error) {
            console.error('Password change failed:', error);
            switch (error.code) {
                case 'auth/wrong-password':
                    throw new Error('현재 패스워드가 올바르지 않습니다.');
                case 'auth/weak-password':
                    throw new Error('새 패스워드는 6자 이상이어야 합니다.');
                case 'auth/too-many-requests':
                    throw new Error('시도가 너무 많습니다. 잠시 후 다시 시도해주세요.');
                default:
                    throw new Error(error.message || '패스워드 변경에 실패했습니다.');
            }
        }
    }

    async getCurrentUser() {
        if (this.currentUser) {
            return this.currentUser;
        }
        const firebaseUser = await this.ensureFirebaseUser(false);
        return firebaseUser ? this.loadUserProfile(firebaseUser) : null;
    }

    async isAuthenticated() {
        const user = await this.ensureFirebaseUser(false);
        return !!user;
    }

    // Firestore helpers
    async getMyCategories() {
        const user = await this.ensureUserProfile();
        const snapshot = await this.db
            .collection('categories')
            .where('created_by', '==', user.uid)
            .orderBy('created_at', 'desc')
            .get();
        return snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(category => !category.is_deleted);
    }

    async getFavorites() {
        const user = await this.ensureUserProfile();
        const favSnapshot = await this.db
            .collection('favorites')
            .where('user_id', '==', user.uid)
            .get();
        const categoryIds = favSnapshot.docs.map(doc => doc.data().category_id).filter(Boolean);
        if (categoryIds.length === 0) {
            return [];
        }

        const chunks = this.chunkArray(categoryIds, 10); // Firestore IN query limit
        const favorites = [];
        for (const chunk of chunks) {
            const snapshot = await this.db
                .collection('categories')
                .where(FirestoreFieldPath.documentId(), 'in', chunk)
                .get();
            snapshot.forEach(doc => favorites.push({ id: doc.id, ...doc.data() }));
        }
        return favorites.filter(category => !category.is_deleted);
    }

    async getPublicCategories(forceRefresh = false) {
        if (!forceRefresh && this.publicCategoryCache.length > 0) {
            return this.publicCategoryCache;
        }
        const snapshot = await this.db
            .collection('categories')
            .where('is_public', '==', true)
            .orderBy('created_at', 'desc')
            .get();
        this.publicCategoryCache = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(category => !category.is_deleted);
        return this.publicCategoryCache;
    }

    async getCategory(categoryId) {
        if (!categoryId) {
            throw new Error('카테고리를 선택해주세요.');
        }

        const snapshot = await this.db.collection('categories').doc(categoryId).get();
        if (!snapshot.exists) {
            throw new Error('카테고리를 찾을 수 없습니다.');
        }

        const data = snapshot.data();
        if (data.is_deleted) {
            throw new Error('삭제된 카테고리입니다.');
        }
        return { id: snapshot.id, ...data };
    }

    async updateCategory(categoryId, updates = {}) {
        if (!categoryId) {
            throw new Error('카테고리를 선택해주세요.');
        }

        const userProfile = await this.ensureUserProfile();
        const docRef = this.db.collection('categories').doc(categoryId);
        const snapshot = await docRef.get();

        if (!snapshot.exists) {
            throw new Error('카테고리를 찾을 수 없습니다.');
        }

        const data = snapshot.data();
        if (data.created_by !== userProfile.uid && userProfile.role !== 'admin') {
            throw new Error('카테고리를 수정할 권한이 없습니다.');
        }

        const payload = {};
        if (typeof updates.name === 'string') {
            const trimmed = updates.name.trim();
            if (!trimmed) {
                throw new Error('카테고리 이름을 입력해주세요.');
            }
            payload.name = trimmed;
        }

        if (typeof updates.description === 'string') {
            payload.description = updates.description.trim();
        }

        if (typeof updates.is_public === 'boolean') {
            payload.is_public = updates.is_public;
        }

        if (Object.keys(payload).length === 0) {
            return { id: categoryId, ...data };
        }

        payload.updated_at = FirestoreTimestamp.now();
        await docRef.update(payload);

        this.publicCategoryCache = [];
        this.brailleCache.delete(categoryId);

        return { id: categoryId, ...data, ...payload };
    }

    async deleteCategory(categoryId) {
        if (!categoryId) {
            throw new Error('카테고리를 선택해주세요.');
        }

        const userProfile = await this.ensureUserProfile();
        const docRef = this.db.collection('categories').doc(categoryId);
        const snapshot = await docRef.get();

        if (!snapshot.exists) {
            throw new Error('카테고리를 찾을 수 없습니다.');
        }

        const data = snapshot.data();
        if (data.created_by !== userProfile.uid && userProfile.role !== 'admin') {
            throw new Error('카테고리를 삭제할 권한이 없습니다.');
        }

        const ownFavoritesSnapshot = await this.db
            .collection('favorites')
            .where('category_id', '==', categoryId)
            .where('user_id', '==', userProfile.uid)
            .get();
        const ownFavoriteIds = ownFavoritesSnapshot.docs.map(doc => doc.id);
        await this.deleteDocumentsByIds('favorites', ownFavoriteIds);

        await docRef.update({
            is_deleted: true,
            deleted_at: FirestoreTimestamp.now(),
            deleted_by: userProfile.uid,
            is_public: false
        });

        this.brailleCache.delete(categoryId);
        this.publicCategoryCache = [];

        return true;
    }

    async createCategoryWithBrailleData({
        name,
        description = '',
        isPublic = false,
        brailleEntries = [],
        languageCode = '',
        languageLabel = ''
    } = {}) {
        if (!name || !name.trim()) {
            throw new Error('카테고리 이름을 입력해주세요.');
        }
        if (!Array.isArray(brailleEntries) || brailleEntries.length === 0) {
            throw new Error('추가할 점자 데이터가 없습니다.');
        }
        if (!languageCode) {
            throw new Error('언어/국가를 선택해주세요.');
        }

        const userProfile = await this.ensureUserProfile();
        const now = FirestoreTimestamp.now();

        // Sanitize entries
        const sanitizedEntries = brailleEntries
            .map((entry, index) => ({
                character: (entry.character || '').trim(),
                description: (entry.description || '').trim(),
                braille_pattern: Array.isArray(entry.braille_pattern) ? entry.braille_pattern : [],
                order: typeof entry.order === 'number' ? entry.order : index
            }))
            .filter(entry => entry.character && entry.braille_pattern.length > 0);

        if (sanitizedEntries.length === 0) {
            throw new Error('유효한 점자 데이터를 찾을 수 없습니다.');
        }

        const categoryRef = this.db.collection('categories').doc();
        const brailleCollection = this.db.collection('braille_data');
        const createdBrailleDocIds = [];
        const chunkSize = 400;

        try {
            let globalOrderOffset = 0;
            for (const chunk of this.chunkArray(sanitizedEntries, chunkSize)) {
                const batch = this.db.batch();
                chunk.forEach((entry, indexInChunk) => {
                    const docRef = brailleCollection.doc();
                    createdBrailleDocIds.push(docRef.id);
                    batch.set(docRef, {
                        category_id: categoryRef.id,
                        character: entry.character,
                        description: entry.description,
                        braille_pattern: JSON.stringify(entry.braille_pattern),
                        created_at: now,
                        created_by: userProfile.uid,
                        order: entry.order ?? (globalOrderOffset + indexInChunk)
                    });
                });
                await batch.commit();
                globalOrderOffset += chunk.length;
            }

            await categoryRef.set({
                name: name.trim(),
                description: description ? description.trim() : '',
                is_public: !!isPublic,
                is_deleted: false,
                language_code: languageCode.trim().toUpperCase(),
                language_label: languageLabel ? languageLabel.trim() : '',
                created_by: userProfile.uid,
                created_by_email: userProfile.email || '',
                created_by_username: userProfile.username || '',
                created_at: now,
                updated_at: now,
                braille_count: sanitizedEntries.length,
                last_imported_at: now
            });

            this.publicCategoryCache = [];
            this.brailleCache.delete(categoryRef.id);

            return {
                categoryId: categoryRef.id,
                brailleCount: sanitizedEntries.length
            };
        } catch (error) {
            // Clean up partially created documents
            await this.deleteDocumentsByIds('braille_data', createdBrailleDocIds).catch(() => {});
            throw error;
        }
    }

    async addBrailleEntry(categoryId, { character, description = '', braillePattern = [] } = {}) {
        if (!categoryId) {
            throw new Error('카테고리를 선택해주세요.');
        }

        const sanitizedCharacter = (character || '').trim();
        if (!sanitizedCharacter) {
            throw new Error('문자를 입력해주세요.');
        }

        if (!Array.isArray(braillePattern) || braillePattern.length === 0) {
            throw new Error('점자 패턴을 입력해주세요.');
        }

        const userProfile = await this.ensureUserProfile();
        const categoryRef = this.db.collection('categories').doc(categoryId);
        const categorySnapshot = await categoryRef.get();

        if (!categorySnapshot.exists) {
            throw new Error('카테고리를 찾을 수 없습니다.');
        }

        const categoryData = categorySnapshot.data();
        if (categoryData.is_deleted) {
            throw new Error('삭제된 카테고리에는 항목을 추가할 수 없습니다.');
        }

        if (categoryData.created_by !== userProfile.uid && userProfile.role !== 'admin') {
            throw new Error('카테고리를 수정할 권한이 없습니다.');
        }

        const now = FirestoreTimestamp.now();
        const brailleCollection = this.db.collection('braille_data');
        const docRef = brailleCollection.doc();
        const currentCount = typeof categoryData.braille_count === 'number' ? categoryData.braille_count : 0;

        await docRef.set({
            category_id: categoryId,
            character: sanitizedCharacter,
            description: (description || '').trim(),
            braille_pattern: JSON.stringify(braillePattern),
            created_at: now,
            created_by: userProfile.uid,
            order: currentCount
        });

        await categoryRef.update({
            braille_count: FirestoreFieldValue.increment(1),
            updated_at: now,
            last_imported_at: now
        });

        this.brailleCache.delete(categoryId);
        this.publicCategoryCache = [];

        return {
            id: docRef.id,
            character: sanitizedCharacter,
            order: currentCount
        };
    }

    async getBrailleEntries(categoryId, { limit = 500 } = {}) {
        if (!categoryId) {
            throw new Error('카테고리를 선택해주세요.');
        }

        const snapshot = await this.db
            .collection('braille_data')
            .where('category_id', '==', categoryId)
            .orderBy('order')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            braille_pattern: this.normalizeBraillePattern(doc.data().braille_pattern)
        }));
    }

    async updateBrailleEntry(entryId, { character, description = '', braillePattern = [] } = {}) {
        if (!entryId) {
            throw new Error('점자 항목을 선택해주세요.');
        }

        const docRef = this.db.collection('braille_data').doc(entryId);
        const snapshot = await docRef.get();

        if (!snapshot.exists) {
            throw new Error('점자 항목을 찾을 수 없습니다.');
        }

        const entryData = snapshot.data();
        const categoryId = entryData.category_id;
        if (!categoryId) {
            throw new Error('점자 항목의 카테고리를 찾을 수 없습니다.');
        }

        const userProfile = await this.ensureUserProfile();
        const categoryRef = this.db.collection('categories').doc(categoryId);
        const categorySnapshot = await categoryRef.get();

        if (!categorySnapshot.exists) {
            throw new Error('카테고리를 찾을 수 없습니다.');
        }

        const categoryData = categorySnapshot.data();
        if (categoryData.created_by !== userProfile.uid && userProfile.role !== 'admin') {
            throw new Error('점자 항목을 수정할 권한이 없습니다.');
        }

        const sanitizedCharacter = typeof character === 'string' ? character.trim() : '';
        if (!sanitizedCharacter) {
            throw new Error('문자를 입력해주세요.');
        }

        if (!Array.isArray(braillePattern) || braillePattern.length === 0) {
            throw new Error('점자 패턴을 입력해주세요.');
        }

        const now = FirestoreTimestamp.now();

        await docRef.update({
            character: sanitizedCharacter,
            description: (description || '').trim(),
            braille_pattern: JSON.stringify(braillePattern),
            updated_at: now
        });

        await categoryRef.update({
            updated_at: now,
            last_imported_at: now
        });

        this.brailleCache.delete(categoryId);
        this.publicCategoryCache = [];

        return {
            id: entryId,
            category_id: categoryId,
            character: sanitizedCharacter
        };
    }

    async deleteBrailleEntry(entryId) {
        if (!entryId) {
            throw new Error('점자 항목을 선택해주세요.');
        }

        const docRef = this.db.collection('braille_data').doc(entryId);
        const snapshot = await docRef.get();

        if (!snapshot.exists) {
            throw new Error('점자 항목을 찾을 수 없습니다.');
        }

        const entryData = snapshot.data();
        const categoryId = entryData.category_id;
        if (!categoryId) {
            throw new Error('점자 항목의 카테고리를 찾을 수 없습니다.');
        }

        const userProfile = await this.ensureUserProfile();
        const categoryRef = this.db.collection('categories').doc(categoryId);
        const categorySnapshot = await categoryRef.get();

        if (!categorySnapshot.exists) {
            throw new Error('카테고리를 찾을 수 없습니다.');
        }

        const categoryData = categorySnapshot.data();
        if (categoryData.created_by !== userProfile.uid && userProfile.role !== 'admin') {
            throw new Error('점자 항목을 삭제할 권한이 없습니다.');
        }

        const now = FirestoreTimestamp.now();

        await docRef.delete();
        await categoryRef.update({
            braille_count: FirestoreFieldValue.increment(-1),
            updated_at: now,
            last_imported_at: now
        });

        this.brailleCache.delete(categoryId);
        this.publicCategoryCache = [];

        return true;
    }

    async getUserStats(options = {}) {
        const { recentLimit = 10, maxLogs = 500 } = options;
        const firebaseUser = await this.ensureFirebaseUser(true);
        const query = this.db
            .collection('practice_logs')
            .where('user_id', '==', firebaseUser.uid)
            .orderBy('practiced_at', 'desc');

        const snapshot = maxLogs ? await query.limit(maxLogs).get() : await query.get();
        let totalTime = 0;
        let totalSessions = 0;
        const practicedDates = new Set();
        const weeklyDates = new Set();
        let weeklyTime = 0;
        const recentSessions = [];

        const weekThreshold = new Date();
        weekThreshold.setDate(weekThreshold.getDate() - 6);

        snapshot.forEach(doc => {
            const data = doc.data();
            const duration = data.duration_seconds || data.practice_time || 0;
            const practicedAt = this.toJsDate(data.practiced_at || data.practice_date);
            const dateKey = data.practice_date || practicedAt.toISOString().split('T')[0];

            totalTime += duration;
            totalSessions += 1;
            practicedDates.add(dateKey);

            if (practicedAt >= weekThreshold) {
                weeklyTime += duration;
                weeklyDates.add(dateKey);
            }

            if (recentSessions.length < recentLimit) {
                recentSessions.push({
                    id: doc.id,
                    date: practicedAt.toISOString(),
                    duration,
                    characters_completed: data.characters_completed || 0,
                    category_id: data.category_id || null
                });
            }
        });

        return {
            total_practice_time: totalTime,
            total_practice_sessions: totalSessions,
            total_practice_days: practicedDates.size,
            weekly_practice_time: weeklyTime,
            weekly_practice_days: weeklyDates.size,
            recent_sessions: recentSessions
        };
    }

    async getRecentPracticeSessions(limit = 10) {
        const stats = await this.getUserStats({ recentLimit: limit, maxLogs: limit });
        return stats.recent_sessions;
    }

    async getAttendance() {
        const user = await this.ensureUserProfile();
        const snapshot = await this.db
            .collection('attendance')
            .where('user_id', '==', user.uid)
            .get();
        return {
            attendance_dates: snapshot.docs.map(doc => doc.data().date).filter(Boolean)
        };
    }

    async getDailyRanking(limit = 5, maxLogsPerDay = 500) {
        const dateKey = this.getLocalDateKey();

        const query = this.db
            .collection('practice_logs')
            .where('practice_date', '==', dateKey);

        const snapshot = maxLogsPerDay
            ? await query.limit(maxLogsPerDay).get()
            : await query.get();

        if (snapshot.empty) {
            return [];
        }

        const rankingMap = new Map();

        snapshot.forEach(doc => {
            const data = doc.data();
            const userId = data.user_id;
            if (!userId) {
                return;
            }

            const duration = data.duration_seconds || data.practice_time || 0;
            if (!rankingMap.has(userId)) {
                rankingMap.set(userId, {
                    user_id: userId,
                    username: data.username
                        || (data.user_email ? data.user_email.split('@')[0] : '사용자'),
                    totalDuration: 0,
                    sessions: 0
                });
            }

            const entry = rankingMap.get(userId);
            entry.totalDuration += duration;
            entry.sessions += 1;
        });

        const ranking = Array.from(rankingMap.values())
            .sort((a, b) => {
                if (b.totalDuration === a.totalDuration) {
                    return a.username.localeCompare(b.username);
                }
                return b.totalDuration - a.totalDuration;
            })
            .slice(0, limit)
            .map((entry, index) => ({
                rank: index + 1,
                user_id: entry.user_id,
                username: entry.username,
                total_duration: entry.totalDuration,
                sessions: entry.sessions
            }));

        return ranking;
    }

    async getPosts() {
        const snapshot = await this.db
            .collection('posts')
            .orderBy('createdAt', 'desc')
            .get();
        const posts = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const post = { id: doc.id, ...data };
            if (data.createdAt && typeof data.createdAt.toDate === 'function') {
                post.createdAtDate = data.createdAt.toDate();
            }
            if (post.author_id) {
                const userDoc = await this.db.collection('users').doc(post.author_id).get();
                if (userDoc.exists) {
                    post.author_name = userDoc.data().username;
                }
            }
            posts.push(post);
        }
        return posts;
    }

    async getComments(postId) {
        const snapshot = await this.db
            .collection('comments')
            .where('postId', '==', postId)
            .orderBy('createdAt', 'asc')
            .get();
        const comments = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const comment = { id: doc.id, ...data };
            if (data.author_id) {
                const userDoc = await this.db.collection('users').doc(data.author_id).get();
                if (userDoc.exists) {
                    comment.author_name = userDoc.data().username;
                }
            }
            comments.push(comment);
        }
        return comments;
    }

    async getRandomBrailleCharacter(categoryId) {
        if (!categoryId) {
            throw new Error('카테고리를 선택해주세요.');
        }

        if (!this.brailleCache.has(categoryId)) {
            const snapshot = await this.db
                .collection('braille_data')
                .where('category_id', '==', categoryId)
                .get();
            if (snapshot.empty) {
                throw new Error('카테고리에 점자 데이터가 없습니다.');
            }
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.brailleCache.set(categoryId, docs);
        }

        const docs = this.brailleCache.get(categoryId);
        const randomDoc = docs[Math.floor(Math.random() * docs.length)];
        return {
            id: randomDoc.id,
            character: randomDoc.character,
            description: randomDoc.description || '',
            braille_pattern: this.normalizeBraillePattern(randomDoc.braille_pattern)
        };
    }

    async recordPracticeSession({ categoryId, durationSeconds, charactersCompleted }) {
        if (!durationSeconds || durationSeconds <= 0) {
            return null;
        }
        const firebaseUser = await this.ensureFirebaseUser(true);
        const profile = await this.ensureUserProfile();
        const now = FirestoreTimestamp.now();
        const dateKey = this.getLocalDateKey();

        const logData = {
            user_id: firebaseUser.uid,
            user_email: firebaseUser.email,
            username: profile.username,
            category_id: categoryId || null,
            duration_seconds: durationSeconds,
            characters_completed: charactersCompleted || 0,
            practiced_at: now,
            practice_date: dateKey,
            created_at: now
        };

        await this.db.collection('practice_logs').add(logData);

        const attendanceRef = this.db.collection('attendance').doc(`${firebaseUser.uid}_${dateKey}`);
        await attendanceRef.set({
            user_id: firebaseUser.uid,
            date: dateKey,
            last_practiced_at: now,
            practice_duration: FirestoreFieldValue.increment(durationSeconds)
        }, { merge: true });

        return logData;
    }

    async post(collection, data) {
        const docRef = await this.db.collection(collection).add({
            ...data,
            createdAt: data.createdAt || FirestoreTimestamp.now()
        });
        return { id: docRef.id, ...data };
    }

    async get(collection, docId) {
        const docRef = this.db.collection(collection).doc(docId);
        const snapshot = await docRef.get();
        if (!snapshot.exists) {
            throw new Error('문서를 찾을 수 없습니다.');
        }
        return { id: snapshot.id, ...snapshot.data() };
    }

    async put(collection, docId, data) {
        await this.db.collection(collection).doc(docId).update({
            ...data,
            updatedAt: FirestoreTimestamp.now()
        });
        return { id: docId, ...data };
    }

    async delete(collection, docId) {
        await this.db.collection(collection).doc(docId).delete();
        return { id: docId };
    }

    async deleteDocumentsByIds(collectionName, ids = []) {
        if (!Array.isArray(ids) || ids.length === 0) {
            return;
        }
        const chunkSize = 400;
        for (const chunk of this.chunkArray(ids, chunkSize)) {
            const batch = this.db.batch();
            chunk.forEach(id => {
                batch.delete(this.db.collection(collectionName).doc(id));
            });
            await batch.commit();
        }
    }

    normalizeBraillePattern(pattern) {
        if (!pattern) {
            return [];
        }
        if (Array.isArray(pattern)) {
            return pattern;
        }
        if (typeof pattern === 'string') {
            try {
                const parsed = JSON.parse(pattern);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            } catch (error) {
                // Fallback to custom parsing "1,2|3,4"
                return pattern.split(/\//).map(block =>
                    block
                        .split(/[^0-9]+/)
                        .map(n => parseInt(n, 10))
                        .filter(Boolean)
                );
            }
        }
        return [];
    }

    toJsDate(value) {
        if (!value) {
            return new Date();
        }
        if (typeof value === 'string') {
            return new Date(value);
        }
        if (value.toDate) {
            return value.toDate();
        }
        return new Date();
    }

    chunkArray(items, chunkSize) {
        const chunks = [];
        for (let i = 0; i < items.length; i += chunkSize) {
            chunks.push(items.slice(i, i + chunkSize));
        }
        return chunks;
    }

    // Helper to get user-friendly error messages from Firebase
    getFirebaseAuthErrorMessage(error) {
        switch (error.code) {
            case 'auth/invalid-email':
                return '유효하지 않은 이메일 주소입니다.';
            case 'auth/user-disabled':
                return '이 계정은 비활성화되었습니다.';
            case 'auth/user-not-found':
                return '사용자를 찾을 수 없습니다.';
            case 'auth/wrong-password':
                return '잘못된 비밀번호입니다.';
            case 'auth/email-already-in-use':
                return '이미 사용 중인 이메일 주소입니다.';
            case 'auth/weak-password':
                return '비밀번호는 6자 이상이어야 합니다.';
            default: {
                const errorMessage = error && error.message ? error.message : '';
                // Firebase REST 에러 응답(body.error.message)이 있을 경우 표시
                if (error && error.message && /INVALID_LOGIN_CREDENTIALS/.test(error.message)) {
                    return '이메일 또는 비밀번호가 올바르지 않습니다.';
                }
                if (error && error.code === 'auth/too-many-requests') {
                    return '시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
                }
                return '인증 오류가 발생했습니다: ' + (errorMessage || '알 수 없는 오류');
            }
        }
    }
}

function createApiClientInstance() {
    if (typeof window !== 'undefined' && typeof window.__createMockApiClient === 'function') {
        return window.__createMockApiClient();
    }
    return new FirebaseApiClient();
}

// Create global instance when running in browser
if (typeof window !== 'undefined') {
    window.apiClient = createApiClientInstance();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseApiClient;
}
