import { useAtomValue } from 'jotai';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { isOfflineReadAtom } from '@/atoms/network';

/**
 * オンライン/オフライン変化時にtoast通知を表示するフック
 * App.tsxで1回のみ呼び出すこと
 */
export const useNetworkToast = () => {
  const isOffline = useAtomValue(isOfflineReadAtom);
  const isFirstRender = useRef(true);
  const prevIsOffline = useRef(isOffline);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevIsOffline.current = isOffline;
      return;
    }

    if (prevIsOffline.current === isOffline) return;

    if (isOffline) {
      toast.warning('オフラインモードになりました');
    } else {
      toast.success('オンラインに復帰しました');
    }

    prevIsOffline.current = isOffline;
  }, [isOffline]);
};
