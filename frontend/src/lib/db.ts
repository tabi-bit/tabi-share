import Dexie, { type EntityTable } from 'dexie';

/** SWRキャッシュエントリの型定義 */
export interface SwrCacheEntry {
  /** SWRキー（シリアライズ済み文字列） */
  key: string;
  /** キャッシュデータ本体（Structured Cloneで保存） */
  data: unknown;
  /** 保存日時（6ヶ月期限管理用） */
  timestamp: number;
  /** 最終アクセス日時（LRU管理用） */
  lastAccessed: number;
}

/** ユーザー設定エントリの型定義 */
export interface UserSettingEntry {
  key: string;
  value: unknown;
}

/** デバッグキャッシュエントリの型定義（local 開発時のみ使用） */
export interface DebugCacheEntry {
  /** 完全一意キー（namespace を含むコロン区切り文字列） */
  key: string;
  /** 分類キー（一括 clear 用）。例: 'gemini:trip-url-preview' */
  namespace: string;
  /** キャッシュ対象データ（structured-cloneable） */
  data: unknown;
  /** 作成日時（unix ms）。TTL 判定に使用 */
  createdAt: number;
}

/**
 * URL ストックエントリ（テスト用ローカルストレージ）
 *
 * MVP 検証中は DB マイグレーションを避けるため、サーバー側に永続化せず
 * フロントの IndexedDB のみで保持する。サーバ取得した Gemini 整形結果も
 * memo に追記された状態でここに保存される。
 */
export interface TripUrlEntry {
  /** Dexie 自動採番の主キー */
  id: number;
  /** 紐づく trip の id */
  tripId: number;
  /** ストック対象の URL */
  url: string;
  /** ページタイトル（自動取得 or 手入力） */
  title: string | null;
  /** og:image */
  thumbnailUrl: string | null;
  /** ユーザーメモ（markdown）。AI 整形結果はこの末尾に追記される */
  memo: string | null;
  /** 作成日時 ISO 文字列 */
  createdAt: string;
  /** 更新日時 ISO 文字列 */
  updatedAt: string;
}

/** アプリケーションオフラインDB */
const db = new Dexie('AppOfflineDB') as Dexie & {
  swrCache: EntityTable<SwrCacheEntry, 'key'>;
  userSettings: EntityTable<UserSettingEntry, 'key'>;
  debugCache: EntityTable<DebugCacheEntry, 'key'>;
  tripUrls: EntityTable<TripUrlEntry, 'id'>;
};

// DBのスキーマを変更する場合は、version番号をインクリメントしてstores()を呼び出す
db.version(1).stores({
  swrCache: 'key, timestamp, lastAccessed',
  userSettings: 'key',
});
db.version(2).stores({
  swrCache: 'key, timestamp, lastAccessed',
  userSettings: 'key',
  debugCache: 'key, namespace, createdAt',
});
db.version(3).stores({
  swrCache: 'key, timestamp, lastAccessed',
  userSettings: 'key',
  debugCache: 'key, namespace, createdAt',
  tripUrls: '++id, tripId, createdAt',
});

export { db };
