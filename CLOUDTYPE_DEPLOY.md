ㅈㅈㅈ# CloudType 배포 가이드 (Firebase 사용)

## 🎯 배포 목적

CloudType의 도커 컨테이너 재부팅 시 데이터 손실을 방지하기 위해 Firebase Firestore를 데이터베이스로 사용합니다.

---

## 📋 배포 전 준비사항

### 1. Firebase 프로젝트 설정

#### Step 1: Firebase 프로젝트 생성
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름: `braille-typing-practice`
4. Google Analytics: 선택사항

#### Step 2: Firestore Database 활성화
1. 좌측 메뉴 "Firestore Database" 클릭
2. "데이터베이스 만들기" 클릭
3. **프로덕션 모드** 선택
4. 리전: `asia-northeast3 (서울)` 선택

#### Step 3: Authentication 활성화
1. 좌측 메뉴 "Authentication" 클릭
2. "시작하기" 클릭
3. "로그인 방법" 탭에서 **"이메일/비밀번호"** 활성화

#### Step 4: 서비스 계정 키 생성
1. 프로젝트 설정 (⚙️) → "서비스 계정" 탭
2. "새 비공개 키 생성" 클릭
3. JSON 파일 다운로드 (예: `braille-typing-practice-firebase-adminsdk-xxxxx.json`)

---

## 🔐 환경 변수 설정

### CloudType 환경 변수로 Firebase 설정

CloudType에서는 파일을 직접 업로드할 수 없으므로, **환경 변수**로 Firebase 설정을 전달합니다.

#### 방법 1: 서비스 계정 키를 환경 변수로 변환

다운로드한 `serviceAccountKey.json` 파일의 내용을 **한 줄로 변환**:

```bash
# Mac/Linux
cat serviceAccountKey.json | jq -c '.' | pbcopy

# 또는 직접 복사
cat serviceAccountKey.json
```

CloudType 환경 변수 설정:
- 변수명: `FIREBASE_SERVICE_ACCOUNT`
- 값: JSON 파일의 전체 내용 (한 줄로)

#### 방법 2: 개별 환경 변수 (권장)

서비스 계정 키 JSON 파일에서 다음 값들을 추출하여 개별 환경 변수로 설정:

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
```

**주의**: `FIREBASE_PRIVATE_KEY`는 `\n`을 **실제 줄바꿈**으로 변환해야 합니다.

---

## 🔧 Backend 코드 수정

### 1. Firebase 초기화 코드 수정

`backend/config/firebase.js` 파일을 환경 변수를 사용하도록 수정:

```javascript
const admin = require('firebase-admin');

let db = null;
let auth = null;

function initializeFirebase() {
  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      console.log('✅ Firebase already initialized');
      db = admin.firestore();
      auth = admin.auth();
      return { db, auth };
    }

    // 환경 변수에서 서비스 계정 정보 읽기
    let serviceAccount;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // 방법 1: 전체 JSON을 환경 변수로 전달받은 경우
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      // 방법 2: 개별 환경 변수로 전달받은 경우
      serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL
      };
    } else {
      // 로컬 개발 환경: 파일에서 읽기
      const path = require('path');
      serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    db = admin.firestore();
    auth = admin.auth();

    console.log('✅ Firebase Admin SDK initialized successfully');
    console.log('📊 Project ID:', serviceAccount.project_id);

    return { db, auth };
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    throw error;
  }
}

function getDb() {
  if (!db) {
    initializeFirebase();
  }
  return db;
}

function getAuth() {
  if (!auth) {
    initializeFirebase();
  }
  return auth;
}

function closeDb() {
  // Firebase Admin SDK doesn't require explicit closing
  return Promise.resolve();
}

module.exports = {
  initializeFirebase,
  getDb,
  getAuth,
  closeDb
};
```

### 2. .env 파일 업데이트

로컬 개발을 위한 `.env` 파일:

```bash
# Server Configuration
NODE_ENV=production
PORT=8080
HOST=0.0.0.0

# Security Configuration
JWT_SECRET=your-secure-jwt-secret-change-this
SESSION_SECRET=your-secure-session-secret-change-this

# Firebase Configuration (로컬 개발 시 주석 처리, 프로덕션에서는 CloudType 환경 변수 사용)
# FIREBASE_PROJECT_ID=your-project-id
# FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
# FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
```

---

## 🐳 Dockerfile 확인

CloudType은 자동으로 Dockerfile을 감지하거나, 없으면 자동 생성합니다.

프로젝트에 `Dockerfile`이 있는지 확인:

```dockerfile
FROM node:18-alpine

# 작업 디렉토리 설정
WORKDIR /app

# package.json 복사 및 의존성 설치
COPY backend/package*.json ./
RUN npm ci --only=production

# 애플리케이션 코드 복사
COPY backend/ ./

# 포트 노출
EXPOSE 8080

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 애플리케이션 시작
CMD ["npm", "start"]
```

---

## 🚀 CloudType 배포 단계

### 1. GitHub Repository 연결

1. 코드를 GitHub에 푸시
2. CloudType 콘솔에서 "새 프로젝트" 생성
3. GitHub Repository 연결

### 2. 빌드 설정

#### 루트 디렉토리
```
/backend
```

#### 빌드 명령어
```bash
npm install
```

#### 시작 명령어
```bash
npm start
```

#### 포트
```
8080
```

### 3. 환경 변수 설정

CloudType 콘솔 → 환경 변수 섹션에서 설정:

```bash
# 필수
NODE_ENV=production
PORT=8080
HOST=0.0.0.0

# JWT & Session
JWT_SECRET=your-production-jwt-secret-min-32-chars
SESSION_SECRET=your-production-session-secret-min-32-chars

# Firebase (방법 1: 전체 JSON)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}

# 또는 Firebase (방법 2: 개별 변수)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
```

### 4. Firestore 보안 규칙 설정

Firebase Console → Firestore → 규칙:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId);
    }

    match /categories/{categoryId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isOwner(resource.data.created_by);
    }

    match /braille_data/{dataId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if true; // 소유자 체크는 서버에서
    }

    match /practice_logs/{logId} {
      allow read, write: if isAuthenticated();
    }

    match /attendance/{attendanceId} {
      allow read, write: if isAuthenticated();
    }

    match /favorites/{favoriteId} {
      allow read, write: if isAuthenticated();
    }

    match /posts/{postId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated();
    }

    match /comments/{commentId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated();
    }
  }
}
```

### 5. 배포

1. "배포" 버튼 클릭
2. 빌드 로그 확인
3. 배포 완료 후 URL 확인

---

## ✅ 배포 후 확인사항

### 1. 헬스체크 확인
```bash
curl https://your-app.cloudtype.app/health
```

예상 응답:
```json
{
  "status": "UP",
  "health": "OK",
  "timestamp": "2025-10-16T12:00:00.000Z",
  "uptime": 123.456
}
```

### 2. Firebase 연결 확인
```bash
curl https://your-app.cloudtype.app/api/status
```

로그에서 다음 메시지 확인:
```
✅ Firebase Admin SDK initialized successfully
📊 Project ID: your-project-id
```

### 3. 회원가입 테스트
```bash
curl -X POST https://your-app.cloudtype.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test1234"}'
```

### 4. 데이터 지속성 테스트
1. 회원가입 → 로그인
2. CloudType에서 앱 재시작
3. 다시 로그인 → ✅ 데이터 유지 확인!

---

## 🐛 문제 해결

### 문제 1: Firebase 초기화 실패
```
❌ Firebase initialization error: Failed to parse private key
```

**해결방법:**
- `FIREBASE_PRIVATE_KEY` 환경 변수의 `\n`을 실제 줄바꿈으로 변환
- 또는 전체 JSON을 `FIREBASE_SERVICE_ACCOUNT`로 전달

### 문제 2: 권한 오류
```
7 PERMISSION_DENIED: Missing or insufficient permissions
```

**해결방법:**
1. Firestore 보안 규칙 확인
2. Firebase Authentication 활성화 확인

### 문제 3: 환경 변수 인식 안 됨

**해결방법:**
- CloudType 콘솔에서 환경 변수 다시 확인
- 앱 재배포
- 로그에서 `process.env` 값 확인

---

## 📊 도커 재부팅 테스트

### 이전 (JSON Database)
```
1. 회원가입 (testuser)
2. 도커 재시작
3. 로그인 시도
   └─> ❌ 실패! 데이터 삭제됨
```

### 현재 (Firebase)
```
1. 회원가입 (testuser)
2. 도커 재시작
3. 로그인 시도
   └─> ✅ 성공! 데이터 유지됨
```

---

## 🎯 핵심 요약

1. ✅ **Backend 폴더 유지** - Express 서버 필요
2. ✅ **Firestore가 영구 저장소 역할** - 도커 재부팅 무관
3. ✅ **환경 변수로 Firebase 설정** - 파일 업로드 불필요
4. ✅ **데이터 손실 방지** - 클라우드 DB 사용

---

## 📚 관련 문서

- [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) - Firebase 상세 설정
- [FIREBASE_MIGRATION.md](./FIREBASE_MIGRATION.md) - 마이그레이션 보고서
- [CloudType 공식 문서](https://docs.cloudtype.io/)

---

## 💡 추가 팁

### Frontend 배포 (선택사항)

Frontend도 CloudType에 배포하려면:

1. 별도 프로젝트로 생성
2. 루트 디렉토리: `/frontend`
3. 정적 파일 서빙 설정
4. Backend API URL 환경 변수로 설정

### 비용 최적화

- Firestore 무료 할당량:
  - 읽기: 50,000/일
  - 쓰기: 20,000/일
  - 삭제: 20,000/일
- 캐싱 전략으로 읽기 최소화
- 불필요한 쿼리 최적화

---

🎉 **CloudType + Firebase 배포 준비 완료!**
