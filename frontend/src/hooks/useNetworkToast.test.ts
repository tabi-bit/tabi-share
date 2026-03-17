import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';

// --- モック ---
const mockToast = {
  warning: vi.fn(),
  success: vi.fn(),
};

let mockIsOffline = false;

vi.mock('sonner', () => ({
  toast: {
    warning: (...args: unknown[]) => mockToast.warning(...args),
    success: (...args: unknown[]) => mockToast.success(...args),
  },
}));

vi.mock('jotai', async importOriginal => {
  const actual = await importOriginal<typeof import('jotai')>();
  return {
    ...actual,
    useAtomValue: () => mockIsOffline,
  };
});

import { useNetworkToast } from '@/hooks/useNetworkToast';

describe('useNetworkToast', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockIsOffline = false;
  });

  it('初回レンダリング時はtoastを表示しない', () => {
    renderHook(() => useNetworkToast());

    expect(mockToast.warning).not.toHaveBeenCalled();
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it('オフラインになったらwarning toastを表示', () => {
    const { rerender } = renderHook(() => useNetworkToast());

    // オフラインに変更
    mockIsOffline = true;
    act(() => {
      rerender();
    });

    expect(mockToast.warning).toHaveBeenCalledWith('オフラインモードになりました');
  });

  it('オンラインに復帰したらsuccess toastを表示', () => {
    // オフライン状態で初期化
    mockIsOffline = true;
    const { rerender } = renderHook(() => useNetworkToast());

    // オンラインに復帰
    mockIsOffline = false;
    act(() => {
      rerender();
    });

    expect(mockToast.success).toHaveBeenCalledWith('オンラインに復帰しました');
  });
});
