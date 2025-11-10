/**
 * DrumSheet IndexedDB Manager
 * 드럼 악보 앱의 모든 데이터를 관리합니다
 */

const DB_NAME = 'DrumSheetDB';
const DB_VERSION = 1;

// Object Store 이름
const STORES = {
  SONGS: 'songs',
  SETTINGS: 'settings'
};

class DrumSheetDB {
  constructor() {
    this.db = null;
  }

  /**
   * 데이터베이스 초기화
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Songs 스토어: 곡 정보, PDF, 타이밍 포인트
        if (!db.objectStoreNames.contains(STORES.SONGS)) {
          const songStore = db.createObjectStore(STORES.SONGS, {
            keyPath: 'id',
            autoIncrement: true
          });
          songStore.createIndex('title', 'title', { unique: false });
          songStore.createIndex('artist', 'artist', { unique: false });
          songStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Settings 스토어: 앱 설정
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * 곡 추가
   * @param {Object} songData - 곡 데이터
   * @param {string} songData.title - 곡 제목
   * @param {string} songData.artist - 아티스트
   * @param {string} songData.youtubeUrl - 유튜브 URL
   * @param {Blob} songData.pdfBlob - PDF 파일
   * @param {Array} songData.timingPoints - 타이밍 포인트 [{time: 15, scrollY: 500}, ...]
   * @returns {Promise<number>} 생성된 곡의 ID
   */
  async addSong(songData) {
    const song = {
      ...songData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SONGS], 'readwrite');
      const store = transaction.objectStore(STORES.SONGS);
      const request = store.add(song);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 곡 수정
   * @param {number} id - 곡 ID
   * @param {Object} updates - 업데이트할 데이터
   * @returns {Promise<void>}
   */
  async updateSong(id, updates) {
    const song = await this.getSong(id);
    if (!song) throw new Error('Song not found');

    const updatedSong = {
      ...song,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SONGS], 'readwrite');
      const store = transaction.objectStore(STORES.SONGS);
      const request = store.put(updatedSong);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 곡 삭제
   * @param {number} id - 곡 ID
   * @returns {Promise<void>}
   */
  async deleteSong(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SONGS], 'readwrite');
      const store = transaction.objectStore(STORES.SONGS);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 곡 조회
   * @param {number} id - 곡 ID
   * @returns {Promise<Object>}
   */
  async getSong(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SONGS], 'readonly');
      const store = transaction.objectStore(STORES.SONGS);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 모든 곡 조회
   * @returns {Promise<Array>}
   */
  async getAllSongs() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SONGS], 'readonly');
      const store = transaction.objectStore(STORES.SONGS);
      const request = store.getAll();

      request.onsuccess = () => {
        const songs = request.result;
        // createdAt 기준 내림차순 정렬
        songs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        resolve(songs);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 데이터 Export (백업)
   * @returns {Promise<Object>} 전체 데이터
   */
  async exportData() {
    const songs = await this.getAllSongs();
    
    // PDF Blob을 Base64로 변환
    const songsWithBase64 = await Promise.all(
      songs.map(async (song) => {
        if (song.pdfBlob) {
          const base64 = await this.blobToBase64(song.pdfBlob);
          return { ...song, pdfBlob: null, pdfBase64: base64 };
        }
        return song;
      })
    );

    return {
      version: DB_VERSION,
      exportedAt: new Date().toISOString(),
      songs: songsWithBase64
    };
  }

  /**
   * 데이터 Import (복구)
   * @param {Object} data - Export된 데이터
   * @returns {Promise<void>}
   */
  async importData(data) {
    if (!data.songs) throw new Error('Invalid import data');

    // 기존 데이터 삭제
    const transaction = this.db.transaction([STORES.SONGS], 'readwrite');
    const store = transaction.objectStore(STORES.SONGS);
    await new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // 새 데이터 추가
    for (const song of data.songs) {
      // Base64를 Blob으로 변환
      if (song.pdfBase64) {
        song.pdfBlob = await this.base64ToBlob(song.pdfBase64);
        delete song.pdfBase64;
      }
      
      // ID 제거 (자동 생성되도록)
      const { id, ...songWithoutId } = song;
      await this.addSong(songWithoutId);
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

  /**
   * YouTube URL에서 Video ID 추출
   * @param {string} url - YouTube URL
   * @returns {string|null} Video ID
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
   * @param {string} videoId - YouTube Video ID
   * @param {string} quality - 'default', 'medium', 'high', 'maxres'
   * @returns {string} Thumbnail URL
   */
  static getYouTubeThumbnail(videoId, quality = 'default') {
    return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
  }
}

// 전역 인스턴스 생성
const db = new DrumSheetDB();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DrumSheetDB, db, STORES };
}
