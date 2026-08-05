import { useEffect } from 'react';
import { subscribeForegroundMessages } from '@/lib/messaging';

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
      const { title, body, tripId, urlId, blockId, icon } = payload;
      if (!title) return;
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

      const registration = await navigator.serviceWorker.getRegistration('/firebase-cloud-messaging-push-scope');
      if (!registration) return;

      const focusParam = blockId ? `?focusBlock=${blockId}` : '';
      // tag は同一 trip の旧通知を置換する rolling next indicator。
      // backend の WebpushNotification.tag と一致させる (docs/notifications.md §5b)。
      // renotify: true は置換時に vibrate/sound を再アラート (iOS では best-effort)。
      // renotify は lib.dom.d.ts の NotificationOptions に含まれない (Chrome/Android で有効な拡張) ため、
      // 型を拡張してキャストする。
      // badge は Firebase Web SDK が payload に載せてこないので frontend で hardcode
      // (全通知共通の紙飛行機シルエット、docs/notifications.md §5)。icon は payload 由来。
      // tag と renotify の判定条件を Boolean(tripId) に揃える。tripId='' の場合、tag は
      // undefined になるが `renotify: tripId !== undefined` だと true になり、Web 仕様上
      // tag なし + renotify=true は showNotification が TypeError で reject する。
      const options: NotificationOptions & { renotify?: boolean } = {
        body,
        icon,
        badge: '/icons/notify/badge.png',
        data: { tripId, urlId, blockId, link: urlId ? `/trip/${urlId}${focusParam}` : undefined },
        tag: tripId ? `trip-${tripId}` : undefined,
        renotify: Boolean(tripId),
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
