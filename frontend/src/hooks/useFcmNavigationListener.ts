import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * firebase-messaging-sw.js の notificationclick が伝えてくる遷移先 URL を受けて
 * React Router で navigate する。App.tsx で 1 回のみ呼ぶ (Router の内側必須)。
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

// FCM SW は root scope 外なので navigation 由来の update check が発火せず、register() の
// byte-diff check も起動 1 回のみ (promise cache のため)。明示 update() が唯一の SW 更新経路。
// PWA セッション中に 1 回だけ呼ぶよう module-level flag で dedupe する。
let fcmSwUpdateTriggered = false;

const promoteFcmSwUpdate = async (sw: ServiceWorkerContainer): Promise<void> => {
  if (fcmSwUpdateTriggered) return;
  fcmSwUpdateTriggered = true;
  try {
    const reg = await sw.getRegistration('/firebase-cloud-messaging-push-scope');
    await reg?.update();
  } catch {
    // best effort
  }
};

export const useFcmNavigationListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 参照を effect スコープに固定: cleanup 時に navigator.serviceWorker が消えていても
    // (テスト環境で差し替えると起こる) removeEventListener で crash させない。
    const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined;

    const handler = (event: MessageEvent) => {
      if (event.data?.type !== 'FCM_NAVIGATE') return;
      const rawUrl = event.data.url;
      if (typeof rawUrl !== 'string') return;
      const target = parseSameOriginPath(rawUrl);
      if (!target) return;
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (target === current) return;
      navigate(target);
    };

    sw?.addEventListener('message', handler);
    if (sw) void promoteFcmSwUpdate(sw);

    return () => {
      sw?.removeEventListener('message', handler);
    };
  }, [navigate]);
};
