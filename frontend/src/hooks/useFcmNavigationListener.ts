import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEBUG_LOG_VERSION, debugLog } from '@/lib/debugLogger';

/**
 * firebase-messaging-sw.js の notificationclick が伝えてくる遷移先 URL を受けて
 * React Router で navigate する。
 * App.tsx で 1 回のみ呼ぶ (Router の内側必須)。
 *
 * [Round 1 の削減版] postMessage 経路のみ。
 * 元は Cache Storage safety net / dedupe / registration.update() 経路も持っていたが、
 * SW 更新問題が根本 fix された今、safety net が本当に必要か検証する削減。
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

    return () => {
      sw?.removeEventListener('message', handler);
    };
  }, [navigate]);
};
