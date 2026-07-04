import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

const mockDbGet = vi.fn();
const mockDbPut = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    swrCache: {},
    userSettings: {
      get: (...args: unknown[]) => mockDbGet(...args),
      put: (...args: unknown[]) => mockDbPut(...args),
    },
  },
}));

import { useActivePage } from '@/hooks/useActivePage';

describe('useActivePage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockDbGet.mockResolvedValue(undefined);
    mockDbPut.mockResolvedValue(undefined);
  });

  it('初期化時にIndexedDBから保存済みのアクティブページIDを読み込む', async () => {
    mockDbGet.mockResolvedValue({ key: 'activePageId_1', value: 42 });

    const { result } = renderHook(() => useActivePage(1));

    await waitFor(() => {
      expect(result.current.isActivePageInitialized).toBe(true);
    });
    expect(mockDbGet).toHaveBeenCalledWith('activePageId_1');
    expect(result.current.storedPageId).toBe(42);
  });

  it('保存済みデータが無い場合は storedPageId が null になる', async () => {
    mockDbGet.mockResolvedValue(undefined);

    const { result } = renderHook(() => useActivePage(1));

    await waitFor(() => {
      expect(result.current.isActivePageInitialized).toBe(true);
    });
    expect(result.current.storedPageId).toBeNull();
  });

  it('saveActivePageId() で tripId に紐づくキーへ保存される', async () => {
    const { result } = renderHook(() => useActivePage(1));

    await waitFor(() => {
      expect(result.current.isActivePageInitialized).toBe(true);
    });

    act(() => {
      result.current.saveActivePageId(7);
    });

    await waitFor(() => {
      expect(mockDbPut).toHaveBeenCalledWith({ key: 'activePageId_1', value: 7 });
    });
  });

  it('tripId が null の場合は読み込みも保存も行わない', async () => {
    const { result } = renderHook(() => useActivePage(null));

    await waitFor(() => {
      expect(result.current.storedPageId).toBeNull();
    });
    expect(mockDbGet).not.toHaveBeenCalled();

    act(() => {
      result.current.saveActivePageId(7);
    });

    expect(mockDbPut).not.toHaveBeenCalled();
  });

  it('IndexedDB読み込みエラー時も初期化完了状態になりクラッシュしない', async () => {
    mockDbGet.mockRejectedValue(new Error('DB error'));

    const { result } = renderHook(() => useActivePage(1));

    await waitFor(() => {
      expect(result.current.isActivePageInitialized).toBe(true);
    });
    expect(result.current.storedPageId).toBeNull();
  });
});
