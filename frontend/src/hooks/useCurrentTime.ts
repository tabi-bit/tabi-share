import { useEffect, useState } from 'react';

interface UseCurrentTimeOptions {
  /** false の場合は tick を停止し、常に null を返す（非 today ページ等での無駄な再レンダー抑止用）。 */
  enabled?: boolean;
  /** tick 間隔 (ms)。デフォルト 60_000。 */
  intervalMs?: number;
}

/**
 * 現在時刻を返すフック。
 * - マウント時に取得
 * - `visibilitychange` でタブ復帰時に再取得（PWA でロック→復帰などを想定）
 * - `intervalMs` 間隔で再取得（デフォルト 60 秒）
 * - `enabled: false` の場合は購読も setState も行わず null を返す
 */
export const useCurrentTime = ({ enabled = true, intervalMs = 60_000 }: UseCurrentTimeOptions = {}): Date | null => {
  const [now, setNow] = useState<Date | null>(() => (enabled ? new Date() : null));

  useEffect(() => {
    if (!enabled) {
      setNow(null);
      return;
    }
    setNow(new Date());
    const update = () => setNow(new Date());
    const interval = setInterval(update, intervalMs);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') update();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, intervalMs]);

  return now;
};
