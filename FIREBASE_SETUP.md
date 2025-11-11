# Firebase 설정 가이드

이 프로젝트는 Firebase를 사용합니다. 다음 단계를 따라 Firebase를 설정해주세요.

## 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력: `braille-typing-practice` (또는 원하는 이름)
4. Google Analytics 설정 (선택사항)

## 2. Firebase 서비스 활성화

### Firestore Database
1. 좌측 메뉴 "Firestore Database" → "데이터베이스 만들기"
2. **프로덕션 모드**로 시작
3. 리전: `asia-northeast3 (서울)` 권장

### Authentication
1. 좌측 메뉴 "Authentication" → "시작하기"
2. "로그인 방법" 탭에서 **"이메일/비밀번호"** 활성화

### Storage (파일 업로드용)
1. 좌측 메뉴 "Storage" → "시작하기"
2. **프로덕션 모드**로 시작

## 3. Backend 설정 (Firebase Admin SDK)

1. Firebase Console → 프로젝트 설정 (⚙️) → "서비스 계정" 탭
2. "새 비공개 키 생성" 클릭
3. 다운로드한 JSON 파일을 다음 경로에 저장:
   ```
   backend/config/serviceAccountKey.json
   ```

## 4. Frontend 설정 (Firebase Client SDK)

1. Firebase Console → 프로젝트 설정 (⚙️) → "일반" 탭
2. "앱 추가" → 웹 앱 (</>) 선택
3. 앱 닉네임 입력 후 등록
4. Firebase SDK 설정 정보를 복사하여 다음 파일을 수정:
   ```
   frontend/js/firebase-config.js
   ```

### firebase-config.js 예시:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "braille-typing-practice.firebaseapp.com",
  projectId: "braille-typing-practice",
  storageBucket: "braille-typing-practice.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

## 5. Firestore 보안 규칙 설정

Firebase Console → Firestore Database → "규칙" 탭에서 다음 규칙을 적용:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자가 인증되었는지 확인하는 함수
    function isAuthenticated() {
      return request.auth != null;
    }

    // 사용자가 해당 문서의 소유자인지 확인하는 함수
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Users 컬렉션
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId);
    }

    // Categories 컬렉션
    match /categories/{categoryId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isOwner(resource.data.created_by);
    }

    // BrailleData 컬렉션
    match /braille_data/{dataId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isOwner(resource.data.created_by);
    }

    // PracticeLogs 컬렉션
    match /practice_logs/{logId} {
      allow create: if isOwner(request.resource.data.user_id);
      allow read: if isAuthenticated();
      allow update, delete: if isOwner(resource.data.user_id);
    }

    // Attendance 컬렉션
    match /attendance/{attendanceId} {
      allow create: if isOwner(request.resource.data.user_id);
      allow read, update, delete: if isOwner(resource.data.user_id);
    }

    // Favorites 컬렉션
    match /favorites/{favoriteId} {
      allow create: if isOwner(request.resource.data.user_id);
      allow read, update, delete: if isOwner(resource.data.user_id);
    }

    // Posts 컬렉션
    match /posts/{postId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isOwner(resource.data.author_id);
    }

    // Comments 컬렉션
    match /comments/{commentId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isOwner(resource.data.author_id);
    }
  }
}
```

## 6. Storage 보안 규칙 설정

Firebase Console → Storage → "규칙" 탭에서 다음 규칙을 적용:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 7. 환경 변수 확인

`.env` 파일에 다음 환경 변수가 설정되어 있는지 확인:

```
NODE_ENV=production
PORT=8080
HOST=0.0.0.0
JWT_SECRET=your-jwt-secret-key
SESSION_SECRET=your-session-secret-key
```

## 8. 서버 시작

```bash
# Backend
cd backend
npm install
npm start

# Frontend (개발 서버)
cd frontend
npm install
npm run serve
```

## 주의사항

⚠️ **절대 커밋하지 말아야 할 파일:**
- `backend/config/serviceAccountKey.json`
- `frontend/js/firebase-config.js` (실제 API 키 포함된 경우)

이 파일들은 `.gitignore`에 추가되어 있습니다.

## 문제 해결

### Firebase 초기화 오류
- `serviceAccountKey.json` 파일이 올바른 위치에 있는지 확인
- Firebase 프로젝트 설정에서 서비스 계정 키를 다시 다운로드

### 권한 오류
- Firestore 보안 규칙이 올바르게 설정되었는지 확인
- Authentication이 활성화되어 있는지 확인

### 연결 오류
- 인터넷 연결 확인
- Firebase 프로젝트 ID가 올바른지 확인
