/**
 * Firebase Database Manager
 * IndexedDB를 대체하여 Firebase Firestore + Storage 사용
 */

// Firebase SDK imports (CDN 버전 사용)
// HTML에서 다음 스크립트를 추가해야 함:
// <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>

const firebaseConfig = {
  apiKey: "AIzaSyBzR1J-tr3nqdO_21Uc1uOlOpTO6cFfVaI",
  authDomain: "music-sheet-fe388.firebaseapp.com",
  projectId: "music-sheet-fe388",
  storageBucket: "music-sheet-fe388.firebasestorage.app",
  messagingSenderId: "407435788069",
  appId: "1:407435788069:web:e864c457a8d9f55764a4cc",
  measurementId: "G-W4PGNC9FB6"
};

class FirebaseDB {
  constructor() {
    this.app = null;
    this.db = null;
    this.storage = null;
    this.auth = null;
    this.currentUser = null;
    this.cacheDB = null; // IndexedDB for PDF caching
  }

  /**
   * IndexedDB 초기화 (PDF 캐싱용)
   */
  async initCache() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('DrumSheetCache', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.cacheDB = request.result;
        resolve(this.cacheDB);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('pdfCache')) {
          db.createObjectStore('pdfCache', { keyPath: 'songId' });
        }
      };
    });
  }

  /**
   * IndexedDB에서 캐시된 PDF 가져오기
   */
  async getCachedPDF(songId) {
    if (!this.cacheDB) await this.initCache();
    
    return new Promise((resolve, reject) => {
      const transaction = this.cacheDB.transaction(['pdfCache'], 'readonly');
      const store = transaction.objectStore('pdfCache');
      const request = store.get(songId);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * IndexedDB에 PDF 캐싱
   */
  async cachePDF(songId, pdfBlob, updatedAt) {
    if (!this.cacheDB) await this.initCache();
    
    return new Promise((resolve, reject) => {
      const transaction = this.cacheDB.transaction(['pdfCache'], 'readwrite');
      const store = transaction.objectStore('pdfCache');
      
      // Timestamp를 밀리초로 변환해서 저장
      const updatedAtMs = updatedAt?.toMillis?.() || Date.now();
      
      const request = store.put({
        songId: songId,
        pdfBlob: pdfBlob,
        updatedAt: updatedAtMs, // 숫자로 저장
        cachedAt: Date.now()
      });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * IndexedDB에서 캐시 삭제
   */
  async deleteCachedPDF(songId) {
    if (!this.cacheDB) await this.initCache();
    
    return new Promise((resolve, reject) => {
      const transaction = this.cacheDB.transaction(['pdfCache'], 'readwrite');
      const store = transaction.objectStore('pdfCache');
      const request = store.delete(songId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Firebase 초기화
   */
  async init() {
    try {
      console.log('🔧 Firebase 초기화 시작');
      
      // Firebase 초기화
      this.app = firebase.initializeApp(firebaseConfig);
      this.db = firebase.firestore();
      this.storage = firebase.storage();
      this.auth = firebase.auth();
      console.log('✅ Firebase SDK 초기화 완료');

      // IndexedDB 캐시 초기화
      await this.initCache();
      console.log('✅ IndexedDB 캐시 초기화 완료');

      // Redirect 결과 처리 (모바일 로그인 후)
      console.log('🔍 Redirect 결과 확인 중...');
      const redirectResult = await this.handleRedirectResult();
      if (redirectResult) {
        console.log('✅ Redirect 로그인 성공:', redirectResult.email);
      } else {
        console.log('ℹ️ Redirect 결과 없음 (정상)');
      }

      // 로그인 상태 변경 리스너
      return new Promise((resolve, reject) => {
        const unsubscribe = this.auth.onAuthStateChanged(user => {
          this.currentUser = user;
          if (user) {
            console.log('✅ 로그인됨:', user.email);
          } else {
            console.log('ℹ️ 로그아웃 상태');
          }
          unsubscribe(); // 첫 콜백 후 구독 해제
          resolve(this.db);
        });
      });
    } catch (error) {
      console.error('❌ Firebase 초기화 실패:', error);
      throw error;
    }
  }

  /**
   * 구글 로그인 (모바일 환경 대응 - Redirect 방식)
   */
  async signInWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      
      console.log('🔐 로그인 시작');
      console.log('📱 isMobile():', this.isMobile());
      console.log('👆 터치 지원:', 'ontouchstart' in window);
      console.log('🖥️ User Agent:', navigator.userAgent);
      
      // 모바일/터치 환경에서는 redirect 방식 사용
      if (this.isMobile()) {
        console.log('➡️ Redirect 방식 사용');
        await this.auth.signInWithRedirect(provider);
        // redirect 후 페이지가 다시 로드되므로 여기서 return
        return null;
      } else {
        console.log('🪟 Popup 방식 사용');
        // 데스크톱에서는 popup 방식 사용
        const result = await this.auth.signInWithPopup(provider);
        this.currentUser = result.user;
        console.log('✅ 로그인 성공:', this.currentUser.email);
        return this.currentUser;
      }
    } catch (error) {
      console.error('❌ 로그인 실패:', error);
      throw error;
    }
  }

  /**
   * Redirect 결과 처리
   */
  async handleRedirectResult() {
    try {
      const result = await this.auth.getRedirectResult();
      if (result && result.user) {
        this.currentUser = result.user;
        console.log('✅ Redirect 로그인 성공:', this.currentUser.email);
        return this.currentUser;
      }
      return null;
    } catch (error) {
      // auth/popup-closed-by-user 등 일부 에러는 무시
      if (error.code === 'auth/popup-closed-by-user' || 
          error.code === 'auth/cancelled-popup-request') {
        console.log('ℹ️ 사용자가 로그인 취소');
        return null;
      }
      console.error('❌ Redirect 결과 처리 실패:', error);
      throw error;
    }
  }

  /**
   * 모바일 환경 감지 (iPad 포함)
   */
  isMobile() {
    // iPad는 Safari 설정에 따라 데스크톱 User Agent를 사용할 수 있음
    // 터치 이벤트와 User Agent를 모두 확인
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isMobileUA = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // iPad Safari는 데스크톱 UA를 사용하더라도 터치 디바이스
    return isTouchDevice || isMobileUA;
  }

  /**
   * 로그아웃
   */
  async signOut() {
    try {
      await this.auth.signOut();
      this.currentUser = null;
      console.log('로그아웃 완료');
    } catch (error) {
      console.error('로그아웃 실패:', error);
      throw error;
    }
  }

  /**
   * 로그인 여부 확인
   */
  isLoggedIn() {
    return this.currentUser !== null;
  }

  /**
   * 사용자 컬렉션 참조 가져오기
   */
  getUserCollection() {
    if (!this.currentUser) {
      throw new Error('로그인이 필요합니다');
    }
    return this.db.collection('users').doc(this.currentUser.uid).collection('songs');
  }

  /**
   * 곡 추가
   */
  async addSong(songData) {
    if (!this.isLoggedIn()) {
      throw new Error('로그인이 필요합니다');
    }

    try {
      // PDF를 Firebase Storage에 업로드
      const pdfUrl = await this.uploadPDF(songData.pdfBlob);

      // Firestore에 곡 정보 저장
      const songsRef = this.getUserCollection();
      const docRef = await songsRef.add({
        title: songData.title,
        artist: songData.artist,
        youtubeUrl: songData.youtubeUrl,
        youtubeId: songData.youtubeId,
        pdfUrl: pdfUrl,
        pdfPages: songData.pdfPages,
        timingPoints: songData.timingPoints,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      console.log('곡 추가 완료:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('곡 추가 실패:', error);
      throw error;
    }
  }

  /**
   * PDF 파일을 Firebase Storage에 업로드
   */
  async uploadPDF(pdfBlob) {
    if (!this.isLoggedIn()) {
      throw new Error('로그인이 필요합니다');
    }

    try {
      const fileName = `pdfs/${this.currentUser.uid}/${Date.now()}.pdf`;
      const storageRef = this.storage.ref(fileName);
      
      const snapshot = await storageRef.put(pdfBlob);
      const downloadUrl = await snapshot.ref.getDownloadURL();
      
      console.log('PDF 업로드 완료:', downloadUrl);
      return downloadUrl;
    } catch (error) {
      console.error('PDF 업로드 실패:', error);
      throw error;
    }
  }

  /**
   * PDF URL에서 Blob 다운로드
   */
  async downloadPDF(pdfUrl) {
    try {
      console.log('📥 PDF 다운로드 시작:', pdfUrl);
      
      // Firebase Storage SDK를 사용하여 직접 Blob 다운로드 (CORS 문제 해결)
      const storageRef = this.storage.refFromURL(pdfUrl);
      console.log('✅ Storage reference 생성 완료');
      
      // getDownloadURL()로 다운로드 URL을 얻고, 해당 URL에서 fetch
      const downloadUrl = await storageRef.getDownloadURL();
      console.log('✅ Download URL 획득:', downloadUrl);
      
      const response = await fetch(downloadUrl);
      console.log('✅ Fetch 완료, status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log('✅ Blob 변환 완료, 크기:', blob.size, 'bytes');
      
      return blob;
    } catch (error) {
      console.error('❌ PDF 다운로드 실패:', error);
      console.error('❌ 에러 상세:', {
        message: error.message,
        code: error.code,
        name: error.name
      });
      throw error;
    }
  }

  /**
   * 곡 수정
   */
  async updateSong(id, updates) {
    if (!this.isLoggedIn()) {
      throw new Error('로그인이 필요합니다');
    }

    try {
      const updateData = { ...updates };

      // PDF가 변경된 경우 새로 업로드
      if (updates.pdfBlob) {
        updateData.pdfUrl = await this.uploadPDF(updates.pdfBlob);
        delete updateData.pdfBlob;
        
        // PDF가 변경되었으므로 캐시 삭제 (다음에 다시 캐싱됨)
        await this.deleteCachedPDF(id);
      }

      updateData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

      const songsRef = this.getUserCollection();
      await songsRef.doc(id).update(updateData);

      console.log('곡 수정 완료:', id);
    } catch (error) {
      console.error('곡 수정 실패:', error);
      throw error;
    }
  }

  /**
   * 곡 삭제
   */
  async deleteSong(id) {
    if (!this.isLoggedIn()) {
      throw new Error('로그인이 필요합니다');
    }

    try {
      // 곡 정보 가져오기
      const song = await this.getSong(id);
      
      // Storage에서 PDF 삭제
      if (song.pdfUrl) {
        try {
          const pdfRef = this.storage.refFromURL(song.pdfUrl);
          await pdfRef.delete();
        } catch (error) {
          console.warn('PDF 삭제 실패 (이미 삭제됨):', error);
        }
      }

      // IndexedDB 캐시 삭제
      await this.deleteCachedPDF(id);

      // Firestore에서 문서 삭제
      const songsRef = this.getUserCollection();
      await songsRef.doc(id).delete();

      console.log('곡 삭제 완료:', id);
    } catch (error) {
      console.error('곡 삭제 실패:', error);
      throw error;
    }
  }

  /**
   * 곡 조회 (캐시 활용)
   */
  async getSong(id) {
    console.log('🔍 getSong 호출됨 - id:', id);
    console.log('🔍 id 타입:', typeof id);
    console.log('🔍 id 값:', JSON.stringify(id));
    
    if (!this.isLoggedIn()) {
      console.error('❌ 로그인되지 않음');
      throw new Error('로그인이 필요합니다');
    }

    try {
      console.log('📥 getUserCollection 호출...');
      const songsRef = this.getUserCollection();
      console.log('📥 Firestore doc 조회 시작...');
      const doc = await songsRef.doc(id).get();
      console.log('✅ Firestore doc 조회 완료 - exists:', doc.exists);

      if (!doc.exists) {
        console.warn('⚠️ 문서가 존재하지 않음');
        return null;
      }

      const data = doc.data();
      
      // PDF Blob 가져오기 (캐시 우선)
      if (data.pdfUrl) {
        // 1. 캐시 확인
        const cached = await this.getCachedPDF(id);
        
        // Timestamp를 밀리초로 변환 (캐시는 이미 숫자)
        const firestoreUpdatedAt = data.updatedAt?.toMillis?.() || 0;
        const cachedUpdatedAt = cached?.updatedAt || 0; // 이미 숫자
        
        console.log('🔍 캐시 비교:', {
          hasCached: !!cached,
          firestoreTime: firestoreUpdatedAt,
          cachedTime: cachedUpdatedAt,
          isCachedNewer: cachedUpdatedAt >= firestoreUpdatedAt
        });
        
        if (cached && cachedUpdatedAt >= firestoreUpdatedAt) {
          // 캐시가 최신 버전
          console.log('✅ 캐시된 PDF 사용:', id);
          data.pdfBlob = cached.pdfBlob;
        } else {
          // 캐시가 없거나 구버전 → 다운로드 후 캐싱
          console.log('📥 PDF 다운로드 중:', id);
          data.pdfBlob = await this.downloadPDF(data.pdfUrl);
          
          // 캐시 저장
          await this.cachePDF(id, data.pdfBlob, data.updatedAt);
          console.log('💾 PDF 캐시 저장 완료:', id);
        }
      }

      return {
        id: doc.id,
        ...data
      };
    } catch (error) {
      console.error('곡 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 모든 곡 조회
   */
  async getAllSongs() {
    if (!this.isLoggedIn()) {
      throw new Error('로그인이 필요합니다');
    }

    try {
      const songsRef = this.getUserCollection();
      const snapshot = await songsRef.orderBy('createdAt', 'desc').get();

      const songs = [];
      for (const doc of snapshot.docs) {
        const data = doc.data();
        songs.push({
          id: doc.id,
          ...data,
          // 목록에서는 pdfBlob 제외 (필요시 getSong으로 가져옴)
        });
      }

      return songs;
    } catch (error) {
      console.error('곡 목록 조회 실패:', error);
      throw error;
    }
  }

  /**
   * YouTube URL에서 Video ID 추출
   */
  static extractYouTubeId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * YouTube Thumbnail URL 생성
   */
  static getYouTubeThumbnail(videoId, quality = 'default') {
    return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
  }

  /**
   * 데이터 Export (백업)
   */
  async exportData() {
    if (!this.isLoggedIn()) {
      throw new Error('로그인이 필요합니다');
    }

    try {
      const songs = await this.getAllSongs();
      
      // 각 곡의 PDF를 Base64로 변환
      const songsWithBase64 = await Promise.all(
        songs.map(async (song) => {
          if (song.pdfUrl) {
            const pdfBlob = await this.downloadPDF(song.pdfUrl);
            const base64 = await this.blobToBase64(pdfBlob);
            return { ...song, pdfUrl: null, pdfBase64: base64 };
          }
          return song;
        })
      );

      return {
        version: 2,
        exportedAt: new Date().toISOString(),
        userId: this.currentUser.uid,
        songs: songsWithBase64
      };
    } catch (error) {
      console.error('Export 실패:', error);
      throw error;
    }
  }

  /**
   * 데이터 Import (복구)
   */
  async importData(data) {
    if (!this.isLoggedIn()) {
      throw new Error('로그인이 필요합니다');
    }

    if (!data.songs) {
      throw new Error('Invalid import data');
    }

    try {
      // 기존 데이터 삭제 확인
      const confirm = window.confirm(
        '기존 데이터가 모두 삭제됩니다. 계속하시겠습니까?'
      );
      if (!confirm) return;

      // 기존 곡들 삭제
      const existingSongs = await this.getAllSongs();
      for (const song of existingSongs) {
        await this.deleteSong(song.id);
      }

      // 새 데이터 추가
      for (const song of data.songs) {
        // Base64를 Blob으로 변환
        if (song.pdfBase64) {
          song.pdfBlob = await this.base64ToBlob(song.pdfBase64);
          delete song.pdfBase64;
        }

        // ID 제거 (자동 생성)
        const { id, createdAt, updatedAt, pdfUrl, ...songData } = song;
        await this.addSong(songData);
      }

      console.log('Import 완료');
    } catch (error) {
      console.error('Import 실패:', error);
      throw error;
    }
  }

  /**
   * Blob을 Base64로 변환
   */
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Base64를 Blob으로 변환
   */
  async base64ToBlob(base64) {
    const response = await fetch(base64);
    return response.blob();
  }
}

// 전역 인스턴스 생성
const firebaseDB = new FirebaseDB();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FirebaseDB, firebaseDB };
}
