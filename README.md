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
3. 프로젝트 설정에서 웹 앱을 추가하고 `firebaseConfig` 객체에 포함된 값을 확인합니다.
4. 루트에 `.env.firebase` (또는 `.env`) 파일을 만들고 아래 키를 채웁니다. 이 파일은 `.gitignore`에 의해 자동으로 무시됩니다.

```bash
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...
# (선택) FIREBASE_MEASUREMENT_ID=...
# (선택) FIREBASE_DATABASE_URL=...
```

`npm run build:pages` 실행 시 위 키들을 읽어 `docs/js/firebase-config.js`를 자동으로 생성합니다. 필요한 경우 다른 환경 파일(.env, GitHub Actions secret 등)로 동일한 키를 제공해도 됩니다.

### 3. 프론트엔드 실행

```bash
# 프로젝트 루트에서 실행
npm run dev

# 또는 frontend 디렉터리에서 수동 실행
cd frontend
npm install
npm run serve
```

### 4. 애플리케이션 접속

- 브라우저에서 `http://localhost:8080`으로 접속합니다.

### 5. 배포 (GitHub Pages)

1. **환경 변수 준비**
   - 로컬에서는 `.env.firebase` 또는 `.env`에 Firebase 키를 채워둡니다.
   - CI/CD나 GitHub Actions를 사용한다면 같은 키 이름으로 Repository Secrets를 저장한 뒤 빌드 단계에서 `.env.firebase` 파일을 생성하세요.

2. **정적 파일 생성**
   ```bash
   npm run build:pages
   ```
   `docs/js/firebase-config.js`가 환경 변수 값을 이용해 자동으로 생성됩니다.

3. **커밋 및 푸시**
   ```bash
   git add docs js scripts package.json README.md
   git commit -m "chore: update docs for pages"
   git push origin <branch>
   ```

4. **GitHub Pages 설정**
   - 저장소 → **Settings → Pages**로 이동합니다.
   - **Deploy from a branch**를 선택하고, **Branch: main**, **Folder: /docs** 조합을 지정합니다.
   - 저장하면 몇 분 안에 `https://<사용자명>.github.io/<저장소명>/` 주소로 배포됩니다.

5. **배포 갱신 루틴**
   - 코드가 바뀔 때마다 `npm run build:pages` 후 `docs`를 커밋/푸시하면 자동으로 최신 버전이 재배포됩니다.
   - 커스텀 도메인을 사용한다면 GitHub Pages 설정의 **Custom domain**과 DNS CNAME 레코드를 같이 업데이트하세요.
   - ⚠️ Firebase 클라이언트 키는 프론트엔드 자바스크립트에 포함될 수밖에 없으니, Firestore/Storage 보안 규칙을 반드시 설정해 두세요.

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
