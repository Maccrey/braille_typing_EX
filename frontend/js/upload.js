// Helper function to get the correct API base URL
function getApiBaseUrl() {
    // For development (localhost)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3001';
    }

    // For file:// protocol (opening HTML files directly) - use production server
    if (window.location.protocol === 'file:') {
        return 'https://typing.maccrey.com';
    }

    // For production - use the same domain
    return window.location.origin;
}

const API_BASE_URL = getApiBaseUrl() + '/api';
const MAX_BRAILLE_ENTRIES = 1000;
const HEADER_CELL_REGEX = /문자|character/i;

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

    const downloadExampleEndpoints = [
        `${API_BASE_URL}/protected/download-example`,
        `${API_BASE_URL}/protected/download-template`
    ];
    const LOCAL_TEMPLATE_PATH = 'assets/examples/braille-example.xlsx';

    async function fetchExampleFile(token) {
        let lastError = null;

        for (const url of downloadExampleEndpoints) {
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    return response;
                }

                const body = await safeReadText(response);
                lastError = { status: response.status, body, url };

                // Only try fallback for 404 (endpoint not found)
                if (response.status !== 404) {
                    break;
                }
            } catch (networkError) {
                lastError = { status: 0, body: networkError.message, url };
                break;
            }
        }

        const statusInfo = lastError
            ? ` (HTTP ${lastError.status}${lastError.body ? `: ${lastError.body.substring(0, 80)}` : ''})`
            : '';
        const error = new Error('파일 다운로드에 실패했습니다.' + statusInfo);
        error.status = lastError?.status || null;
        throw error;
    }

    async function safeReadText(response) {
        try {
            return await response.text();
        } catch (err) {
            console.warn('⚠️ Failed to read response text:', err);
            return '';
        }
    }

    async function fetchLocalTemplate() {
        try {
            const response = await fetch(LOCAL_TEMPLATE_PATH, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`로컬 예제 파일을 가져오지 못했습니다. (HTTP ${response.status})`);
            }
            return response;
        } catch (error) {
            console.error('Local template fetch failed:', error);
            throw new Error('예제 파일을 다운로드할 수 없습니다. 관리자에게 문의해주세요.');
        }
    }

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

            let response;
            try {
                response = await fetchExampleFile(token);
            } catch (apiError) {
                console.warn('API 예제 파일 다운로드 실패, 로컬 템플릿 사용 시도:', apiError);
                response = await fetchLocalTemplate();
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

            if (error.status === 401) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('userData');
                sessionStorage.clear();
                window.location.href = 'login.html';
                return;
            }

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

    async function checkAuth() {
        try {
            if (!window.apiClient) {
                throw new Error('API 클라이언트가 초기화되지 않았습니다.');
            }
            const user = await window.apiClient.getCurrentUser();
            if (!user) {
                redirectToLogin();
            }
        } catch (error) {
            console.warn('Auth verification failed:', error);
            redirectToLogin();
        }
    }

    function redirectToLogin() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        sessionStorage.clear();
        window.location.href = 'login.html';
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

        if (!window.apiClient || typeof window.apiClient.createCategoryWithBrailleData !== 'function') {
            showError('Firebase 클라이언트를 초기화할 수 없습니다. 페이지를 새로고침한 뒤 다시 시도해주세요.');
            return;
        }

        try {
            setLoadingState(true);
            hideMessages();

            console.log('📥 Parsing Excel file:', selectedFile.name);
            const brailleEntries = await parseExcelFile(selectedFile);
            console.log('🧮 Parsed braille entries:', brailleEntries.length);

            const result = await window.apiClient.createCategoryWithBrailleData({
                name: categoryName,
                description,
                isPublic: isPublicCheckbox.checked,
                brailleEntries
            });

            showSuccess(`업로드가 완료되었습니다! ${result.brailleCount}개의 점자 데이터가 추가되었습니다.`);

            // Reset form
            resetForm();

            // Redirect after delay
            setTimeout(() => {
                window.location.href = 'main.html';
            }, 1200);
        } catch (error) {
            console.error('Upload error:', error);
            showError(error.message || '업로드 중 오류가 발생했습니다. 다시 시도해주세요.');
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

    async function parseExcelFile(file) {
        if (typeof XLSX === 'undefined') {
            throw new Error('Excel 파서가 로드되지 않았습니다. 페이지를 새로고침해 주세요.');
        }

        let workbook;
        try {
            const arrayBuffer = await file.arrayBuffer();
            workbook = XLSX.read(arrayBuffer, { type: 'array' });
        } catch (error) {
            console.error('Failed to read Excel file:', error);
            throw new Error('Excel 파일을 읽는 중 오류가 발생했습니다.');
        }

        const sheetName = workbook.SheetNames && workbook.SheetNames[0];
        if (!sheetName) {
            throw new Error('Excel 파일에 시트를 찾을 수 없습니다.');
        }

        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });

        if (!rows || rows.length === 0) {
            throw new Error('Excel 파일이 비어있습니다.');
        }

        const entries = [];
        rows.forEach((row, index) => {
            if (!Array.isArray(row) || row.length === 0) {
                return;
            }

            const characterCell = row[0];
            const character = (characterCell ?? '').toString().trim();
            const isHeaderRow = index === 0 && HEADER_CELL_REGEX.test(character);

            if (!character || isHeaderRow) {
                return;
            }

            const brailleBlocks = extractBrailleBlocksFromRow(row);
            if (brailleBlocks.length === 0) {
                console.warn(`Row ${index + 1} skipped: no valid braille dots.`);
                return;
            }

            entries.push({
                character,
                braille_pattern: brailleBlocks,
                order: entries.length
            });
        });

        if (entries.length === 0) {
            throw new Error('점자 데이터를 찾을 수 없습니다. 예제 파일 형식을 참고해주세요.');
        }

        if (entries.length > MAX_BRAILLE_ENTRIES) {
            throw new Error(`점자 데이터는 최대 ${MAX_BRAILLE_ENTRIES}개까지만 업로드할 수 있습니다.`);
        }

        return entries;
    }

    function extractBrailleBlocksFromRow(row) {
        const blocks = [];
        for (let colIndex = 1; colIndex < row.length; colIndex++) {
            const cellValue = row[colIndex];
            if (cellValue === undefined || cellValue === null || cellValue === '') {
                continue;
            }

            const dots = cellValue
                .toString()
                .split(/[,，\s]+/)
                .map(part => parseInt(part.trim(), 10))
                .filter(num => Number.isInteger(num) && num >= 1 && num <= 6);

            if (dots.length === 0) {
                continue;
            }

            blocks.push(normalizeDotValues(dots));
        }
        return blocks;
    }

    function normalizeDotValues(dots) {
        const seen = new Set();
        const uniqueDots = [];
        dots.forEach(dot => {
            if (!seen.has(dot)) {
                seen.add(dot);
                uniqueDots.push(dot);
            }
        });
        return uniqueDots.sort((a, b) => a - b);
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
});
