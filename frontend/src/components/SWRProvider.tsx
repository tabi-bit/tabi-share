import { useAtomValue } from 'jotai';
import { type FC, type ReactNode, useEffect, useRef, useState } from 'react';
import { SWRConfig, useSWRConfig } from 'swr';
import { isOfflineReadAtom } from '@/atoms/network';
import { runCacheCleanup } from '@/lib/swrCacheCleanup';
import { createSwrCacheProvider } from '@/lib/swrCacheProvider';

const { provider, hydratePromise } = createSwrCacheProvider();

/** オフライン→オンライン遷移時に全SWRキャッシュを再検証する */
const SWROnlineRecovery: FC<{ isOffline: boolean }> = ({ isOffline }) => {
  const { mutate } = useSWRConfig();
  const prevOfflineRef = useRef(isOffline);

  useEffect(() => {
    if (prevOfflineRef.current && !isOffline) {
      mutate(() => true);
    }
    prevOfflineRef.current = isOffline;
  }, [isOffline, mutate]);

  return null;
};

/** SWRのカスタムキャッシュプロバイダでアプリをラップする */
export const SWRProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const isOffline = useAtomValue(isOfflineReadAtom);

  useEffect(() => {
    hydratePromise.then(() => {
      setIsHydrated(true);
      runCacheCleanup().catch(() => {
        // fire-and-forget
      });
    });
  }, []);

  if (!isHydrated) return null;

  return (
    <SWRConfig
      value={{
        provider,
        revalidateOnFocus: !isOffline,
        revalidateIfStale: !isOffline,
        revalidateOnReconnect: !isOffline,
        revalidateOnMount: isOffline ? false : undefined,
        onErrorRetry: isOffline
          ? () => {
              /* オフライン時はリトライしない */
            }
          : undefined,
      }}
    >
      <SWROnlineRecovery isOffline={isOffline} />
      {children}
    </SWRConfig>
  );
};
