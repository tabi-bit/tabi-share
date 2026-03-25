import { vi } from 'vitest';
import type { SwrCacheEntry } from '@/lib/db';

// --- Dexieモック ---
const mockToArray = vi.fn<() => Promise<SwrCacheEntry[]>>();
const mockLimit = vi.fn(() => ({ toArray: mockToArray }));
const mockReverse = vi.fn(() => ({ limit: mockLimit }));
const mockOrderBy = vi.fn(() => ({ reverse: mockReverse }));
const mockPut = vi.fn<() => Promise<void>>();
const mockDelete = vi.fn<() => Promise<void>>();

vi.mock('@/lib/db', () => ({
  db: {
    swrCache: {
      orderBy: mockOrderBy,
      put: mockPut,
      delete: mockDelete,
    },
  },
}));

// モジュールキャッシュをリセットして各テストで独立したproviderを生成する
const loadProvider = async () => {
  const mod = await import('@/lib/swrCacheProvider');
  const result = mod.createSwrCacheProvider();
  // テストではState<State>の型制約を緩和（内部Mapの動作検証が目的）
  return {
    ...result,
    provider: () =>
      result.provider() as unknown as {
        get: (key: string) => { data?: unknown } | undefined;
        set: (key: string, value: { data?: unknown }) => void;
        delete: (key: string) => void;
        keys: () => IterableIterator<string>;
      },
  };
};

describe('createSwrCacheProvider', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    mockPut.mockResolvedValue(undefined);
    mockDelete.mockResolvedValue(undefined);
  });

  describe('hydration（正常系）', () => {
    it('IndexedDBからプリロードしたデータがget()で同期的に返る', async () => {
      const entries: SwrCacheEntry[] = [
        { key: 'trip-1', data: { id: 1 }, timestamp: 1000, lastAccessed: 2000 },
        { key: 'trip-2', data: { id: 2 }, timestamp: 1000, lastAccessed: 1500 },
      ];
      mockToArray.mockResolvedValue(entries);

      const { provider, hydratePromise } = await loadProvider();
      await hydratePromise;

      const cache = provider();
      expect(cache.get('trip-1')).toEqual({ data: { id: 1 } });
      expect(cache.get('trip-2')).toEqual({ data: { id: 2 } });
    });

    it('存在しないキーにはundefinedを返す', async () => {
      mockToArray.mockResolvedValue([]);

      const { provider, hydratePromise } = await loadProvider();
      await hydratePromise;

      const cache = provider();
      expect(cache.get('nonexistent')).toBeUndefined();
    });
  });

  describe('hydration（エラー系）', () => {
    it('IndexedDBのhydrationが失敗してもhydratePromiseはresolveする', async () => {
      mockToArray.mockRejectedValue(new Error('DB error'));

      const { hydratePromise } = await loadProvider();
      // rejectせずに正常完了すること
      await expect(hydratePromise).resolves.toBeUndefined();
    });
  });

  describe('set()', () => {
    it('メモリMapが更新され、get()で取得できる', async () => {
      mockToArray.mockResolvedValue([]);

      const { provider, hydratePromise } = await loadProvider();
      await hydratePromise;

      const cache = provider();
      cache.set('key-1', { data: { name: 'trip' } });
      expect(cache.get('key-1')).toEqual({ data: { name: 'trip' } });
    });

    it('dataがある場合、IndexedDBのput()が呼ばれる', async () => {
      mockToArray.mockResolvedValue([]);
      vi.spyOn(Date, 'now').mockReturnValue(99999);

      const { provider, hydratePromise } = await loadProvider();
      await hydratePromise;

      const cache = provider();
      cache.set('key-1', { data: { name: 'trip' } });

      expect(mockPut).toHaveBeenCalledWith({
        key: 'key-1',
        data: { name: 'trip' },
        timestamp: 99999,
        lastAccessed: 99999,
      });

      vi.restoreAllMocks();
    });

    it('data === undefinedの場合、IndexedDBには書き込まない', async () => {
      mockToArray.mockResolvedValue([]);

      const { provider, hydratePromise } = await loadProvider();
      await hydratePromise;

      const cache = provider();
      cache.set('key-1', { data: undefined });
      expect(mockPut).not.toHaveBeenCalled();
    });
  });

  describe('delete()', () => {
    it('メモリから削除され、IndexedDBのdelete()も呼ばれる', async () => {
      mockToArray.mockResolvedValue([]);

      const { provider, hydratePromise } = await loadProvider();
      await hydratePromise;

      const cache = provider();
      cache.set('key-1', { data: { name: 'trip' } });
      cache.delete('key-1');

      expect(cache.get('key-1')).toBeUndefined();
      expect(mockDelete).toHaveBeenCalledWith('key-1');
    });
  });

  describe('keys()', () => {
    it('現在のキー一覧を返す', async () => {
      mockToArray.mockResolvedValue([]);

      const { provider, hydratePromise } = await loadProvider();
      await hydratePromise;

      const cache = provider();
      cache.set('a', { data: { id: 1 } });
      cache.set('b', { data: { id: 2 } });

      const keys = [...cache.keys()];
      expect(keys).toContain('a');
      expect(keys).toContain('b');
    });
  });
});
