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

describe('Comments API', () => {
    let authToken;
    let userId;
    let postId;
    let commentId;
    let replyId;

    beforeAll(async () => {
        // Create tables
        await createTables();

        // Register a test user
        const registerResponse = await request(app)
            .post('/api/auth/signup')
            .send({
                username: 'testuser_comments',
                password: 'testpass123'
            });

        expect(registerResponse.status).toBe(201);
        authToken = registerResponse.body.token;
        userId = registerResponse.body.user.id;

        // Create a test post
        const postResponse = await request(app)
            .post('/api/posts')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                title: '댓글 테스트용 게시글',
                content: '댓글 테스트를 위한 게시글입니다.'
            });

        postId = postResponse.body.id;
    });

    afterAll(async () => {
        // Clean up database
        const db = getDb();
        db.run('DELETE FROM comments WHERE 1=1');
        db.run('DELETE FROM posts WHERE 1=1');
        db.run('DELETE FROM users WHERE username = ?', ['testuser_comments']);
        await closeDb(db);
    });

    describe('POST /api/comments/posts/:postId', () => {
        test('should create a new comment', async () => {
            const commentData = {
                content: '이것은 테스트 댓글입니다.'
            };

            const response = await request(app)
                .post(`/api/comments/posts/${postId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(commentData);

            expect(response.status).toBe(201);
            expect(response.body.content).toBe(commentData.content);
            expect(response.body.author_name).toBe('testuser_comments');
            expect(response.body.post_id).toBe(postId);
            expect(response.body.parent_comment_id).toBeNull();
            expect(response.body.children).toEqual([]);

            commentId = response.body.id;
        });

        test('should create a reply to existing comment', async () => {
            const replyData = {
                content: '이것은 댓글에 대한 답글입니다.',
                parentCommentId: commentId
            };

            const response = await request(app)
                .post(`/api/comments/posts/${postId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(replyData);

            expect(response.status).toBe(201);
            expect(response.body.content).toBe(replyData.content);
            expect(response.body.parent_comment_id).toBe(commentId);
            expect(response.body.children).toEqual([]);

            replyId = response.body.id;
        });

        test('should fail to create comment without authentication', async () => {
            const commentData = {
                content: '인증 없는 댓글'
            };

            const response = await request(app)
                .post(`/api/comments/posts/${postId}`)
                .send(commentData);

            expect(response.status).toBe(401);
        });

        test('should fail to create comment without content', async () => {
            const response = await request(app)
                .post(`/api/comments/posts/${postId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('댓글 내용은 필수입니다.');
        });

        test('should fail to create comment with empty content', async () => {
            const commentData = {
                content: '   '
            };

            const response = await request(app)
                .post(`/api/comments/posts/${postId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(commentData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('댓글 내용은 필수입니다.');
        });

        test('should fail to create comment for non-existent post', async () => {
            const commentData = {
                content: '존재하지 않는 게시글에 대한 댓글'
            };

            const response = await request(app)
                .post('/api/comments/posts/99999')
                .set('Authorization', `Bearer ${authToken}`)
                .send(commentData);

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('게시글을 찾을 수 없습니다.');
        });

        test('should fail to create reply for non-existent parent comment', async () => {
            const replyData = {
                content: '존재하지 않는 댓글에 대한 답글',
                parentCommentId: 99999
            };

            const response = await request(app)
                .post(`/api/comments/posts/${postId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(replyData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('부모 댓글을 찾을 수 없습니다.');
        });
    });

    describe('GET /api/comments/posts/:postId', () => {
        test('should get all comments for a post with hierarchy', async () => {
            const response = await request(app)
                .get(`/api/comments/posts/${postId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);

            // Find the parent comment
            const parentComment = response.body.find(c => c.id === commentId);
            expect(parentComment).toBeDefined();
            expect(parentComment.children).toBeDefined();
            expect(parentComment.children.length).toBe(1);
            expect(parentComment.children[0].id).toBe(replyId);
        });

        test('should return empty array for post with no comments', async () => {
            // Create another post
            const postResponse = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: '댓글 없는 게시글',
                    content: '댓글이 없는 테스트 게시글입니다.'
                });

            const emptyPostId = postResponse.body.id;

            const response = await request(app)
                .get(`/api/comments/posts/${emptyPostId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(0);

            // Clean up
            await request(app)
                .delete(`/api/posts/${emptyPostId}`)
                .set('Authorization', `Bearer ${authToken}`);
        });
    });

    describe('PUT /api/comments/:id', () => {
        test('should update comment by owner', async () => {
            const updateData = {
                content: '수정된 댓글 내용입니다.'
            };

            const response = await request(app)
                .put(`/api/comments/${commentId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.content).toBe(updateData.content);
            expect(response.body.id).toBe(commentId);
        });

        test('should fail to update comment by non-owner', async () => {
            // Create another user
            const registerResponse = await request(app)
            .post('/api/auth/signup')
            .send({
                username: 'anotheruser_comment',
                password: 'testpass123'
            });

            const anotherToken = registerResponse.body.token;

            const updateData = {
                content: '무단 수정 시도'
            };

            const response = await request(app)
                .put(`/api/comments/${commentId}`)
                .set('Authorization', `Bearer ${anotherToken}`)
                .send(updateData);

            expect(response.status).toBe(403);
            expect(response.body.error).toBe('댓글을 수정할 권한이 없습니다.');

            // Clean up
            const db = getDb();
            db.run('DELETE FROM users WHERE username = ?', ['anotheruser_comment']);
        });

        test('should fail to update comment without content', async () => {
            const response = await request(app)
                .put(`/api/comments/${commentId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('댓글 내용은 필수입니다.');
        });

        test('should fail to update non-existent comment', async () => {
            const updateData = {
                content: '존재하지 않는 댓글 수정'
            };

            const response = await request(app)
                .put('/api/comments/99999')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData);

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('댓글을 찾을 수 없습니다.');
        });
    });

    describe('DELETE /api/comments/:id', () => {
        test('should fail to delete comment by non-owner', async () => {
            // Create another user
            const registerResponse = await request(app)
                .post('/api/auth/signup')
                .send({
                    username: 'deleteuser_comment',
                    password: 'testpass123'
                });

            const anotherToken = registerResponse.body.token;

            const response = await request(app)
                .delete(`/api/comments/${commentId}`)
                .set('Authorization', `Bearer ${anotherToken}`);

            expect(response.status).toBe(403);
            expect(response.body.error).toBe('댓글을 삭제할 권한이 없습니다.');

            // Clean up
            const db = getDb();
            db.run('DELETE FROM users WHERE username = ?', ['deleteuser_comment']);
        });

        test('should delete reply first', async () => {
            const response = await request(app)
                .delete(`/api/comments/${replyId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('댓글이 삭제되었습니다.');
        });

        test('should delete parent comment', async () => {
            const response = await request(app)
                .delete(`/api/comments/${commentId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('댓글이 삭제되었습니다.');

            // Verify comments are deleted
            const getResponse = await request(app)
                .get(`/api/comments/posts/${postId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(getResponse.status).toBe(200);
            expect(getResponse.body.length).toBe(0);
        });

        test('should fail to delete non-existent comment', async () => {
            const response = await request(app)
                .delete('/api/comments/99999')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('댓글을 찾을 수 없습니다.');
        });
    });
});