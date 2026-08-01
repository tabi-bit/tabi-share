/**
 * Android PWA など console が取りづらい環境向けの診断ロガー。
 *
 * IndexedDB に ring buffer (最大 500 件) で書き、client 側から readAll で
 * 一括取得できる。SW からも同じ DB / store に書けるよう、SW 側は
 * `firebase-messaging-sw.js` に同じロジックを inline 実装している (importScripts
 * 経由の shared module にすると build 側の設定が要るため duplicate で運用)。
 */

const DB_NAME = 'fcm-debug-log';
const STORE_NAME = 'entries';
const MAX_ENTRIES = 500;

/**
 * 診断コード修正のたびに手動で bump する。firebase-messaging-sw.js 側の DEBUG_LOG_VERSION と
 * 揃えて更新。ログの各行に埋め込まれるので、共有されたログのバージョンが古い環境か新しい環境か
 * を確認しやすくする。
 */
export const DEBUG_LOG_VERSION = 'v06-cl-2026-08-01';

interface LogEntry {
  ts: number;
  version: string;
  tag: string;
  message: string;
  data: unknown;
}

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no idb'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch(err => {
    dbPromise = null;
    throw err;
  });
  return dbPromise;
};

const safeSerialize = (data: unknown): unknown => {
  if (data === undefined) return null;
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    return String(data);
  }
};

export const debugLog = async (tag: string, message: string, data?: unknown): Promise<void> => {
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const entry: LogEntry = {
      ts: Date.now(),
      version: DEBUG_LOG_VERSION,
      tag,
      message,
      data: safeSerialize(data),
    };
    store.add(entry);
    const countReq = store.count();
    countReq.onsuccess = () => {
      const excess = countReq.result - MAX_ENTRIES;
      if (excess <= 0) return;
      const cursorReq = store.openCursor();
      let remaining = excess;
      cursorReq.onsuccess = e => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (!cursor || remaining <= 0) return;
        cursor.delete();
        remaining -= 1;
        cursor.continue();
      };
    };
  } catch {
    // logger must not throw
  }
};

const formatEntry = (e: LogEntry): string => {
  const t = new Date(e.ts).toISOString();
  const data = e.data == null ? '' : ` | ${JSON.stringify(e.data)}`;
  const version = e.version ?? '?';
  return `[${t}] [${version}] [${e.tag}] ${e.message}${data}`;
};

export const readAllLogs = async (): Promise<string> => {
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return await new Promise<string>((resolve, reject) => {
      const entries: LogEntry[] = [];
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = e => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          entries.push(cursor.value as LogEntry);
          cursor.continue();
        } else {
          resolve(entries.map(formatEntry).join('\n'));
        }
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    });
  } catch {
    return '';
  }
};

export const clearAllLogs = async (): Promise<void> => {
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  } catch {
    // ignore
  }
};
