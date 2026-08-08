import { vi } from 'vitest';
import { applyTripArchived, MY_ARCHIVED_TRIPS_KEY, MY_TRIPS_KEY, writeTrip } from '@/lib/tripCache';
import type { Trip } from '@/types/trip';

const makeTrip = (id: number, title = `trip-${id}`): Trip => ({
  id,
  title,
  detail: null,
  peopleNum: null,
  urlId: `url-${id}`,
  startDate: null,
  endDate: null,
  walicaUrl: null,
  createdAt: new Date('2026-01-01'),
  lastEditedAt: new Date('2026-01-01'),
});

/** キー -> データの Map を持つ簡易 mutate。updater を即時適用して結果を保持する */
const createMutate = (initial: Record<string, Trip[] | undefined>) => {
  const store = new Map<string, Trip[] | undefined>(Object.entries(initial));
  const mutate = vi.fn((key: string, updater?: unknown) => {
    if (typeof updater === 'function') {
      store.set(key, (updater as (trips?: Trip[]) => Trip[] | undefined)(store.get(key)));
    } else {
      store.set(key, updater as Trip[] | undefined);
    }
    return Promise.resolve();
  });
  return { mutate: mutate as never, store };
};

describe('writeTrip', () => {
  // Trip 型は archived を持たず所属リストを判別できない。挿入すると
  // アーカイブしていない旅程がアーカイブ済み一覧に混入する
  it('元々載っていないリストには追加しない', () => {
    const trip = makeTrip(1);
    const { mutate, store } = createMutate({
      [MY_TRIPS_KEY]: [trip],
      [MY_ARCHIVED_TRIPS_KEY]: [],
    });

    writeTrip(mutate, { ...trip, title: '改題後' });

    expect(store.get(MY_TRIPS_KEY)?.map(t => t.title)).toEqual(['改題後']);
    expect(store.get(MY_ARCHIVED_TRIPS_KEY)).toEqual([]);
  });

  it('アーカイブ済み側に載っている旅程は通常一覧に復活しない', () => {
    const trip = makeTrip(1);
    const { mutate, store } = createMutate({
      [MY_TRIPS_KEY]: [],
      [MY_ARCHIVED_TRIPS_KEY]: [trip],
    });

    writeTrip(mutate, { ...trip, title: '改題後' });

    expect(store.get(MY_TRIPS_KEY)).toEqual([]);
    expect(store.get(MY_ARCHIVED_TRIPS_KEY)?.map(t => t.title)).toEqual(['改題後']);
  });
});

describe('applyTripArchived', () => {
  it('通常一覧からアーカイブ済みへ移す', () => {
    const trip = makeTrip(1);
    const { mutate, store } = createMutate({
      [MY_TRIPS_KEY]: [trip, makeTrip(2)],
      [MY_ARCHIVED_TRIPS_KEY]: [],
    });

    applyTripArchived(mutate, trip, true);

    expect(store.get(MY_TRIPS_KEY)?.map(t => t.id)).toEqual([2]);
    expect(store.get(MY_ARCHIVED_TRIPS_KEY)?.map(t => t.id)).toEqual([1]);
  });

  it('アーカイブ済みから通常一覧へ戻す', () => {
    const trip = makeTrip(1);
    const { mutate, store } = createMutate({
      [MY_TRIPS_KEY]: [],
      [MY_ARCHIVED_TRIPS_KEY]: [trip],
    });

    applyTripArchived(mutate, trip, false);

    expect(store.get(MY_ARCHIVED_TRIPS_KEY)).toEqual([]);
    expect(store.get(MY_TRIPS_KEY)?.map(t => t.id)).toEqual([1]);
  });
});
