# 점자 타자 연습기 (Braille Typing Practice)

🔤 **시각장애인을 위한 웹 기반 점자 타자 연습 애플리케이션**

[![Firebase](https://img.shields.io/badge/Backend-Firebase-yellow.svg)](https://firebase.google.com/)
[![Firestore](https://img.shields.io/badge/Database-Firestore-blue.svg)](https://firebase.google.com/docs/firestore)
[![Playwright](https://img.shields.io/badge/E2E-Playwright-orange.svg)](https://playwright.dev/)

## 📋 목차

- [프로젝트 개요](#-프로젝트-개요)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [설치 및 실행](#-설치-및-실행)
- [사용법](#-사용법)
- [개발자 가이드](#-개발자-가이드)
- [테스트](#-테스트)
- [프로젝트 구조](#-프로젝트-구조)
- [기여하기](#-기여하기)
- [라이센스](#-라이센스)

## 🎯 프로젝트 개요

점자 타자 연습기는 시각장애인들이 점자 입력 능력을 향상시킬 수 있도록 돕는 웹 애플리케이션입니다. 사용자는 개인화된 학습 환경에서 다양한 점자 문자를 연습하고, 학습 진행 상황을 추적할 수 있습니다.

### 🌟 핵심 가치

- **접근성**: 시각장애인을 위한 직관적이고 접근 가능한 인터페이스
- **개인화**: 사용자별 맞춤형 학습 콘텐츠 및 진행 상황 추적
- **커뮤니티**: 학습 자료 공유 및 협력 학습 환경
- **성능**: 빠르고 안정적인 사용자 경험

## ✨ 주요 기능

### 🔐 사용자 인증

- **회원가입/로그인**: Firebase Authentication을 이용한 안전한 인증 시스템
- **개인화된 환경**: 사용자별 학습 데이터 및 설정 관리

### 📁 학습 자료 관리

- **Excel 파일 업로드**: 점자 학습 데이터를 Excel 형태로 쉽게 업로드 (구현 예정)
- **카테고리 관리**: 주제별로 학습 자료를 체계적으로 분류
- **공개/비공개 설정**: 개인 학습용 또는 커뮤니티 공유용 선택 가능
- **즐겨찾기**: 다른 사용자의 우수한 학습 자료를 즐겨찾기에 추가 (구현 예정)

### 🎹 점자 연습 시스템

- **키보드 매핑**: F(1), D(2), S(3), J(4), K(5), L(6) 키를 이용한 점자 입력
- **실시간 피드백**: 입력한 점자의 정확성을 즉시 확인

### 📊 학습 기록 및 통계

- **연습 시간 추적**: 일일 및 누적 연습 시간 기록
- **출석 달력**: 학습 일정을 달력 형태로 시각화

### 🔍 검색 및 발견

- **공개 자료 검색**: 다른 사용자들이 공유한 학습 자료 검색

### 👨‍💼 관리자 기능 (구현 예정)

- **시스템 통계**: 전체 사용자, 카테고리, 연습 기록 등 시스템 현황 조회
- **사용자 관리**: 전체 사용자 목록 조회 및 권한 변경

## 🛠 기술 스택

### Backend

- **Service**: Firebase
- **Database**: Firestore
- **Authentication**: Firebase Authentication
- **Storage**: Firebase Storage

### Frontend

- **Language**: Vanilla JavaScript (ES6+)
- **Styling**: CSS3 (Grid, Flexbox)
- **Testing**: Playwright (E2E)

### Development Tools

- **Version Control**: Git

## 🚀 설치 및 실행

### 시스템 요구사항

- Node.js 18.0.0 이상
- npm 8.0.0 이상

### 1. 프로젝트 클론

```bash
git clone https://github.com/your-username/braille-typing-ex.git
cd braille-typing-ex
```

### 2. Firebase 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트를 생성합니다.
2. **Authentication**, **Firestore**, **Storage** 서비스를 활성화합니다.
3. 프로젝트 설정에서 웹 앱을 추가하고 `firebaseConfig` 객체를 복사합니다.
4. `frontend/js/firebase-config.js` 파일을 생성하고 복사한 `firebaseConfig` 객체를 붙여넣습니다.

**`firebase-config.js` 예시:**
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
```

### 3. 프론트엔드 실행

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 시작 (http-server 등)
npx http-server -p 8080
```

### 4. 애플리케이션 접속

- 브라우저에서 `http://localhost:8080`으로 접속합니다.

## 📖 사용법

### 1. 회원가입 및 로그인

- 이메일과 비밀번호를 사용하여 계정을 생성하고 로그인합니다.

### 2. 학습

- **내 카테고리**: 내가 만든 카테고리 목록을 확인하고 연습을 시작할 수 있습니다.
- **즐겨찾기**: 즐겨찾기한 카테고리 목록을 확인합니다. (구현 예정)
- **검색**: 다른 사용자가 만든 공개 카테고리를 검색합니다.
- **커뮤니티**: 다른 사용자와 소통할 수 있는 게시판입니다.
- **출석 달력**: 나의 학습 기록을 확인합니다.

## 👨‍💻 개발자 가이드

### 데이터베이스 스키마

- **users**: 사용자 정보
- **categories**: 학습 카테고리 정보
- **posts**: 커뮤니티 게시글
- **comments**: 게시글 댓글
- **practice_logs**: 연습 기록
- **attendance**: 출석 기록
- **favorites**: 즐겨찾기 목록

## 🧪 테스트

```bash
cd frontend

# Playwright 테스트 실행
npm test
```

## 📁 프로젝트 구조

```
braille-typing-ex/
├── frontend/               # 프론트엔드 클라이언트
│   ├── css/               # 스타일시트
│   ├── js/                # JavaScript 파일
│   │   ├── utils/         # 유틸리티 함수 (apiClient.js)
│   │   ├── auth.js        # 인증 로직
│   │   ├── main.js        # 메인 페이지 로직
│   │   └── ...
│   ├── tests/             # Playwright E2E 테스트
│   ├── *.html             # HTML 페이지들
│   └── package.json       # 프론트엔드 의존성
└── README.md              # 프로젝트 문서
```

## 🤝 기여하기

- 버그 리포트나 기능 제안은 GitHub Issues를 이용해주세요.

## 📄 라이센스

MIT License