const API_BASE_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();

    // DOM elements
    const uploadForm = document.getElementById('upload-form');
    const categoryNameInput = document.getElementById('categoryName');
    const descriptionInput = document.getElementById('description');
    const fileUploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('file-input');
    const fileInfo = document.getElementById('file-info');
    const fileDetails = document.getElementById('file-details');
    const isPublicCheckbox = document.getElementById('isPublic');
    const uploadButton = document.getElementById('upload-button');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    const loadingIndicator = document.getElementById('loading');
    const progressBar = document.getElementById('progress-bar');
    const progressFill = document.getElementById('progress-fill');
    const downloadExampleBtn = document.getElementById('download-example-btn');

    let selectedFile = null;

    // Download example file functionality
    downloadExampleBtn.addEventListener('click', async function() {
        try {
            // Show loading state
            downloadExampleBtn.disabled = true;
            downloadExampleBtn.textContent = '다운로드 중...';

            const token = localStorage.getItem('authToken');
            if (!token) {
                showError('로그인이 필요합니다.');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/protected/download-example`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('파일 다운로드에 실패했습니다.');
            }

            // Create blob and download link
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'braille-example.xlsx';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            showSuccess('예제 파일이 다운로드되었습니다!');

        } catch (error) {
            console.error('Download error:', error);
            showError('파일 다운로드 중 오류가 발생했습니다: ' + error.message);
        } finally {
            // Reset button state
            downloadExampleBtn.disabled = false;
            downloadExampleBtn.textContent = '예제 파일 다운로드';
        }
    });

    // File upload area interactions
    fileUploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.classList.add('dragover');
    });

    fileUploadArea.addEventListener('dragleave', () => {
        fileUploadArea.classList.remove('dragover');
    });

    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelection(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });

    // Form submission
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleUpload();
    });

    function checkAuth() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
    }

    function handleFileSelection(file) {
        // Validate file type
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel' // .xls
        ];

        const fileExtension = file.name.toLowerCase().split('.').pop();
        const isValidExtension = ['xlsx', 'xls'].includes(fileExtension);
        const isValidMimeType = allowedTypes.includes(file.type);

        if (!isValidExtension && !isValidMimeType) {
            showError('Excel 파일만 업로드 가능합니다 (.xlsx, .xls)');
            return;
        }

        // Check file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            showError('파일 크기가 너무 큽니다. 최대 10MB까지 업로드 가능합니다.');
            return;
        }

        selectedFile = file;

        // Update UI
        fileUploadArea.classList.add('has-file');
        fileInfo.classList.add('visible');

        const fileSizeFormatted = formatFileSize(file.size);
        fileDetails.innerHTML = `
            <div><strong>파일명:</strong> ${file.name}</div>
            <div><strong>크기:</strong> ${fileSizeFormatted}</div>
            <div><strong>타입:</strong> ${file.type || '알 수 없음'}</div>
        `;

        hideMessages();
    }

    async function handleUpload() {
        try {
            // Validate form
            const categoryName = categoryNameInput.value.trim();
            const description = descriptionInput.value.trim();

            if (!categoryName) {
                showError('카테고리 이름을 입력해주세요.');
                return;
            }

            if (!selectedFile) {
                showError('업로드할 파일을 선택해주세요.');
                return;
            }

            // Show loading state
            setLoadingState(true);

            // Prepare form data
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('categoryName', categoryName);
            formData.append('description', description);
            formData.append('isPublic', isPublicCheckbox.checked);

            // Get auth token
            const token = localStorage.getItem('authToken');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }

            // Upload file
            const response = await fetch(`${API_BASE_URL}/protected/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                showSuccess(`업로드가 완료되었습니다! ${data.brailleDataCount}개의 점자 데이터가 추가되었습니다.`);

                // Reset form
                resetForm();

                // Redirect after delay
                setTimeout(() => {
                    window.location.href = 'main.html';
                }, 1000);
            } else {
                // Handle specific error messages
                let errorMsg = '업로드에 실패했습니다.';

                if (response.status === 400) {
                    errorMsg = data.error || errorMsg;
                } else if (response.status === 401) {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userData');
                    window.location.href = 'login.html';
                    return;
                } else if (response.status === 413) {
                    errorMsg = '파일 크기가 너무 큽니다.';
                }

                showError(errorMsg);
            }

        } catch (error) {
            console.error('Upload error:', error);
            showError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setLoadingState(false);
        }
    }

    function resetForm() {
        categoryNameInput.value = '';
        descriptionInput.value = '';
        isPublicCheckbox.checked = false;
        selectedFile = null;
        fileInput.value = '';

        fileUploadArea.classList.remove('has-file');
        fileInfo.classList.remove('visible');

        hideMessages();
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
    }

    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
    }

    function hideMessages() {
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            uploadButton.disabled = true;
            loadingIndicator.style.display = 'block';
            progressBar.style.display = 'block';

            // Simulate progress for user feedback
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += Math.random() * 15;
                if (progress > 90) progress = 90;
                progressFill.style.width = progress + '%';
            }, 200);

            // Store interval ID for cleanup
            uploadButton.dataset.progressInterval = progressInterval;
        } else {
            uploadButton.disabled = false;
            loadingIndicator.style.display = 'none';
            progressBar.style.display = 'none';
            progressFill.style.width = '0%';

            // Clear progress simulation
            const progressInterval = uploadButton.dataset.progressInterval;
            if (progressInterval) {
                clearInterval(progressInterval);
                delete uploadButton.dataset.progressInterval;
            }
        }
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
});