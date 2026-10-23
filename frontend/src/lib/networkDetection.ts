import type { createStore } from 'jotai';
import { isOfflineAtom } from '@/atoms/network';

// --- 定数 ---

const HEALTH_CHECK_PATH = '/health';
// デバッグ用: URLに ?networkDelay=6 を付けるとヘルスチェックに遅延(秒)を追加
const DEBUG_DELAY_PARAM =
  import.meta.env.VITE_APP_ENV !== 'production'
    ? new URLSearchParams(window.location.search).get('networkDelay')
    : null;
const INITIAL_RTT_THRESHOLD_MS = 5000;
const RELAXED_RTT_THRESHOLD_MS = 10000;
// タブ復帰・再接続直後はモバイル無線の再接続遅延で初回ヘルスチェックが失敗しやすい。
// 一度だけ待ってから緩和しきい値で再判定するための待機時間。
export const RESUME_RETRY_DELAY_MS = 1500;

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// --- 型 ---

export type NetworkCheckResult = {
  isOffline: boolean;
  rtt?: number;
  reason: 'navigator-offline' | 'fetch-failed' | 'rtt-exceeded' | 'online';
};

// --- 動的しきい値管理 ---

export const thresholdManager = (() => {
  let currentMs = INITIAL_RTT_THRESHOLD_MS;
  return {
    get: (): number => currentMs,
    relax: (): void => {
      currentMs = RELAXED_RTT_THRESHOLD_MS;
    },
    reset: (): void => {
      currentMs = INITIAL_RTT_THRESHOLD_MS;
    },
    isExceeded: (rtt: number): boolean => rtt > currentMs,
  };
})();

// --- 2段階判定ロジック ---

export const checkNetworkStatus = async (
  baseUrl: string = import.meta.env.VITE_API_BASE_URL ?? '',
  thresholdMs?: number
): Promise<NetworkCheckResult> => {
  // Step 1: navigator.onLine チェック
  if (!navigator.onLine) {
    return { isOffline: true, reason: 'navigator-offline' };
  }

  // Step 2: fetch と RTTしきい値タイマーを Promise.race で競わせる
  const controller = new AbortController();
  const rttThresholdMs = thresholdMs ?? thresholdManager.get();
  const start = performance.now();

  const healthUrl = DEBUG_DELAY_PARAM
    ? `${baseUrl}${HEALTH_CHECK_PATH}?delay=${DEBUG_DELAY_PARAM}`
    : `${baseUrl}${HEALTH_CHECK_PATH}`;

  const fetchPromise = fetch(healthUrl, {
    cache: 'no-store',
    signal: controller.signal,
  })
    .then((response): NetworkCheckResult => {
      const rtt = performance.now() - start;
      if (!response.ok) {
        return { isOffline: true, rtt, reason: 'fetch-failed' };
      }
      return { isOffline: false, rtt, reason: 'online' };
    })
    .catch((): NetworkCheckResult => {
      return { isOffline: true, reason: 'fetch-failed' };
    });

  let rttTimer: ReturnType<typeof setTimeout> | undefined;
  const rttExceededPromise = new Promise<NetworkCheckResult>(resolve => {
    rttTimer = setTimeout(() => {
      resolve({ isOffline: true, rtt: rttThresholdMs, reason: 'rtt-exceeded' });
    }, rttThresholdMs);
  });

  const result = await Promise.race([fetchPromise, rttExceededPromise]);
  clearTimeout(rttTimer);

  if (result.isOffline) {
    controller.abort();
  }

  return result;
};

// --- atom 更新 ---

export type EvaluateNetworkOptions = {
  /**
   * タブ復帰(visibilitychange)・再接続(online)など、ネットワークが不安定に
   * なりやすいタイミングで true にする。オンライン→オフラインへ反転しそうな
   * 場合に、緩和しきい値で1度だけ再判定してから確定させ、誤検知を防ぐ。
   */
  allowRetry?: boolean;
};

export const evaluateNetwork = async (
  store: ReturnType<typeof createStore>,
  options: EvaluateNetworkOptions = {}
): Promise<void> => {
  const wasPreviouslyOffline = store.get(isOfflineAtom);
  let result = await checkNetworkStatus();

  // タブ復帰・再接続時の誤検知対策:
  // それまでオンラインだったのに navigator.onLine は true のままヘルスチェックだけ
  // 失敗した場合(モバイル無線の復帰遅延など)、少し待ってから緩和しきい値で再判定する。
  // navigator-offline はブラウザ確定のオフラインなので再判定しない。
  if (options.allowRetry && !wasPreviouslyOffline && result.isOffline && result.reason !== 'navigator-offline') {
    await delay(RESUME_RETRY_DELAY_MS);
    result = navigator.onLine
      ? await checkNetworkStatus(undefined, RELAXED_RTT_THRESHOLD_MS)
      : { isOffline: true, reason: 'navigator-offline' };
  }

  const changed = wasPreviouslyOffline !== result.isOffline;
  if (changed) {
    const label = result.isOffline ? '🔴 OFFLINE' : '🟢 ONLINE';
    console.log(
      `[Network] ${label} (reason: ${result.reason}${result.rtt != null ? `, rtt: ${Math.round(result.rtt)}ms` : ''})`
    );
  }

  store.set(isOfflineAtom, result.isOffline);

  // オフライン → オンライン復帰時にしきい値を緩和（フラッピング防止）
  if (wasPreviouslyOffline && !result.isOffline) {
    thresholdManager.relax();
  }
};
