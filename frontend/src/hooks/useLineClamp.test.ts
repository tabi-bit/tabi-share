import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// useResizeObserver をモックし、登録された resize コールバックを捕捉して任意に発火させる。
// これにより ResizeObserver（jsdom 非対応）に依存せず行数計算ロジックだけを検証する。
let capturedCallback: ((entry: ResizeObserverEntry) => void) | undefined;

vi.mock('./useResizeObserver', () => ({
  useResizeObserver: (cb: (entry: ResizeObserverEntry) => void) => {
    capturedCallback = cb;
    return { current: null };
  },
}));

import { useLineClamp } from './useLineClamp';

const mockComputedStyle = (fontSize: string, lineHeight: string) => {
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({ fontSize, lineHeight } as CSSStyleDeclaration);
};

const fireResize = (height: number) => {
  const entry = {
    target: document.createElement('div'),
    contentRect: { height } as DOMRectReadOnly,
  } as unknown as ResizeObserverEntry;
  act(() => {
    capturedCallback?.(entry);
  });
};

describe('useLineClamp', () => {
  beforeEach(() => {
    capturedCallback = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('初期値は1行', () => {
    const { result } = renderHook(() => useLineClamp());
    expect(result.current.lineClamp).toBe(1);
  });

  it('利用可能高さ ÷ 行高 の行数を返す', () => {
    mockComputedStyle('16px', '24px');
    const { result } = renderHook(() => useLineClamp());
    fireResize(72);
    expect(result.current.lineClamp).toBe(3);
  });

  it('端数は切り捨てる', () => {
    mockComputedStyle('16px', '24px');
    const { result } = renderHook(() => useLineClamp());
    fireResize(80); // 80 / 24 = 3.33 -> 3
    expect(result.current.lineClamp).toBe(3);
  });

  it('行高より低い高さでも最低1行を返す', () => {
    mockComputedStyle('16px', '24px');
    const { result } = renderHook(() => useLineClamp());
    fireResize(10);
    expect(result.current.lineClamp).toBe(1);
  });

  it('line-height が px で取得できない場合は fontSize * 1.4 をフォールバックに使う', () => {
    mockComputedStyle('20px', 'normal'); // フォールバック行高 = 28px
    const { result } = renderHook(() => useLineClamp());
    fireResize(84); // 84 / 28 = 3
    expect(result.current.lineClamp).toBe(3);
  });
});
