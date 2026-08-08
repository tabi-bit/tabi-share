import { useEffect } from 'react';
import { debugLog } from '@/lib/debugLogger';
import { subscribeForegroundMessages } from '@/lib/messaging';
import { getDisplayMode } from '@/lib/platform';

/**
 * フォアグラウンド (タブがアクティブ) で FCM メッセージを受け取った際に、
 * 自前で OS 通知を表示する。
 *
 * Firebase Web SDK はバックグラウンド (SW 経由) では payload.notification を見て OS 通知を
 * 自動表示するが、フォアグラウンドでは自動表示しない (page の onMessage に payload を渡すのみ)。
 * このフックは onMessage を受けて SW registration 経由で同等の OS 通知を出す。
 *
 * App.tsx で 1 回のみ呼び出すこと。
 */
export const useForegroundNotificationToast = () => {
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    subscribeForegroundMessages(async payload => {
      const { title, body, kind, tripId, urlId, blockId, icon } = payload;
      // FCM SW は可視クライアントが 1 つでもあると自分では表示せずページに postMessage する。
      // この行が残っていれば「SW ではなくページが表示した」と判別できる
      void debugLog('FCM', 'foreground message', {
        title,
        kind,
        displayMode: getDisplayMode(),
        visibility: document.visibilityState,
      });
      if (!title) return;
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

      const registration = await navigator.serviceWorker.getRegistration('/firebase-cloud-messaging-push-scope');
      if (!registration) return;

      const focusParam = blockId ? `?focusBlock=${blockId}` : '';
      // tag / renotify / badge は docs §5b / §5。renotify は lib.dom.d.ts に無い拡張なので型を拡張。
      // tag prefix は kind に追従: test 送信は test-{tripId} で本運用 trip-{tripId} と分離。
      const tag = tripId ? `${kind === 'test' ? 'test' : 'trip'}-${tripId}` : undefined;
      const options: NotificationOptions & { renotify?: boolean } = {
        body,
        icon,
        badge: '/icons/notify/badge.png',
        data: { kind, tripId, urlId, blockId, link: urlId ? `/trip/${urlId}${focusParam}` : undefined },
        tag,
        renotify: Boolean(tag),
      };
      await registration.showNotification(title, options);
    })
      .then(fn => {
        if (cancelled) fn();
        else unsubscribe = fn;
      })
      .catch(err => {
        // FCM Web Push 非対応環境 / SW 登録失敗等。実害は「フォアグラウンド通知が出ない」だけなので握りつぶす
        console.warn('Failed to subscribe foreground FCM messages:', err);
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);
};
