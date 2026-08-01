// biome-ignore-all lint/correctness/noUndeclaredVariables: firebase / importScripts は SW context の global
// biome-ignore-all lint/correctness/noUnusedFunctionParameters: onBackgroundMessage の signature は Firebase 規定

// notificationclick handler は Firebase SDK の import / init より前に登録する必要がある。
// Firebase Messaging SDK は内部で notificationclick リスナーを付け stopImmediatePropagation
// することがあり、後付けで addEventListener すると invocation されないケースがある。
// (`firebase-js-sdk/packages/messaging/src/listeners/sw-listeners.ts` の実装参照)

// --- 診断ロガー (client 側 lib/debugLogger.ts と同じ DB / store) ---
// Android PWA から console を取れない環境向け。SW から IndexedDB に書いて client 側で
// 読み出す。運用機能ではないので消しても実装挙動には影響しない。
// DEBUG_LOG_VERSION は診断コード修正のたびに手動で bump する。client 側 debugLogger.ts の
// DEBUG_LOG_VERSION と対で更新。ログ各行に埋め込まれるので、実機で古い SW が動いているのか
// 新しい SW が動いているのかを共有ログから判別できる (SW 更新は非同期でユーザ操作依存なため)。
const DEBUG_LOG_VERSION = 'v09-sw-2026-08-01';
const DEBUG_DB = 'fcm-debug-log';
const DEBUG_STORE = 'entries';
const DEBUG_MAX = 500;
const openDebugDb = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DEBUG_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DEBUG_STORE)) {
        db.createObjectStore(DEBUG_STORE, { autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
const debugLog = async (tag, message, data) => {
  try {
    const db = await openDebugDb();
    const tx = db.transaction(DEBUG_STORE, 'readwrite');
    const store = tx.objectStore(DEBUG_STORE);
    const safeData = data === undefined ? null : JSON.parse(JSON.stringify(data));
    store.add({ ts: Date.now(), version: DEBUG_LOG_VERSION, tag, message, data: safeData });
    const countReq = store.count();
    countReq.onsuccess = () => {
      const excess = countReq.result - DEBUG_MAX;
      if (excess <= 0) return;
      const cursorReq = store.openCursor();
      let remaining = excess;
      cursorReq.onsuccess = e => {
        const cursor = e.target.result;
        if (!cursor || remaining <= 0) return;
        cursor.delete();
        remaining -= 1;
        cursor.continue();
      };
    };
  } catch (_) {
    // logger must not throw
  }
};

// SW script が evaluate されたタイミングを残す。SW 更新のタイミング把握用。
void debugLog('SW', 'sw script evaluated');

// 新版 SW の active 待ち (デフォルト挙動) だと既存 tab が全部閉じるまで古い SW が動き続ける。
// notificationclick handler / extractDeepLink の修正が実機に届かないケースが観測されたため
// install → skipWaiting、activate → clients.claim で強制的に即切替させる。
self.addEventListener('install', event => {
  void debugLog('SW', 'install (skipWaiting)');
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', event => {
  void debugLog('SW', 'activate (clients.claim)');
  event.waitUntil(self.clients.claim());
});
// [Round 1 削減] SKIP_WAITING message handler は client 側の
// registration.update() 経路と対で削除。install → skipWaiting のデフォルトルートのみで
// 更新が成立するか検証する。

// FCM payload に載る deep link の位置は複数の可能性がある:
// - `data.FCM_MSG.notification.click_action`: Firebase Admin SDK で WebpushFCMOptions(link=...) を
//   指定した場合、SDK 12.x が実 payload に写す形。実機ログで確認済で **これが primary**
// - `data.FCM_MSG.fcmOptions.link`: SDK バージョンや Admin SDK 経路によってはこちらに入るとの
//   資料あり (残しておく安全策)
// - `data.link`: フォアグラウンド通知 (useForegroundNotificationToast) の自前 showNotification 経由
const extractDeepLink = notification => {
  const data = notification?.data ?? {};
  const fcm = data?.FCM_MSG;
  return fcm?.notification?.click_action ?? fcm?.fcmOptions?.link ?? data?.link ?? null;
};

// PWA / ブラウザ tab 両方 push 登録している端末で、ユーザが今触ってる方を選ぶための優先度。
const pickTargetClient = clientsList => {
  return (
    clientsList.find(c => c.focused) ?? clientsList.find(c => c.visibilityState === 'visible') ?? clientsList[0] ?? null
  );
};

// [Round 1 削減] Cache Storage safety net (storePendingIntent) と client 側 applyIntent 経路を削除。
// SW 更新問題 (真の原因) が解決した今、postMessage + focus + openWindow fallback だけで十分か検証する。

self.addEventListener('notificationclick', event => {
  event.notification.close();
  void debugLog('SW', 'notificationclick', { data: event.notification.data });

  const link = extractDeepLink(event.notification);
  void debugLog('SW', 'link extracted', { link });
  if (!link) return;

  // payload 経路経由の open-redirect を防ぐ (別 origin URL は捨てる)。
  let targetUrl;
  try {
    targetUrl = new URL(link, self.location.origin);
  } catch (err) {
    void debugLog('SW', 'URL parse fail', { err: String(err) });
    return;
  }
  if (targetUrl.origin !== self.location.origin) {
    void debugLog('SW', 'origin mismatch', { target: targetUrl.origin, self: self.location.origin });
    return;
  }

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      void debugLog('SW', 'matchAll', {
        n: clientsList.length,
        clients: clientsList.map(c => ({ url: c.url, focused: c.focused, vis: c.visibilityState })),
      });
      const target = pickTargetClient(clientsList);
      void debugLog('SW', 'target picked', { url: target ? target.url : null });

      if (target) {
        // WindowClient.navigate() を使うとフルリロードで atom / SWR / scroll 位置が飛ぶので、
        // 代わりに client 側で React Router の navigate を呼んでもらう。
        target.postMessage({ type: 'FCM_NAVIGATE', url: targetUrl.href });
        void debugLog('SW', 'postMessage sent', { url: targetUrl.href });
        try {
          await target.focus();
          void debugLog('SW', 'focus ok');
        } catch (err) {
          // focus はユーザ操作起源でないと reject されるが、postMessage は届いてるので許容
          void debugLog('SW', 'focus fail', { err: String(err) });
        }
        return;
      }

      void debugLog('SW', 'openWindow fallback', { url: targetUrl.href });
      await self.clients.openWindow(targetUrl.href);
    })()
  );
});

importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js');

// SDK バージョンは package.json の firebase と揃えて更新すること。
// Firebase Web SDK config は公開情報のためハードコード (全環境で同一プロジェクト共用)。
firebase.initializeApp({
  apiKey: 'AIzaSyBCXP11xRioE8cT8z_Uz-sBE6Rae5qO0zY',
  authDomain: 'tabi-share-8ef6b.firebaseapp.com',
  projectId: 'tabi-share-8ef6b',
  storageBucket: 'tabi-share-8ef6b.firebasestorage.app',
  messagingSenderId: '398057900448',
  appId: '1:398057900448:web:8236ebc8ad1849b59c3cc5',
});

// payload.notification が入っていれば Firebase が OS 通知を自動表示する。ここでは追加処理なし。
firebase.messaging().onBackgroundMessage(_payload => {
  // no-op
});
