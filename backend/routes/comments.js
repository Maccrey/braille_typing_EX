const express = require('express');
const router = express.Router();
const commentsController = require('../controllers/commentsController');
const authenticateToken = require('../middleware/authMiddleware');

// 특정 게시글의 댓글 조회 (인증 필요)
router.get('/posts/:postId', authenticateToken, commentsController.getCommentsByPostId);

// 댓글 생성 (인증 필요)
router.post('/posts/:postId', authenticateToken, commentsController.createComment);

// 댓글 수정 (인증 필요)
router.put('/:id', authenticateToken, commentsController.updateComment);

// 댓글 삭제 (인증 필요)
router.delete('/:id', authenticateToken, commentsController.deleteComment);

module.exports = router;