import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 639px)';

/**
 * Tailwind の `sm` ブレイクポイント (640px) 未満を「モバイル」と判定する hook。
 * `sm:` 起点のレスポンシブ規約に揃える。SSR/初回 render では false を返す。
 */
export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const update = () => {
      setIsMobile(mql.matches);
    };
    update();
    mql.addEventListener('change', update);
    return () => {
      mql.removeEventListener('change', update);
    };
  }, []);

  return isMobile;
};
