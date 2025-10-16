# 🚀 CloudType 배포 완전 가이드 (초보자용)

**이 가이드를 따라하면 누구나 5분 안에 배포할 수 있습니다!**

> ⚠️ **중요**: 이 가이드는 순서대로 따라해야 합니다. 단계를 건너뛰지 마세요!

---

## 📋 목차

1. [사전 준비물](#1-사전-준비물)
2. [Firebase 프로젝트 만들기](#2-firebase-프로젝트-만들기-10분)
3. [Firebase 설정 파일 받기](#3-firebase-설정-파일-받기-5분)
4. [CloudType에 배포하기](#4-cloudtype에-배포하기-10분)
5. [배포 확인하기](#5-배포-확인하기-2분)
6. [문제 해결](#6-문제-해결)

---

## 1. 사전 준비물

다음 3가지가 필요합니다:

- [ ] Google 계정 (Gmail)
- [ ] GitHub 계정
- [ ] CloudType 계정 (무료: https://cloudtype.io/)

> 💡 **팁**: 모두 무료로 만들 수 있습니다!

---

## 2. Firebase 프로젝트 만들기 (10분)

### Step 2-1: Firebase Console 접속

1. 브라우저에서 https://console.firebase.google.com/ 접속
2. Google 계정으로 로그인

### Step 2-2: 새 프로젝트 만들기

1. **"프로젝트 추가"** 버튼 클릭 (또는 "Create a project")
2. 프로젝트 이름 입력:
   ```
   braille-typing-practice
   ```
   또는 원하는 이름 입력
3. **"계속"** 클릭

### Step 2-3: Google Analytics 설정 (선택사항)

1. "이 프로젝트에 Google Analytics 사용 설정" 토글 끄기 (추천)
2. **"프로젝트 만들기"** 클릭
3. 프로젝트 생성 완료까지 기다리기 (약 30초)
4. **"계속"** 클릭

---

## 3. Firebase 설정 파일 받기 (5분)

### Step 3-1: Firestore Database 활성화

1. 왼쪽 메뉴에서 **"Firestore Database"** 클릭
2. **"데이터베이스 만들기"** 버튼 클릭
3. 보안 규칙: **"프로덕션 모드에서 시작"** 선택
4. **"다음"** 클릭
5. 위치 선택:
   ```
   asia-northeast3 (서울)
   ```
6. **"사용 설정"** 클릭
7. 데이터베이스 생성 완료까지 기다리기 (약 1분)

### Step 3-2: Authentication 활성화

1. 왼쪽 메뉴에서 **"Authentication"** 클릭
2. **"시작하기"** 버튼 클릭
3. **"이메일/비밀번호"** 클릭
4. 첫 번째 토글 **"사용 설정"** (이메일/비밀번호만)
5. **"저장"** 클릭

### Step 3-3: 서비스 계정 키 다운로드 ⭐ 중요!

1. 왼쪽 상단 **톱니바퀴(⚙️)** 아이콘 클릭
2. **"프로젝트 설정"** 클릭
3. 상단 탭에서 **"서비스 계정"** 클릭
4. 아래로 스크롤하여 **"새 비공개 키 생성"** 버튼 클릭
5. 팝업에서 **"키 생성"** 클릭
6. JSON 파일이 자동으로 다운로드됩니다
   - 파일명 예시: `braille-typing-practice-firebase-adminsdk-xxxxx-xxxxxxxxxx.json`
7. **이 파일을 안전한 곳에 보관하세요!** (절대 GitHub에 올리면 안 됨)

### Step 3-4: JSON 파일 내용 복사하기

1. 다운로드한 JSON 파일을 텍스트 에디터로 열기 (메모장, VSCode 등)
2. 파일 전체 내용을 복사 (Ctrl+A → Ctrl+C)
3. 다음과 같은 형태입니다:

```json
{
  "type": "service_account",
  "project_id": "braille-typing-practice",
  "private_key_id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...(매우 긴 문자열)...=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@braille-typing-practice.iam.gserviceaccount.com",
  "client_id": "xxxxxxxxxxxxxxxxxxxxx",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40braille-typing-practice.iam.gserviceaccount.com"
}
```

4. **이 내용을 메모장에 임시 저장하세요** (다음 단계에서 사용)

---

## 4. CloudType에 배포하기 (10분)

### Step 4-1: GitHub에 코드 푸시

1. 터미널 또는 Git Bash 열기
2. 프로젝트 폴더로 이동:
   ```bash
   cd /path/to/braille_typing_EX
   ```

3. 모든 변경사항 커밋:
   ```bash
   git add .
   git commit -m "feat: Firebase 마이그레이션 완료"
   git push
   ```

### Step 4-2: CloudType 프로젝트 생성

1. https://cloudtype.io/ 접속
2. 로그인 (GitHub 계정으로 로그인 추천)
3. **"새 프로젝트"** 또는 **"Create Project"** 클릭
4. **"GitHub에서 가져오기"** 선택
5. GitHub 연동 (처음이면 권한 승인 필요)
6. Repository 선택: `braille_typing_EX` 선택
7. 브랜치 선택: `main` 또는 `firebase` 선택

### Step 4-3: 빌드 설정

다음 내용을 **정확히** 입력하세요:

#### 기본 설정
```
프로젝트 이름: braille-typing-practice (또는 원하는 이름)
```

#### 빌드 설정
```
루트 디렉토리: backend
빌드 명령어: npm install
시작 명령어: npm start
포트: 8080
```

#### 고급 설정 (선택사항)
```
Node.js 버전: 18
```

### Step 4-4: 환경 변수 설정 ⭐ 가장 중요!

1. **"환경 변수"** 섹션으로 스크롤
2. **"환경 변수 추가"** 클릭
3. 다음 변수들을 **하나씩** 추가:

#### 변수 1: NODE_ENV
```
키(Key): NODE_ENV
값(Value): production
```
**"추가"** 클릭

#### 변수 2: PORT
```
키(Key): PORT
값(Value): 8080
```
**"추가"** 클릭

#### 변수 3: HOST
```
키(Key): HOST
값(Value): 0.0.0.0
```
**"추가"** 클릭

#### 변수 4: JWT_SECRET
```
키(Key): JWT_SECRET
값(Value): braille-typing-practice-jwt-secret-2025-change-in-production-min-32-characters-required
```
**"추가"** 클릭

> 💡 **보안 팁**: 실제 프로덕션에서는 이 값을 랜덤한 문자열로 변경하세요!

#### 변수 5: SESSION_SECRET
```
키(Key): SESSION_SECRET
값(Value): braille-typing-session-secret-key-change-in-production-min-32-characters-required
```
**"추가"** 클릭

#### 변수 6: FIREBASE_SERVICE_ACCOUNT ⭐⭐⭐ 가장 중요!

```
키(Key): FIREBASE_SERVICE_ACCOUNT
값(Value): [Step 3-4에서 복사한 JSON 전체 내용 붙여넣기]
```

**주의사항**:
- JSON 전체를 **한 줄로** 붙여넣어야 합니다
- 줄바꿈이 있으면 안 됩니다
- `{`로 시작해서 `}`로 끝나야 합니다

**예시**:
```json
{"type":"service_account","project_id":"braille-typing-practice","private_key_id":"xxxx","private_key":"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@braille-typing-practice.iam.gserviceaccount.com",...}
```

> ⚠️ **매우 중요**: 이 값이 잘못되면 앱이 작동하지 않습니다!

**"추가"** 클릭

### Step 4-5: 배포 시작

1. 모든 설정 확인
2. **"배포"** 또는 **"Deploy"** 버튼 클릭
3. 빌드 로그 확인 (약 2-3분 소요)

#### 성공 메시지 확인
로그에서 다음 메시지가 보이면 성공:
```
✅ Firebase Admin SDK initialized successfully
📊 Project ID: braille-typing-practice
🚀 Server running on http://0.0.0.0:8080
✅ Server is ready and healthy
```

4. 배포 완료되면 **URL이 생성됩니다**
   - 예시: `https://braille-typing-practice-xxxxx.cloudtype.app`

---

## 5. 배포 확인하기 (2분)

### Step 5-1: 헬스체크 확인

1. 브라우저에서 다음 URL 접속:
   ```
   https://your-app-name.cloudtype.app/health
   ```

2. 다음과 같은 응답이 보이면 성공:
   ```json
   {
     "status": "UP",
     "health": "OK",
     "timestamp": "2025-10-16T12:00:00.000Z",
     "uptime": 123.456
   }
   ```

### Step 5-2: 회원가입 테스트

1. 메인 페이지 접속:
   ```
   https://your-app-name.cloudtype.app
   ```

2. 회원가입 시도:
   - 사용자명: `testuser`
   - 비밀번호: `test1234`

3. 회원가입 성공하면 로그인 시도

### Step 5-3: 데이터 지속성 테스트 ⭐ 핵심!

1. 회원가입 및 로그인 성공
2. CloudType 콘솔에서 **"재시작"** 버튼 클릭
3. 앱 재시작 후 다시 로그인 시도
4. **✅ 로그인 성공하면 데이터가 유지되는 것입니다!**

---

## 6. 문제 해결

### 문제 1: "Firebase initialization error"

**증상**:
```
❌ Firebase initialization error: Failed to parse private key
```

**해결방법**:
1. CloudType 환경 변수 `FIREBASE_SERVICE_ACCOUNT` 확인
2. JSON 형식이 올바른지 확인 (줄바꿈 없이 한 줄)
3. JSON 유효성 검사: https://jsonlint.com/ 에서 검증
4. 환경 변수 수정 후 **재배포**

### 문제 2: "Module not found"

**증상**:
```
Error: Cannot find module 'firebase-admin'
```

**해결방법**:
1. `backend/package.json` 파일에 `firebase-admin` 있는지 확인
2. 빌드 명령어가 `npm install`인지 확인
3. 루트 디렉토리가 `backend`인지 확인
4. **재배포**

### 문제 3: "Port already in use"

**증상**:
```
Error: listen EADDRINUSE: address already in use :::8080
```

**해결방법**:
1. CloudType에서 포트가 `8080`으로 설정되었는지 확인
2. 환경 변수 `PORT=8080` 확인
3. **재배포**

### 문제 4: "Cannot POST /api/auth/signup"

**증상**:
회원가입 버튼을 눌러도 아무 반응이 없음

**해결방법**:
1. CloudType URL이 올바른지 확인
2. 브라우저 개발자 도구(F12) → Network 탭에서 에러 확인
3. API 엔드포인트 확인:
   ```
   https://your-app-name.cloudtype.app/api/auth/signup
   ```

### 문제 5: 환경 변수가 인식 안 됨

**해결방법**:
1. CloudType 콘솔 → 프로젝트 설정 → 환경 변수 확인
2. 모든 변수가 올바르게 입력되었는지 확인
3. 특히 `FIREBASE_SERVICE_ACCOUNT` 값 재확인
4. 환경 변수 수정 후 **반드시 재배포**

---

## 📋 체크리스트

배포 전 최종 확인:

- [ ] Firebase 프로젝트 생성 완료
- [ ] Firestore Database 활성화 (프로덕션 모드)
- [ ] Authentication 활성화 (이메일/비밀번호)
- [ ] 서비스 계정 키 JSON 다운로드 완료
- [ ] GitHub에 코드 푸시 완료
- [ ] CloudType 프로젝트 생성 완료
- [ ] 빌드 설정 올바르게 입력 (루트: backend, 포트: 8080)
- [ ] 환경 변수 6개 모두 입력 완료
- [ ] FIREBASE_SERVICE_ACCOUNT 값 JSON 형식 확인
- [ ] 배포 완료 및 URL 생성
- [ ] 헬스체크 성공 (`/health` 접속)
- [ ] 회원가입 테스트 성공
- [ ] 재시작 후 로그인 테스트 성공 (데이터 유지 확인)

---

## 🎯 빠른 환경 변수 복사 (CloudType용)

아래 내용을 복사해서 CloudType 환경 변수에 붙여넣으세요:

```bash
# 기본 설정
NODE_ENV=production
PORT=8080
HOST=0.0.0.0

# 보안 (실제 프로덕션에서는 변경 필요)
JWT_SECRET=braille-typing-practice-jwt-secret-2025-change-in-production-min-32-characters-required
SESSION_SECRET=braille-typing-session-secret-key-change-in-production-min-32-characters-required

# Firebase (아래에 JSON 내용 붙여넣기)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"여기에-복사한-JSON-내용-붙여넣기"}
```

---

## 📚 추가 자료

- [Firebase Console](https://console.firebase.google.com/)
- [CloudType 공식 문서](https://docs.cloudtype.io/)
- [Firebase 보안 규칙](https://firebase.google.com/docs/firestore/security/get-started)

---

## 💬 도움이 필요하신가요?

문제가 해결되지 않으면:

1. CloudType 빌드 로그 전체 복사
2. 에러 메시지 스크린샷
3. GitHub Issue 생성 또는 문의

---

## 🎉 성공!

축하합니다! 🎊

이제 도커가 재부팅되어도 데이터가 사라지지 않습니다!

### 다음 단계:
1. ✅ 프론트엔드도 CloudType에 배포하기 (선택사항)
2. ✅ 커스텀 도메인 연결하기
3. ✅ HTTPS 인증서 자동 적용 확인
4. ✅ Firebase 보안 규칙 세밀하게 설정하기

---

**배포 완료 시간**: 약 25-30분 (처음 하는 경우)

**데이터 손실**: ❌ 없음! (Firebase 클라우드 저장)

**비용**: 🆓 무료 (Firebase & CloudType 무료 플랜)

🚀 **Happy Coding!**
