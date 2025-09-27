const { getDb } = require('../config/database');

const commentsController = {
  // 특정 게시글의 댓글 조회 (계층구조)
  getCommentsByPostId: (req, res) => {
    const db = getDb();
    const postId = req.params.postId;

    const query = `
      SELECT c.*, u.username as author_name
      FROM comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `;

    db.all(query, [postId], (err, comments) => {
      if (err) {
        return res.status(500).json({ error: '댓글을 조회할 수 없습니다.' });
      }

      // 댓글을 계층구조로 변환
      const commentMap = new Map();
      const rootComments = [];

      // 모든 댓글을 맵에 저장하고 children 배열 초기화
      comments.forEach(comment => {
        comment.children = [];
        commentMap.set(comment.id, comment);
      });

      // 부모-자식 관계 설정
      comments.forEach(comment => {
        if (comment.parent_comment_id) {
          const parent = commentMap.get(comment.parent_comment_id);
          if (parent) {
            parent.children.push(comment);
          }
        } else {
          rootComments.push(comment);
        }
      });

      res.json(rootComments);
    });
  },

  // 댓글 생성
  createComment: (req, res) => {
    const db = getDb();
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;
    const authorId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '댓글 내용은 필수입니다.' });
    }

    // 게시글 존재 확인
    const checkPostQuery = `SELECT id FROM posts WHERE id = ?`;

    db.get(checkPostQuery, [postId], (err, post) => {
      if (err) {
        return res.status(500).json({ error: '게시글을 확인할 수 없습니다.' });
      }

      if (!post) {
        return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      }

      // 부모 댓글이 있는 경우 존재 확인
      const checkParentComment = (callback) => {
        if (!parentCommentId) {
          return callback(null);
        }

        const checkParentQuery = `
          SELECT id FROM comments
          WHERE id = ? AND post_id = ?
        `;

        db.get(checkParentQuery, [parentCommentId, postId], (err, parentComment) => {
          if (err) {
            return callback(err);
          }

          if (!parentComment) {
            return callback(new Error('부모 댓글을 찾을 수 없습니다.'));
          }

          callback(null);
        });
      };

      checkParentComment((err) => {
        if (err) {
          return res.status(400).json({ error: err.message });
        }

        const insertQuery = `
          INSERT INTO comments (post_id, parent_comment_id, content, author_id)
          VALUES (?, ?, ?, ?)
        `;

        const values = [postId, parentCommentId || null, content.trim(), authorId];

        db.run(insertQuery, values, function(err) {
          if (err) {
            return res.status(500).json({ error: '댓글을 생성할 수 없습니다.' });
          }

          // 생성된 댓글 정보 반환
          const selectQuery = `
            SELECT c.*, u.username as author_name
            FROM comments c
            JOIN users u ON c.author_id = u.id
            WHERE c.id = ?
          `;

          db.get(selectQuery, [this.lastID], (err, comment) => {
            if (err) {
              return res.status(500).json({ error: '댓글 정보를 조회할 수 없습니다.' });
            }

            comment.children = [];
            res.status(201).json(comment);
          });
        });
      });
    });
  },

  // 댓글 수정
  updateComment: (req, res) => {
    const db = getDb();
    const commentId = req.params.id;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '댓글 내용은 필수입니다.' });
    }

    // 댓글 작성자 확인
    const checkQuery = `SELECT author_id FROM comments WHERE id = ?`;

    db.get(checkQuery, [commentId], (err, comment) => {
      if (err) {
        return res.status(500).json({ error: '댓글을 조회할 수 없습니다.' });
      }

      if (!comment) {
        return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
      }

      if (comment.author_id !== userId) {
        return res.status(403).json({ error: '댓글을 수정할 권한이 없습니다.' });
      }

      const updateQuery = `
        UPDATE comments
        SET content = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      db.run(updateQuery, [content.trim(), commentId], function(err) {
        if (err) {
          return res.status(500).json({ error: '댓글을 수정할 수 없습니다.' });
        }

        // 수정된 댓글 정보 반환
        const selectQuery = `
          SELECT c.*, u.username as author_name
          FROM comments c
          JOIN users u ON c.author_id = u.id
          WHERE c.id = ?
        `;

        db.get(selectQuery, [commentId], (err, updatedComment) => {
          if (err) {
            return res.status(500).json({ error: '댓글 정보를 조회할 수 없습니다.' });
          }

          updatedComment.children = [];
          res.json(updatedComment);
        });
      });
    });
  },

  // 댓글 삭제
  deleteComment: (req, res) => {
    const db = getDb();
    const commentId = req.params.id;
    const userId = req.user.id;

    // 댓글 작성자 확인
    const checkQuery = `SELECT author_id FROM comments WHERE id = ?`;

    db.get(checkQuery, [commentId], (err, comment) => {
      if (err) {
        return res.status(500).json({ error: '댓글을 조회할 수 없습니다.' });
      }

      if (!comment) {
        return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
      }

      if (comment.author_id !== userId) {
        return res.status(403).json({ error: '댓글을 삭제할 권한이 없습니다.' });
      }

      const deleteQuery = `DELETE FROM comments WHERE id = ?`;

      db.run(deleteQuery, [commentId], function(err) {
        if (err) {
          return res.status(500).json({ error: '댓글을 삭제할 수 없습니다.' });
        }

        res.json({ message: '댓글이 삭제되었습니다.' });
      });
    });
  }
};

module.exports = commentsController;