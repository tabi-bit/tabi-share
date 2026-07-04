import { act, renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { vi } from 'vitest';
import { server } from '../../tests/msw/server';

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

import { useVisitedTrips } from '@/hooks/useVisitedTrips';

describe('useVisitedTrips', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    mockDbGet.mockResolvedValue(undefined);
    mockDbPut.mockResolvedValue(undefined);
    // urlIds に対応する Trip 取得は MSW で valid な API レスポンスを返す
    server.use(
      http.get('*/trips/url/:urlId', ({ params }) =>
        HttpResponse.json({
          id: 1,
          title: 'mock',
          detail: null,
          people_num: null,
          url_id: String(params.urlId),
        })
      )
    );
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

  it('IndexedDB 読み込み中は isLoading が true で、完了後に false になる', async () => {
    mockDbGet.mockResolvedValue({ key: 'visitedTripUrlIds', value: [] });

    const { result } = renderHook(() => useVisitedTrips());

    // マウント直後（IndexedDB 読み込み中）は isLoading が true
    expect(result.current.isLoading).toBe(true);

    // 初期化完了後は false（urlIds が空なので SWR も走らない）
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});
