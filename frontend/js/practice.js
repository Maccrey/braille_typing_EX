// Task 7.2: Basic Braille Practice UI Structure

class BraillePractice {
    constructor() {
        this.currentChar = null;
        this.currentBraillePattern = null;
        this.currentBlockIndex = 0;
        this.pressedDots = new Set();
        this.dotInputOrder = []; // Track order of dot inputs for backspace
        this.categoryId = null;
        this.showHints = false;

        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuthentication();

        // Get category ID from URL params or use default
        const urlParams = new URLSearchParams(window.location.search);
        this.categoryId = urlParams.get('category') || 4; // Default to public category 4
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

        // Ensure the page has focus for keyboard events
        window.addEventListener('load', () => {
            document.body.focus();
        });

        // Also set focus when user clicks anywhere on the page
        document.addEventListener('click', () => {
            document.body.focus();
        });
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

            // Reset validation state first
            this.resetValidationState();

            const token = localStorage.getItem('authToken');
            const response = await fetch(`http://localhost:3000/api/protected/braille/${this.categoryId}/random`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load braille data');
            }

            const data = await response.json();
            console.log('📦 Received data:', data);
            this.currentChar = data.character;
            this.currentBraillePattern = JSON.parse(data.braille_pattern);
            console.log('🎯 Parsed braille pattern:', this.currentBraillePattern);
            this.currentBlockIndex = 0;
            this.pressedDots.clear();

            this.displayCharacter();
            this.createBrailleBlocks();
            this.updateProgress(`문자: ${this.currentChar}`);
            this.updateBlockProgress();

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

        // Update hint display after creating blocks
        this.updateHintDisplay();
    }

    createSingleBrailleBlock(pattern, blockIndex) {
        const block = document.createElement('div');
        block.className = 'braille-block';
        block.dataset.blockIndex = blockIndex;
        block.dataset.blockNumber = blockIndex + 1; // For CSS pseudo-element

        // Create 6 dots in braille layout: 14/25/36 arrangement
        // Order: 1, 4, 2, 5, 3, 6 (left column: 1,2,3, right column: 4,5,6)
        const dotOrder = [1, 4, 2, 5, 3, 6];

        for (let i = 0; i < 6; i++) {
            const dotNumber = dotOrder[i];
            const dot = document.createElement('div');
            dot.className = 'dot';
            dot.dataset.dotNumber = dotNumber;
            dot.dataset.blockIndex = blockIndex;

            // Add hint overlay
            const hint = document.createElement('div');
            hint.className = 'hint-overlay';
            hint.textContent = dotNumber;
            dot.appendChild(hint);

            block.appendChild(dot);
        }

        return block;
    }

    toggleHint() {
        this.showHints = !this.showHints;
        console.log('💡 Hint toggled:', this.showHints);
        this.updateHintDisplay();

        const hintBtn = document.getElementById('hint-btn');
        hintBtn.textContent = this.showHints ? '힌트 끄기' : '힌트 켜기';
    }

    updateHintDisplay() {
        const hints = document.querySelectorAll('.hint-overlay');
        hints.forEach(hint => {
            hint.style.display = this.showHints ? 'block' : 'none';
        });

        // Update hint highlighting for current block
        this.updateHintHighlighting();
    }

    updateHintHighlighting() {
        console.log('🔍 updateHintHighlighting called', {
            showHints: this.showHints,
            hasPattern: !!this.currentBraillePattern,
            currentBlockIndex: this.currentBlockIndex,
            patternLength: this.currentBraillePattern?.length
        });

        // Clear all hint highlighting first
        const allDots = document.querySelectorAll('.dot');
        allDots.forEach(dot => {
            dot.classList.remove('hint-active');
        });

        if (!this.showHints || !this.currentBraillePattern || this.currentBlockIndex >= this.currentBraillePattern.length) {
            console.log('❌ Hint highlighting skipped - conditions not met');
            return;
        }

        // Highlight correct dots for current block
        const currentPattern = this.currentBraillePattern[this.currentBlockIndex];
        const currentBlock = document.querySelector(`.braille-block[data-block-index="${this.currentBlockIndex}"]`);

        console.log('💡 Highlighting pattern:', currentPattern, 'for block:', this.currentBlockIndex);

        if (currentBlock && currentPattern) {
            currentPattern.forEach(dotNumber => {
                const dot = currentBlock.querySelector(`.dot[data-dot-number="${dotNumber}"]`);
                if (dot) {
                    dot.classList.add('hint-active');
                    console.log('✨ Added hint-active to dot:', dotNumber);
                } else {
                    console.log('❌ Could not find dot:', dotNumber);
                }
            });
        } else {
            console.log('❌ Current block or pattern not found');
        }
    }

    handleKeyDown(event) {
        const key = event.key.toLowerCase();
        console.log('🎹 Key pressed:', key, 'Current pattern exists:', !!this.currentBraillePattern);

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
            console.log('🎯 Toggling dot:', keyToDot[key]);
            this.toggleDot(keyToDot[key]);
        } else if (key === ' ') {
            event.preventDefault();
            console.log('💡 Toggling hint');
            this.toggleHint();
        } else if (key === 'enter') {
            event.preventDefault();
            console.log('⏭️ Loading next character');
            this.loadNextCharacter();
        } else if (key === 'escape') {
            event.preventDefault();
            console.log('🧹 Clearing all dots');
            this.clearAllDots();
        } else if (key === 'backspace') {
            event.preventDefault();
            console.log('⬅️ Removing last dot');
            this.removeLastDot();
        }
    }

    toggleDot(dotNumber) {
        console.log('🔄 toggleDot called with:', dotNumber);
        console.log('📊 Current state:', {
            hasPattern: !!this.currentBraillePattern,
            patternLength: this.currentBraillePattern?.length,
            currentBlockIndex: this.currentBlockIndex
        });

        if (!this.currentBraillePattern || this.currentBraillePattern.length === 0) {
            console.log('❌ No braille pattern available');
            return;
        }

        // Find the target dot in the current block
        const currentBlock = document.querySelector(`.braille-block[data-block-index="${this.currentBlockIndex}"]`);
        if (!currentBlock) {
            console.log('❌ Current block not found:', this.currentBlockIndex);
            return;
        }

        const dot = currentBlock.querySelector(`.dot[data-dot-number="${dotNumber}"]`);
        if (!dot) {
            console.log('❌ Dot not found:', dotNumber);
            return;
        }

        console.log('✅ Found dot element:', dot);

        // Toggle dot state
        if (this.pressedDots.has(dotNumber)) {
            console.log('🔴 Removing dot:', dotNumber);
            this.pressedDots.delete(dotNumber);
            dot.classList.remove('active');
            console.log('🔍 Dot classes after remove:', dot.className);
            // Remove from input order
            const index = this.dotInputOrder.indexOf(dotNumber);
            if (index > -1) {
                this.dotInputOrder.splice(index, 1);
            }
        } else {
            console.log('🟢 Adding dot:', dotNumber);
            this.pressedDots.add(dotNumber);
            dot.classList.add('active');
            console.log('🔍 Dot classes after add:', dot.className);
            // Add to input order
            this.dotInputOrder.push(dotNumber);
        }

        console.log('📊 Current pressed dots:', Array.from(this.pressedDots).sort());

        // Auto-validate when user completes current block pattern
        this.checkCurrentBlock();
    }

    clearAllDots() {
        this.pressedDots.clear();
        this.dotInputOrder = [];

        // Clear all active dots in current block
        const currentBlock = document.querySelector(`.braille-block[data-block-index="${this.currentBlockIndex}"]`);
        if (currentBlock) {
            const activeDots = currentBlock.querySelectorAll('.dot.active');
            activeDots.forEach(dot => {
                dot.classList.remove('active');
            });
        }
    }

    removeLastDot() {
        // Only work with active dots, not correct/wrong ones
        if (this.dotInputOrder.length === 0) {
            return;
        }

        const currentBlock = document.querySelector(`.braille-block[data-block-index="${this.currentBlockIndex}"]`);
        if (!currentBlock) {
            return;
        }

        // Check if we have any wrong dots - if so, don't allow backspace
        const wrongDots = currentBlock.querySelectorAll('.dot.wrong');
        if (wrongDots.length > 0) {
            return;
        }

        // Check if we have any correct dots - if so, don't allow backspace
        const correctDots = currentBlock.querySelectorAll('.dot.correct');
        if (correctDots.length > 0) {
            return;
        }

        // Get the last input dot
        const lastDotNumber = this.dotInputOrder[this.dotInputOrder.length - 1];
        const lastDot = currentBlock.querySelector(`.dot[data-dot-number="${lastDotNumber}"]`);

        if (lastDot && lastDot.classList.contains('active')) {
            // Remove from sets and arrays
            this.pressedDots.delete(lastDotNumber);
            this.dotInputOrder.pop();

            // Remove visual feedback
            lastDot.classList.remove('active');
        }
    }

    checkCurrentBlock() {
        if (!this.currentBraillePattern || this.currentBlockIndex >= this.currentBraillePattern.length) {
            return;
        }

        const correctPattern = this.currentBraillePattern[this.currentBlockIndex];
        const pressedArray = Array.from(this.pressedDots).sort((a, b) => a - b);
        const correctArray = [...correctPattern].sort((a, b) => a - b);

        // Check if user has pressed at least as many dots as the correct pattern
        if (pressedArray.length >= correctArray.length) {
            this.validateCurrentBlock(pressedArray, correctArray);
        }
    }

    validateCurrentBlock(pressedArray, correctArray) {
        const currentBlock = document.querySelector(`.braille-block[data-block-index="${this.currentBlockIndex}"]`);
        if (!currentBlock) {
            return;
        }

        // Check if patterns match
        const isCorrect = this.arraysEqual(pressedArray, correctArray);

        if (isCorrect) {
            this.handleCorrectInput(currentBlock);
        } else {
            this.handleWrongInput(currentBlock);
        }
    }

    arraysEqual(arr1, arr2) {
        if (arr1.length !== arr2.length) return false;
        return arr1.every((val, index) => val === arr2[index]);
    }

    handleCorrectInput(currentBlock) {
        // Mark all pressed dots as correct
        const activeDots = currentBlock.querySelectorAll('.dot.active');
        activeDots.forEach(dot => {
            dot.classList.remove('active');
            dot.classList.add('correct');
        });

        this.updateProgress(`정답! 잘하셨습니다.`);

        // Move to next block or complete character
        this.currentBlockIndex++;
        this.pressedDots.clear();
        this.dotInputOrder = [];

        // Update hint highlighting for next block
        this.updateHintHighlighting();
        this.updateBlockProgress();

        if (this.currentBlockIndex >= this.currentBraillePattern.length) {
            // Character complete - show completion message
            this.updateProgress(`✅ "${this.currentChar}" 완성! 다음 문자로 넘어갑니다...`);
            setTimeout(() => {
                this.loadNextCharacter();
            }, 1500);
        } else {
            // Move to next block
            this.updateProgress(`다음 블록을 입력하세요 (${this.currentBlockIndex + 1}/${this.currentBraillePattern.length})`);
        }
    }

    handleWrongInput(currentBlock) {
        // Mark all pressed dots as wrong
        const activeDots = currentBlock.querySelectorAll('.dot.active');
        activeDots.forEach(dot => {
            dot.classList.remove('active');
            dot.classList.add('wrong');
        });

        this.updateProgress(`틀렸습니다. 다시 시도해보세요.`);

        // Clear wrong feedback after delay
        setTimeout(() => {
            this.clearWrongFeedback(currentBlock);
        }, 500);
    }

    clearWrongFeedback(currentBlock) {
        const wrongDots = currentBlock.querySelectorAll('.dot.wrong');
        wrongDots.forEach(dot => {
            dot.classList.remove('wrong');
        });

        this.pressedDots.clear();
        this.dotInputOrder = [];
        this.updateProgress(`문자: ${this.currentChar}`);
        this.updateBlockProgress();
    }

    // Reset all validation states
    resetValidationState() {
        const allDots = document.querySelectorAll('.dot');
        allDots.forEach(dot => {
            dot.classList.remove('active', 'correct', 'wrong');
        });
        this.pressedDots.clear();
        this.dotInputOrder = [];
        this.currentBlockIndex = 0;
    }

    updateProgress(message) {
        const progressEl = document.getElementById('progress-indicator');
        progressEl.textContent = message;
    }

    updateBlockProgress() {
        if (!this.currentBraillePattern || this.currentBraillePattern.length <= 1) {
            // Single block - no need to show block progress
            return;
        }

        // Update block indicators/highlighting
        const allBlocks = document.querySelectorAll('.braille-block');
        allBlocks.forEach((block, index) => {
            block.classList.remove('current-block', 'completed-block', 'pending-block');

            if (index < this.currentBlockIndex) {
                block.classList.add('completed-block');
            } else if (index === this.currentBlockIndex) {
                block.classList.add('current-block');
            } else {
                block.classList.add('pending-block');
            }
        });

        // Update progress text for multi-block characters
        if (this.currentBlockIndex < this.currentBraillePattern.length) {
            const blockText = `블록 ${this.currentBlockIndex + 1}/${this.currentBraillePattern.length}`;
            const currentProgress = document.getElementById('progress-indicator').textContent;
            if (!currentProgress.includes('✅') && !currentProgress.includes('틀렸습니다')) {
                this.updateProgress(`문자: ${this.currentChar} - ${blockText}`);
            }
        }
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

    // Auto-start practice (either with provided category or default)
    const urlParams = new URLSearchParams(window.location.search);
    const categoryId = urlParams.get('category');
    // Always start practice, using either URL param or default category
    window.braillePractice.startPractice(categoryId);
});