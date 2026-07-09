import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCurrentTime } from './useCurrentTime';

describe('useCurrentTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-09T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('マウント時に現在時刻を返す', () => {
    const { result } = renderHook(() => useCurrentTime());
    expect(result.current?.toISOString()).toBe(new Date('2026-07-09T10:00:00').toISOString());
  });

  it('interval 経過ごとに時刻が更新される', () => {
    const { result } = renderHook(() => useCurrentTime({ intervalMs: 60_000 }));
    const initial = result.current!.getTime();

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current!.getTime()).toBe(initial + 60_000);
  });

  it('visibilitychange で visible になった時に時刻が更新される', () => {
    const { result } = renderHook(() => useCurrentTime());
    const initial = result.current!.getTime();

    act(() => {
      vi.advanceTimersByTime(5 * 60_000);
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current!.getTime()).toBeGreaterThanOrEqual(initial + 5 * 60_000);
  });

  it('アンマウント時に interval と listener がクリーンアップされる', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    const removeListenerSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() => useCurrentTime());
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(removeListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('enabled=false のとき null を返し interval を設定しない', () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval');

    const { result } = renderHook(() => useCurrentTime({ enabled: false }));

    expect(result.current).toBeNull();
    expect(setIntervalSpy).not.toHaveBeenCalled();
  });
});
