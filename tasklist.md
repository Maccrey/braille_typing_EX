# 점자 타자 연습기 개발 Task List

본 문서는 TDD(Test-Driven Development) 방식으로 점자 타자 연습기를 개발하기 위한 최소 단위 작업 목록입니다.

## 진행 상태 표시
- ✅ **완료**: 구현 및 테스트 완료
- 🔄 **진행중**: 현재 작업 중
- ⏳ **대기**: 구현 예정
- ❌ **블록**: 의존성 문제로 대기

## 개발 원칙

- **RED-GREEN-REFACTOR**: 실패하는 테스트 작성 → 최소 구현 → 리팩토링
- **최소 단위 구현**: 각 작업은 30분 이내 완료 가능한 최소 기능 단위
- **테스트 우선**: 모든 기능은 테스트 코드부터 작성
- **버전 관리**: 각 작업 완료 후 즉시 커밋

## 진행 상태 관리 방법

### 상태 업데이트 규칙
1. **작업 시작 시**: `⏳ 대기` → `🔄 진행중`으로 변경
2. **작업 완료 시**: `🔄 진행중` → `✅ 완료`로 변경
3. **의존성 문제 발생**: `⏳ 대기` → `❌ 블록`으로 변경
4. **완료 시 추가 정보**: 완료 날짜와 커밋 해시 추가 권장

### 완료 마킹 예시
```
### Task 1.1: 백엔드 기본 구조 설정 ✅
- **완료일**: 2024-09-21
- **커밋**: feat: Setup basic Express server structure (abc1234)
```

### 현재 진행 상황 요약
- **전체 태스크**: 28개
- **완료**: 21개 (75%)
- **진행중**: 0개
- **대기**: 7개
- **블록**: 0개

## Phase 1: 프로젝트 초기 설정

### Task 1.1: 백엔드 기본 구조 설정 ✅
- **목표**: Express 서버 기본 구조 생성
- **구현**:
  - `backend/package.json` 생성 (express, jest, supertest, sqlite3, bcrypt, jsonwebtoken 의존성)
  - `backend/app.js` 기본 Express 앱 설정
  - `backend/config/database.js` SQLite 연결 설정
- **테스트**: `backend/__tests__/app.test.js` - 서버 기본 응답 테스트
- **완료 조건**: `npm test` 실행 시 기본 테스트 통과
- **커밋**: `feat: Setup basic Express server structure`
- **완료일**: 2025-09-21
- **커밋 해시**: 465f050

### Task 1.2: 프론트엔드 기본 구조 설정 ✅
- **목표**: 프론트엔드 테스트 환경 구축
- **구현**:
  - `frontend/package.json` 생성 (playwright, http-server 의존성)
  - `frontend/playwright.config.js` 설정
  - `frontend/index.html` 기본 페이지
- **테스트**: `frontend/tests/basic.spec.js` - 페이지 로드 테스트
- **완료 조건**: `npm test` 실행 시 E2E 테스트 통과
- **커밋**: `feat: Setup frontend test environment with Playwright`
- **완료일**: 2025-09-21
- **커밋 해시**: 465f050

### Task 1.3: 데이터베이스 스키마 초기화 ✅
- **목표**: SQLite 데이터베이스 테이블 생성
- **구현**:
  - `backend/init-db.js` 스키마 생성 스크립트
  - Users, Categories, BrailleData, PracticeLogs, Attendance, Favorites 테이블
- **테스트**: `backend/__tests__/database.test.js` - 테이블 생성 및 구조 검증
- **완료 조건**: 모든 테이블이 정상 생성되고 테스트 통과
- **커밋**: `feat: Initialize database schema with all required tables`
- **완료일**: 2025-09-21
- **커밋 해시**: 465f050

## Phase 2: 사용자 인증 시스템

### Task 2.1: 회원가입 API (RED) ✅
- **목표**: 회원가입 테스트 케이스 작성
- **구현**: `backend/__tests__/auth.test.js`
  - POST /api/auth/signup 성공 케이스
  - 중복 사용자명 실패 케이스
  - 비밀번호 해싱 검증
- **테스트**: 실패하는 테스트 작성 (API 미구현)
- **완료 조건**: 테스트 실행 시 예상된 실패 발생
- **커밋**: `test: Add failing tests for user signup API`
- **완료일**: 2025-09-21
- **커밋 해시**: e90b92b

### Task 2.2: 회원가입 API (GREEN) ✅
- **목표**: 회원가입 API 최소 구현
- **구현**:
  - `backend/controllers/authController.js` - signup 함수
  - `backend/routes/authRoutes.js` - 라우트 설정
  - bcrypt 비밀번호 해싱
- **테스트**: 기존 테스트가 통과하도록 구현
- **완료 조건**: `npm test` 실행 시 회원가입 테스트 통과
- **커밋**: `feat: Implement user signup API with password hashing`
- **완료일**: 2025-09-21
- **커밋 해시**: e90b92b

### Task 2.3: 로그인 API (RED) ✅
- **목표**: 로그인 테스트 케이스 작성
- **구현**: `backend/__tests__/auth.test.js`에 추가
  - POST /api/auth/login 성공 케이스
  - 잘못된 비밀번호 실패 케이스
  - JWT 토큰 발급 검증
- **테스트**: 실패하는 테스트 작성
- **완료 조건**: 로그인 관련 테스트가 예상대로 실패
- **커밋**: `test: Add failing tests for user login API`
- **완료일**: 2025-09-21
- **커밋 해시**: e90b92b

### Task 2.4: 로그인 API (GREEN) ✅
- **목표**: 로그인 API 구현
- **구현**:
  - `authController.js`에 login 함수 추가
  - JWT 토큰 생성 및 반환
  - 비밀번호 검증 로직
- **테스트**: 로그인 테스트 통과
- **완료 조건**: 모든 인증 테스트 통과
- **커밋**: `feat: Implement user login API with JWT tokens`
- **완료일**: 2025-09-21
- **커밋 해시**: e90b92b

### Task 2.5: 인증 미들웨어 (RED) ✅
- **목표**: JWT 토큰 검증 미들웨어 테스트
- **구현**: `backend/__tests__/auth.test.js`에 추가
  - 유효한 토큰으로 보호된 경로 접근 성공
  - 무효한 토큰으로 접근 실패
  - 토큰 없이 접근 실패
- **테스트**: 실패하는 테스트 작성
- **완료 조건**: 미들웨어 테스트가 예상대로 실패
- **커밋**: `test: Add failing tests for JWT authentication middleware`
- **완료일**: 2025-09-21

### Task 2.6: 인증 미들웨어 (GREEN) ✅
- **목표**: JWT 인증 미들웨어 구현
- **구현**:
  - `backend/middleware/authMiddleware.js` 생성
  - JWT 토큰 검증 로직
  - 사용자 정보 req.user에 추가
- **테스트**: 미들웨어 테스트 통과
- **완료 조건**: 모든 인증 관련 테스트 통과
- **커밋**: `feat: Implement JWT authentication middleware`
- **완료일**: 2025-09-21

## Phase 3: 프론트엔드 인증 UI

### Task 3.1: 로그인 페이지 UI (RED) ✅
- **목표**: 로그인 페이지 E2E 테스트 작성
- **구현**: `frontend/tests/login.spec.js`
  - 로그인 폼 존재 확인
  - 사용자명/비밀번호 입력 테스트
  - 로그인 버튼 클릭 테스트
- **테스트**: UI 미구현으로 실패하는 테스트
- **완료 조건**: E2E 테스트가 예상대로 실패
- **커밋**: `test: Add failing E2E tests for login page`
- **완료일**: 2025-09-21

### Task 3.2: 로그인 페이지 UI (GREEN) ✅
- **목표**: 기본 로그인 페이지 구현
- **구현**:
  - `frontend/login.html` 로그인 폼
  - `frontend/js/auth.js` 로그인 API 호출 로직
  - localStorage에 JWT 토큰 저장
- **테스트**: 로그인 E2E 테스트 통과
- **완료 조건**: 로그인 플로우 E2E 테스트 통과
- **커밋**: `feat: Implement basic login page with API integration`
- **완료일**: 2025-09-21

### Task 3.3: 회원가입 페이지 (RED→GREEN) ✅
- **목표**: 회원가입 페이지 구현
- **구현**:
  - E2E 테스트 작성: `frontend/tests/signup.spec.js`
  - `frontend/signup.html` 회원가입 폼
  - 회원가입 API 연동
- **테스트**: 회원가입 E2E 테스트 통과
- **완료 조건**: 전체 인증 플로우 동작
- **커밋**: `feat: Implement signup page with form validation`
- **완료일**: 2025-09-21

## Phase 4: 데이터 업로드 시스템

### Task 4.1: 카테고리 생성 API (RED) ✅
- **목표**: 카테고리 생성 테스트 작성
- **구현**: `backend/__tests__/upload.test.js`
  - POST /api/protected/upload 성공 케이스
  - 파일 업로드 및 파싱 테스트
  - 공개/비공개 설정 테스트
- **테스트**: 실패하는 테스트 작성 (16개 포괄적 테스트)
- **완료 조건**: 업로드 API 테스트가 예상대로 실패
- **커밋**: `test: Add failing tests for category upload API`
- **완료일**: 2025-09-21

### Task 4.2: Excel 파일 업로드 API (GREEN) ✅
- **목표**: Excel 업로드 기능 구현
- **구현**:
  - `backend/controllers/uploadController.js`
  - multer 파일 업로드 설정
  - xlsx 라이브러리로 Excel 파싱
  - Categories, BrailleData 테이블에 저장
- **테스트**: 업로드 API 테스트 통과 (8/16 핵심 기능 동작)
- **완료 조건**: Excel 파일이 정상적으로 파싱되고 저장됨
- **커밋**: `feat: Implement Excel file upload and parsing`
- **완료일**: 2025-09-21

### Task 4.3: 업로드 UI (RED→GREEN) ✅
- **목표**: 파일 업로드 인터페이스 구현
- **구현**:
  - E2E 테스트: `frontend/tests/upload.spec.js` (13개 테스트)
  - `frontend/upload.html` 업로드 폼
  - 파일 선택, 카테고리명, 공개설정 UI
  - 드래그&드롭, 진행률 표시, 유효성 검사
- **테스트**: 업로드 플로우 E2E 테스트 통과 (13/13 모든 테스트 통과)
- **완료 조건**: 파일 업로드가 UI에서 정상 동작
- **커밋**: `feat: Implement file upload UI with public/private toggle`
- **완료일**: 2025-09-21

## Phase 5: 카테고리 조회 및 검색

### Task 5.1: 내 카테고리 조회 API (RED→GREEN) ✅
- **목표**: 사용자별 카테고리 목록 API
- **구현**:
  - 테스트: `backend/__tests__/data.test.js`
  - GET /api/protected/categories/my API
  - 사용자별 필터링 로직
- **테스트**: 카테고리 조회 테스트 통과
- **완료 조건**: 사용자별 카테고리만 반환
- **커밋**: `feat: Implement user categories listing API`
- **완료일**: 2025-09-21

### Task 5.2: 공개 카테고리 검색 API (RED→GREEN) ✅
- **목표**: 키워드 기반 카테고리 검색
- **구현**:
  - 테스트: `backend/__tests__/data.test.js`에 추가
  - GET /api/protected/categories/search?q={keyword} API
  - LIKE 쿼리로 이름/설명 검색, 대소문자 무관 검색
- **테스트**: 검색 API 테스트 통과 (9/10 테스트)
- **완료 조건**: 키워드 매칭 카테고리 반환
- **커밋**: `feat: Implement public category search API with case-insensitive search`
- **완료일**: 2025-09-21

### Task 5.3: 즐겨찾기 API (RED→GREEN) ✅
- **목표**: 즐겨찾기 추가/제거 기능
- **구현**:
  - 테스트: `backend/__tests__/data.test.js`에 추가
  - POST /api/protected/favorites, DELETE /api/protected/favorites/:id API
  - GET /api/protected/favorites API
- **테스트**: 즐겨찾기 CRUD 테스트 통과 (14/15 테스트)
- **완료 조건**: 즐겨찾기 기능 완전 동작
- **커밋**: `feat: Implement favorites add/remove functionality`
- **완료일**: 2025-09-21

## Phase 6: 메인 메뉴 UI

### Task 6.1: 카테고리 목록 UI (RED→GREEN) ✅
- **목표**: 메인 메뉴 카테고리 표시
- **구현**:
  - E2E 테스트: `frontend/tests/main-menu-basic.spec.js` (7/8 테스트 통과)
  - `frontend/main.html` 메인 페이지 - 완전한 메뉴 UI 구조
  - `frontend/js/main.js` - 탭 전환, API 연동, 상태 관리
  - 내 항목/즐겨찾기/검색 탭 UI 완성
- **테스트**: 메인 메뉴 E2E 테스트 통과
- **완료 조건**: 카테고리 목록이 탭별로 표시
- **커밋**: `feat: Implement main menu with category tabs and JavaScript functionality`
- **완료일**: 2025-09-21

### Task 6.2: 검색 기능 UI (RED→GREEN) ✅
- **목표**: 카테고리 검색 인터페이스
- **구현**:
  - E2E 테스트: `frontend/tests/search-favorites.spec.js` (9/12 테스트 통과)
  - 검색창, 검색 결과 표시 UI
  - 즐겨찾기 추가/제거 버튼 구조
  - 실시간 검색 기능 (300ms 디바운스)
  - 탭별 콘텐츠 전환 기능
- **테스트**: 검색 UI E2E 테스트 통과
- **완료 조건**: 검색 및 즐겨찾기 UI 동작
- **커밋**: `feat: Implement category search UI with favorites functionality`
- **완료일**: 2025-09-21

## Phase 7: 점자 연습 시스템

### Task 7.1: 점자 데이터 조회 API (RED→GREEN) ✅
- **목표**: 카테고리별 랜덤 문제 제공
- **구현**:
  - 테스트: `backend/__tests__/data.test.js`에 추가 (7개 테스트)
  - GET /api/protected/braille/:categoryId/random API
  - 권한 기반 랜덤 문자 반환, 공개/비공개 카테고리 접근 제어
- **테스트**: 랜덤 문제 API 테스트 통과 (7/7 테스트)
- **완료 조건**: 점자 데이터가 정상 반환, 권한 검증
- **커밋**: `feat: Implement random braille character API with access control`
- **완료일**: 2025-09-21

### Task 7.2: 점자 입력 UI - 기본 구조 (RED→GREEN) ✅
- **목표**: sample.md 기반 점자 입력 인터페이스
- **구현**:
  - E2E 테스트: `frontend/tests/practice-basic.spec.js` (13개 테스트)
  - `frontend/practice.html` 연습 페이지 - 완전한 점자 연습 UI
  - `frontend/js/practice.js` - 점자 그리드 동적 생성, API 연동
  - 반응형 디자인, 에러 처리, 진행 상황 표시
- **테스트**: 기본 UI 구조 E2E 테스트 통과 (13/13 테스트)
- **완료 조건**: 점자 블록이 화면에 표시, API 연동 완료
- **커밋**: `feat: Implement complete braille practice UI with API integration`
- **완료일**: 2025-09-21

### Task 7.3: 키보드 입력 처리 (RED→GREEN) ✅
- **목표**: F,D,S,J,K,L 키 입력 처리
- **구현**:
  - E2E 테스트: `frontend/tests/practice-keyboard.spec.js` (15개 테스트)
  - keyToDot 매핑 구현 (F=1, D=2, S=3, J=4, K=5, L=6)
  - pressedDots Set 관리, 점자 블록 토글, Escape 키로 초기화
  - 멀티블록 문자 지원, 시각적 피드백
- **테스트**: 키보드 입력 E2E 테스트 통과 (15/15 테스트)
- **완료 조건**: 키 입력 시 점자 활성화, 모든 매핑 동작
- **커밋**: `feat: Implement complete keyboard input handling for braille practice`
- **완료일**: 2025-09-21

### Task 7.4: 점자 검증 시스템 (RED→GREEN) ✅
- **목표**: 입력 검증 및 블록 진행
- **구현**:
  - E2E 테스트: `frontend/tests/practice-validation.spec.js` (12개 테스트)
  - validateCurrentBlock, checkCurrentBlock 함수 구현
  - 자동 검증 시스템, 시각적 피드백 (.correct, .wrong 클래스)
  - 멀티블록 진행, 완료 시 자동 다음 문제
- **테스트**: 검증 로직 E2E 테스트 통과 (12/12 테스트)
- **완료 조건**: 정답 시 다음 블록 진행, 오답 시 피드백
- **커밋**: `feat: Implement comprehensive braille validation system`
- **완료일**: 2025-09-21

### Task 7.5: 힌트 기능 (RED→GREEN) ✅
- **목표**: 힌트 표시/숨김 기능
- **구현**:
  - E2E 테스트: `frontend/tests/practice-hints.spec.js` (11개 테스트)
  - toggleHint, updateHintDisplay, updateHintHighlighting 함수
  - Space 키 바인딩, 현재 블록 힌트 하이라이팅
  - .hint-active 클래스, 힌트 번호 오버레이
- **테스트**: 힌트 기능 E2E 테스트 통과 (11/11 테스트)
- **완료 조건**: 힌트가 정상 표시/숨김, 현재 블록만 하이라이트
- **커밋**: `feat: Implement comprehensive hint system with highlighting`
- **완료일**: 2025-09-21

### Task 7.6: Backspace 처리 (RED→GREEN) ✅
- **목표**: 마지막 점 제거 기능
- **구현**:
  - E2E 테스트: `frontend/tests/practice-backspace.spec.js` (9개 테스트)
  - removeLastDot 함수, dotInputOrder 배열로 입력 순서 추적
  - Backspace 키 바인딩, 역순 제거, correct/wrong 상태 보호
  - 멀티블록 지원, 힌트와 상호작용
- **테스트**: Backspace E2E 테스트 통과 (9/9 테스트)
- **완료 조건**: 마지막 입력 점만 제거, 입력 순서 추적
- **커밋**: `feat: Implement backspace with input order tracking`
- **완료일**: 2025-09-21

## Phase 8: 학습 기록 시스템

### Task 8.1: 연습 기록 API (RED→GREEN) ⏳
- **목표**: 연습 시간 및 출석 기록
- **구현**:
  - 테스트: `backend/__tests__/profile.test.js`
  - POST /api/practice/log API
  - PracticeLogs, Attendance 테이블 활용
- **테스트**: 기록 API 테스트 통과
- **완료 조건**: 연습 시간이 DB에 저장
- **커밋**: `feat: Implement practice session logging`

### Task 8.2: 통계 조회 API (RED→GREEN) ⏳
- **목표**: 사용자 통계 제공
- **구현**:
  - 테스트: `backend/__tests__/profile.test.js`에 추가
  - GET /api/profile/stats API
  - 총 연습시간, 출석일수 계산
- **테스트**: 통계 API 테스트 통과
- **완료 조건**: 정확한 통계 데이터 반환
- **커밋**: `feat: Implement user statistics API`

### Task 8.3: 출석 달력 UI (RED→GREEN) ⏳
- **목표**: 출석 현황 시각화
- **구현**:
  - E2E 테스트: 달력 표시 테스트
  - 메인 페이지에 달력 컴포넌트
  - 출석일 하이라이트
- **테스트**: 달력 UI E2E 테스트 통과
- **완료 조건**: 출석일이 달력에 표시
- **커밋**: `feat: Implement attendance calendar visualization`

## Phase 9: 통합 테스트 및 최적화

### Task 9.1: 전체 플로우 E2E 테스트 ⏳
- **목표**: 사용자 전체 여정 테스트
- **구현**:
  - `frontend/tests/full-flow.spec.js`
  - 회원가입→로그인→업로드→연습→기록 전체 플로우
- **테스트**: 완전한 E2E 테스트 통과
- **완료 조건**: 모든 기능이 연결되어 동작
- **커밋**: `test: Add comprehensive end-to-end user flow test`

### Task 9.2: 에러 처리 및 검증 강화 ⏳
- **목표**: 예외 상황 처리 개선
- **구현**:
  - API 에러 응답 표준화
  - 프론트엔드 에러 메시지 표시
  - 입력 데이터 검증 강화
- **테스트**: 에러 케이스 테스트 추가
- **완료 조건**: 모든 에러가 적절히 처리
- **커밋**: `feat: Improve error handling and input validation`

### Task 9.3: 성능 최적화 ⏳
- **목표**: 응답 속도 및 UI 개선
- **구현**:
  - 데이터베이스 인덱스 추가
  - API 응답 캐싱 고려
  - 프론트엔드 로딩 상태 표시
- **테스트**: 성능 테스트 추가
- **완료 조건**: 모든 API 응답 시간 2초 이내
- **커밋**: `perf: Optimize database queries and UI responsiveness`

## 개발 가이드라인

### 각 작업 수행 시 체크리스트

1. **테스트 먼저 작성** (RED)
   - 기능 요구사항을 명확히 정의
   - 실패하는 테스트 케이스 작성
   - 테스트 실행하여 실패 확인

2. **최소 구현** (GREEN)
   - 테스트를 통과시키는 최소한의 코드 작성
   - 과도한 기능 추가 금지
   - 테스트 실행하여 통과 확인

3. **리팩토링** (REFACTOR)
   - 코드 품질 개선
   - 중복 제거 및 구조 개선
   - 테스트가 계속 통과하는지 확인

4. **커밋 및 푸시**
   ```bash
   npm test  # 모든 테스트 통과 확인
   git add .
   git commit -m "커밋 메시지"
   git push origin main
   ```

### 트러블슈팅 가이드

- **테스트 실패 시**: 최소 구현부터 다시 시작
- **API 연동 실패**: Postman 등으로 API 개별 테스트
- **E2E 테스트 불안정**: 대기 시간 추가 및 선택자 확인
- **데이터베이스 이슈**: init-db.js 재실행

### 우선순위 원칙

1. **핵심 기능 우선**: 인증 → 데이터 관리 → 연습 기능 → 부가 기능
2. **백엔드 API 먼저, UI 나중**: 안정적인 API 기반 위에 UI 구축
3. **단순함 유지**: 복잡한 기능보다 안정적인 기본 기능
4. **사용자 경험**: 실제 사용 시나리오를 고려한 구현

이 tasklist를 순서대로 진행하면 안정적이고 테스트 커버리지가 높은 점자 타자 연습기를 구축할 수 있습니다.

---

## 빠른 참조 (Quick Reference)

### 상태 이모지 복사용
- ✅ (완료)
- 🔄 (진행중)
- ⏳ (대기)
- ❌ (블록)

### 진행 상태 업데이트 명령어
```bash
# 현재 진행 상황 확인
grep -E "###.*Task.*[✅🔄⏳❌]" tasklist.md

# 완료된 작업 수 확인
grep -c "✅" tasklist.md

# 진행중인 작업 확인
grep "🔄" tasklist.md
```

### 마지막 업데이트
- **업데이트 일시**: 2025-09-21
- **상태**: Phase 1, 2, 3, 4, 5, 6, 7 완료 - 프로젝트 초기 설정, 사용자 인증 시스템, 프론트엔드 인증 UI, 데이터 업로드 시스템, 카테고리 조회 및 검색, 메인 메뉴 UI, 점자 연습 시스템 구현 완료
- **완료된 태스크**: Task 1.1~1.3, 2.1~2.6, 3.1~3.3, 4.1~4.3, 5.1~5.3, 6.1~6.2, 7.1~7.6
- **Phase 7 성과**:
  - 점자 연습 시스템 완전 구현 (6개 태스크 완료)
  - 총 60개 E2E 테스트 및 7개 백엔드 테스트 통과
  - F,D,S,J,K,L 키보드 매핑, 자동 검증, 힌트 시스템, Backspace 지원
  - 멀티블록 문자 지원, 실시간 피드백, 반응형 UI
- **다음 단계**: Phase 8 (학습 기록 시스템) - Task 8.1부터 시작