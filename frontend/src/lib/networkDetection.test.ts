import { createStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isOfflineAtom } from '@/atoms/network';
import { checkNetworkStatus, evaluateNetwork, RESUME_RETRY_DELAY_MS, thresholdManager } from './networkDetection';

const mockNavigatorOnLine = (value: boolean) => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(value);
};

const mockPerformanceNow = (values: number[]) => {
  const spy = vi.spyOn(performance, 'now');
  for (const v of values) {
    spy.mockReturnValueOnce(v);
  }
  return spy;
};

const mockFetchSuccess = (status = 200) => {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok', { status }));
};

const mockFetchFailure = () => {
  return vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network error'));
};

const mockFetchAbort = () => {
  return vi.spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('Aborted', 'AbortError'));
};

describe('checkNetworkStatus', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    thresholdManager.reset();
  });

  it('navigator.onLine === false → 即オフライン、fetch を呼ばない', async () => {
    mockNavigatorOnLine(false);
    const fetchSpy = mockFetchSuccess();

    const result = await checkNetworkStatus('http://localhost');

    expect(result).toEqual({ isOffline: true, reason: 'navigator-offline' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetch 成功 + RTT ≤ しきい値 → オンライン', async () => {
    mockNavigatorOnLine(true);
    mockFetchSuccess();
    mockPerformanceNow([100, 200]); // RTT = 100ms

    const result = await checkNetworkStatus('http://localhost');

    expect(result).toEqual({ isOffline: false, rtt: 100, reason: 'online' });
  });

  it('fetch 成功 + RTT > しきい値 → しきい値超過時点で即オフライン (rtt-exceeded)', async () => {
    vi.useFakeTimers();
    mockNavigatorOnLine(true);
    // fetchが返らない（しきい値タイマーが先に発火する）
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      new Promise(() => {
        // 永遠に解決しないPromise
      })
    );

    const resultPromise = checkNetworkStatus('http://localhost');
    await vi.advanceTimersByTimeAsync(5000);
    const result = await resultPromise;

    expect(result).toEqual({ isOffline: true, rtt: 5000, reason: 'rtt-exceeded' });
    vi.useRealTimers();
  });

  it('fetch ネットワークエラー → オフライン (fetch-failed)', async () => {
    mockNavigatorOnLine(true);
    mockFetchFailure();

    const result = await checkNetworkStatus('http://localhost');

    expect(result).toEqual({ isOffline: true, reason: 'fetch-failed' });
  });

  it('fetch AbortError → オフライン (fetch-failed)', async () => {
    mockNavigatorOnLine(true);
    mockFetchAbort();

    const result = await checkNetworkStatus('http://localhost');

    expect(result).toEqual({ isOffline: true, reason: 'fetch-failed' });
  });

  it('fetch 非200 → オフライン (fetch-failed)', async () => {
    mockNavigatorOnLine(true);
    mockFetchSuccess(500);
    mockPerformanceNow([0, 100]);

    const result = await checkNetworkStatus('http://localhost');

    expect(result).toEqual({ isOffline: true, rtt: 100, reason: 'fetch-failed' });
  });
});

describe('動的しきい値', () => {
  beforeEach(() => {
    thresholdManager.reset();
  });

  it('thresholdManager.relax() で 10000ms に緩和', () => {
    expect(thresholdManager.get()).toBe(5000);
    thresholdManager.relax();
    expect(thresholdManager.get()).toBe(10000);
  });

  it('thresholdManager.reset() で 5000ms にリセット', () => {
    thresholdManager.relax();
    thresholdManager.reset();
    expect(thresholdManager.get()).toBe(5000);
  });

  it('緩和後は しきい値10000ms なので fetch が先に返ればオンライン判定', async () => {
    mockNavigatorOnLine(true);
    mockFetchSuccess();
    mockPerformanceNow([0, 6000]);
    thresholdManager.relax();

    const result = await checkNetworkStatus('http://localhost');

    expect(result).toEqual({ isOffline: false, rtt: 6000, reason: 'online' });
  });
});

describe('evaluateNetwork', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    thresholdManager.reset();
  });

  it('オンライン時に isOfflineAtom を false に更新', async () => {
    mockNavigatorOnLine(true);
    mockFetchSuccess();
    mockPerformanceNow([0, 100]);

    const store = createStore();
    store.set(isOfflineAtom, true); // 初期値をオフラインに設定

    await evaluateNetwork(store);

    expect(store.get(isOfflineAtom)).toBe(false);
  });

  it('オフライン時に isOfflineAtom を true に更新', async () => {
    mockNavigatorOnLine(false);

    const store = createStore();
    store.set(isOfflineAtom, false);

    await evaluateNetwork(store);

    expect(store.get(isOfflineAtom)).toBe(true);
  });

  it('オフライン → オンライン復帰時に relaxThreshold を呼ぶ', async () => {
    mockNavigatorOnLine(true);
    mockFetchSuccess();
    mockPerformanceNow([0, 100]);

    const store = createStore();
    store.set(isOfflineAtom, true); // 以前オフラインだった

    await evaluateNetwork(store);

    expect(store.get(isOfflineAtom)).toBe(false);
    expect(thresholdManager.get()).toBe(10000); // 緩和されている
  });

  it('オンライン → オンライン時は relaxThreshold を呼ばない', async () => {
    mockNavigatorOnLine(true);
    mockFetchSuccess();
    mockPerformanceNow([0, 100]);

    const store = createStore();
    store.set(isOfflineAtom, false); // 以前からオンライン

    await evaluateNetwork(store);

    expect(store.get(isOfflineAtom)).toBe(false);
    expect(thresholdManager.get()).toBe(5000); // 変更なし
  });
});

describe('evaluateNetwork - タブ復帰時の誤検知対策 (allowRetry)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    thresholdManager.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allowRetry: 初回 rtt-exceeded でも再判定でオンラインなら誤オフライン判定しない', async () => {
    mockNavigatorOnLine(true);
    // 1回目: しきい値超過で返らない / 2回目: 即成功
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockReturnValueOnce(
      new Promise(() => {
        // 1回目は解決しない（しきい値タイマーが先に発火）
      })
    );
    fetchSpy.mockResolvedValueOnce(new Response('ok', { status: 200 }));
    // 2回目の RTT 計測用
    vi.spyOn(performance, 'now').mockReturnValue(0);

    const store = createStore();
    store.set(isOfflineAtom, false); // 以前はオンライン

    const promise = evaluateNetwork(store, { allowRetry: true });
    // 1回目の RTT しきい値(5000ms) 超過 → 待機(1500ms) → 2回目チェック
    await vi.advanceTimersByTimeAsync(5000 + 1500);
    await promise;

    expect(store.get(isOfflineAtom)).toBe(false); // 誤オフラインにならない
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('allowRetry: 再判定でも失敗すれば最終的にオフライン判定する', async () => {
    mockNavigatorOnLine(true);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network error'));

    const store = createStore();
    store.set(isOfflineAtom, false);

    const promise = evaluateNetwork(store, { allowRetry: true });
    await vi.advanceTimersByTimeAsync(RESUME_RETRY_DELAY_MS);
    await promise;

    expect(store.get(isOfflineAtom)).toBe(true);
  });

  it('allowRetry: 待機中に navigator.onLine が false になればオフライン確定', async () => {
    const onLineSpy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network error'));

    const store = createStore();
    store.set(isOfflineAtom, false);

    const promise = evaluateNetwork(store, { allowRetry: true });
    // 待機中にブラウザがオフライン確定
    onLineSpy.mockReturnValue(false);
    await vi.advanceTimersByTimeAsync(RESUME_RETRY_DELAY_MS);
    await promise;

    expect(store.get(isOfflineAtom)).toBe(true);
  });

  it('allowRetry: navigator-offline は再判定せず即オフライン', async () => {
    mockNavigatorOnLine(false);
    const fetchSpy = mockFetchSuccess();

    const store = createStore();
    store.set(isOfflineAtom, false);

    await evaluateNetwork(store, { allowRetry: true });

    expect(store.get(isOfflineAtom)).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('allowRetry: 以前オフラインだった場合は再判定しない（オフライン→オフライン）', async () => {
    mockNavigatorOnLine(true);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockRejectedValue(new TypeError('Network error'));

    const store = createStore();
    store.set(isOfflineAtom, true); // 以前からオフライン

    await evaluateNetwork(store, { allowRetry: true });

    expect(store.get(isOfflineAtom)).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // 再判定なし（1回のみ）
  });
});
