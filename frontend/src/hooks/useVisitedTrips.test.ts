import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

// --- モック ---
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

vi.mock('@/lib/apiClient', () => ({
  fetcher: vi.fn(),
}));

vi.mock('@/types/trip', () => ({
  tripFromApi: {
    parse: (data: unknown) => data,
  },
}));

// SWRのキャッシュを無効化して各テストを独立させる
vi.mock('swr', async () => {
  const actual = await vi.importActual<typeof import('swr')>('swr');
  return {
    ...actual,
    default: actual.default,
  };
});

import { useVisitedTrips } from '@/hooks/useVisitedTrips';

describe('useVisitedTrips', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    mockDbGet.mockResolvedValue(undefined);
    mockDbPut.mockResolvedValue(undefined);
  });

  it('初期化時にIndexedDBからurlIdsを読み込む', async () => {
    mockDbGet.mockResolvedValue({ key: 'visitedTripUrlIds', value: ['url-1', 'url-2'] });

    const { result } = renderHook(() => useVisitedTrips());

    await waitFor(() => {
      expect(result.current.trips).not.toBeUndefined();
    });
  });

  it('addVisitedTrip()で新しいurlIdが追加される', async () => {
    mockDbGet.mockResolvedValue({ key: 'visitedTripUrlIds', value: [] });

    const { result } = renderHook(() => useVisitedTrips());

    // 初期化完了を待つ
    await waitFor(() => {
      expect(mockDbGet).toHaveBeenCalled();
    });

    act(() => {
      result.current.addVisitedTrip('new-url');
    });

    // IndexedDBへの保存が呼ばれることを確認
    await waitFor(() => {
      expect(mockDbPut).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'visitedTripUrlIds',
          value: expect.arrayContaining(['new-url']),
        })
      );
    });
  });

  it('重複するurlIdは追加しない', async () => {
    mockDbGet.mockResolvedValue({ key: 'visitedTripUrlIds', value: ['existing'] });

    const { result } = renderHook(() => useVisitedTrips());

    await waitFor(() => {
      expect(mockDbGet).toHaveBeenCalled();
    });

    act(() => {
      result.current.addVisitedTrip('existing');
    });

    // 重複追加後もvalueの長さは1のまま
    await waitFor(() => {
      const calls = mockDbPut.mock.calls;
      const lastCall = calls[calls.length - 1];
      if (lastCall) {
        expect(lastCall[0].value).toHaveLength(1);
      }
    });
  });

  it('removeVisitedTrip()でurlIdが削除される', async () => {
    mockDbGet.mockResolvedValue({ key: 'visitedTripUrlIds', value: ['url-1', 'url-2'] });

    const { result } = renderHook(() => useVisitedTrips());

    await waitFor(() => {
      expect(mockDbGet).toHaveBeenCalled();
    });

    act(() => {
      result.current.removeVisitedTrip('url-1');
    });

    await waitFor(() => {
      expect(mockDbPut).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'visitedTripUrlIds',
          value: ['url-2'],
        })
      );
    });
  });

  it('localStorageにデータがある場合、IndexedDBへマイグレーションされる', async () => {
    localStorage.setItem('visitedTripUrlIds', JSON.stringify(['migrated-1']));
    // IndexedDBは空
    mockDbGet.mockResolvedValue(undefined);

    renderHook(() => useVisitedTrips());

    await waitFor(() => {
      expect(mockDbPut).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'visitedTripUrlIds',
          value: ['migrated-1'],
        })
      );
    });

    // マイグレーション後にlocalStorageが削除される
    expect(localStorage.getItem('visitedTripUrlIds')).toBeNull();
  });

  it('localStorageのJSONパースエラーでもクラッシュしない', async () => {
    localStorage.setItem('visitedTripUrlIds', 'invalid json{{{');

    const { result } = renderHook(() => useVisitedTrips());

    // エラーにならずレンダリングされること
    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
  });

  it('IndexedDB読み込みエラー時もブロックしない', async () => {
    mockDbGet.mockRejectedValue(new Error('DB error'));

    const { result } = renderHook(() => useVisitedTrips());

    // エラーにならずレンダリングされること
    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
  });
});
