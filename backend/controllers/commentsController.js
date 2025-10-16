const { getDb } = require('../config/firebase');

const commentsController = {
  // 특정 게시글의 댓글 조회 (계층구조)
  getCommentsByPostId: async (req, res) => {
    try {
      const db = getDb();
      const postId = req.params.postId;

      // 댓글과 사용자 정보를 조회
      const commentsSnapshot = await db.collection('comments').where('post_id', '==', postId).get();
      const comments = commentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const usersSnapshot = await db.collection('users').get();
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 사용자 정보를 맵으로 변환
      const userMap = new Map();
      users.forEach(user => {
        userMap.set(user.id, user);
      });

      // 댓글에 작성자 이름 추가
      const commentsWithAuthor = comments.map(comment => ({
        ...comment,
        author_name: userMap.get(comment.author_id)?.username || 'Unknown'
      }));

      // 댓글을 계층구조로 변환
      const commentMap = new Map();
      const rootComments = [];

      // 모든 댓글을 맵에 저장하고 children 배열 초기화
      commentsWithAuthor.forEach(comment => {
        comment.children = [];
        commentMap.set(comment.id, comment);
      });

      // 부모-자식 관계 설정
      commentsWithAuthor.forEach(comment => {
        if (comment.parent_comment_id) {
          const parent = commentMap.get(comment.parent_comment_id);
          if (parent) {
            parent.children.push(comment);
          }
        } else {
          rootComments.push(comment);
        }
      });

      // 생성 시간 순으로 정렬
      rootComments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      res.json(rootComments);
    } catch (err) {
      console.error('댓글 조회 오류:', err);
      res.status(500).json({ error: '댓글을 조회할 수 없습니다.' });
    }
  },

  // 댓글 생성
  createComment: async (req, res) => {
    try {
      const db = getDb();
      const postId = req.params.postId;
      const { content, parentCommentId } = req.body;
      const authorId = req.user.id;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: '댓글 내용은 필수입니다.' });
      }

      // 게시글 존재 확인
      const postDoc = await db.collection('posts').doc(postId).get();
      if (!postDoc.exists) {
        return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      }

      // 부모 댓글이 있는 경우 존재 확인
      if (parentCommentId) {
        const parentCommentDoc = await db.collection('comments').doc(parentCommentId).get();
        if (!parentCommentDoc.exists || parentCommentDoc.data().post_id !== postId) {
          return res.status(400).json({ error: '부모 댓글을 찾을 수 없습니다.' });
        }
      }

      const now = new Date().toISOString();

      // 댓글 생성
      const commentData = {
        post_id: postId,
        parent_comment_id: parentCommentId || null,
        content: content.trim(),
        author_id: authorId,
        created_at: now,
        updated_at: null
      };

      const commentRef = await db.collection('comments').add(commentData);

      // 생성된 댓글 정보 조회 (작성자 이름 포함)
      const authorDoc = await db.collection('users').doc(authorId).get();
      const author = authorDoc.exists ? { id: authorDoc.id, ...authorDoc.data() } : null;

      const responseComment = {
        id: commentRef.id,
        ...commentData,
        author_name: author?.username || 'Unknown',
        children: []
      };

      res.status(201).json(responseComment);
    } catch (err) {
      console.error('댓글 생성 오류:', err);
      res.status(500).json({ error: '댓글을 생성할 수 없습니다.' });
    }
  },

  // 댓글 수정
  updateComment: async (req, res) => {
    try {
      const db = getDb();
      const commentId = req.params.id;
      const { content } = req.body;
      const userId = req.user.id;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: '댓글 내용은 필수입니다.' });
      }

      // 댓글 작성자 확인
      const commentDoc = await db.collection('comments').doc(commentId).get();
      if (!commentDoc.exists) {
        return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
      }

      const comment = { id: commentDoc.id, ...commentDoc.data() };

      if (comment.author_id !== userId) {
        return res.status(403).json({ error: '댓글을 수정할 권한이 없습니다.' });
      }

      // 댓글 수정
      await db.collection('comments').doc(commentId).update({
        content: content.trim(),
        updated_at: new Date().toISOString()
      });

      // 수정된 댓글 정보 조회 (작성자 이름 포함)
      const updatedCommentDoc = await db.collection('comments').doc(commentId).get();
      const updatedComment = { id: updatedCommentDoc.id, ...updatedCommentDoc.data() };

      const authorDoc = await db.collection('users').doc(updatedComment.author_id).get();
      const author = authorDoc.exists ? { id: authorDoc.id, ...authorDoc.data() } : null;

      const responseComment = {
        ...updatedComment,
        author_name: author?.username || 'Unknown',
        children: []
      };

      res.json(responseComment);
    } catch (err) {
      console.error('댓글 수정 오류:', err);
      res.status(500).json({ error: '댓글을 수정할 수 없습니다.' });
    }
  },

  // 댓글 삭제
  deleteComment: async (req, res) => {
    try {
      const db = getDb();
      const commentId = req.params.id;
      const userId = req.user.id;

      // 댓글 작성자 확인
      const commentDoc = await db.collection('comments').doc(commentId).get();
      if (!commentDoc.exists) {
        return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
      }

      const comment = { id: commentDoc.id, ...commentDoc.data() };

      if (comment.author_id !== userId) {
        return res.status(403).json({ error: '댓글을 삭제할 권한이 없습니다.' });
      }

      // 대댓글들도 함께 삭제
      const childCommentsSnapshot = await db.collection('comments').where('parent_comment_id', '==', commentId).get();
      const batch = db.batch();
      childCommentsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // 댓글 삭제
      await db.collection('comments').doc(commentId).delete();

      res.json({ message: '댓글이 삭제되었습니다.' });
    } catch (err) {
      console.error('댓글 삭제 오류:', err);
      res.status(500).json({ error: '댓글을 삭제할 수 없습니다.' });
    }
  }
};

module.exports = commentsController;