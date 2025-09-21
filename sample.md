<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>그리스어 점자 타자 연습기</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
            background-color: #f5f5f5;
        }
        h1 {
            margin-bottom: 20px;
        }
        .braille-container {
            display: flex;
            gap: 20px;
            margin: 20px 0;
        }
        .braille-block {
            text-align: center;
        }
        .braille-grid {
            display: grid;
            grid-template-columns: repeat(2, 40px);
            grid-template-rows: repeat(3, 40px);
            gap: 10px;
            margin-top: 10px;
        }
        .dot {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s;
            font-weight: bold;
            color: black;
            font-size: 16px;
        }
        .active {
            background-color: #007bff;
            color: white;
        }
        .correct {
            background-color: green;
            color: white;
        }
        .wrong {
            background-color: red;
            color: white;
        }
        #current-char {
            font-size: 32px;
            margin-bottom: 10px;
        }
        #hint {
            margin: 10px;
            font-size: 18px;
            color: #333;
        }
        button {
            padding: 8px 16px;
            font-size: 16px;
            cursor: pointer;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <h1>그리스어 점자 타자 연습기</h1>
    <div id="current-char">Α</div>
    <button id="hint-toggle-btn" onclick="toggleHint()">힌트 보기</button>
    <div id="hint"></div>
    
    <div class="braille-container" id="braille-container">
        </div>
    
    <p>F(1) D(2) S(3) / J(4) K(5) L(6) 키를 눌러 점자를 입력하세요. Backspace=초기화, Space=힌트</p>

    <script>
        const brailleMap = {
            'Α': [[6], [2, 6], [1]],
            'α': [[2, 6], [1]],
            'Β': [[6], [2, 6], [1, 4]],
            'β': [[2, 6], [1, 4]],
            'Γ': [[6], [2, 6], [1, 2, 3, 4]],
            'γ': [[2, 6], [1, 2, 3, 4]],
            'Δ': [[6], [2, 6], [1, 2, 5]],
            'δ': [[2, 6], [1, 2, 5]],
            'Ε': [[6], [2, 6], [1, 5]],
            'ε': [[2, 6], [1, 5]],
            'Ζ': [[6], [2, 6], [1, 2, 4, 6]],
            'ζ': [[2, 6], [1, 2, 4, 6]],
            'Η': [[6], [2, 6], [1, 2, 5]],
            'η': [[2, 6], [1, 2, 5]],
            'Θ': [[6], [2, 6], [1, 2, 4, 5]],
            'θ': [[2, 6], [1, 2, 4, 5]],
            'Ι': [[6], [2, 6], [2, 4]],
            'ι': [[2, 6], [2, 4]],
            'Κ': [[6], [2, 6], [1, 3]],
            'κ': [[2, 6], [1, 3]],
            'Λ': [[6], [2, 6], [1, 2, 3, 4]],
            'λ': [[2, 6], [1, 2, 3, 4]],
            'Μ': [[6], [2, 6], [1, 3, 4]],
            'μ': [[2, 6], [1, 3, 4]],
            'Ν': [[6], [2, 6], [1, 3, 4, 5]],
            'ν': [[2, 6], [1, 3, 4, 5]],
            'Ξ': [[6], [2, 6], [1, 3, 4, 5, 6]],
            'ξ': [[2, 6], [1, 3, 4, 5, 6]],
            'Ο': [[6], [2, 6], [1, 3, 5]],
            'ο': [[2, 6], [1, 3, 5]],
            'Π': [[6], [2, 6], [1, 2, 3, 4]],
            'π': [[2, 6], [1, 2, 3, 4]],
            'Ρ': [[6], [2, 6], [1, 2, 3, 4]],
            'ρ': [[2, 6], [1, 2, 3, 4]],
            'Σ': [[6], [2, 6], [1, 2, 4, 5]],
            'σ': [[2, 6], [1, 2, 4, 5]],
            'Τ': [[6], [2, 6], [1, 2, 3, 4]],
            'τ': [[2, 6], [1, 2, 3, 4]],
            'Υ': [[6], [2, 6], [1, 2, 5, 6]],
            'υ': [[2, 6], [1, 2, 5, 6]],
            'Φ': [[6], [2, 6], [1, 2, 4, 5]],
            'φ': [[2, 6], [1, 2, 4, 5]],
            'Χ': [[6], [2, 6], [1, 2, 4, 5, 6]],
            'χ': [[2, 6], [1, 2, 4, 5, 6]],
            'Ψ': [[6], [2, 6], [1, 2, 4, 5, 6]],
            'ψ': [[2, 6], [1, 2, 4, 5, 6]],
            'Ω': [[6], [2, 6], [1, 2, 4, 5]],
            'ω': [[2, 6], [1, 2, 4, 5]],
        };

        const keyToDot = {
            'f': 1, 'd': 2, 's': 3,
            'j': 4, 'k': 5, 'l': 6,
        };

        let currentChar;
        let correctBraille;
        let blockCount;
        let currentBlockIndex = 0;
        let pressedDots = new Set();
        let hintVisible = false;

        const brailleContainer = document.getElementById('braille-container');

        function createBrailleBlocks(count) {
            brailleContainer.innerHTML = '';
            for (let i = 0; i < count; i++) {
                const block = document.createElement('div');
                block.className = 'braille-block';
                block.id = `block-${i}`;
                // 점자 번호 순서를 1-4, 2-5, 3-6 형식으로 변경
                block.innerHTML = `
                    <p>블록 ${i + 1}</p>
                    <div class="braille-grid">
                        <div id="dot-${i}-1" class="dot">1</div>
                        <div id="dot-${i}-4" class="dot">4</div>
                        <div id="dot-${i}-2" class="dot">2</div>
                        <div id="dot-${i}-5" class="dot">5</div>
                        <div id="dot-${i}-3" class="dot">3</div>
                        <div id="dot-${i}-6" class="dot">6</div>
                    </div>
                `;
                brailleContainer.appendChild(block);
            }
        }

        function updateDots() {
            document.querySelectorAll('.dot').forEach(dot => {
                dot.className = dot.className.replace(/ (active|correct|wrong)/g, '');
            });

            pressedDots.forEach(dot => {
                document.getElementById(`dot-${currentBlockIndex}-${dot}`).classList.add('active');
            });

            for (let i = 0; i < currentBlockIndex; i++) {
                const correctBlockDots = new Set(correctBraille[i]);
                correctBlockDots.forEach(dot => {
                    document.getElementById(`dot-${i}-${dot}`).classList.add('correct');
                });
            }
        }

        function reset() {
            currentChar = randomChar();
            correctBraille = brailleMap[currentChar];
            blockCount = correctBraille.length;
            currentBlockIndex = 0;
            pressedDots.clear();
            hintVisible = false;

            document.getElementById('current-char').textContent = currentChar;
            document.getElementById('hint').textContent = '';
            document.getElementById('hint-toggle-btn').textContent = '힌트 보기';
            createBrailleBlocks(blockCount);
            updateDots();
        }

        function randomChar() {
            const keys = Object.keys(brailleMap);
            return keys[Math.floor(Math.random() * keys.length)];
        }

        function toggleHint() {
            const hintBox = document.getElementById('hint');
            const btn = document.getElementById('hint-toggle-btn');
            if (!hintVisible) {
                const hints = correctBraille.map((block, index) => {
                    return `블록 ${index + 1} = [${block.join(', ')}]`;
                }).join(', ');

                hintBox.textContent = `힌트: ${currentChar} = ${hints}`;
                btn.textContent = '힌트 숨기기';
                hintVisible = true;
            } else {
                hintBox.textContent = '';
                btn.textContent = '힌트 보기';
                hintVisible = false;
            }
        }

        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();

            if (keyToDot[key]) {
                pressedDots.add(keyToDot[key]);
                updateDots();

                const correctDots = new Set(correctBraille[currentBlockIndex]);
                if (pressedDots.size === correctDots.size) {
                    checkAnswerAndProceed();
                }

            } else if (e.code === 'Space') {
                e.preventDefault();
                toggleHint();
            } else if (key === 'backspace') {
                e.preventDefault();
                if (pressedDots.size > 0) {
                    const lastDot = Array.from(pressedDots).pop();
                    pressedDots.delete(lastDot);
                    updateDots();
                }
            }
        });

        function checkAnswerAndProceed() {
            const correctDots = new Set(correctBraille[currentBlockIndex]);
            const isCorrect = pressedDots.size === correctDots.size && [...pressedDots].every(d => correctDots.has(d));

            correctDots.forEach(dot => {
                document.getElementById(`dot-${currentBlockIndex}-${dot}`).classList.add(isCorrect ? 'correct' : 'wrong');
            });

            setTimeout(() => {
                if (isCorrect) {
                    currentBlockIndex++;
                    if (currentBlockIndex < blockCount) {
                        pressedDots.clear();
                        updateDots();
                    } else {
                        alert('축하합니다! 정답입니다!');
                        reset();
                    }
                } else {
                    alert('아쉽네요! 다시 시도해 보세요.');
                    pressedDots.clear();
                    updateDots();
                }
            }, 500);
        }

        reset();
    </script>

</body>
</html>
