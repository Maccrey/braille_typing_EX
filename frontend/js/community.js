
class CommunityManager {
    constructor() {
        this.currentPage = 1;
        this.totalPages = 1;
        this.currentPost = null;
        this.editingPost = null;
        this.editingComment = null;
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        const createPostBtn = document.getElementById('create-post-btn');
        if (createPostBtn) {
            createPostBtn.addEventListener('click', () => this.showCreatePostModal());
        }

        const postForm = document.getElementById('post-form');
        if (postForm) {
            postForm.addEventListener('submit', (e) => this.handlePostSubmit(e));
        }

        this.bindModalEvents();
        this.bindPaginationEvents();
    }

    bindModalEvents() {
        const postModal = document.getElementById('post-modal');
        const postModalClose = document.getElementById('post-modal-close');
        const postCancelBtn = document.getElementById('post-cancel-btn');

        if (postModalClose) {
            postModalClose.addEventListener('click', () => this.hidePostModal());
        }
        if (postCancelBtn) {
            postCancelBtn.addEventListener('click', () => this.hidePostModal());
        }
        if (postModal) {
            postModal.addEventListener('click', (e) => {
                if (e.target === postModal) this.hidePostModal();
            });
        }

        const postDetailModal = document.getElementById('post-detail-modal');
        const postDetailModalClose = document.getElementById('post-detail-modal-close');

        if (postDetailModalClose) {
            postDetailModalClose.addEventListener('click', () => this.hidePostDetailModal());
        }
        if (postDetailModal) {
            postDetailModal.addEventListener('click', (e) => {
                if (e.target === postDetailModal) this.hidePostDetailModal();
            });
        }
    }

    bindPaginationEvents() {
        // Pagination will be handled differently with Firestore
    }

    async loadPosts(page = 1) {
        const loading = document.getElementById('posts-loading');
        const postsList = document.getElementById('posts-list');
        const emptyMessage = document.getElementById('posts-empty-message');
        const pagination = document.getElementById('posts-pagination');

        try {
            if (loading) loading.style.display = 'block';
            if (postsList) postsList.innerHTML = '';
            if (emptyMessage) emptyMessage.style.display = 'none';
            if (pagination) pagination.style.display = 'none';

            const posts = await window.apiClient.getPosts();

            if (posts.length === 0) {
                if (emptyMessage) emptyMessage.style.display = 'block';
            } else {
                this.renderPosts(posts);
            }

        } catch (error) {
            console.error('Error loading posts:', error);
            this.showError('게시글을 불러오는 중 오류가 발생했습니다.');
        } finally {
            if (loading) loading.style.display = 'none';
        }
    }

    renderPosts(posts) {
        const postsList = document.getElementById('posts-list');
        if (!postsList) return;

        const currentUser = window.apiClient.currentUser;

        postsList.innerHTML = posts.map(post => {
            const isOwner = currentUser && currentUser.uid === post.author_id;
            const createdAt = post.createdAt.toDate(); // Convert Firestore Timestamp to Date
            const createdDate = createdAt.toLocaleDateString('ko-KR');
            const createdTime = createdAt.toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="post-item" data-post-id="${post.id}">
                    <div class="post-header">
                        <div>
                            <div class="post-title">${this.escapeHtml(post.title)}</div>
                            <div class="post-meta">
                                <span>작성자: ${this.escapeHtml(post.author_name)}</span>
                                <span>작성일: ${createdDate} ${createdTime}</span>
                            </div>
                        </div>
                        ${isOwner ? `
                            <div class="owner-post-actions">
                                <button class="edit-post-btn" onclick="mainMenu.communityManager.editPost('${post.id}')">
                                    수정
                                </button>
                                <button class="delete-post-btn" onclick="mainMenu.communityManager.deletePost('${post.id}')">
                                    삭제
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    <div class="post-content collapsed" data-full-content="${this.escapeHtml(post.content)}">${this.escapeHtmlWithLineBreaks(post.content)}</div>
                    <div class="post-actions">
                        <div class="post-stats">
                            <div class="post-stat">
                                <span>💬 댓글 ${post.comment_count || 0}개</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        postsList.querySelectorAll('.post-item').forEach(item => {
            const postContent = item.querySelector('.post-content');
            if (postContent) {
                postContent.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.togglePostContent(postContent);
                });
            }

            item.addEventListener('click', (e) => {
                if (e.target.closest('.owner-post-actions') || e.target.closest('.post-content')) return;

                const postId = item.dataset.postId;
                this.showPostDetail(postId);
            });
        });
    }

    showCreatePostModal() {
        this.editingPost = null;
        const modal = document.getElementById('post-modal');
        const title = document.getElementById('post-modal-title');
        const submitBtn = document.getElementById('post-submit-btn');
        const postForm = document.getElementById('post-form');

        if (title) title.textContent = '새 게시글 작성';
        if (submitBtn) submitBtn.textContent = '작성';
        if (postForm) postForm.reset();
        if (modal) modal.style.display = 'block';
    }

    hidePostModal() {
        const modal = document.getElementById('post-modal');
        if (modal) modal.style.display = 'none';
        this.editingPost = null;
    }

    async handlePostSubmit(e) {
        e.preventDefault();

        const title = document.getElementById('post-title').value.trim();
        const content = document.getElementById('post-content').value.trim();

        if (!title || !content) {
            alert('제목과 내용을 모두 입력해주세요.');
            return;
        }

        try {
            const currentUser = window.apiClient.currentUser;
            const isEdit = this.editingPost !== null;
            
            const postData = {
                title,
                content,
                author_id: currentUser.uid,
                author_name: currentUser.username,
                createdAt: isEdit ? this.editingPost.createdAt : new Date(),
                updatedAt: new Date(),
                comment_count: isEdit ? this.editingPost.comment_count : 0
            };

            if (isEdit) {
                await window.apiClient.put('posts', this.editingPost.id, postData);
            } else {
                await window.apiClient.post('posts', postData);
            }

            this.hidePostModal();
            this.loadPosts();

        } catch (error) {
            console.error('Error submitting post:', error);
            alert(error.message);
        }
    }

    async editPost(postId) {
        try {
            const post = await window.apiClient.get('posts', postId);
            if (post) {
                this.editingPost = post;
                const modal = document.getElementById('post-modal');
                const title = document.getElementById('post-modal-title');
                const submitBtn = document.getElementById('post-submit-btn');
                const postTitle = document.getElementById('post-title');
                const postContent = document.getElementById('post-content');

                if (title) title.textContent = '게시글 수정';
                if (submitBtn) submitBtn.textContent = '수정';
                if (postTitle) postTitle.value = post.title;
                if (postContent) postContent.value = post.content;
                if (modal) modal.style.display = 'block';
            } else {
                this.showError('게시글을 찾을 수 없습니다.');
            }
        } catch (error) {
            console.error('Error loading post for edit:', error);
            this.showError('게시글을 불러오는데 실패했습니다.');
        }
    }

    async deletePost(postId) {
        if (confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
            try {
                await window.apiClient.delete('posts', postId);
                this.loadPosts();
            } catch (error) {
                console.error('Error deleting post:', error);
                this.showError('게시글 삭제에 실패했습니다.');
            }
        }
    }

    async showPostDetail(postId) {
        const modal = document.getElementById('post-detail-modal');
        const container = document.getElementById('post-detail-container');

        try {
            if (container) container.innerHTML = '<div class="loading-indicator"><div class="loading-spinner"></div><p>게시글을 불러오는 중...</p></div>';
            if (modal) modal.style.display = 'block';

            const post = await window.apiClient.get('posts', postId);
            const comments = await window.apiClient.getComments(postId);

            this.currentPost = post;
            this.renderPostDetail(post, comments);

        } catch (error) {
            console.error('Error loading post detail:', error);
            if (container) {
                container.innerHTML = `<div class="error-message">게시글을 불러오는 중 오류가 발생했습니다: ${error.message}</div>`;
            }
        }
    }

    renderPostDetail(post, comments) {
        const container = document.getElementById('post-detail-container');
        if (!container) return;

        const currentUser = window.apiClient.currentUser;
        const isOwner = currentUser && currentUser.uid === post.author_id;
        const createdAt = post.createdAt.toDate();
        const createdDate = createdAt.toLocaleDateString('ko-KR');
        const createdTime = createdAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

        container.innerHTML = `
            <div class="post-detail-header">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <div class="post-detail-title">${this.escapeHtml(post.title)}</div>
                        <div class="post-detail-meta">
                            <span>작성자: ${this.escapeHtml(post.author_name)}</span>
                            <span>작성일: ${createdDate} ${createdTime}</span>
                        </div>
                    </div>
                    ${isOwner ? `
                        <div class="owner-post-actions">
                            <button class="edit-post-btn" onclick="mainMenu.communityManager.editPost('${post.id}'); mainMenu.communityManager.hidePostDetailModal();">
                                수정
                            </button>
                            <button class="delete-post-btn" onclick="mainMenu.communityManager.deletePost('${post.id}')">
                                삭제
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="post-detail-body">${this.escapeHtmlWithLineBreaks(post.content)}</div>

            <div class="comments-section">
                <div class="comments-header">
                    <div class="comments-title">댓글 ${comments.length}개</div>
                </div>

                <div class="comment-form">
                    <textarea class="comment-input" id="new-comment-input" placeholder="댓글을 작성해주세요..."></textarea>
                    <div class="comment-actions">
                        <button class="btn btn-primary" onclick="mainMenu.communityManager.addComment()">댓글 작성</button>
                    </div>
                </div>

                <div class="comments-list" id="comments-list">
                    ${this.renderComments(comments)}
                </div>
            </div>
        `;
    }

    renderComments(comments) {
        return comments.map(comment => {
            const isOwner = window.apiClient.currentUser && window.apiClient.currentUser.uid === comment.author_id;
            const createdAt = comment.createdAt.toDate();
            const createdDate = createdAt.toLocaleDateString('ko-KR');
            const createdTime = createdAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

            return `
                <div class="comment-item" data-comment-id="${comment.id}">
                    <div class="comment-header">
                        <span class="comment-author">${this.escapeHtml(comment.author_name)}</span>
                        <span class="comment-date">${createdDate} ${createdTime}</span>
                    </div>
                    <div class="comment-content">${this.escapeHtmlWithLineBreaks(comment.content)}</div>
                    <div class="comment-actions-bar">
                        ${isOwner ? `<button class="comment-action-btn" onclick="mainMenu.communityManager.editComment('${comment.id}')">수정</button><button class="comment-action-btn" onclick="mainMenu.communityManager.deleteComment('${comment.id}')">삭제</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    async addComment() {
        const input = document.getElementById('new-comment-input');
        const content = input.value.trim();

        if (!content) {
            alert('댓글 내용을 입력해주세요.');
            return;
        }

        try {
            const currentUser = window.apiClient.currentUser;
            const commentData = {
                content,
                postId: this.currentPost.id,
                author_id: currentUser.uid,
                author_name: currentUser.username,
                createdAt: new Date()
            };

            await window.apiClient.post('comments', commentData);
            this.showPostDetail(this.currentPost.id);

        } catch (error) {
            console.error('Error adding comment:', error);
            alert(error.message);
        }
    }

    async editComment(commentId) {
        const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
        const contentElement = commentElement.querySelector('.comment-content');
        const originalContent = contentElement.innerText;

        contentElement.innerHTML = `
            <textarea class="comment-edit-input">${originalContent}</textarea>
            <button onclick="mainMenu.communityManager.saveEditComment(\'${commentId}\')">저장</button>
            <button onclick="mainMenu.communityManager.cancelEditComment(\'${commentId}\', \`${originalContent}\`)">취소</button>
        `;
    }

    async saveEditComment(commentId) {
        const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
        const input = commentElement.querySelector('.comment-edit-input');
        const content = input.value.trim();

        if (!content) {
            alert('댓글 내용을 입력해주세요.');
            return;
        }

        try {
            await window.apiClient.put('comments', commentId, { content });
            this.showPostDetail(this.currentPost.id);
        } catch (error) {
            console.error('Error saving comment:', error);
            alert(error.message);
        }
    }

    cancelEditComment(commentId, originalContent) {
        const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
        const contentElement = commentElement.querySelector('.comment-content');
        contentElement.innerHTML = this.escapeHtmlWithLineBreaks(originalContent);
    }

    async deleteComment(commentId) {
        if (confirm('정말로 이 댓글을 삭제하시겠습니까?')) {
            try {
                await window.apiClient.delete('comments', commentId);
                this.showPostDetail(this.currentPost.id);
            } catch (error) {
                console.error('Error deleting comment:', error);
                alert(error.message);
            }
        }
    }

    hidePostDetailModal() {
        const modal = document.getElementById('post-detail-modal');
        if (modal) modal.style.display = 'none';
        this.currentPost = null;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    escapeHtmlWithLineBreaks(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML.replace(/\n/g, '<br>');
    }
    togglePostContent(postContent) {
        const isCollapsed = postContent.classList.contains('collapsed');

        if (isCollapsed) {
            postContent.classList.remove('collapsed');
            postContent.classList.add('expanded');
        } else {
            postContent.classList.remove('expanded');
            postContent.classList.add('collapsed');
        }
    }
    showError(message) {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }
}
