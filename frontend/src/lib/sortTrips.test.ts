import { sortTripsByLatestUpdate } from '@/lib/sortTrips';
import type { Trip } from '@/types/trip';

/** テスト用の最小 Trip を生成 */
const makeTrip = (id: number, updatedAt: string, createdAt = updatedAt): Trip => ({
  id,
  title: `trip-${id}`,
  detail: null,
  peopleNum: null,
  urlId: `url-${id}`,
  startDate: null,
  endDate: null,
  createdAt: new Date(createdAt),
  updatedAt: new Date(updatedAt),
});

describe('sortTripsByLatestUpdate', () => {
  it('updatedAt 降順に並び替える', () => {
    const trips: Trip[] = [
      makeTrip(1, '2026-01-01T09:00:00Z'),
      makeTrip(2, '2026-03-01T09:00:00Z'),
      makeTrip(3, '2026-02-01T09:00:00Z'),
    ];

    const sorted = sortTripsByLatestUpdate(trips);

    expect(sorted.map(t => t.id)).toEqual([2, 3, 1]);
  });

  it('updatedAt が同じ場合は id 降順（新しい方が上）', () => {
    const trips: Trip[] = [
      makeTrip(1, '2026-01-01T09:00:00Z'),
      makeTrip(3, '2026-01-01T09:00:00Z'),
      makeTrip(2, '2026-01-01T09:00:00Z'),
    ];

    const sorted = sortTripsByLatestUpdate(trips);

    expect(sorted.map(t => t.id)).toEqual([3, 2, 1]);
  });

  it('元の配列を破壊しない（非破壊ソート）', () => {
    const trips: Trip[] = [makeTrip(1, '2026-01-01T09:00:00Z'), makeTrip(2, '2026-02-01T09:00:00Z')];

    const sorted = sortTripsByLatestUpdate(trips);

    expect(trips.map(t => t.id)).toEqual([1, 2]);
    expect(sorted).not.toBe(trips);
  });
});
