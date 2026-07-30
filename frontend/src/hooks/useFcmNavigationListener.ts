import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * firebase-messaging-sw.js の notificationclick が postMessage する
 * `{ type: 'FCM_NAVIGATE', url }` を受けて React Router で navigate する。
 * App.tsx で 1 回のみ呼ぶ (Router の内側必須)。
 */
export const useFcmNavigationListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 参照を effect スコープに固定: cleanup 時に navigator.serviceWorker が消えていても
    // (テスト環境で差し替えると起こる) removeEventListener で crash させない。
    const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined;
    if (!sw) return;

    const handler = (event: MessageEvent) => {
      if (event.data?.type !== 'FCM_NAVIGATE') return;
      const rawUrl = event.data.url;
      if (typeof rawUrl !== 'string') return;

      let parsed: URL;
      try {
        parsed = new URL(rawUrl, window.location.origin);
      } catch {
        return;
      }
      // SW 側でも弾いているが、payload 経路の open-redirect 対策として二重防御。
      if (parsed.origin !== window.location.origin) return;

      navigate(`${parsed.pathname}${parsed.search}${parsed.hash}`);
    };

    sw.addEventListener('message', handler);
    return () => {
      sw.removeEventListener('message', handler);
    };
  }, [navigate]);
};
