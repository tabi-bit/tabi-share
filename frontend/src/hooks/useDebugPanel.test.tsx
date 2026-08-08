import { act, renderHook } from '@testing-library/react';
import { createStore, Provider as JotaiProvider } from 'jotai';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebugPanel, useDebugTapGesture } from '@/hooks/useDebugPanel';

const { mockToast } = vi.hoisted(() => ({ mockToast: Object.assign(vi.fn(), { success: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: mockToast }));

const STORAGE_KEY = '__app_debug_panel__';
const TAP_INTERVAL_MS = 800;

// store を毎回作り直すことで atom の localStorage 初回読み取りをテストごとにやり直す
const wrapper = (search: string) => {
  const store = createStore();
  return ({ children }: { children: ReactNode }) => (
    <JotaiProvider store={store}>
      <MemoryRouter initialEntries={[`/${search}`]}>{children}</MemoryRouter>
    </JotaiProvider>
  );
};

describe('useDebugPanel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('query も localStorage も無ければ非表示', () => {
    const { result } = renderHook(() => useDebugPanel(), { wrapper: wrapper('') });
    expect(result.current).toBe(false);
  });

  it('?debug=1 で表示され localStorage に永続化される', () => {
    const { result } = renderHook(() => useDebugPanel(), { wrapper: wrapper('?debug=1') });
    expect(result.current).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('1');
  });

  it('永続化済みなら query 無しでも表示される (PWA インストール後の経路)', () => {
    localStorage.setItem(STORAGE_KEY, '1');
    const { result } = renderHook(() => useDebugPanel(), { wrapper: wrapper('') });
    expect(result.current).toBe(true);
  });

  it('?debug=0 で非表示になり localStorage も解除される', () => {
    localStorage.setItem(STORAGE_KEY, '1');
    const { result } = renderHook(() => useDebugPanel(), { wrapper: wrapper('?debug=0') });
    expect(result.current).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('debug 以外の query は状態に影響しない', () => {
    localStorage.setItem(STORAGE_KEY, '1');
    const { result } = renderHook(() => useDebugPanel(), { wrapper: wrapper('?focusBlock=42') });
    expect(result.current).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('1');
  });
});

describe('useDebugTapGesture', () => {
  // 連打判定は Date.now() の差分だけを見るので、時計を直接制御する
  let now = 0;
  const advance = (ms: number) => {
    now += ms;
  };
  const tap = (onTap: () => void, times: number) => {
    for (let i = 0; i < times; i++) act(() => onTap());
  };

  beforeEach(() => {
    localStorage.clear();
    mockToast.mockClear();
    mockToast.success.mockClear();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    // module scope に持っている連打カウンタを前テストから引き継がないよう間隔を空ける
    advance(TAP_INTERVAL_MS * 2);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('7 回連打で有効化され localStorage に永続化される', () => {
    const { result } = renderHook(() => useDebugTapGesture(), { wrapper: wrapper('') });
    tap(result.current, 7);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('1');
    expect(mockToast.success).toHaveBeenCalledWith('デバッグモードをONにしました', expect.anything());
  });

  it('6 回では有効化されず、残り回数が通知される', () => {
    const { result } = renderHook(() => useDebugTapGesture(), { wrapper: wrapper('') });
    tap(result.current, 6);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(mockToast).toHaveBeenLastCalledWith('あと1回でデバッグモードを切り替えます', expect.anything());
  });

  it('タップ間隔が空くとカウントがリセットされる', () => {
    const { result } = renderHook(() => useDebugTapGesture(), { wrapper: wrapper('') });
    tap(result.current, 6);
    advance(TAP_INTERVAL_MS + 1);
    tap(result.current, 1);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('有効な状態でもう 7 回連打すると無効化される', () => {
    localStorage.setItem(STORAGE_KEY, '1');
    const { result } = renderHook(() => useDebugTapGesture(), { wrapper: wrapper('') });
    tap(result.current, 7);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(mockToast.success).toHaveBeenCalledWith('デバッグモードをOFFにしました', expect.anything());
  });
});
