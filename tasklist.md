# Firebase 마이그레이션 Task List

본 문서는 Node.js/Express 백엔드를 Firebase로 마이그레이션하기 위한 작업 목록입니다.

## 진행 상태 표시
- ✅ **완료**: 구현 및 테스트 완료
- 🔄 **진행중**: 현재 작업 중
- ⏳ **대기**: 구현 예정

## 현재 백엔드 구조 분석

### 데이터베이스 (JSON Database)
- **테이블**: users, categories, braille_data, practice_logs, attendance, favorites, posts, comments
- **인증**: JWT + bcrypt 패스워드 해싱
- **세션**: express-session 사용

### API 엔드포인트
- 인증: `/api/auth/*` (signup, login, logout, getUser, changePassword)
- 보호된 라우트: `/api/protected/*` (카테고리, 즐겨찾기)
- 연습: `/api/practice/*` (로그 기록)
- 프로필: `/api/profile/*` (통계, 출석)
- 게시물: `/api/posts/*` (커뮤니티 게시글)
- 댓글: `/api/comments/*` (게시글 댓글)
- 관리자: `/api/admin/*`

### 주요 컨트롤러
- authController (인증)
- practiceController (연습 로그)
- profileController (통계, 출석, 랭킹)
- postsController (게시글 CRUD)
- commentsController (댓글 CRUD)
- dataController (카테고리, 점자 데이터, 즐겨찾기)
- uploadController (Excel 업로드)
- adminController (관리자 기능)

---

## Phase 1: Firebase 프로젝트 설정 ⏳

### Task 1.1: Firebase 프로젝트 생성 및 초기 설정 ⏳
- **목표**: Firebase 프로젝트 생성 및 필요한 서비스 활성화
- **구현**:
  - Firebase Console에서 새 프로젝트 생성
  - Firestore Database 활성화
  - Firebase Authentication 활성화 (Email/Password)
  - Firebase Storage 활성화 (Excel 파일 업로드용)
  - Firebase 프로젝트 설정 다운로드 (serviceAccountKey.json)
- **완료 조건**: Firebase 프로젝트가 생성되고 모든 서비스 활성화
- **커밋**: `feat: Initialize Firebase project and enable services`

### Task 1.2: Firebase SDK 설치 및 초기화 ⏳
- **목표**: 프론트엔드/백엔드에 Firebase SDK 설치
- **구현**:
  - `npm install firebase firebase-admin --save` (백엔드)
  - `backend/config/firebase.js` - Firebase Admin SDK 초기화
  - `frontend/js/firebase-config.js` - Firebase Client SDK 초기화
  - 환경변수 설정 (.env 파일에 Firebase credentials)
- **완료 조건**: Firebase SDK가 정상 초기화
- **커밋**: `feat: Install and configure Firebase SDK`

### Task 1.3: Firestore 데이터 모델 설계 ⏳
- **목표**: JSON Database 스키마를 Firestore 컬렉션으로 변환
- **구현**:
  - Firestore 컬렉션 구조 설계
    - `users` 컬렉션: { username, role, created_at }
    - `categories` 컬렉션: { name, description, is_public, created_by, created_at }
    - `braille_data` 컬렉션: { category_id, character, braille_pattern, description }
    - `practice_logs` 컬렉션: { user_id, duration_seconds, practiced_at, created_at }
    - `attendance` 컬렉션: { user_id, date, check_in_time, check_out_time, is_work_day, work_details }
    - `favorites` 컬렉션: { user_id, category_id, created_at }
    - `posts` 컬렉션: { title, content, author_id, created_at, updated_at }
    - `comments` 컬렉션: { post_id, author_id, content, created_at, updated_at }
  - Firestore 인덱스 설계 문서 작성
- **완료 조건**: 데이터 모델 설계 문서 작성 완료
- **커밋**: `docs: Design Firestore data model for migration`

---

## Phase 2: Firebase Authentication 마이그레이션 ⏳

### Task 2.1: Firebase Authentication 기본 설정 ⏳
- **목표**: Firebase Auth로 인증 시스템 전환
- **구현**:
  - `backend/config/firebase.js`에 Firebase Admin Auth 초기화
  - `frontend/js/firebase-auth.js` 생성 - Firebase Client Auth 래퍼
  - Firebase Auth Email/Password 프로바이더 활성화
- **완료 조건**: Firebase Auth 초기화 완료
- **커밋**: `feat: Setup Firebase Authentication`

### Task 2.2: 회원가입 Firebase 마이그레이션 ⏳
- **목표**: authController signup을 Firebase로 전환
- **구현**:
  - `backend/controllers/authController.js` 수정
    - Firebase Admin SDK createUser 사용
    - bcrypt 제거 (Firebase가 자동 처리)
    - Firestore `users` 컬렉션에 추가 정보 저장 (role 등)
  - `frontend/js/firebase-auth.js`에 signup 함수 추가
    - Firebase Client SDK createUserWithEmailAndPassword 사용
- **테스트**: Firebase 콘솔에서 사용자 생성 확인
- **완료 조건**: Firebase Auth로 회원가입 동작
- **커밋**: `feat: Migrate signup to Firebase Authentication`

### Task 2.3: 로그인 Firebase 마이그레이션 ⏳
- **목표**: authController login을 Firebase로 전환
- **구현**:
  - `backend/controllers/authController.js` 수정
    - Firebase Admin SDK verifyIdToken 사용
    - JWT 생성 제거 (Firebase ID Token 사용)
  - `frontend/js/firebase-auth.js`에 login 함수 추가
    - Firebase Client SDK signInWithEmailAndPassword 사용
    - ID Token을 localStorage에 저장
- **테스트**: 로그인 후 Firebase 콘솔에서 사용자 확인
- **완료 조건**: Firebase Auth로 로그인 동작
- **커밋**: `feat: Migrate login to Firebase Authentication`

### Task 2.4: 인증 미들웨어 Firebase 전환 ⏳
- **목표**: authMiddleware를 Firebase ID Token 검증으로 전환
- **구현**:
  - `backend/middleware/authMiddleware.js` 수정
    - JWT verify 제거
    - Firebase Admin SDK verifyIdToken 사용
    - req.user에 Firebase UID와 custom claims 저장
  - express-session 제거
- **테스트**: 보호된 API 엔드포인트 접근 테스트
- **완료 조건**: Firebase ID Token으로 인증 동작
- **커밋**: `feat: Migrate auth middleware to Firebase ID Token verification`

### Task 2.5: 로그아웃 Firebase 마이그레이션 ⏳
- **목표**: Firebase signOut으로 로그아웃 전환
- **구현**:
  - `backend/controllers/authController.js` 수정
    - session destroy 제거
    - 클라이언트에서 처리하도록 변경
  - `frontend/js/firebase-auth.js`에 logout 함수 추가
    - Firebase Client SDK signOut 사용
    - localStorage 토큰 제거
- **완료 조건**: 로그아웃 후 인증 상태 해제
- **커밋**: `feat: Migrate logout to Firebase signOut`

### Task 2.6: 패스워드 변경 Firebase 마이그레이션 ⏳
- **목표**: changePassword를 Firebase로 전환
- **구현**:
  - `backend/controllers/authController.js` 수정
    - Firebase Admin SDK updateUser 사용
    - 또는 클라이언트에서 updatePassword 사용
  - `frontend/js/firebase-auth.js`에 changePassword 함수 추가
    - Firebase Client SDK updatePassword 사용
    - reauthenticate 구현
- **완료 조건**: Firebase Auth로 패스워드 변경 동작
- **커밋**: `feat: Migrate password change to Firebase Auth`

---

## Phase 3: Firestore 데이터 마이그레이션 ⏳

### Task 3.1: Firestore 유틸리티 함수 작성 ⏳
- **목표**: Firestore CRUD 래퍼 함수 작성
- **구현**:
  - `backend/config/firestore.js` 생성
    - `createDocument(collection, data)` - 문서 생성
    - `getDocument(collection, docId)` - 문서 조회
    - `updateDocument(collection, docId, data)` - 문서 수정
    - `deleteDocument(collection, docId)` - 문서 삭제
    - `queryDocuments(collection, conditions)` - 쿼리 조회
  - 타임스탬프 자동 추가 (created_at, updated_at)
- **완료 조건**: Firestore 유틸리티 함수 동작
- **커밋**: `feat: Create Firestore utility functions`

### Task 3.2: 카테고리 관리 Firestore 전환 ⏳
- **목표**: dataController 카테고리 관련 함수 Firestore 전환
- **구현**:
  - `backend/controllers/dataController.js` 수정
    - `getMyCategoriesWithCount`: Firestore 쿼리 사용 (where created_by == userId)
    - `searchPublicCategories`: Firestore 쿼리 사용 (where is_public == true)
    - `deleteCategory`: Firestore batch delete 사용
    - `updateCategory`: Firestore updateDocument 사용
  - JSON Database 관련 코드 제거
- **테스트**: 카테고리 CRUD API 테스트
- **완료 조건**: Firestore로 카테고리 관리 동작
- **커밋**: `feat: Migrate category management to Firestore`

### Task 3.3: 점자 데이터 Firestore 전환 ⏳
- **목표**: braille_data 관련 함수 Firestore 전환
- **구현**:
  - `backend/controllers/dataController.js` 수정
    - `getRandomBrailleData`: Firestore 쿼리 사용
    - `getCategoryBrailleData`: Firestore 쿼리 사용 (where category_id == categoryId)
    - `updateCategoryBrailleData`: Firestore batch write 사용
  - `backend/controllers/uploadController.js` 수정
    - Excel 업로드 후 Firestore에 저장
- **테스트**: 점자 데이터 API 테스트
- **완료 조건**: Firestore로 점자 데이터 관리 동작
- **커밋**: `feat: Migrate braille data to Firestore`

### Task 3.4: 즐겨찾기 Firestore 전환 ⏳
- **목표**: favorites 관련 함수 Firestore 전환
- **구현**:
  - `backend/controllers/dataController.js` 수정
    - `addToFavorites`: Firestore createDocument 사용
    - `removeFromFavorites`: Firestore deleteDocument 사용
    - `getFavorites`: Firestore 쿼리 사용 (where user_id == userId)
  - 중복 체크 로직 추가 (Firestore unique constraint는 없음)
- **테스트**: 즐겨찾기 추가/제거 API 테스트
- **완료 조건**: Firestore로 즐겨찾기 동작
- **커밋**: `feat: Migrate favorites to Firestore`

### Task 3.5: 연습 로그 Firestore 전환 ⏳
- **목표**: practice_logs 관련 함수 Firestore 전환
- **구현**:
  - `backend/controllers/practiceController.js` 수정
    - `logPracticeSession`: Firestore createDocument 사용
    - practice_logs 컬렉션에 저장
    - attendance 자동 생성 로직 유지
- **테스트**: 연습 로그 API 테스트
- **완료 조건**: Firestore로 연습 로그 저장 동작
- **커밋**: `feat: Migrate practice logs to Firestore`

### Task 3.6: 출석 및 통계 Firestore 전환 ⏳
- **목표**: attendance 및 통계 관련 함수 Firestore 전환
- **구현**:
  - `backend/controllers/profileController.js` 수정
    - `getUserStats`: Firestore 집계 쿼리 사용
    - `getAttendanceData`: Firestore 쿼리 사용 (where user_id == userId and date startsWith month)
    - `checkIn/checkOut`: Firestore 문서 생성/수정
    - `getDailyRanking`: Firestore 쿼리 + 집계 로직
  - 복잡한 집계는 클라이언트에서 처리 고려
- **테스트**: 통계 및 출석 API 테스트
- **완료 조건**: Firestore로 출석 및 통계 동작
- **커밋**: `feat: Migrate attendance and stats to Firestore`

### Task 3.7: 게시물 및 댓글 Firestore 전환 ⏳
- **목표**: posts 및 comments 관련 함수 Firestore 전환
- **구현**:
  - `backend/controllers/postsController.js` 수정
    - `getAllPosts`: Firestore 쿼리 사용 (pagination 포함)
    - `getPostById`: Firestore getDocument 사용
    - `createPost`: Firestore createDocument 사용
    - `updatePost`: Firestore updateDocument 사용
    - `deletePost`: Firestore batch delete (댓글 포함)
  - `backend/controllers/commentsController.js` 수정
    - comments 컬렉션 Firestore 전환
- **테스트**: 게시물 및 댓글 CRUD API 테스트
- **완료 조건**: Firestore로 커뮤니티 기능 동작
- **커밋**: `feat: Migrate posts and comments to Firestore`

---

## Phase 4: Firebase Storage 마이그레이션 ⏳

### Task 4.1: Firebase Storage 설정 ⏳
- **목표**: Excel 파일 업로드를 Firebase Storage로 전환
- **구현**:
  - Firebase Storage 규칙 설정
  - `backend/config/storage.js` 생성 - Firebase Storage 초기화
  - multer 제거 고려 (Firebase Storage는 클라이언트 직접 업로드 가능)
- **완료 조건**: Firebase Storage 초기화 완료
- **커밋**: `feat: Setup Firebase Storage for file uploads`

### Task 4.2: Excel 업로드 Firebase Storage 전환 ⏳
- **목표**: uploadController를 Firebase Storage로 전환
- **구현**:
  - `backend/controllers/uploadController.js` 수정
    - Firebase Storage uploadBytes 사용
    - 또는 클라이언트에서 직접 업로드 후 백엔드에서 다운로드 URL로 처리
  - `frontend/js/upload.js` 수정
    - Firebase Storage SDK 사용하여 파일 업로드
    - 업로드 진행률 표시 유지
- **테스트**: Excel 파일 업로드 및 파싱 테스트
- **완료 조건**: Firebase Storage로 파일 업로드 동작
- **커밋**: `feat: Migrate Excel upload to Firebase Storage`

---

## Phase 5: 프론트엔드 API 연동 수정 ⏳

### Task 5.1: API 호출 함수 Firebase 전환 ⏳
- **목표**: 프론트엔드 API 호출을 Firebase Client SDK로 전환
- **구현**:
  - `frontend/js/firebase-api.js` 생성
    - Firestore 클라이언트 CRUD 함수
    - Firebase Auth 상태 리스너
  - 기존 fetch API 호출을 Firebase SDK 호출로 변경
    - `frontend/js/auth.js` 수정
    - `frontend/js/main.js` 수정
    - `frontend/js/practice.js` 수정
    - `frontend/js/statistics.js` 수정
    - `frontend/js/community.js` 수정
- **완료 조건**: 프론트엔드가 Firebase SDK로 데이터 조회
- **커밋**: `feat: Migrate frontend API calls to Firebase SDK`

### Task 5.2: 실시간 데이터 리스너 구현 (선택) ⏳
- **목표**: Firestore 실시간 리스너로 UI 자동 업데이트
- **구현**:
  - 게시물 목록 실시간 업데이트 (onSnapshot)
  - 댓글 실시간 업데이트
  - 통계 실시간 업데이트
- **완료 조건**: 데이터 변경 시 UI 자동 반영
- **커밋**: `feat: Implement Firestore real-time listeners`

---

## Phase 6: 보안 규칙 및 인덱스 설정 ⏳

### Task 6.1: Firestore Security Rules 작성 ⏳
- **목표**: Firestore 보안 규칙 설정
- **구현**:
  - `firestore.rules` 파일 작성
    - users: 본인만 읽기/쓰기
    - categories: 공개는 모두 읽기, 본인만 쓰기
    - braille_data: 카테고리 권한에 따라
    - practice_logs: 본인만 읽기/쓰기
    - attendance: 본인만 읽기/쓰기
    - favorites: 본인만 읽기/쓰기
    - posts: 모두 읽기, 인증된 사용자만 쓰기, 본인만 수정/삭제
    - comments: 모두 읽기, 인증된 사용자만 쓰기, 본인만 수정/삭제
  - Firebase 콘솔에서 규칙 배포
- **완료 조건**: Firestore 보안 규칙 적용
- **커밋**: `feat: Configure Firestore security rules`

### Task 6.2: Firestore 인덱스 생성 ⏳
- **목표**: Firestore 복합 쿼리 인덱스 생성
- **구현**:
  - `firestore.indexes.json` 파일 작성
    - categories: created_by + created_at
    - braille_data: category_id + id
    - practice_logs: user_id + practiced_at
    - attendance: user_id + date
    - favorites: user_id + category_id
    - posts: created_at (descending)
    - comments: post_id + created_at
  - Firebase CLI로 인덱스 배포
- **완료 조건**: 모든 쿼리가 인덱스 사용
- **커밋**: `feat: Create Firestore composite indexes`

### Task 6.3: Storage Security Rules 작성 ⏳
- **목표**: Firebase Storage 보안 규칙 설정
- **구현**:
  - `storage.rules` 파일 작성
    - Excel 파일: 인증된 사용자만 업로드
    - 파일 크기 제한 (10MB)
    - 파일 타입 제한 (.xlsx, .xls)
  - Firebase 콘솔에서 규칙 배포
- **완료 조건**: Storage 보안 규칙 적용
- **커밋**: `feat: Configure Firebase Storage security rules`

---

## Phase 7: 기존 데이터 마이그레이션 ⏳

### Task 7.1: 데이터 마이그레이션 스크립트 작성 ⏳
- **목표**: JSON Database → Firestore 데이터 이전 스크립트
- **구현**:
  - `backend/scripts/migrate-to-firebase.js` 생성
    - JSON 파일에서 데이터 읽기
    - Firestore batch write로 데이터 저장
    - 각 컬렉션별 마이그레이션 함수
  - Firebase Admin SDK 사용
  - 진행률 표시
- **완료 조건**: 스크립트 실행 시 데이터 이전
- **커밋**: `feat: Create data migration script from JSON to Firestore`

---

## Phase 8: Firebase 데이터베이스 변경 테스트 계획 🔄

### Task 8.1: 인증/대시보드 회귀 테스트 추가 ⏳
- **목표**: Firebase Authentication + Firestore 전환 후에도 로그인/회원가입/메인 대시보드가 기존 UX를 유지함을 Playwright로 보장
- **구현**:
  - Firebase 호출을 테스트에서 주입 가능한 mock으로 추상화 (예: `window.__createMockApiClient`)
  - 로그인/회원가입 성공·실패 시나리오, 자동 리다이렉트, 토큰 저장/삭제 절차 검증
  - 메인 페이지가 Firestore 데이터를 불러와 통계 카드 및 카테고리를 정상 렌더링하는지 확인
- **테스트**: `cd frontend && npm test`
- **완료 조건**: 신규 테스트가 deterministic 하게 통과하고, Firebase 의존성 없이도 CI에서 실행 가능
- **커밋**: `test: cover firebase auth/dashboard flows`

### Task 8.2: 연습(Practice) Firebase 데이터 경로 검증 🔄
- **목표**: `/practice.html`이 Firestore 점자 데이터 + 연습 로그를 사용해도 기존 키보드 UX를 유지함을 자동화 테스트로 검증
- **구현**:
  - `window.apiClient.getRandomBrailleCharacter` / `recordPracticeSession` mock 으로 다양한 패턴 및 세션 시나리오 테스트
  - 다중 블록, 힌트, 백스페이스, 세션 종료시 로그 기록 등 핵심 동작 검증
  - 기본 카테고리 ID 전달/미전달 케이스 커버
- **테스트**: Playwright practice spec 실행 (`npm test`)
- **완료 조건**: 최소 3개의 핵심 사용자 여정(문제 로딩 → 입력 → 로그 기록)이 자동화로 커버되고, Firebase 전환 이후에도 회귀 가능
- **커밋**: `test: add firebase practice regression`

### Task 8.3: 통계/출석 Firestore 집계 테스트 ⏳
- **목표**: Firestore 기반 통계/출석 계산 로직이 기존 REST 응답과 동일한 포맷을 제공하는지 검증
- **구현**:
  - mock 데이터로 다양한 `practice_logs`/`attendance` 케이스 구성 (주간 합계, 세션 수, 중복 날짜 등)
  - `statistics.html`이 mock 응답으로 카드, 차트, 최근 세션 리스트를 정확히 렌더링하는지 검사
  - 주간 목표 달성률, 평균 세션 시간 계산 공식 회귀 테스트 포함
- **테스트**: Playwright statistics spec 실행 (`npm test`)
- **완료 조건**: Firestore 집계 포맷 변경 시 테스트가 즉시 실패하도록 커버리지 확보
- **커밋**: `test: ensure firestore stats rendering`

### Task 7.2: 사용자 데이터 마이그레이션 ⏳
- **목표**: users 컬렉션 데이터 이전
- **구현**:
  - `backend/data/users.json` 데이터 읽기
  - Firebase Auth에 사용자 생성 (password는 재설정 필요)
  - Firestore users 컬렉션에 추가 정보 저장
  - 마이그레이션 로그 기록
- **테스트**: Firebase 콘솔에서 사용자 확인
- **완료 조건**: 모든 사용자 데이터 이전
- **커밋**: `feat: Migrate user data to Firebase Auth and Firestore`

### Task 7.3: 카테고리 및 점자 데이터 마이그레이션 ⏳
- **목표**: categories 및 braille_data 컬렉션 데이터 이전
- **구현**:
  - `backend/data/categories.json` 및 `braille_data.json` 데이터 읽기
  - Firestore batch write로 저장
  - category_id 참조 무결성 확인
- **테스트**: Firestore 콘솔에서 데이터 확인
- **완료 조건**: 모든 카테고리 및 점자 데이터 이전
- **커밋**: `feat: Migrate categories and braille data to Firestore`

### Task 7.4: 연습 로그 및 출석 데이터 마이그레이션 ⏳
- **목표**: practice_logs 및 attendance 컬렉션 데이터 이전
- **구현**:
  - `backend/data/practice_logs.json` 및 `attendance.json` 데이터 읽기
  - Firestore batch write로 저장
  - user_id 참조 무결성 확인
- **테스트**: Firestore 콘솔에서 데이터 확인
- **완료 조건**: 모든 연습 로그 및 출석 데이터 이전
- **커밋**: `feat: Migrate practice logs and attendance to Firestore`

### Task 7.5: 게시물 및 댓글 데이터 마이그레이션 ⏳
- **목표**: posts 및 comments 컬렉션 데이터 이전
- **구현**:
  - `backend/data/posts.json` 및 `comments.json` 데이터 읽기
  - Firestore batch write로 저장
  - author_id, post_id 참조 무결성 확인
- **테스트**: Firestore 콘솔에서 데이터 확인
- **완료 조건**: 모든 게시물 및 댓글 데이터 이전
- **커밋**: `feat: Migrate posts and comments to Firestore`

---

## Phase 8: 테스트 및 검증 ⏳

### Task 8.1: 통합 테스트 실행 ⏳
- **목표**: 모든 기능 동작 확인
- **구현**:
  - 회원가입/로그인 테스트
  - 카테고리 생성/조회/검색 테스트
  - 점자 연습 테스트
  - 통계 조회 테스트
  - 게시물/댓글 CRUD 테스트
  - 즐겨찾기 추가/제거 테스트
- **완료 조건**: 모든 핵심 기능 정상 동작
- **커밋**: `test: Verify all features after Firebase migration`

### Task 8.2: 성능 테스트 ⏳
- **목표**: Firestore 쿼리 성능 확인
- **구현**:
  - 대량 데이터 조회 테스트
  - 복합 쿼리 성능 측정
  - 인덱스 최적화
  - Firestore 읽기/쓰기 비용 분석
- **완료 조건**: 성능 이슈 없음
- **커밋**: `test: Performance testing and optimization`

### Task 8.3: 보안 테스트 ⏳
- **목표**: Firestore Security Rules 검증
- **구현**:
  - 권한 없는 접근 시도 테스트
  - 다른 사용자 데이터 접근 차단 확인
  - Storage 규칙 테스트 (파일 타입, 크기 제한)
  - Firebase Console Simulator 사용
- **완료 조건**: 모든 보안 규칙 정상 동작
- **커밋**: `test: Verify Firestore and Storage security rules`

---

## Phase 9: 배포 및 정리 ⏳

### Task 9.1: 환경 변수 및 설정 정리 ⏳
- **목표**: Firebase 프로덕션 설정
- **구현**:
  - `.env.production` 파일 생성
  - Firebase 프로젝트 ID, API Key 등 설정
  - 민감 정보 .gitignore 추가
  - `backend/config/firebase.js` 환경별 설정 분리
- **완료 조건**: 프로덕션 환경 설정 완료
- **커밋**: `feat: Configure Firebase for production environment`

### Task 9.2: 기존 Node.js 백엔드 코드 제거 ⏳
- **목표**: 사용하지 않는 코드 정리
- **구현**:
  - `backend/config/jsonDatabase.js` 삭제
  - `backend/config/database.js` 수정 (Firebase만 남김)
  - `backend/data/*.json` 파일 삭제 (백업 후)
  - express-session, bcrypt, jsonwebtoken 의존성 제거
  - multer 제거 (Firebase Storage 사용)
  - 사용하지 않는 미들웨어 제거
- **테스트**: 빌드 및 실행 테스트
- **완료 조건**: 불필요한 코드 모두 제거
- **커밋**: `refactor: Remove legacy JSON database code`

### Task 9.3: 테스트 파일 정리 및 삭제 ⏳
- **목표**: 마이그레이션 테스트 파일 삭제
- **구현**:
  - `backend/__tests__/` 디렉토리 내 테스트 파일 삭제
    - `auth.test.js`, `data.test.js`, `profile.test.js`, `upload.test.js`, `database.test.js` 삭제
  - `frontend/tests/` 디렉토리 내 불필요한 테스트 파일 삭제
  - Jest 의존성 제거 (선택)
- **완료 조건**: 테스트 파일 정리 완료
- **커밋**: `chore: Remove test files after migration`

### Task 9.4: README 및 문서 업데이트 ⏳
- **목표**: Firebase 마이그레이션 문서화
- **구현**:
  - `README.md` 업데이트
    - Firebase 프로젝트 설정 가이드
    - 환경 변수 설정 방법
    - 데이터 마이그레이션 가이드
  - `CLAUDE.md` 업데이트
    - Firebase 아키텍처 설명
    - Firestore 데이터 모델
    - 개발 가이드라인
- **완료 조건**: 문서 업데이트 완료
- **커밋**: `docs: Update documentation for Firebase migration`

### Task 9.5: 최종 커밋 및 브랜치 병합 ⏳
- **목표**: firebase 브랜치 작업 완료
- **구현**:
  - 모든 변경사항 커밋
  - firebase 브랜치에 최종 커밋
  - 커밋 메시지: `feat: Complete Firebase migration from Node.js backend`
- **완료 조건**: firebase 브랜치에 모든 작업 커밋
- **커밋**: `feat: Complete Firebase migration from Node.js backend`

---

## 개발 가이드라인

### 각 작업 수행 시 체크리스트

1. **작업 시작**
   - tasklist.md에서 상태를 `⏳ 대기` → `🔄 진행중`으로 변경
   - 작업 브랜치 확인 (firebase 브랜치)

2. **구현 중**
   - Firebase 콘솔에서 실시간 확인
   - 에러 로그 확인
   - 기존 기능과 동일하게 동작하는지 확인

3. **테스트**
   - Firebase Emulator Suite 사용 (선택)
   - 실제 Firebase 프로젝트에서 테스트
   - Firestore 콘솔에서 데이터 확인
   - Storage 콘솔에서 파일 확인

4. **작업 완료**
   - tasklist.md에서 상태를 `🔄 진행중` → `✅ 완료`로 변경
   - 테스트 파일 삭제 (Phase 9.3에서 명시된 경우)
   - firebase 브랜치에 커밋
   ```bash
   git add .
   git commit -m "커밋 메시지"
   git push origin firebase
   ```

### 주의사항

- **테스트 파일**: 각 Phase 완료 후 해당 Phase에서 사용한 테스트 파일은 Phase 9.3에서 일괄 삭제
- **데이터 백업**: 마이그레이션 전 기존 JSON 파일 백업 필수
- **점진적 마이그레이션**: 한 번에 모든 기능을 전환하지 말고 Phase별로 진행
- **Firebase 비용**: Firestore 읽기/쓰기 비용 모니터링
- **Security Rules**: 반드시 테스트 후 프로덕션 적용
- **ID Token 갱신**: Firebase ID Token은 1시간마다 갱신 필요 (자동 처리)

### Firebase vs Node.js 비교

| 기능 | Node.js/Express | Firebase |
|------|----------------|----------|
| 인증 | JWT + bcrypt | Firebase Authentication |
| 데이터베이스 | JSON Database (SQLite 대체) | Firestore |
| 파일 업로드 | multer | Firebase Storage |
| 세션 관리 | express-session | Firebase ID Token |
| 보안 | 미들웨어 기반 | Security Rules |
| 실시간 | 없음 | onSnapshot |

### 우선순위

1. **Phase 1-2**: Firebase 설정 및 인증 (가장 중요)
2. **Phase 3**: Firestore 데이터 마이그레이션 (핵심 기능)
3. **Phase 4-5**: Storage 및 프론트엔드 연동
4. **Phase 6-7**: 보안 및 데이터 이전
5. **Phase 8-9**: 테스트 및 정리

---

## 진행 상황 요약

- **전체 태스크**: 30개
- **완료**: 0개 (0%)
- **진행중**: 0개
- **대기**: 30개

### Phase별 태스크 수
- Phase 1: 3개 (Firebase 설정)
- Phase 2: 6개 (Authentication)
- Phase 3: 7개 (Firestore 마이그레이션)
- Phase 4: 2개 (Storage)
- Phase 5: 2개 (프론트엔드)
- Phase 6: 3개 (보안)
- Phase 7: 5개 (데이터 이전)
- Phase 8: 3개 (테스트)
- Phase 9: 5개 (배포 및 정리)
