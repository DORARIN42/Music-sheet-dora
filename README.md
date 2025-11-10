# 🥁 드럼 악보 뷰어 (DRUM SHEET)

유튜브 영상과 PDF 악보를 연동하여 자동으로 스크롤되는 드럼 악보 뷰어 앱입니다.

## ✨ 주요 기능

### 1. 곡 관리
- 곡 제목, 아티스트, 유튜브 URL, PDF 악보 저장
- IndexedDB를 사용한 오프라인 저장
- Export/Import 기능으로 데이터 백업 및 복구

### 2. 타이밍 설정
- YouTube 플레이어와 연동하여 현재 재생 시간 확인
- PDF 페이지별 스크롤 위치 자동 계산
- 원하는 시점에 타이밍 포인트 추가
- 타이밍 포인트 수정 및 삭제

### 3. 악보 뷰어
- PDF.js를 사용한 고품질 PDF 렌더링
- YouTube IFrame API와 연동
- 타이밍 포인트에 따른 자동 스크롤
- 재생/일시정지, 프로그레스 바 제어

### 4. PWA 지원
- 오프라인 사용 가능
- 홈 화면에 추가하여 앱처럼 사용
- 빠른 로딩 속도

## 📁 파일 구조

```
drum-sheet-app/
├── index.html              # 메인 페이지 (곡 목록)
├── add-song.html           # 곡 추가 페이지
├── sheet.html              # 악보 뷰어 페이지
├── manifest.json           # PWA 매니페스트
├── service-worker.js       # Service Worker
├── js/
│   └── db.js              # IndexedDB 매니저
└── README.md              # 문서
```

## 🗄️ 데이터베이스 구조

### Songs Object Store
```javascript
{
  id: 1,                    // 자동 증가 키
  title: "예뻤어",          // 곡 제목
  artist: "DAY6",           // 아티스트
  youtubeUrl: "https://...", // YouTube URL
  youtubeId: "Mhyi9p7T7OM", // YouTube Video ID
  pdfBlob: Blob,            // PDF 파일 (Blob)
  pdfPages: [               // PDF 페이지 정보
    {
      pageNum: 1,
      startY: 0,
      endY: 1200,
      height: 1200
    },
    // ...
  ],
  timingPoints: [           // 타이밍 포인트
    {
      time: 15,             // 초 단위
      scrollY: 500          // 스크롤 위치 (px)
    },
    // ...
  ],
  createdAt: "2025-11-09T...", // 생성 시간
  updatedAt: "2025-11-09T..."  // 수정 시간
}
```

### Settings Object Store
```javascript
{
  key: "theme",             // 설정 키
  value: "dark"             // 설정 값
}
```

## 🛠️ 사용 기술

- **HTML/CSS/JavaScript** - 순수 바닐라 JS
- **IndexedDB** - 로컬 데이터 저장
- **YouTube IFrame API** - 유튜브 플레이어 제어
- **PDF.js** - PDF 렌더링
- **Service Worker** - PWA 지원

## 🚀 설치 및 실행

### 1. 파일 준비
모든 파일을 웹 서버 디렉토리에 배치합니다.

### 2. 로컬 서버 실행
```bash
# Python 3
python -m http.server 8000

# Node.js (http-server)
npx http-server -p 8000

# PHP
php -S localhost:8000
```

### 3. 브라우저에서 접속
```
http://localhost:8000
```

### 4. PWA 설치 (선택사항)
- 브라우저 주소창의 "설치" 버튼 클릭
- 홈 화면에 추가하여 앱처럼 사용

## 📱 사용 방법

### 곡 추가하기
1. 메인 페이지에서 "+ 곡 추가" 버튼 클릭
2. 곡명, 아티스트, 유튜브 URL 입력
3. PDF 악보 파일 업로드
4. YouTube 영상을 재생하며 원하는 시점에 "+ 포인트 추가" 클릭
5. 각 타이밍 포인트의 스크롤 위치(px) 조정
6. "저장" 버튼 클릭

### 악보 보기
1. 메인 페이지에서 곡 선택
2. 재생 버튼(▶) 클릭
3. 설정된 타이밍에 따라 악보가 자동으로 스크롤됨
4. 프로그레스 바를 클릭하여 원하는 구간으로 이동 가능

### 백업 및 복구
1. 메인 페이지 우측 하단의 "⋮" 버튼 클릭
2. **Export**: 현재 데이터를 JSON 파일로 다운로드
3. **Import**: 백업 파일을 선택하여 복구

## ⚙️ 설정 가능한 값

### 디자인 색상
```javascript
// db.js 또는 각 HTML 파일의 CSS 수정
const colors = {
  background: '#1a1a1a',
  card: '#212121',
  cardHover: '#2a2a2a',
  accent: '#007AFF',
  // ...
};
```

### PDF 렌더링 스케일
```javascript
// sheet.html의 renderPdf() 함수
const viewport = page.getViewport({ scale: 1.5 }); // 1.0 ~ 2.0
```

### 타임 업데이트 간격
```javascript
// sheet.html의 startTimeUpdate() 함수
setInterval(() => { /* ... */ }, 100); // 밀리초 단위
```

## 🔧 트러블슈팅

### YouTube 플레이어가 로드되지 않음
- 브라우저 콘솔에서 에러 확인
- YouTube IFrame API 스크립트 로딩 확인
- 올바른 YouTube URL 형식인지 확인

### PDF가 렌더링되지 않음
- PDF 파일이 손상되지 않았는지 확인
- PDF.js 스크립트 로딩 확인
- 브라우저 콘솔에서 에러 로그 확인

### IndexedDB 오류
- 시크릿 모드가 아닌지 확인
- 브라우저 저장소 용량 확인
- 개발자 도구 > Application > Storage > IndexedDB 확인

### 자동 스크롤이 작동하지 않음
- 타이밍 포인트가 올바르게 설정되었는지 확인
- 스크롤 위치(px)가 PDF 전체 높이 내에 있는지 확인
- 브라우저 콘솔에서 타이밍 로그 확인

## 📝 향후 개선 계획

- [ ] 곡 검색 기능
- [ ] 곡 편집 기능
- [ ] 재생 속도 조절
- [ ] 반복 재생 구간 설정
- [ ] 다크/라이트 테마 전환
- [ ] 클라우드 동기화
- [ ] 곡 공유 기능
- [ ] 악기별 파트 표시

## 📄 라이선스

이 프로젝트는 개인 용도로 자유롭게 사용할 수 있습니다.

## 🙋 문의

버그 제보나 기능 제안은 이슈로 등록해주세요.

---

**Made with ❤️ for drummers**
