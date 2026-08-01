import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEBUG_LOG_VERSION, debugLog } from '@/lib/debugLogger';

/**
 * firebase-messaging-sw.js の notificationclick が伝えてくる遷移先 URL を受けて
 * React Router で navigate する。
 * App.tsx で 1 回のみ呼ぶ (Router の内側必須)。
 *
 * 経路は 2 系統:
 * - fast path: SW からの postMessage `{ type: 'FCM_NAVIGATE', url }` を message event で受ける
 * - safety net: SW が Cache Storage (INTENT_CACHE / INTENT_KEY) に書き残した URL を
 *   mount + visibilitychange のたびに読む。PWA が Android にキルされて postMessage が
 *   届かないケース / cold start で listener 未登録のケースを両方救う
 *
 * 両方の経路が同じ URL に対して発火するので、直近の遷移 URL を ref に持たせて重複 navigate を防ぐ。
 */

const INTENT_CACHE = 'fcm-nav-intent-v1';
const INTENT_KEY_PATH = '/__fcm_pending_nav__';

const intentKeyUrl = () => new URL(INTENT_KEY_PATH, window.location.origin).href;

const openIntentCache = async (): Promise<Cache | null> => {
  if (typeof caches === 'undefined') return null;
  try {
    return await caches.open(INTENT_CACHE);
  } catch {
    return null;
  }
};

const readAndClearPendingIntent = async (): Promise<string | null> => {
  const cache = await openIntentCache();
  if (!cache) return null;
  const key = intentKeyUrl();
  try {
    const res = await cache.match(key);
    if (!res) return null;
    const url = await res.text();
    await cache.delete(key);
    return url;
  } catch {
    return null;
  }
};

const clearPendingIntent = async (): Promise<void> => {
  const cache = await openIntentCache();
  if (!cache) return;
  try {
    await cache.delete(intentKeyUrl());
  } catch {
    // best effort
  }
};

const parseSameOriginPath = (rawUrl: string): string | null => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl, window.location.origin);
  } catch {
    return null;
  }
  if (parsed.origin !== window.location.origin) return null;
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
};

export const useFcmNavigationListener = () => {
  const navigate = useNavigate();
  // fast path (message) と safety net (cache) が同一 URL に対して二重発火するのを防ぐ。
  // 直近の遷移先を保持し、同値なら skip する。
  const lastNavigatedRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const navigateOnce = (target: string, source: string) => {
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (target === current) {
        void debugLog('CL', 'navigateOnce skip (== current)', { target, source });
        return;
      }
      if (lastNavigatedRef.current === target) {
        void debugLog('CL', 'navigateOnce skip (== last)', { target, source });
        return;
      }
      lastNavigatedRef.current = target;
      void debugLog('CL', 'navigate() called', { target, source });
      navigate(target);
    };

    const applyIntent = async () => {
      const url = await readAndClearPendingIntent();
      void debugLog('CL', 'applyIntent', { url });
      if (cancelled || !url) return;
      const target = parseSameOriginPath(url);
      if (!target) return;
      navigateOnce(target, 'intent');
    };

    // 参照を effect スコープに固定: cleanup 時に navigator.serviceWorker が消えていても
    // (テスト環境で差し替えると起こる) removeEventListener で crash させない。
    const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined;

    const handler = (event: MessageEvent) => {
      void debugLog('CL', 'sw message', { data: event.data });
      if (event.data?.type !== 'FCM_NAVIGATE') return;
      const rawUrl = event.data.url;
      if (typeof rawUrl !== 'string') return;
      const target = parseSameOriginPath(rawUrl);
      if (!target) return;
      // message 経由で消化するので safety net の Cache は掃除する (二重 navigate 防止)
      void clearPendingIntent();
      navigateOnce(target, 'message');
    };

    const onVisibility = () => {
      void debugLog('CL', 'visibilitychange', { state: document.visibilityState });
      if (document.visibilityState === 'visible') void applyIntent();
    };

    sw?.addEventListener('message', handler);
    document.addEventListener('visibilitychange', onVisibility);
    void debugLog('CL', 'listener mounted', {
      hasSw: !!sw,
      swControllerUrl: sw?.controller?.scriptURL ?? null,
      currentUrl: window.location.href,
      clientVersion: DEBUG_LOG_VERSION,
    });

    // FCM SW は root scope に居ないので navigation では update check されず、
    // register() は起動時 1 回のみ (lib/messaging.ts の promise cache のため)。
    // 明示的に update() を叩いて Chrome に新 SW の byte-diff check を促し、
    // waiting になった SW があれば SKIP_WAITING message で即 activate に持ち込む。
    void (async () => {
      if (!sw) return;
      try {
        const reg = await sw.getRegistration('/firebase-cloud-messaging-push-scope');
        if (!reg) {
          void debugLog('CL', 'fcm registration not found');
          return;
        }
        reg.addEventListener('updatefound', () => {
          const newSw = reg.installing;
          void debugLog('CL', 'fcm updatefound', { installingUrl: newSw?.scriptURL ?? null });
          newSw?.addEventListener('statechange', () => {
            void debugLog('CL', 'fcm new sw statechange', { state: newSw.state });
            if (newSw.state === 'installed' && reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
              void debugLog('CL', 'sent SKIP_WAITING (post-install)');
            }
          });
        });
        await reg.update();
        void debugLog('CL', 'fcm update() done', {
          activeUrl: reg.active?.scriptURL ?? null,
          waitingUrl: reg.waiting?.scriptURL ?? null,
          installingUrl: reg.installing?.scriptURL ?? null,
        });
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          void debugLog('CL', 'sent SKIP_WAITING (existing waiting)');
        }
      } catch (err) {
        void debugLog('CL', 'fcm update fail', { err: String(err) });
      }
    })();
    // 全 SW registration の state を吐き出す。root scope (VitePWA) と
    // /firebase-cloud-messaging-push-scope (FCM) の new/waiting/active を可視化して、
    // 古い FCM SW が waiting のまま残ってないか確認する。
    void (async () => {
      if (!sw) return;
      try {
        const regs = await sw.getRegistrations();
        void debugLog('CL', 'registrations', {
          registrations: regs.map(r => ({
            scope: r.scope,
            active: r.active?.scriptURL ?? null,
            waiting: r.waiting?.scriptURL ?? null,
            installing: r.installing?.scriptURL ?? null,
          })),
        });
      } catch (err) {
        void debugLog('CL', 'getRegistrations fail', { err: String(err) });
      }
    })();
    void applyIntent();

    return () => {
      cancelled = true;
      sw?.removeEventListener('message', handler);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [navigate]);
};
