// biome-ignore-all lint/correctness/noUndeclaredVariables: firebase / importScripts は SW context の global
// biome-ignore-all lint/correctness/noUnusedFunctionParameters: onBackgroundMessage の signature は Firebase 規定

// notificationclick handler は Firebase SDK の import / init より前に登録する必要がある。
// Firebase Messaging SDK は内部で notificationclick リスナーを付け stopImmediatePropagation
// することがあり、後付けで addEventListener すると invocation されないケースがある。
// (`firebase-js-sdk/packages/messaging/src/listeners/sw-listeners.ts` の実装参照)

// Firebase Admin SDK の WebpushFCMOptions.link は data.FCM_MSG.fcmOptions.link に入る。
// フォアグラウンド通知 (useForegroundNotificationToast) の自前 showNotification 経由は data.link。
const extractDeepLink = notification => {
  const data = notification?.data ?? {};
  return data?.FCM_MSG?.fcmOptions?.link ?? data?.link ?? null;
};

// PWA / ブラウザ tab 両方 push 登録している端末で、ユーザが今触ってる方を選ぶための優先度。
const pickTargetClient = clientsList => {
  return (
    clientsList.find(c => c.focused) ?? clientsList.find(c => c.visibilityState === 'visible') ?? clientsList[0] ?? null
  );
};

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const link = extractDeepLink(event.notification);
  if (!link) return;

  // payload 経路経由の open-redirect を防ぐ (別 origin URL は捨てる)。
  let targetUrl;
  try {
    targetUrl = new URL(link, self.location.origin);
  } catch {
    return;
  }
  if (targetUrl.origin !== self.location.origin) return;

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const target = pickTargetClient(clientsList);

      if (target) {
        // WindowClient.navigate() を使うとフルリロードで atom / SWR / scroll 位置が飛ぶので、
        // 代わりに client 側で React Router の navigate を呼んでもらう。
        target.postMessage({ type: 'FCM_NAVIGATE', url: targetUrl.href });
        try {
          await target.focus();
        } catch {
          // focus はユーザ操作起源でないと reject されるが、postMessage は届いてるので許容
        }
        return;
      }

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
