# 🔥 Firebase 연동 배포 가이드

## 📦 생성된 파일 목록

1. **firebase-db.js** - Firebase 데이터베이스 매니저
2. **index-firebase.html** - 로그인 + 곡 목록 페이지
3. **add-song-firebase.html** - 곡 추가/수정 페이지
4. **sheet-firebase.html** - 악보 재생 페이지

---

## 🚀 배포 순서

### 1단계: 파일 교체

기존 Netlify 프로젝트 폴더에서:

```bash
# 기존 파일 백업 (선택사항)
mv index.html index-old.html
mv add-song.html add-song-old.html  
mv sheet.html sheet-old.html

# Firebase 버전으로 교체
mv index-firebase.html index.html
mv add-song-firebase.html add-song.html
mv sheet-firebase.html sheet.html

# firebase-db.js 추가
# js/ 폴더에 firebase-db.js 복사
```

**최종 폴더 구조:**
```
drum-sheet-app/
├── index.html              ← Firebase 버전
├── add-song.html           ← Firebase 버전
├── sheet.html              ← Firebase 버전
├── js/
│   ├── db.js               (백업용)
│   └── firebase-db.js      ← 새로 추가
├── manifest.json
└── sw.js
```

---

### 2단계: Firestore 보안 규칙 설정

Firebase 콘솔에서:

1. **Firestore Database** 메뉴로 이동
2. 상단 **"규칙"** 탭 클릭
3. 아래 규칙 복사해서 붙여넣기:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 로그인한 사용자만 자신의 데이터에 접근 가능
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

4. **"게시"** 버튼 클릭

---

### 3단계: Storage 보안 규칙 설정

Firebase 콘솔에서:

1. **Storage** 메뉴로 이동
2. 상단 **"규칙"** 탭 클릭
3. 아래 규칙 복사해서 붙여넣기:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // 로그인한 사용자만 자신의 PDF에 접근 가능
    match /pdfs/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

4. **"게시"** 버튼 클릭

---

### 4단계: Netlify에 배포

```bash
# Git으로 배포하는 경우
git add .
git commit -m "Firebase 연동 완료"
git push

# 또는 Netlify 드래그 앤 드롭으로 배포
```

---

## ✅ 테스트

1. **배포된 사이트 접속**
   - 로그인 화면이 나타나야 함
   
2. **구글 로그인**
   - "Google로 로그인" 버튼 클릭
   - 구글 계정 선택
   
3. **곡 추가 테스트**
   - "+ 곡 추가" 버튼
   - PDF + YouTube URL 업로드
   - 저장
   
4. **다른 기기에서 확인**
   - 아이패드에서 같은 사이트 접속
   - 같은 구글 계정으로 로그인
   - 방금 추가한 곡이 보여야 함! ✨

---

## 🔧 문제 해결

### "로그인이 필요합니다" 알림이 계속 뜸
→ Firebase Authentication이 제대로 설정되지 않음
- Firebase 콘솔 → Authentication → Google 로그인 활성화 확인

### PDF 업로드 실패
→ Storage 규칙 확인
- Firebase 콘솔 → Storage → 규칙 탭 확인

### "권한 거부됨" 오류
→ Firestore 규칙 확인
- Firebase 콘솔 → Firestore → 규칙 탭 확인
- 사용자 UID가 올바른지 확인

---

## 💾 기존 데이터 마이그레이션

IndexedDB에 저장된 기존 데이터가 있다면:

1. **기존 앱에서 Export**
   - 설정(⋮) → Export
   - JSON 파일 다운로드
   
2. **Firebase 앱에서 Import**
   - 로그인 후
   - 설정(⋮) → Import
   - JSON 파일 선택

---

## 🎉 완료!

이제 컴퓨터와 아이패드에서 자동으로 동기화됩니다!
- 컴퓨터에서 곡 추가 → 아이패드에서 바로 확인
- 인터넷만 연결되어 있으면 OK!

---

## 📊 무료 한도 모니터링

Firebase 콘솔 → 설정 → 사용량 및 결제
- Firestore 읽기/쓰기 횟수 확인
- Storage 사용량 확인
- 예산 알림 설정 권장 ($1 또는 $5)
