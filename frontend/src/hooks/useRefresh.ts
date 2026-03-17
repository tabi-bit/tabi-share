import { useState } from 'react';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
import { isOfflineAtom } from '@/atoms/network';
import { evaluateNetwork } from '@/lib/networkDetection';
import { appStore } from '@/lib/store';

export type UseRefreshReturn = {
  isRefreshing: boolean;
  refresh: () => Promise<void>;
};

/**
 * ネットワーク状態に応じたリフレッシュフック
 * - オフライン時: evaluateNetworkで再接続を試行
 * - オンライン時: SWR全キャッシュを再検証
 */
export const useRefresh = (): UseRefreshReturn => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { mutate } = useSWRConfig();

  const refresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const isOffline = appStore.get(isOfflineAtom);
      if (isOffline) {
        await evaluateNetwork(appStore);
        const stillOffline = appStore.get(isOfflineAtom);
        if (stillOffline) {
          toast.error('再接続できませんでした');
          return;
        }
      }
      await mutate(() => true);
      toast.success('データを再取得しました');
    } finally {
      setIsRefreshing(false);
    }
  };

  return { isRefreshing, refresh };
};
