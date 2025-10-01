const { getDb } = require('../config/database');

const postsController = {
  // 모든 게시글 조회
  getAllPosts: async (req, res) => {
    try {
      const db = getDb();
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      // Get all posts, users, and comments
      const allPosts = await db.select('posts', {});
      const allUsers = await db.select('users', {});
      const allComments = await db.select('comments', {});

      // Create user lookup map
      const userMap = {};
      allUsers.forEach(user => {
        userMap[user.id] = user;
      });

      // Create comment count map
      const commentCountMap = {};
      allComments.forEach(comment => {
        commentCountMap[comment.post_id] = (commentCountMap[comment.post_id] || 0) + 1;
      });

      // Join posts with user data and add comment counts
      const postsWithDetails = allPosts.map(post => ({
        ...post,
        author_name: userMap[post.author_id]?.username || 'Unknown',
        comment_count: commentCountMap[post.id] || 0
      }));

      // Sort by created_at DESC
      postsWithDetails.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Apply pagination
      const totalPosts = postsWithDetails.length;
      const paginatedPosts = postsWithDetails.slice(offset, offset + limit);

      res.json({
        posts: paginatedPosts,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalPosts / limit),
          totalPosts: totalPosts,
          hasNext: page * limit < totalPosts,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Get all posts error:', error);
      res.status(500).json({ error: '게시글을 조회할 수 없습니다.' });
    }
  },

  // 특정 게시글 조회
  getPostById: async (req, res) => {
    try {
      const db = getDb();
      const postId = parseInt(req.params.id);

      // 게시글 조회
      const post = await db.selectOne('posts', { id: postId });

      if (!post) {
        return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      }

      // 작성자 정보 조회
      const author = await db.selectOne('users', { id: post.author_id });

      // 응답 데이터 구성
      const postWithAuthor = {
        ...post,
        author_name: author ? author.username : 'Unknown'
      };

      res.json(postWithAuthor);

    } catch (error) {
      console.error('Get post by id error:', error);
      res.status(500).json({ error: '게시글을 조회할 수 없습니다.' });
    }
  },

  // 게시글 생성
  createPost: async (req, res) => {
    try {
      const db = getDb();
      const { title, content } = req.body;
      const authorId = req.user.id;

      if (!title || !content) {
        return res.status(400).json({ error: '제목과 내용은 필수입니다.' });
      }

      if (title.length > 255) {
        return res.status(400).json({ error: '제목은 255자를 초과할 수 없습니다.' });
      }

      // 게시글 생성
      const result = await db.insert('posts', {
        title,
        content,
        author_id: authorId
      });

      // 작성자 정보 조회
      const author = await db.selectOne('users', { id: authorId });

      // 생성된 게시글 정보 구성
      const createdPost = {
        id: result.lastID,
        title,
        content,
        author_id: authorId,
        author_name: author ? author.username : 'Unknown',
        created_at: new Date().toISOString(),
        updated_at: null
      };

      res.status(201).json(createdPost);

    } catch (error) {
      console.error('Create post error:', error);
      res.status(500).json({ error: '게시글을 생성할 수 없습니다.' });
    }
  },

  // 게시글 수정
  updatePost: async (req, res) => {
    try {
      const db = getDb();
      const postId = parseInt(req.params.id);
      const { title, content } = req.body;
      const userId = req.user.id;

      if (!title || !content) {
        return res.status(400).json({ error: '제목과 내용은 필수입니다.' });
      }

      // 게시글 작성자 확인
      const post = await db.selectOne('posts', { id: postId });
      if (!post) {
        return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      }

      if (post.author_id !== userId) {
        return res.status(403).json({ error: '게시글을 수정할 권한이 없습니다.' });
      }

      // 게시글 수정
      await db.update('posts',
        { title, content },
        { id: postId }
      );

      // 수정된 게시글 정보 조회 (작성자 이름 포함)
      const updatedPost = await db.selectOne('posts', { id: postId });
      const author = await db.selectOne('users', { id: updatedPost.author_id });

      const responsePost = {
        ...updatedPost,
        author_name: author?.username || 'Unknown'
      };

      res.json(responsePost);
    } catch (err) {
      console.error('게시글 수정 오류:', err);
      res.status(500).json({ error: '게시글을 수정할 수 없습니다.' });
    }
  },

  // 게시글 삭제
  deletePost: async (req, res) => {
    try {
      const db = getDb();
      const postId = parseInt(req.params.id);
      const userId = req.user.id;

      // 게시글 작성자 확인
      const post = await db.selectOne('posts', { id: postId });
      if (!post) {
        return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      }

      if (post.author_id !== userId) {
        return res.status(403).json({ error: '게시글을 삭제할 권한이 없습니다.' });
      }

      // 관련 댓글들도 함께 삭제
      await db.delete('comments', { post_id: postId });

      // 게시글 삭제
      await db.delete('posts', { id: postId });

      res.json({ message: '게시글이 삭제되었습니다.' });
    } catch (err) {
      console.error('게시글 삭제 오류:', err);
      res.status(500).json({ error: '게시글을 삭제할 수 없습니다.' });
    }
  }
};

module.exports = postsController;