// Helper function to get the correct API base URL
function getApiBaseUrl() {
    return window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://typing.maccrey.com';
}

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
        // Create post button
        const createPostBtn = document.getElementById('create-post-btn');
        if (createPostBtn) {
            createPostBtn.addEventListener('click', () => this.showCreatePostModal());
        }

        // Post form
        const postForm = document.getElementById('post-form');
        if (postForm) {
            postForm.addEventListener('submit', (e) => this.handlePostSubmit(e));
        }

        // Modal close buttons
        this.bindModalEvents();

        // Pagination
        this.bindPaginationEvents();
    }

    bindModalEvents() {
        // Post modal
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

        // Post detail modal
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
        const prevPageBtn = document.getElementById('prev-page');
        const nextPageBtn = document.getElementById('next-page');

        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => this.loadPreviousPage());
        }
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => this.loadNextPage());
        }
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

            const token = localStorage.getItem('authToken');
            const response = await fetch(`${getApiBaseUrl()}/api/posts?page=${page}&limit=10`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('게시글을 불러올 수 없습니다.');
            }

            const data = await response.json();
            this.currentPage = data.pagination.currentPage;
            this.totalPages = data.pagination.totalPages;

            if (data.posts.length === 0) {
                if (emptyMessage) emptyMessage.style.display = 'block';
            } else {
                this.renderPosts(data.posts);
                this.updatePagination(data.pagination);
                if (pagination) pagination.style.display = 'flex';
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

        const userData = localStorage.getItem('userData');
        const currentUser = userData ? JSON.parse(userData).username : null;

        postsList.innerHTML = posts.map(post => {
            const isOwner = currentUser === post.author_name;
            const createdDate = new Date(post.created_at).toLocaleDateString('ko-KR');
            const createdTime = new Date(post.created_at).toLocaleTimeString('ko-KR', {
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
                                <button class="edit-post-btn" onclick="communityManager.editPost(${post.id})">
                                    수정
                                </button>
                                <button class="delete-post-btn" onclick="communityManager.deletePost(${post.id})">
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

        // Add click event listeners to post items
        postsList.querySelectorAll('.post-item').forEach(item => {
            // Add expand/collapse functionality for post content
            const postContent = item.querySelector('.post-content');
            if (postContent) {
                postContent.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.togglePostContent(postContent);
                });
            }

            item.addEventListener('click', (e) => {
                // Don't trigger if clicking on action buttons or post content
                if (e.target.closest('.owner-post-actions') || e.target.closest('.post-content')) return;

                const postId = item.dataset.postId;
                this.showPostDetail(postId);
            });
        });
    }

    updatePagination(pagination) {
        const prevPageBtn = document.getElementById('prev-page');
        const nextPageBtn = document.getElementById('next-page');
        const pageInfo = document.getElementById('page-info');

        if (prevPageBtn) {
            prevPageBtn.disabled = !pagination.hasPrev;
        }
        if (nextPageBtn) {
            nextPageBtn.disabled = !pagination.hasNext;
        }
        if (pageInfo) {
            pageInfo.textContent = `${pagination.currentPage} / ${pagination.totalPages}`;
        }
    }

    loadPreviousPage() {
        if (this.currentPage > 1) {
            this.loadPosts(this.currentPage - 1);
        }
    }

    loadNextPage() {
        if (this.currentPage < this.totalPages) {
            this.loadPosts(this.currentPage + 1);
        }
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

    showEditPostModal(post) {
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
            const token = localStorage.getItem('authToken');
            const isEdit = this.editingPost !== null;
            const url = isEdit ? `/api/posts/${this.editingPost.id}` : '/api/posts';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title, content })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '게시글 처리 중 오류가 발생했습니다.');
            }

            const responseData = await response.json();

            this.hidePostModal();

            if (isEdit) {
                // 수정된 게시글을 목록에서 즉시 업데이트
                this.updatePostInUI(responseData);
            } else {
                // 새 게시글은 목록을 다시 로드 (첫 페이지로)
                this.loadPosts(1);
            }

            const successMessage = isEdit ? '게시글이 수정되었습니다.' : '게시글이 작성되었습니다.';
            this.showSuccess(successMessage);

        } catch (error) {
            console.error('Error submitting post:', error);
            alert(error.message);
        }
    }

    async editPost(postId) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${getApiBaseUrl()}/api/posts/${postId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('게시글을 불러올 수 없습니다.');
            }

            const post = await response.json();
            this.showEditPostModal(post);

        } catch (error) {
            console.error('Error loading post for edit:', error);
            alert(error.message);
        }
    }

    // 상세보기에서 수정 버튼 클릭 시
    editPostFromDetail(postId) {
        this.editPost(postId);
    }

    // 상세보기에서 삭제 버튼 클릭 시
    deletePostFromDetail(postId) {
        if (confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
            this.hidePostDetailModal();
            this.deletePost(postId);
        }
    }

    async deletePost(postId) {
        // 목록에서 직접 호출될 때만 confirm 표시 (상세보기에서는 이미 confirm을 했으므로)
        if (!this.currentPost && !confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${getApiBaseUrl()}/api/posts/${postId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '게시글 삭제 중 오류가 발생했습니다.');
            }

            // 화면에서 게시글 즉시 제거
            this.removePostFromUI(postId);
            this.showSuccess('게시글이 삭제되었습니다.');

        } catch (error) {
            console.error('Error deleting post:', error);
            alert(error.message);
        }
    }

    async showPostDetail(postId) {
        const modal = document.getElementById('post-detail-modal');
        const container = document.getElementById('post-detail-container');

        try {
            if (container) container.innerHTML = '<div class="loading-indicator"><div class="loading-spinner"></div><p>게시글을 불러오는 중...</p></div>';
            if (modal) modal.style.display = 'block';

            const token = localStorage.getItem('authToken');

            // Load post details
            const postResponse = await fetch(`${getApiBaseUrl()}/api/posts/${postId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!postResponse.ok) {
                throw new Error('게시글을 불러올 수 없습니다.');
            }

            const post = await postResponse.json();
            this.currentPost = post;

            // Load comments
            const commentsResponse = await fetch(`${getApiBaseUrl()}/api/comments/posts/${postId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const comments = commentsResponse.ok ? await commentsResponse.json() : [];

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

        const userData = localStorage.getItem('userData');
        const currentUser = userData ? JSON.parse(userData).username : null;
        const isOwner = currentUser === post.author_name;
        const createdDate = new Date(post.created_at).toLocaleDateString('ko-KR');
        const createdTime = new Date(post.created_at).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit'
        });

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
                            <button class="edit-post-btn" onclick="communityManager.editPostFromDetail(${post.id}); communityManager.hidePostDetailModal();">
                                수정
                            </button>
                            <button class="delete-post-btn" onclick="communityManager.deletePostFromDetail(${post.id})">
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
                        <button class="btn btn-primary" onclick="communityManager.addComment()">댓글 작성</button>
                    </div>
                </div>

                <div class="comments-list" id="comments-list">
                    ${this.renderComments(comments)}
                </div>
            </div>
        `;
    }

    renderComments(comments, level = 0) {
        if (!Array.isArray(comments)) return '';

        return comments.map(comment => {
            const userData = localStorage.getItem('userData');
        const currentUser = userData ? JSON.parse(userData).username : null;
            const isOwner = currentUser === comment.author_name;

            const createdDate = new Date(comment.created_at).toLocaleDateString('ko-KR');
            const createdTime = new Date(comment.created_at).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const childComments = comment.children && comment.children.length > 0
                ? this.renderComments(comment.children, level + 1)
                : '';

            // 수정/삭제 버튼 HTML 생성
            let ownerButtons = '';
            if (isOwner) {
                ownerButtons = '<button class="comment-action-btn" onclick="communityManager.editComment(' + comment.id + ')">수정</button><button class="comment-action-btn" onclick="communityManager.deleteComment(' + comment.id + ')">삭제</button>';
            }

            return `
                <div class="comment-item ${level > 0 ? 'reply' : ''}" data-comment-id="${comment.id}">
                    <div class="comment-header">
                        <span class="comment-author">${this.escapeHtml(comment.author_name)}</span>
                        <span class="comment-date">${createdDate} ${createdTime}</span>
                    </div>
                    <div class="comment-content">${this.escapeHtmlWithLineBreaks(comment.content)}</div>
                    <div class="comment-actions-bar">
                        <button class="comment-action-btn" onclick="communityManager.showReplyForm(${comment.id})">답글</button>
                        ${ownerButtons}
                    </div>
                    <div class="reply-form" id="reply-form-${comment.id}" style="display: none;">
                        <textarea class="reply-input" placeholder="답글을 작성해주세요..."></textarea>
                        <div class="comment-actions">
                            <button class="btn btn-secondary btn-cancel" onclick="communityManager.hideReplyForm(${comment.id})">취소</button>
                            <button class="btn btn-primary" onclick="communityManager.addReply(${comment.id})">답글 작성</button>
                        </div>
                    </div>
                </div>
                ${childComments}
            `;
        }).join('');
    }

    hidePostDetailModal() {
        const modal = document.getElementById('post-detail-modal');
        if (modal) modal.style.display = 'none';
        this.currentPost = null;
    }

    addCommentToUI(comment) {
        const commentsList = document.getElementById('comments-list');
        if (!commentsList) return;

        // 새 댓글 HTML 생성
        const commentHTML = this.renderSingleComment(comment);

        // 댓글 목록에 추가
        commentsList.insertAdjacentHTML('beforeend', commentHTML);
    }

    addReplyToUI(reply, parentCommentId) {
        const parentComment = document.querySelector(`[data-comment-id="${parentCommentId}"]`);
        if (!parentComment) return;

        // 답글 HTML 생성
        const replyHTML = this.renderSingleComment(reply, true);

        // 부모 댓글 뒤에 답글 추가
        parentComment.insertAdjacentHTML('afterend', replyHTML);
    }

    renderSingleComment(comment, isReply = false) {
        const userData = localStorage.getItem('userData');
        const currentUser = userData ? JSON.parse(userData).username : null;
        const isOwner = currentUser === comment.author_name;
        const createdDate = new Date(comment.created_at).toLocaleDateString('ko-KR');
        const createdTime = new Date(comment.created_at).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit'
        });

        // 수정/삭제 버튼 HTML 생성
        let ownerButtons = '';
        if (isOwner) {
            ownerButtons = '<button class="comment-action-btn" onclick="communityManager.editComment(' + comment.id + ')">수정</button><button class="comment-action-btn" onclick="communityManager.deleteComment(' + comment.id + ')">삭제</button>';
        }

        return `
            <div class="comment-item ${isReply ? 'reply' : ''}" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <span class="comment-author">${this.escapeHtml(comment.author_name)}</span>
                    <span class="comment-date">${createdDate} ${createdTime}</span>
                </div>
                <div class="comment-content">${this.escapeHtmlWithLineBreaks(comment.content)}</div>
                <div class="comment-actions-bar">
                    <button class="comment-action-btn" onclick="communityManager.showReplyForm(${comment.id})">답글</button>
                    ${ownerButtons}
                </div>
                <div class="reply-form" id="reply-form-${comment.id}" style="display: none;">
                    <textarea class="reply-input" placeholder="답글을 작성해주세요..."></textarea>
                    <div class="comment-actions">
                        <button class="btn btn-secondary btn-cancel" onclick="communityManager.hideReplyForm(${comment.id})">취소</button>
                        <button class="btn btn-primary" onclick="communityManager.addReply(${comment.id})">답글 작성</button>
                    </div>
                </div>
            </div>
        `;
    }

    updateCommentCount() {
        const commentsTitle = document.querySelector('.comments-title');
        const commentItems = document.querySelectorAll('.comment-item');
        const count = commentItems.length;

        if (commentsTitle) {
            commentsTitle.textContent = `댓글 ${count}개`;
        }
    }

    removeCommentFromUI(commentId) {
        const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
        if (commentElement) {
            // 답글들도 함께 찾아서 제거
            const replies = this.findReplies(commentElement);
            replies.forEach(reply => reply.remove());

            // 원본 댓글 제거
            commentElement.remove();
        }
    }

    findReplies(commentElement) {
        const replies = [];
        let nextElement = commentElement.nextElementSibling;

        while (nextElement && nextElement.classList.contains('reply')) {
            replies.push(nextElement);
            nextElement = nextElement.nextElementSibling;
        }

        return replies;
    }

    removePostFromUI(postId) {
        const postElement = document.querySelector(`[data-post-id="${postId}"]`);
        if (postElement) {
            postElement.remove();

            // 게시글이 없으면 빈 메시지 표시
            const postsList = document.getElementById('posts-list');
            const emptyMessage = document.getElementById('posts-empty-message');

            if (postsList && postsList.children.length === 0) {
                if (emptyMessage) emptyMessage.style.display = 'block';
            }
        }
    }

    updatePostInUI(updatedPost) {
        const postElement = document.querySelector(`[data-post-id="${updatedPost.id}"]`);
        if (postElement) {
            // 제목과 메타 정보 업데이트
            const titleElement = postElement.querySelector('.post-title');
            const contentElement = postElement.querySelector('.post-content');

            if (titleElement) {
                titleElement.textContent = updatedPost.title;
            }

            if (contentElement) {
                // 전체 내용으로 업데이트하고 collapsed 상태로 설정
                contentElement.innerHTML = this.escapeHtmlWithLineBreaks(updatedPost.content);
                contentElement.setAttribute('data-full-content', this.escapeHtml(updatedPost.content));
                contentElement.className = 'post-content collapsed';

                // 클릭 이벤트 리스너 재설정
                contentElement.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.togglePostContent(contentElement);
                });
            }
        }
    }

    async addComment() {
        const input = document.getElementById('new-comment-input');
        const content = input.value.trim();

        if (!content) {
            alert('댓글 내용을 입력해주세요.');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${getApiBaseUrl()}/api/comments/posts/${this.currentPost.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '댓글 작성 중 오류가 발생했습니다.');
            }

            const newComment = await response.json();

            // 입력 필드 초기화
            input.value = '';

            // 새 댓글을 화면에 즉시 추가
            this.addCommentToUI(newComment);

            // 댓글 수 업데이트
            this.updateCommentCount();

        } catch (error) {
            console.error('Error adding comment:', error);
            alert(error.message);
        }
    }

    showReplyForm(commentId) {
        const replyForm = document.getElementById(`reply-form-${commentId}`);
        if (replyForm) {
            replyForm.style.display = 'block';
        }
    }

    hideReplyForm(commentId) {
        const replyForm = document.getElementById(`reply-form-${commentId}`);
        if (replyForm) {
            replyForm.style.display = 'none';
            const textarea = replyForm.querySelector('.reply-input');
            if (textarea) textarea.value = '';
        }
    }

    async addReply(parentCommentId) {
        const replyForm = document.getElementById(`reply-form-${parentCommentId}`);
        const textarea = replyForm.querySelector('.reply-input');
        const content = textarea.value.trim();

        if (!content) {
            alert('답글 내용을 입력해주세요.');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${getApiBaseUrl()}/api/comments/posts/${this.currentPost.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    content,
                    parentCommentId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '답글 작성 중 오류가 발생했습니다.');
            }

            const newReply = await response.json();

            // 답글 폼 숨기기
            this.hideReplyForm(parentCommentId);

            // 새 답글을 화면에 즉시 추가
            this.addReplyToUI(newReply, parentCommentId);

            // 댓글 수 업데이트
            this.updateCommentCount();

        } catch (error) {
            console.error('Error adding reply:', error);
            alert(error.message);
        }
    }

    editComment(commentId) {
        const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
        if (!commentElement) return;

        const contentElement = commentElement.querySelector('.comment-content');
        const actionsBar = commentElement.querySelector('.comment-actions-bar');
        const currentContent = contentElement.textContent;

        // 원본 내용을 데이터 속성에 저장
        commentElement.dataset.originalContent = currentContent;

        // 수정 모드 클래스 추가
        commentElement.classList.add('editing');

        // 기존 액션 버튼들 숨기기
        if (actionsBar) {
            actionsBar.style.display = 'none';
            // 추가 확실성을 위해
            actionsBar.style.visibility = 'hidden';
        }

        console.log('Edit mode: hiding actions bar', actionsBar);

        // 편집 폼으로 교체
        contentElement.innerHTML = `
            <div class="comment-edit-form">
                <textarea class="comment-edit-input">${this.escapeHtml(currentContent)}</textarea>
                <div class="comment-edit-actions">
                    <button class="btn btn-secondary btn-sm" onclick="communityManager.cancelEditComment(${commentId})">취소</button>
                    <button class="btn btn-primary btn-sm" onclick="communityManager.saveEditComment(${commentId})">저장</button>
                </div>
            </div>
        `;

        // textarea 자동 리사이징 설정
        const textarea = contentElement.querySelector('.comment-edit-input');
        if (textarea) {
            this.setupAutoResize(textarea);
        }
    }

    cancelEditComment(commentId) {
        const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
        if (!commentElement) return;

        const originalContent = commentElement.dataset.originalContent;
        const contentElement = commentElement.querySelector('.comment-content');
        const actionsBar = commentElement.querySelector('.comment-actions-bar');

        // 원본 내용으로 복원
        contentElement.textContent = originalContent;

        // 수정 모드 클래스 제거
        commentElement.classList.remove('editing');

        // 액션 버튼들 다시 보이기
        if (actionsBar) {
            actionsBar.style.display = 'flex';
            actionsBar.style.visibility = 'visible';
        }

        console.log('Cancel edit: showing actions bar', actionsBar);
    }

    async saveEditComment(commentId) {
        const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
        if (!commentElement) return;

        const textarea = commentElement.querySelector('.comment-edit-input');
        const newContent = textarea.value.trim();

        if (!newContent) {
            alert('댓글 내용을 입력해주세요.');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${getApiBaseUrl()}/api/comments/${commentId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: newContent
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '댓글 수정 중 오류가 발생했습니다.');
            }

            // 성공적으로 수정되면 내용 업데이트
            const contentElement = commentElement.querySelector('.comment-content');
            const actionsBar = commentElement.querySelector('.comment-actions-bar');

            contentElement.innerHTML = this.escapeHtmlWithLineBreaks(newContent);

            // 수정 모드 클래스 제거
            commentElement.classList.remove('editing');

            // 액션 버튼들 다시 보이기
            if (actionsBar) {
                actionsBar.style.display = 'flex';
                actionsBar.style.visibility = 'visible';
            }

            console.log('Save edit: showing actions bar', actionsBar);

        } catch (error) {
            console.error('Error editing comment:', error);
            alert('댓글 수정 중 오류가 발생했습니다: ' + error.message);
        }
    }

    async deleteComment(commentId) {
        if (!confirm('정말로 이 댓글을 삭제하시겠습니까?')) {
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${getApiBaseUrl()}/api/comments/${commentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '댓글 삭제 중 오류가 발생했습니다.');
            }

            // 화면에서 댓글 제거
            this.removeCommentFromUI(commentId);

            // 댓글 수 업데이트
            this.updateCommentCount();

        } catch (error) {
            console.error('Error deleting comment:', error);
            alert(error.message);
        }
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
            // Expand
            postContent.classList.remove('collapsed');
            postContent.classList.add('expanded');
        } else {
            // Collapse
            postContent.classList.remove('expanded');
            postContent.classList.add('collapsed');
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
    }

    showSuccess(message) {
        // You can implement a success message display here
        alert(message);
    }

    setupAutoResize(textarea) {
        // 높이 자동 조절 함수
        const adjustHeight = () => {
            // 높이를 auto로 리셋하여 실제 내용 높이 측정
            textarea.style.height = 'auto';

            // 스크롤 높이 기반으로 새로운 높이 계산 (원래 크기로 복원)
            const newHeight = Math.max(20, Math.min(60, textarea.scrollHeight));
            textarea.style.height = newHeight + 'px';
        };

        // 즉시 높이 조절
        setTimeout(adjustHeight, 0);

        // 이벤트 리스너들
        textarea.addEventListener('input', adjustHeight);
        textarea.addEventListener('paste', () => setTimeout(adjustHeight, 10));
        textarea.addEventListener('keydown', () => setTimeout(adjustHeight, 0));
    }
}

// Initialize community manager
let communityManager;

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
    communityManager = new CommunityManager();
});