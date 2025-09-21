// Task 7.2: Basic Braille Practice UI Structure

class BraillePractice {
    constructor() {
        this.currentChar = null;
        this.currentBraillePattern = null;
        this.currentBlockIndex = 0;
        this.pressedDots = new Set();
        this.categoryId = null;
        this.showHints = false;

        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuthentication();

        // Get category ID from URL params or use default
        const urlParams = new URLSearchParams(window.location.search);
        this.categoryId = urlParams.get('category') || 1;
    }

    bindEvents() {
        // Control buttons
        document.getElementById('next-btn').addEventListener('click', () => this.loadNextCharacter());
        document.getElementById('hint-btn').addEventListener('click', () => this.toggleHint());
        document.getElementById('back-btn').addEventListener('click', () => {
            window.location.href = 'main.html';
        });

        // Keyboard events will be handled in Task 7.3
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    checkAuthentication() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            this.showError('로그인이 필요합니다.');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return false;
        }
        return true;
    }

    async startPractice(categoryId) {
        if (categoryId) {
            this.categoryId = categoryId;
        }
        await this.loadNextCharacter();
    }

    async loadNextCharacter() {
        try {
            this.updateProgress('문제를 불러오는 중...');

            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/protected/braille/${this.categoryId}/random`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load braille data');
            }

            const data = await response.json();
            this.currentChar = data.character;
            this.currentBraillePattern = JSON.parse(data.braille_pattern);
            this.currentBlockIndex = 0;
            this.pressedDots.clear();

            this.displayCharacter();
            this.createBrailleBlocks();
            this.updateProgress(`문자: ${this.currentChar}`);

        } catch (error) {
            console.error('Error loading character:', error);
            this.showError('오류가 발생했습니다: ' + error.message);
        }
    }

    displayCharacter() {
        const currentCharEl = document.getElementById('current-char');
        currentCharEl.textContent = this.currentChar || '-';
    }

    createBrailleBlocks() {
        const container = document.getElementById('braille-blocks');
        container.innerHTML = '';

        if (!this.currentBraillePattern) return;

        this.currentBraillePattern.forEach((blockPattern, blockIndex) => {
            const block = this.createSingleBrailleBlock(blockPattern, blockIndex);
            container.appendChild(block);
        });
    }

    createSingleBrailleBlock(pattern, blockIndex) {
        const block = document.createElement('div');
        block.className = 'braille-block';
        block.dataset.blockIndex = blockIndex;

        // Create 6 dots in standard braille layout
        for (let i = 1; i <= 6; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot';
            dot.dataset.dotNumber = i;
            dot.dataset.blockIndex = blockIndex;

            // Add hint overlay
            const hint = document.createElement('div');
            hint.className = 'hint-overlay';
            hint.textContent = i;
            dot.appendChild(hint);

            block.appendChild(dot);
        }

        return block;
    }

    toggleHint() {
        this.showHints = !this.showHints;
        const hints = document.querySelectorAll('.hint-overlay');
        hints.forEach(hint => {
            hint.style.display = this.showHints ? 'block' : 'none';
        });

        const hintBtn = document.getElementById('hint-btn');
        hintBtn.textContent = this.showHints ? '힌트 끄기' : '힌트 켜기';
    }

    handleKeyDown(event) {
        const key = event.key.toLowerCase();

        // Task 7.3: Keyboard input handling
        const keyToDot = {
            'f': 1,
            'd': 2,
            's': 3,
            'j': 4,
            'k': 5,
            'l': 6
        };

        if (keyToDot[key]) {
            event.preventDefault();
            this.toggleDot(keyToDot[key]);
        } else if (key === ' ') {
            event.preventDefault();
            this.toggleHint();
        } else if (key === 'enter') {
            event.preventDefault();
            this.loadNextCharacter();
        } else if (key === 'escape') {
            event.preventDefault();
            this.clearAllDots();
        }
    }

    toggleDot(dotNumber) {
        if (!this.currentBraillePattern || this.currentBraillePattern.length === 0) {
            return;
        }

        // Find the target dot in the current block
        const currentBlock = document.querySelector(`.braille-block[data-block-index="${this.currentBlockIndex}"]`);
        if (!currentBlock) {
            return;
        }

        const dot = currentBlock.querySelector(`.dot[data-dot-number="${dotNumber}"]`);
        if (!dot) {
            return;
        }

        // Toggle dot state
        if (this.pressedDots.has(dotNumber)) {
            this.pressedDots.delete(dotNumber);
            dot.classList.remove('active');
        } else {
            this.pressedDots.add(dotNumber);
            dot.classList.add('active');
        }

        // Auto-validate when user completes current block pattern
        this.checkCurrentBlock();
    }

    clearAllDots() {
        this.pressedDots.clear();

        // Clear all active dots in current block
        const currentBlock = document.querySelector(`.braille-block[data-block-index="${this.currentBlockIndex}"]`);
        if (currentBlock) {
            const activeDots = currentBlock.querySelectorAll('.dot.active');
            activeDots.forEach(dot => {
                dot.classList.remove('active');
            });
        }
    }

    checkCurrentBlock() {
        if (!this.currentBraillePattern || this.currentBlockIndex >= this.currentBraillePattern.length) {
            return;
        }

        const correctPattern = this.currentBraillePattern[this.currentBlockIndex];
        const pressedArray = Array.from(this.pressedDots).sort((a, b) => a - b);
        const correctArray = correctPattern.sort((a, b) => a - b);

        // Check if user has pressed the same number of dots as the correct pattern
        if (pressedArray.length === correctArray.length) {
            // Auto-validate (will be implemented in Task 7.4)
            console.log('Block complete - validation will be implemented in Task 7.4');
        }
    }

    updateProgress(message) {
        const progressEl = document.getElementById('progress-indicator');
        progressEl.textContent = message;
    }

    showError(message) {
        const errorEl = document.getElementById('error-message');
        errorEl.textContent = message;
        errorEl.style.display = 'block';

        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
    }
}

// Global functions for testing
window.startPractice = function(categoryId) {
    if (window.braillePractice) {
        window.braillePractice.startPractice(categoryId);
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.braillePractice = new BraillePractice();

    // Auto-start practice if category is provided
    const urlParams = new URLSearchParams(window.location.search);
    const categoryId = urlParams.get('category');
    if (categoryId) {
        window.braillePractice.startPractice(categoryId);
    }
});