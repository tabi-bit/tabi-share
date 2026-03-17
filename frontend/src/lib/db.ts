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

/** アプリケーションオフラインDB */
const db = new Dexie('AppOfflineDB') as Dexie & {
  swrCache: EntityTable<SwrCacheEntry, 'key'>;
  userSettings: EntityTable<UserSettingEntry, 'key'>;
};

// DBのスキーマを変更する場合は、version番号をインクリメントしてstores()を呼び出す
db.version(1).stores({
  swrCache: 'key, timestamp, lastAccessed',
  userSettings: 'key',
});

export { db };
