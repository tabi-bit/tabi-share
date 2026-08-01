import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEBUG_LOG_VERSION, debugLog } from '@/lib/debugLogger';

/**
 * firebase-messaging-sw.js の notificationclick が伝えてくる遷移先 URL を受けて
 * React Router で navigate する。
 * App.tsx で 1 回のみ呼ぶ (Router の内側必須)。
 *
 * [Round 2] Round 1 では registration.update() まで削除して壊れた
 * (実機で FCM SW が更新されず古い版が残り続けた)。
 * FCM SW は root scope 外で navigation 由来の update check が起きず、register() の
 * byte-diff check も初回 1 回のみのため、明示 update() が唯一の SW 更新経路になる。
 * Cache Storage safety net と dedupe は Round 2 段階でもまだ削除継続。
 */

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

// PWA セッション中 1 回だけ SW 更新を promote する。App の unmount/remount で hook が
// 何度も走っても update() は 1 回に絞る。
let fcmSwUpdateTriggered = false;

const promoteFcmSwUpdate = async (sw: ServiceWorkerContainer): Promise<void> => {
  if (fcmSwUpdateTriggered) return;
  fcmSwUpdateTriggered = true;
  try {
    const reg = await sw.getRegistration('/firebase-cloud-messaging-push-scope');
    if (!reg) {
      void debugLog('CL', 'fcm registration not found');
      return;
    }
    await reg.update();
    void debugLog('CL', 'fcm update() done', {
      activeUrl: reg.active?.scriptURL ?? null,
      waitingUrl: reg.waiting?.scriptURL ?? null,
      installingUrl: reg.installing?.scriptURL ?? null,
    });
  } catch (err) {
    void debugLog('CL', 'fcm update fail', { err: String(err) });
  }
};

export const useFcmNavigationListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
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
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (target === current) {
        void debugLog('CL', 'navigate skip (== current)', { target });
        return;
      }
      void debugLog('CL', 'navigate() called', { target });
      navigate(target);
    };

    sw?.addEventListener('message', handler);
    void debugLog('CL', 'listener mounted', {
      hasSw: !!sw,
      swControllerUrl: sw?.controller?.scriptURL ?? null,
      currentUrl: window.location.href,
      clientVersion: DEBUG_LOG_VERSION,
    });
    if (sw) void promoteFcmSwUpdate(sw);

    return () => {
      sw?.removeEventListener('message', handler);
    };
  }, [navigate]);
};
