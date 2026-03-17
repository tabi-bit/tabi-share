import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

// --- モック ---
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};
const mockMutate = vi.fn();
const mockEvaluateNetwork = vi.fn();
const mockAppStoreGet = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToast.success(...args),
    error: (...args: unknown[]) => mockToast.error(...args),
  },
}));

vi.mock('swr', () => ({
  useSWRConfig: () => ({ mutate: mockMutate }),
}));

vi.mock('@/lib/networkDetection', () => ({
  evaluateNetwork: (...args: unknown[]) => mockEvaluateNetwork(...args),
}));

vi.mock('@/lib/store', () => ({
  appStore: {
    get: (...args: unknown[]) => mockAppStoreGet(...args),
  },
}));

vi.mock('@/atoms/network', () => ({
  isOfflineAtom: Symbol('isOfflineAtom'),
}));

import { useRefresh } from '@/hooks/useRefresh';

describe('useRefresh', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockMutate.mockResolvedValue(undefined);
    mockEvaluateNetwork.mockResolvedValue(undefined);
  });

  it('オンライン時: SWR mutateを呼びsuccess toast', async () => {
    mockAppStoreGet.mockReturnValue(false);

    const { result } = renderHook(() => useRefresh());

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockMutate).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalledWith('データを再取得しました');
  });

  it('オフライン→再接続失敗: error toast', async () => {
    // 初回・再評価後ともにオフライン
    mockAppStoreGet.mockReturnValue(true);

    const { result } = renderHook(() => useRefresh());

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockEvaluateNetwork).toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalledWith('再接続できませんでした');
  });

  it('refresh中にisRefreshingがtrue→falseに遷移', async () => {
    mockAppStoreGet.mockReturnValue(false);

    const { result } = renderHook(() => useRefresh());

    expect(result.current.isRefreshing).toBe(false);

    let refreshPromise: Promise<void>;
    act(() => {
      refreshPromise = result.current.refresh();
    });

    // refresh実行中はtrue
    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(true);
    });

    await act(async () => {
      await refreshPromise;
    });

    expect(result.current.isRefreshing).toBe(false);
  });
});
