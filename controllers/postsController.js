const { getDb } = require('../config/database');

const postsController = {
  // 모든 게시글 조회
  getAllPosts: (req, res) => {
    const db = getDb();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const query = `
      SELECT p.*, u.username as author_name,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
      FROM posts p
      JOIN users u ON p.author_id = u.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `SELECT COUNT(*) as total FROM posts`;

    db.get(countQuery, (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: '게시글 수를 조회할 수 없습니다.' });
      }

      db.all(query, [limit, offset], (err, posts) => {
        if (err) {
          return res.status(500).json({ error: '게시글을 조회할 수 없습니다.' });
        }

        res.json({
          posts,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(countResult.total / limit),
            totalPosts: countResult.total,
            hasNext: page * limit < countResult.total,
            hasPrev: page > 1
          }
        });
      });
    });
  },

  // 특정 게시글 조회
  getPostById: (req, res) => {
    const db = getDb();
    const postId = req.params.id;

    const query = `
      SELECT p.*, u.username as author_name
      FROM posts p
      JOIN users u ON p.author_id = u.id
      WHERE p.id = ?
    `;

    db.get(query, [postId], (err, post) => {
      if (err) {
        return res.status(500).json({ error: '게시글을 조회할 수 없습니다.' });
      }

      if (!post) {
        return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      }

      res.json(post);
    });
  },

  // 게시글 생성
  createPost: (req, res) => {
    const db = getDb();
    const { title, content } = req.body;
    const authorId = req.user.id;

    if (!title || !content) {
      return res.status(400).json({ error: '제목과 내용은 필수입니다.' });
    }

    if (title.length > 255) {
      return res.status(400).json({ error: '제목은 255자를 초과할 수 없습니다.' });
    }

    const query = `
      INSERT INTO posts (title, content, author_id)
      VALUES (?, ?, ?)
    `;

    db.run(query, [title, content, authorId], function(err) {
      if (err) {
        return res.status(500).json({ error: '게시글을 생성할 수 없습니다.' });
      }

      // 생성된 게시글 정보 반환
      const selectQuery = `
        SELECT p.*, u.username as author_name
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE p.id = ?
      `;

      db.get(selectQuery, [this.lastID], (err, post) => {
        if (err) {
          return res.status(500).json({ error: '게시글 정보를 조회할 수 없습니다.' });
        }

        res.status(201).json(post);
      });
    });
  },

  // 게시글 수정
  updatePost: (req, res) => {
    const db = getDb();
    const postId = req.params.id;
    const { title, content } = req.body;
    const userId = req.user.id;

    if (!title || !content) {
      return res.status(400).json({ error: '제목과 내용은 필수입니다.' });
    }

    // 게시글 작성자 확인
    const checkQuery = `SELECT author_id FROM posts WHERE id = ?`;

    db.get(checkQuery, [postId], (err, post) => {
      if (err) {
        return res.status(500).json({ error: '게시글을 조회할 수 없습니다.' });
      }

      if (!post) {
        return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      }

      if (post.author_id !== userId) {
        return res.status(403).json({ error: '게시글을 수정할 권한이 없습니다.' });
      }

      const updateQuery = `
        UPDATE posts
        SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      db.run(updateQuery, [title, content, postId], function(err) {
        if (err) {
          return res.status(500).json({ error: '게시글을 수정할 수 없습니다.' });
        }

        // 수정된 게시글 정보 반환
        const selectQuery = `
          SELECT p.*, u.username as author_name
          FROM posts p
          JOIN users u ON p.author_id = u.id
          WHERE p.id = ?
        `;

        db.get(selectQuery, [postId], (err, updatedPost) => {
          if (err) {
            return res.status(500).json({ error: '게시글 정보를 조회할 수 없습니다.' });
          }

          res.json(updatedPost);
        });
      });
    });
  },

  // 게시글 삭제
  deletePost: (req, res) => {
    const db = getDb();
    const postId = req.params.id;
    const userId = req.user.id;

    // 게시글 작성자 확인
    const checkQuery = `SELECT author_id FROM posts WHERE id = ?`;

    db.get(checkQuery, [postId], (err, post) => {
      if (err) {
        return res.status(500).json({ error: '게시글을 조회할 수 없습니다.' });
      }

      if (!post) {
        return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      }

      if (post.author_id !== userId) {
        return res.status(403).json({ error: '게시글을 삭제할 권한이 없습니다.' });
      }

      const deleteQuery = `DELETE FROM posts WHERE id = ?`;

      db.run(deleteQuery, [postId], function(err) {
        if (err) {
          return res.status(500).json({ error: '게시글을 삭제할 수 없습니다.' });
        }

        res.json({ message: '게시글이 삭제되었습니다.' });
      });
    });
  }
};

module.exports = postsController;