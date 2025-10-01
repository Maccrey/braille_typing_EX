// Task 7.2: Basic Braille Practice UI Structure

class BraillePractice {
    constructor() {
        this.currentChar = null;
        this.currentCharDescription = null;
        this.currentBraillePattern = null;
        this.currentBlockIndex = 0;
        this.pressedDots = new Set();
        this.dotInputOrder = []; // Track order of dot inputs for backspace
        this.categoryId = null;
        this.showHints = false;
        this.ttsEnabled = false;

        // Practice session tracking
        this.sessionStartTime = null;
        this.lastRecordedTime = null; // Track last recorded time to prevent duplicate recording
        this.practiceSessionData = {
            startTime: null,
            charactersCompleted: 0,
            totalTime: 0
        };

        // UI update timer
        this.uiUpdateInterval = null;

        // Inactivity timer for auto-logout
        this.inactivityTimer = null;
        this.inactivityTimeout = 30000; // 30 seconds

        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuthentication();
        this.setupResponsiveLayout();

        // Get category ID from URL params or use default
        const urlParams = new URLSearchParams(window.location.search);
        this.categoryId = urlParams.get('categoryId') || 5; // Default to public category 5
    }

    setupResponsiveLayout() {
        // 화면 크기 변화 감지
        window.addEventListener('resize', () => {
            this.adjustBrailleBlockSizes();
        });

        // 초기 크기 조정
        this.adjustBrailleBlockSizes();
    }

    adjustBrailleBlockSizes() {
        const container = document.getElementById('braille-blocks');
        if (!container || !this.currentBraillePattern) return;

        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        const blockCount = this.currentBraillePattern.length;

        // 기본 크기와 여백 설정
        const defaultBlockWidth = 80;
        const defaultBlockHeight = 120;
        const defaultGap = 16; // 1rem = 16px
        const containerPadding = 20; // 좌우 패딩

        // 필요한 총 너비 계산
        const totalNeededWidth = (blockCount * defaultBlockWidth) + ((blockCount - 1) * defaultGap) + containerPadding;

        // 모바일 환경 감지
        const isMobile = window.innerWidth <= 768;
        const isSmallMobile = window.innerWidth <= 480;

        // 화면 크기에 맞게 스케일 조정
        let scale = 1;

        if (totalNeededWidth > containerWidth) {
            // 가로 크기 기준 스케일 계산
            const availableWidth = containerWidth - containerPadding;
            const gapTotalWidth = (blockCount - 1) * defaultGap;
            const availableBlockWidth = availableWidth - gapTotalWidth;
            const widthScale = availableBlockWidth / (blockCount * defaultBlockWidth);

            // 세로 크기 기준 스케일 계산 (디바이스별 최대 높이 고려)
            let maxContainerHeight = 200; // 기본값
            if (isSmallMobile) {
                maxContainerHeight = 140;
            } else if (isMobile) {
                maxContainerHeight = 160;
            }

            const availableHeight = Math.min(containerHeight, maxContainerHeight) - 20; // 상하 패딩
            const heightScale = availableHeight / defaultBlockHeight;

            // 더 작은 스케일 선택 (가로나 세로 중 더 제한적인 조건)
            scale = Math.min(widthScale, heightScale);

            // 디바이스별 최소/최대 스케일 제한
            let minScale = 0.4; // 기본 40%까지 축소 가능
            if (isSmallMobile) {
                minScale = 0.3; // 소형 모바일에서는 30%까지
            } else if (isMobile) {
                minScale = 0.35; // 모바일에서는 35%까지
            }

            const maxScale = 1.0;  // 최대 100%
            scale = Math.max(minScale, Math.min(maxScale, scale));

            // CSS 변수를 통해 동적 크기 조정
            document.documentElement.style.setProperty('--braille-block-scale', scale);

            // 스케일에 따른 gap 조정
            const adjustedGap = Math.max(4, defaultGap * scale);
            container.style.gap = adjustedGap + 'px';

            console.log(`📏 Block scaling: ${scale.toFixed(2)} (${blockCount} blocks, container: ${containerWidth}px)`);
        } else {
            // 기본 크기 유지
            scale = 1;
            document.documentElement.style.setProperty('--braille-block-scale', '1');
            container.style.gap = '';
        }

        // 컨테이너 높이 동적 조정
        const finalBlockHeight = defaultBlockHeight * scale;
        const minContainerHeight = Math.max(finalBlockHeight + 20, 60); // 최소 높이 보장
        container.style.minHeight = minContainerHeight + 'px';

        // 스크롤 방지
        container.style.overflow = 'visible';
    }

    bindEvents() {
        // Control buttons
        document.getElementById('next-btn').addEventListener('click', () => this.loadNextCharacter());
        document.getElementById('hint-btn').addEventListener('click', () => this.toggleHint());
        document.getElementById('tts-toggle').addEventListener('change', (e) => this.toggleTTS(e.target.checked));
        document.getElementById('back-btn').addEventListener('click', () => {
            window.location.href = 'main.html';
        });

        // Keyboard events will be handled in Task 7.3
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Ensure the page has focus for keyboard events
        window.addEventListener('load', () => {
            document.body.focus();
            this.initializeTTS();
        });

        // Also set focus when user clicks anywhere on the page
        document.addEventListener('click', () => {
            document.body.focus();
            // Reset inactivity timer on any click
            this.resetInactivityTimer();
        });

        // Add page unload handler to save practice session
        window.addEventListener('beforeunload', () => {
            this.clearInactivityTimer();
            this.endPracticeSession();
        });

        // Add page visibility change handler for better session tracking
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && this.sessionStartTime) {
                // Note: Practice session will be recorded only when explicitly ended
                console.log('Page hidden, but session recording deferred to session end');
            }
        });

        // Start inactivity timer
        this.startInactivityTimer();
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

        // Start practice session tracking
        this.sessionStartTime = Date.now();
        this.lastRecordedTime = this.sessionStartTime; // Initialize last recorded time
        this.practiceSessionData.startTime = this.sessionStartTime;
        console.log('📊 Practice session started at:', new Date(this.sessionStartTime));

        // Start UI update timer
        this.startUIUpdates();

        await this.loadNextCharacter();
    }

    async loadNextCharacter() {
        try {
            this.updateProgress('문제를 불러오는 중...');

            // Reset validation state first
            this.resetValidationState();

            const token = localStorage.getItem('authToken');

            if (!token) {
                console.error('❌ No auth token found');
                this.updateProgress('로그인이 필요합니다.');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
                return;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

            const response = await fetch(`/api/protected/braille/${this.categoryId}/random`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.status === 401) {
                console.error('❌ Unauthorized - invalid token');
                localStorage.removeItem('authToken');
                this.updateProgress('인증이 만료되었습니다. 로그인 페이지로 이동합니다.');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
                return;
            }

            if (response.status === 404) {
                console.error('❌ Category not found or no braille data');
                this.updateProgress('카테고리가 존재하지 않거나 점자 데이터가 없습니다.');
                setTimeout(() => {
                    window.location.href = 'main.html';
                }, 3000);
                return;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const data = await response.json();
            console.log('📦 Received data:', data);
            this.currentChar = data.character;
            this.currentCharDescription = data.description;
            this.currentBraillePattern = JSON.parse(data.braille_pattern);
            console.log('🎯 Parsed braille pattern:', this.currentBraillePattern);
            this.currentBlockIndex = 0;
            this.pressedDots.clear();

            this.displayCharacter();
            this.displayCharacterDescription();
            this.createBrailleBlocks();
            this.updateProgress(`문자: ${this.currentChar}`);
            this.updateBlockProgress();

        } catch (error) {
            console.error('Error loading character:', error);

            if (error.name === 'AbortError') {
                this.updateProgress('서버 응답이 지연되고 있습니다. 네트워크 연결을 확인해주세요.');
            } else if (error.message.includes('fetch')) {
                this.updateProgress('네트워크 연결 오류입니다. 잠시 후 다시 시도해주세요.');
            } else {
                this.updateProgress('문제를 불러오는데 실패했습니다. 메인 페이지로 돌아갑니다.');
                setTimeout(() => {
                    window.location.href = 'main.html';
                }, 3000);
            }
        }
    }

    displayCharacter() {
        const currentCharEl = document.getElementById('current-char');
        currentCharEl.textContent = this.currentChar || '-';
    }

    displayCharacterDescription() {
        const descriptionEl = document.getElementById('character-description');
        if (descriptionEl) {
            descriptionEl.textContent = this.currentCharDescription || '';

            // Read description with TTS if enabled
            if (this.ttsEnabled && this.currentCharDescription) {
                this.speakText(this.currentCharDescription);
            }
        }
    }

    toggleTTS(enabled) {
        this.ttsEnabled = enabled;
        console.log('TTS', enabled ? 'enabled' : 'disabled');

        if (enabled) {
            // Test TTS with current character if available
            if (this.currentCharDescription) {
                this.speakText(`음성 읽기가 활성화되었습니다. ${this.currentCharDescription}`);
            } else {
                this.speakText('음성 읽기가 활성화되었습니다.');
            }
        } else {
            // Stop any ongoing speech
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        }
    }

    initializeTTS() {
        if ('speechSynthesis' in window) {
            // Load voices
            const loadVoices = () => {
                const voices = window.speechSynthesis.getVoices();
                console.log('Available TTS voices:', voices.map(v => `${v.name} (${v.lang})`));
            };

            if (window.speechSynthesis.getVoices().length > 0) {
                loadVoices();
            } else {
                window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
            }
        }
    }

    speakText(text) {
        if (!this.ttsEnabled || !('speechSynthesis' in window)) {
            return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Set Korean voice if available
        const voices = window.speechSynthesis.getVoices();
        const koreanVoice = voices.find(voice =>
            voice.lang.includes('ko') || voice.name.includes('Korean')
        );

        if (koreanVoice) {
            utterance.voice = koreanVoice;
        }

        utterance.lang = 'ko-KR';
        utterance.rate = 0.8; // Slightly slower for better comprehension
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        window.speechSynthesis.speak(utterance);
    }

    createBrailleBlocks() {
        const container = document.getElementById('braille-blocks');
        console.log('🏗️ Creating braille blocks, container found:', !!container);
        container.innerHTML = '';

        if (!this.currentBraillePattern) {
            console.log('❌ No braille pattern available');
            return;
        }

        console.log('🧱 Creating blocks for pattern:', this.currentBraillePattern);

        this.currentBraillePattern.forEach((blockPattern, blockIndex) => {
            const block = this.createSingleBrailleBlock(blockPattern, blockIndex);
            container.appendChild(block);
            console.log(`✅ Block ${blockIndex} created with pattern:`, blockPattern);
        });

        // Log final DOM structure
        const createdBlocks = container.querySelectorAll('.braille-block');
        console.log('🏗️ Total blocks created:', createdBlocks.length);
        createdBlocks.forEach((block, index) => {
            const dots = block.querySelectorAll('.dot');
            console.log(`📊 Block ${index} has ${dots.length} dots`);
        });

        // Update hint display after creating blocks
        this.updateHintDisplay();

        // 블록 생성 후 크기 조정
        setTimeout(() => {
            this.adjustBrailleBlockSizes();
        }, 100);
    }

    createSingleBrailleBlock(pattern, blockIndex) {
        const block = document.createElement('div');
        block.className = 'braille-block';
        block.dataset.blockIndex = blockIndex;
        block.dataset.blockNumber = blockIndex + 1; // For CSS pseudo-element

        // Create 6 dots in braille layout: 14/25/36 arrangement
        // Grid positions: [0,0]=1, [0,1]=4, [1,0]=2, [1,1]=5, [2,0]=3, [2,1]=6
        // Result: 1 4
        //         2 5
        //         3 6
        const dotOrder = [1, 4, 2, 5, 3, 6];

        for (let i = 0; i < 6; i++) {
            const dotNumber = dotOrder[i];
            const dot = document.createElement('div');
            dot.className = 'dot';
            dot.dataset.dotNumber = dotNumber;
            dot.dataset.blockIndex = blockIndex;

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

        // Clear all hint highlighting first, but only for the current block
        const currentBlock = document.querySelector(`.braille-block[data-block-index="${this.currentBlockIndex}"]`);
        if (currentBlock) {
            const currentBlockDots = currentBlock.querySelectorAll('.dot');
            currentBlockDots.forEach(dot => {
                // Only remove hint if the dot is not active (not currently pressed)
                if (!dot.classList.contains('active')) {
                    dot.classList.remove('hint-active');
                }
            });
        }

        if (!this.showHints || !this.currentBraillePattern || this.currentBlockIndex >= this.currentBraillePattern.length) {
            console.log('❌ Hint highlighting skipped - conditions not met');
            return;
        }

        // Highlight correct dots for current block
        const currentPattern = this.currentBraillePattern[this.currentBlockIndex];

        console.log('💡 Highlighting pattern:', currentPattern, 'for block:', this.currentBlockIndex);

        if (currentBlock && currentPattern) {
            currentPattern.forEach(dotNumber => {
                const dot = currentBlock.querySelector(`.dot[data-dot-number="${dotNumber}"]`);
                if (dot) {
                    // Always add hint-active for correct dots when hints are enabled
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

        // Reset inactivity timer on any key press
        this.resetInactivityTimer();

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

            // Remove all state classes
            dot.classList.remove('active', 'correct', 'wrong');

            // Check if this dot should have hint based on current pattern
            if (this.showHints && this.currentBraillePattern && this.currentBlockIndex < this.currentBraillePattern.length) {
                const currentPattern = this.currentBraillePattern[this.currentBlockIndex];
                if (currentPattern && currentPattern.includes(dotNumber)) {
                    dot.classList.add('hint-active');
                    console.log('💡 Restored hint for dot:', dotNumber);
                }
            }

            console.log('🔍 Dot classes after remove:', dot.className);
            // Remove from input order
            const index = this.dotInputOrder.indexOf(dotNumber);
            if (index > -1) {
                this.dotInputOrder.splice(index, 1);
            }
        } else {
            console.log('🟢 Adding dot:', dotNumber);
            this.pressedDots.add(dotNumber);

            // Check if this dot should have hint (is it part of correct pattern?)
            const currentPattern = this.currentBraillePattern[this.currentBlockIndex];
            const shouldKeepHint = this.showHints && currentPattern && currentPattern.includes(dotNumber);

            // Remove state classes but preserve hint if it should be kept
            dot.classList.remove('correct', 'wrong');
            if (!shouldKeepHint) {
                dot.classList.remove('hint-active');
            }
            dot.classList.add('active');
            console.log('🔍 Dot classes after add:', dot.className);
            console.log('🔍 Dot element style:', {
                background: getComputedStyle(dot).backgroundColor,
                border: getComputedStyle(dot).borderColor,
                display: getComputedStyle(dot).display,
                visibility: getComputedStyle(dot).visibility
            });
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
            // Character complete - record completion and show completion message
            this.practiceSessionData.charactersCompleted++;
            console.log('🎯 Character completed! Total characters:', this.practiceSessionData.charactersCompleted);

            // Update completed characters display immediately
            this.updateCompletedCharsDisplay();

            this.updateProgress(`✅ "${this.currentChar}" 완성! 다음 문자로 넘어갑니다...`);

            // TTS notification for completion
            if (this.ttsEnabled) {
                const description = this.currentCharDescription || this.currentChar;
                this.speakText(`${description} 완성되었습니다!`);
            }

            // Note: Practice session recording is now done only at the end of the session

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

            // Restore hint if this dot should be hinted and hints are enabled
            if (this.showHints && this.currentBraillePattern && this.currentBlockIndex < this.currentBraillePattern.length) {
                const currentPattern = this.currentBraillePattern[this.currentBlockIndex];
                const dotNumber = parseInt(dot.dataset.dotNumber);
                if (currentPattern && currentPattern.includes(dotNumber)) {
                    dot.classList.add('hint-active');
                }
            }
        });

        this.pressedDots.clear();
        this.dotInputOrder = [];
        this.updateProgress(`문자: ${this.currentChar}`);
        this.updateBlockProgress();

        // Re-apply hints if they were enabled (backup method)
        if (this.showHints) {
            this.updateHintHighlighting();
        }
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

    // DEPRECATED: No longer used - practice sessions are now recorded only at the end
    // checkAndRecordSession() {
    //     // This function is no longer used. Practice sessions are recorded once at the end.
    // }

    // Record practice session to backend
    async recordPracticeSession(duration) {
        try {
            // Only record if there's meaningful practice time (at least 10 seconds)
            if (duration < 10) {
                console.log('⏱️ Session too short to record:', duration, 'seconds');
                return;
            }

            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            const token = localStorage.getItem('authToken');

            console.log('📝 Recording practice session:', {
                totalDuration: duration,
                characters: this.practiceSessionData.charactersCompleted,
                date: today
            });

            const baseUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:3001' : window.location.origin;
            const response = await fetch(baseUrl + '/api/protected/practice/log', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    duration_seconds: duration,
                    practiced_at: today
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Practice session recorded successfully:', result);
                this.practiceSessionData.totalTime = duration;
            } else {
                const error = await response.json();
                console.error('❌ Failed to record practice session:', error);
            }

        } catch (error) {
            console.error('❌ Error recording practice session:', error);
        }
    }

    // End practice session and record total session time
    async endPracticeSession() {
        if (this.sessionStartTime) {
            const currentTime = Date.now();
            const totalSessionDuration = Math.floor((currentTime - this.sessionStartTime) / 1000);

            console.log('🏁 Ending practice session. Total duration:', totalSessionDuration, 'seconds');
            console.log('📊 Characters completed:', this.practiceSessionData.charactersCompleted);

            // Stop UI updates
            this.stopUIUpdates();

            // Record total session time only if there's meaningful practice time (at least 10 seconds)
            if (totalSessionDuration >= 10) {
                await this.recordPracticeSession(totalSessionDuration);
            } else {
                console.log('⏱️ Session too short to record:', totalSessionDuration, 'seconds');
            }

            // Reset session data
            this.sessionStartTime = null;
            this.lastRecordedTime = null;
            this.practiceSessionData = {
                startTime: null,
                charactersCompleted: 0,
                totalTime: 0
            };
        }
    }

    // Start UI updates timer
    startUIUpdates() {
        console.log('▶️ Starting UI updates, session start time:', this.sessionStartTime);

        // Update immediately
        this.updateSessionTimeDisplay();
        this.updateCompletedCharsDisplay();

        // Clear any existing interval first
        if (this.uiUpdateInterval) {
            clearInterval(this.uiUpdateInterval);
        }

        // Update every second
        this.uiUpdateInterval = setInterval(() => {
            this.updateSessionTimeDisplay();
        }, 1000);

        console.log('✅ UI update interval started:', this.uiUpdateInterval);
    }

    // Stop UI updates timer
    stopUIUpdates() {
        if (this.uiUpdateInterval) {
            clearInterval(this.uiUpdateInterval);
            this.uiUpdateInterval = null;
        }
    }

    // Update session time display
    updateSessionTimeDisplay() {
        if (!this.sessionStartTime) {
            console.log('⚠️ updateSessionTimeDisplay: No sessionStartTime found');
            return;
        }

        const currentTime = Date.now();
        const elapsedSeconds = Math.floor((currentTime - this.sessionStartTime) / 1000);

        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        const timeElement = document.getElementById('current-session-time');
        if (timeElement) {
            timeElement.textContent = timeString;
        }

        // Debug log every 10 seconds
        if (elapsedSeconds % 10 === 0) {
            console.log('⏰ Session time update:', timeString, 'Characters:', this.practiceSessionData.charactersCompleted);
        }
    }

    // Update completed characters display
    updateCompletedCharsDisplay() {
        const charsElement = document.getElementById('completed-chars');
        if (charsElement) {
            charsElement.textContent = `${this.practiceSessionData.charactersCompleted}개`;
        }
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

    // Inactivity timer management
    startInactivityTimer() {
        console.log('🕐 Starting inactivity timer (30 seconds)');
        this.clearInactivityTimer();
        this.inactivityTimer = setTimeout(() => {
            this.handleInactivityTimeout();
        }, this.inactivityTimeout);
    }

    resetInactivityTimer() {
        console.log('🔄 Resetting inactivity timer');
        this.startInactivityTimer();
    }

    clearInactivityTimer() {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = null;
        }
    }

    handleInactivityTimeout() {
        console.log('⏰ Inactivity timeout reached - returning to main page');

        // Clear the timer
        this.clearInactivityTimer();

        // End practice session
        this.endPracticeSession();

        // Show a message and redirect to main page
        this.updateProgress('30초 동안 입력이 없어 메인 페이지로 이동합니다...');

        setTimeout(() => {
            window.location.href = 'main.html';
        }, 1500);
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