// biome-ignore-all lint/correctness/noUndeclaredVariables: firebase / importScripts は SW context の global
// biome-ignore-all lint/correctness/noUnusedFunctionParameters: onBackgroundMessage の signature は Firebase 規定

// notificationclick handler は Firebase SDK の import / init より前に登録する。
// Firebase Messaging SDK は内部で notificationclick リスナーを付け stopImmediatePropagation する
// ことがあるため、後付けだと invocation されないケースがある。

// --- 診断ロガー (client 側 lib/debugLogger.ts と同じ DB / store に書く) ---
// SW は importScripts で compat SDK を読む都合 ES module import が使えないため、client 側と
// 同じロジックを duplicate して持つ (詳細は docs/debug_logger.md)。
// __BUILD_ID__ は vite.config.ts の stampServiceWorkerBuildId が build / dev 配信時に置換する。
// ログ各行に埋め込まれるので、client 側の行と値がズレていれば古い SW が動いたままだと判る。
const DEBUG_LOG_VERSION = '__BUILD_ID__';
const DEBUG_DB = 'app-debug-log';
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
  } catch {
    // logger must not throw
  }
};

// SW script が evaluate されたタイミングを残す (SW 更新が実機に届いたかの判定に使う)。
void debugLog('SW', 'sw script evaluated');

// SW default lifecycle だと install → waiting、既存 client が全部閉じるまで activate されない。
// FCM SW は root scope 外なので待たせるとユーザ操作なしに切替できず更新が届かない。
self.addEventListener('install', event => {
  void debugLog('SW', 'install (skipWaiting)');
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', event => {
  void debugLog('SW', 'activate (clients.claim)');
  event.waitUntil(self.clients.claim());
});

// Firebase Admin SDK の WebpushFCMOptions(link=...) は SDK 12.x で
// data.FCM_MSG.notification.click_action に写される (fcmOptions.link ではない)。
// data.link はフォアグラウンド通知 (useForegroundNotificationToast) の自前 showNotification 経由。
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

self.addEventListener('notificationclick', event => {
  event.notification.close();
  void debugLog('SW', 'notificationclick', { data: event.notification.data });

  const link = extractDeepLink(event.notification);
  if (!link) {
    void debugLog('SW', 'no link extracted');
    return;
  }

  // payload 経路経由の open-redirect を防ぐ (別 origin URL は捨てる)。
  let targetUrl;
  try {
    targetUrl = new URL(link, self.location.origin);
  } catch (err) {
    void debugLog('SW', 'URL parse fail', { link, err: String(err) });
    return;
  }
  if (targetUrl.origin !== self.location.origin) {
    void debugLog('SW', 'origin mismatch', { target: targetUrl.origin, self: self.location.origin });
    return;
  }

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const target = pickTargetClient(clientsList);
      void debugLog('SW', 'target picked', { n: clientsList.length, url: target ? target.url : null });

      if (target) {
        // WindowClient.navigate() を使うとフルリロードで atom / SWR / scroll 位置が飛ぶので、
        // 代わりに client 側で React Router の navigate を呼んでもらう。
        target.postMessage({ type: 'FCM_NAVIGATE', url: targetUrl.href });
        try {
          await target.focus();
        } catch (err) {
          // focus はユーザ操作起源でないと reject されるが postMessage は届いてるので許容
          void debugLog('SW', 'focus fail', { err: String(err) });
        }
        return;
      }

      // task-killed 状態など matchAll が 0 件のときは openWindow が唯一の起動経路。
      // Chrome は URL を尊重して PWA を起動 (実機で verify 済み)。
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
