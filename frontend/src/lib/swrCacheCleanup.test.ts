import { vi } from 'vitest';

// vi.mockファクトリ内で参照するためvi.hoisted()で宣言
const { mockDeleteOp, mockBelow, mockWhere } = vi.hoisted(() => {
  const mockDeleteOp = vi.fn<() => Promise<number>>();
  const mockBelow = vi.fn(() => ({ delete: mockDeleteOp }));
  const mockWhere = vi.fn(() => ({ below: mockBelow }));
  return { mockDeleteOp, mockBelow, mockWhere };
});

vi.mock('@/lib/db', () => ({
  db: {
    swrCache: {
      where: mockWhere,
    },
  },
}));

import { runCacheCleanup } from '@/lib/swrCacheCleanup';

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

describe('runCacheCleanup', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // resetAllMocksでチェーンが壊れるので再設定
    mockWhere.mockReturnValue({ below: mockBelow });
    mockBelow.mockReturnValue({ delete: mockDeleteOp });
  });

  it('6ヶ月前のしきい値でlastAccessedを条件にdelete()が呼ばれる', async () => {
    const now = 1700000000000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    mockDeleteOp.mockResolvedValue(5);

    await runCacheCleanup();

    expect(mockWhere).toHaveBeenCalledWith('lastAccessed');
    expect(mockBelow).toHaveBeenCalledWith(now - SIX_MONTHS_MS);
    expect(mockDeleteOp).toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it('IndexedDB操作が失敗した場合、Promiseがrejectされる', async () => {
    mockDeleteOp.mockRejectedValue(new Error('DB error'));

    await expect(runCacheCleanup()).rejects.toThrow('DB error');
  });
});
