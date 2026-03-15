import { type FC, type ReactNode, useEffect, useState } from 'react';
import { SWRConfig } from 'swr';
import { runCacheCleanup } from '@/lib/swrCacheCleanup';
import { createSwrCacheProvider } from '@/lib/swrCacheProvider';

const { provider, hydratePromise } = createSwrCacheProvider();

/** SWRのカスタムキャッシュプロバイダでアプリをラップする */
export const SWRProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    hydratePromise.then(() => {
      setIsHydrated(true);
      runCacheCleanup().catch(() => {
        // fire-and-forget
      });
    });
  }, []);

  if (!isHydrated) return null;

  return <SWRConfig value={{ provider }}>{children}</SWRConfig>;
};
