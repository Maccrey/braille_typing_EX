const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// 예제 데이터 (그리스 문자 점자)
const exampleData = [
    ['문자', '블록1', '블록2', '설명'],
    ['α', '1', '', '알파 (alpha)'],
    ['β', '1,2', '', '베타 (beta)'],
    ['γ', '1,2,4,5', '', '감마 (gamma)'],
    ['δ', '1,4,5', '', '델타 (delta)'],
    ['ε', '1,5', '', '엡실론 (epsilon)'],
    ['ζ', '1,3,5,6', '', '제타 (zeta)'],
    ['η', '1,2,4,5,6', '', '에타 (eta)'],
    ['θ', '1,4,5,6', '', '세타 (theta)'],
    ['ι', '2,4', '', '이오타 (iota)'],
    ['κ', '1,3', '', '카파 (kappa)'],
    ['λ', '1,2,3', '', '람다 (lambda)'],
    ['μ', '1,3,4', '', '뮤 (mu)'],
    ['ν', '1,3,4,5', '', '뉴 (nu)'],
    ['ξ', '1,3,4,6', '', '크시 (xi)'],
    ['ο', '1,3,5', '', '오미크론 (omicron)'],
    ['π', '1,2,3,4', '', '파이 (pi)'],
    ['ρ', '1,2,3,5', '', '로 (rho)'],
    ['σ', '2,3,4', '', '시그마 (sigma)'],
    ['τ', '2,3,4,5', '', '타우 (tau)'],
    ['υ', '1,3,6', '', '업실론 (upsilon)'],
    ['φ', '1,2,4', '', '파이 (phi)'],
    ['χ', '1,2,3,4,6', '', '카이 (chi)'],
    ['ψ', '1,3,4,5,6', '', '프사이 (psi)'],
    ['ω', '2,4,6', '', '오메가 (omega)']
];

// 한국어 자음 예제 추가
const koreanConsonants = [
    ['ㄱ', '1', '', '기역'],
    ['ㄴ', '2,4', '', '니은'],
    ['ㄷ', '2,4,6', '', '디귿'],
    ['ㄹ', '5', '', '리을'],
    ['ㅁ', '1,3,4', '', '미음'],
    ['ㅂ', '4,5', '', '비읍'],
    ['ㅅ', '6', '', '시옷'],
    ['ㅇ', '1,2,4,5,6', '', '이응'],
    ['ㅈ', '2,6', '', '지읒'],
    ['ㅊ', '5,6', '', '치읓'],
    ['ㅋ', '2,4,5', '', '키읔'],
    ['ㅌ', '2,4,5,6', '', '티읕'],
    ['ㅍ', '4,5,6', '', '피읖'],
    ['ㅎ', '2,5,6', '', '히읗']
];

// 복합 문자 예제 (다중 블록)
const complexExamples = [
    ['가', '1', '1,2,3,4,5', '', '', '기역 + 아 (2블록)'],
    ['나', '2,4', '1,2,3,4,5', '', '', '니은 + 아 (2블록)'],
    ['다', '2,4,6', '1,2,3,4,5', '', '', '디귿 + 아 (2블록)'],
    ['안녕', '1,2,3,4,5', '2,4', '', '', '아 + 니은 (2블록)'],
    ['사랑해', '6', '5', '1,2,3,4,5', '', '사 + 랑 + 애 (3블록)'],
    ['고맙습니다', '1,2', '1,3,4', '1', '2,4', '고 + 마 + ㅂ + 니 (4블록)'],
    ['학교에서', '1,2,5,6', '1,2', '1,5', '6', '학 + 교 + 에 + 서 (4블록)']
];

// 영어 단어 예제 (더 많은 블록)
const englishExamples = [
    ['HELLO', '1,2,5', '1,5', '1,2,3', '1,2,3', 'H + E + L + L (4블록)'],
    ['WORLD', '2,4,5,6', '1,3,5', '1,2,3,5', '1,2,3', 'W + O + R + L (4블록)'],
    ['BRAILLE', '1,2', '1,2,3,5', '1', '1', 'B + R + A + I (4블록+)']
];

function createExampleFile() {
    try {
        // uploads 디렉토리가 없으면 생성
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // 워크북 생성
        const workbook = XLSX.utils.book_new();

        // 그리스 문자 시트
        const greekSheet = XLSX.utils.aoa_to_sheet([
            ['📋 그리스 문자 점자 예제'],
            [''],
            ['📝 사용법:'],
            ['- A열: 학습할 문자'],
            ['- B열: 첫 번째 점자 블록의 점 번호 (쉼표로 구분)'],
            ['- C열: 두 번째 점자 블록의 점 번호 (선택사항)'],
            ['- D열: 설명 (선택사항)'],
            [''],
            ...exampleData
        ]);

        // 한국어 자음 시트
        const koreanSheet = XLSX.utils.aoa_to_sheet([
            ['📋 한국어 자음 점자 예제'],
            [''],
            ['📝 점자 번호 규칙:'],
            ['1  4'],
            ['2  5'],
            ['3  6'],
            [''],
            ['문자', '블록1', '블록2', '설명'],
            ...koreanConsonants
        ]);

        // 복합 문자 시트 (동적 블록 수)
        const complexSheet = XLSX.utils.aoa_to_sheet([
            ['📋 복합 문자 점자 예제'],
            [''],
            ['📝 다중 블록 문자:'],
            ['- 한 문자가 여러 점자 블록으로 구성되는 경우'],
            ['- 각 블록을 순서대로 B열, C열, D열... 에 입력'],
            ['- 빈 블록은 비워두세요'],
            [''],
            ['문자', '블록1', '블록2', '블록3', '블록4', '설명'],
            ...complexExamples
        ]);

        // 영어 단어 시트
        const englishSheet = XLSX.utils.aoa_to_sheet([
            ['📋 영어 단어 점자 예제'],
            [''],
            ['📝 영어 문자의 다중 블록:'],
            ['- 영어 단어는 각 문자가 하나의 블록'],
            ['- 단어 전체를 하나의 행에 입력'],
            [''],
            ['단어', '블록1', '블록2', '블록3', '블록4', '설명'],
            ...englishExamples
        ]);

        // 시트를 워크북에 추가
        XLSX.utils.book_append_sheet(workbook, greekSheet, '그리스문자');
        XLSX.utils.book_append_sheet(workbook, koreanSheet, '한국어자음');
        XLSX.utils.book_append_sheet(workbook, complexSheet, '복합문자');
        XLSX.utils.book_append_sheet(workbook, englishSheet, '영어단어');

        // 파일 저장
        const filePath = path.join(uploadsDir, 'braille-example.xlsx');
        XLSX.writeFile(workbook, filePath);

        console.log('✅ 예제 Excel 파일이 생성되었습니다:', filePath);
        return filePath;

    } catch (error) {
        console.error('❌ 예제 파일 생성 중 오류 발생:', error);
        throw error;
    }
}

// 스크립트가 직접 실행된 경우
if (require.main === module) {
    createExampleFile();
}

module.exports = { createExampleFile };