const request = require('supertest');
const { getDb, closeDb } = require('../config/database');
const { createTables } = require('../init-db');

// Create the app for testing
const express = require('express');
const cors = require('cors');
const postsRoutes = require('../routes/posts');
const commentsRoutes = require('../routes/comments');
const authRoutes = require('../routes/authRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/comments', commentsRoutes);

describe('Posts API', () => {
    let authToken;
    let userId;
    let postId;

    beforeAll(async () => {
        // Create tables
        await createTables();

        // Register a test user
        const registerResponse = await request(app)
            .post('/api/auth/signup')
            .send({
                username: 'testuser_posts',
                password: 'testpass123'
            });

        expect(registerResponse.status).toBe(201);
        authToken = registerResponse.body.token;
        userId = registerResponse.body.user.id;
    });

    afterAll(async () => {
        // Clean up database
        const db = getDb();
        db.run('DELETE FROM comments WHERE 1=1');
        db.run('DELETE FROM posts WHERE 1=1');
        db.run('DELETE FROM users WHERE username = ?', ['testuser_posts']);
        await closeDb(db);
    });

    describe('POST /api/posts', () => {
        test('should create a new post with valid data', async () => {
            const postData = {
                title: '테스트 게시글',
                content: '이것은 테스트 게시글 내용입니다.'
            };

            const response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(postData);

            expect(response.status).toBe(201);
            expect(response.body.title).toBe(postData.title);
            expect(response.body.content).toBe(postData.content);
            expect(response.body.author_name).toBe('testuser_posts');
            expect(response.body.id).toBeDefined();

            postId = response.body.id;
        });

        test('should fail to create post without authentication', async () => {
            const postData = {
                title: '테스트 게시글',
                content: '이것은 테스트 게시글 내용입니다.'
            };

            const response = await request(app)
                .post('/api/posts')
                .send(postData);

            expect(response.status).toBe(401);
        });

        test('should fail to create post without title', async () => {
            const postData = {
                content: '이것은 테스트 게시글 내용입니다.'
            };

            const response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(postData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('제목과 내용은 필수입니다.');
        });

        test('should fail to create post without content', async () => {
            const postData = {
                title: '테스트 게시글'
            };

            const response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(postData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('제목과 내용은 필수입니다.');
        });

        test('should fail to create post with title longer than 255 characters', async () => {
            const postData = {
                title: 'a'.repeat(256),
                content: '이것은 테스트 게시글 내용입니다.'
            };

            const response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(postData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('제목은 255자를 초과할 수 없습니다.');
        });
    });

    describe('GET /api/posts', () => {
        test('should get all posts with pagination', async () => {
            const response = await request(app)
                .get('/api/posts')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.posts).toBeDefined();
            expect(response.body.pagination).toBeDefined();
            expect(response.body.posts.length).toBeGreaterThan(0);
            expect(response.body.posts[0].comment_count).toBeDefined();
        });

        test('should get posts with custom pagination parameters', async () => {
            const response = await request(app)
                .get('/api/posts?page=1&limit=5')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.pagination.currentPage).toBe(1);
        });
    });

    describe('GET /api/posts/:id', () => {
        test('should get a specific post by id', async () => {
            const response = await request(app)
                .get(`/api/posts/${postId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(postId);
            expect(response.body.title).toBe('테스트 게시글');
            expect(response.body.author_name).toBe('testuser_posts');
        });

        test('should return 404 for non-existent post', async () => {
            const response = await request(app)
                .get('/api/posts/99999')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('게시글을 찾을 수 없습니다.');
        });
    });

    describe('PUT /api/posts/:id', () => {
        test('should update post by owner', async () => {
            const updateData = {
                title: '수정된 게시글 제목',
                content: '수정된 게시글 내용입니다.'
            };

            const response = await request(app)
                .put(`/api/posts/${postId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.title).toBe(updateData.title);
            expect(response.body.content).toBe(updateData.content);
        });

        test('should fail to update post by non-owner', async () => {
            // Create another user
            const registerResponse = await request(app)
                .post('/api/auth/signup')
                .send({
                    username: 'anotheruser',
                    password: 'testpass123'
                });

            const anotherToken = registerResponse.body.token;

            const updateData = {
                title: '무단 수정 시도',
                content: '무단 수정 내용'
            };

            const response = await request(app)
                .put(`/api/posts/${postId}`)
                .set('Authorization', `Bearer ${anotherToken}`)
                .send(updateData);

            expect(response.status).toBe(403);
            expect(response.body.error).toBe('게시글을 수정할 권한이 없습니다.');

            // Clean up
            const db = getDb();
            db.run('DELETE FROM users WHERE username = ?', ['anotheruser']);
        });

        test('should fail to update non-existent post', async () => {
            const updateData = {
                title: '수정 시도',
                content: '수정 내용'
            };

            const response = await request(app)
                .put('/api/posts/99999')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData);

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('게시글을 찾을 수 없습니다.');
        });
    });

    describe('DELETE /api/posts/:id', () => {
        test('should fail to delete post by non-owner', async () => {
            // Create another user
            const registerResponse = await request(app)
                .post('/api/auth/signup')
                .send({
                    username: 'deleteuser',
                    password: 'testpass123'
                });

            const anotherToken = registerResponse.body.token;

            const response = await request(app)
                .delete(`/api/posts/${postId}`)
                .set('Authorization', `Bearer ${anotherToken}`);

            expect(response.status).toBe(403);
            expect(response.body.error).toBe('게시글을 삭제할 권한이 없습니다.');

            // Clean up
            const db = getDb();
            db.run('DELETE FROM users WHERE username = ?', ['deleteuser']);
        });

        test('should delete post by owner', async () => {
            const response = await request(app)
                .delete(`/api/posts/${postId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('게시글이 삭제되었습니다.');

            // Verify post is deleted
            const getResponse = await request(app)
                .get(`/api/posts/${postId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(getResponse.status).toBe(404);
        });

        test('should fail to delete non-existent post', async () => {
            const response = await request(app)
                .delete('/api/posts/99999')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('게시글을 찾을 수 없습니다.');
        });
    });
});