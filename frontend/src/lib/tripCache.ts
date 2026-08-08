import type { Cache, ScopedMutator } from 'swr';
import { sortTripsByLastEdited } from '@/lib/sortTrips';
import type { Trip } from '@/types/trip';

/**
 * Trip に関する SWR キーと、その横断更新をまとめる。
 *
 * Trip は「一覧 (通常/アーカイブ済み)」と「詳細」の 3 キーに跨って載るため、
 * キーの知識をここに閉じ込めて呼び出し側が個別に mutate しないようにする。
 */

export const MY_TRIPS_KEY = '/me/trips';
export const MY_ARCHIVED_TRIPS_KEY = '/me/trips?archived=true';

export const tripDetailKey = (urlId: Trip['urlId']): string => `/trips/url/${urlId}`;

const insert = (trips: Trip[] | undefined, trip: Trip): Trip[] | undefined =>
  trips && sortTripsByLastEdited([...trips.filter(t => t.id !== trip.id), trip]);

/** 既にそのリストに載っている場合のみ差し替える。所属リストは変えない。 */
const replaceIfPresent = (trips: Trip[] | undefined, trip: Trip): Trip[] | undefined =>
  trips?.some(t => t.id === trip.id) ? sortTripsByLastEdited(trips.map(t => (t.id === trip.id ? trip : t))) : trips;

const exclude = (trips: Trip[] | undefined, tripId: Trip['id']): Trip[] | undefined =>
  trips?.filter(t => t.id !== tripId);

/**
 * Trip の内容変更を詳細・一覧の両キャッシュに反映する。
 *
 * Trip 型は archived を持たないため所属リストを判別できない。挿入すると
 * アーカイブしていない旅程がアーカイブ済み一覧に混入するので、差し替えのみ行う。
 * リスト間の移動は applyTripArchived の責務。
 */
export const writeTrip = (mutate: ScopedMutator, trip: Trip): void => {
  mutate(tripDetailKey(trip.urlId), trip, { revalidate: false });
  mutate(MY_TRIPS_KEY, (trips?: Trip[]) => replaceIfPresent(trips, trip), { revalidate: false });
  mutate(MY_ARCHIVED_TRIPS_KEY, (trips?: Trip[]) => replaceIfPresent(trips, trip), { revalidate: false });
};

/**
 * Trip を全キャッシュから取り除く。
 *
 * 詳細キャッシュは mutate だけでは IndexedDB に残り、再訪時に削除済み Trip が
 * 描画される (issue #187)。購読中コンポーネントへの通知に mutate、永続層の削除に
 * cache.delete と両方が要る。
 */
export const removeTrip = (mutate: ScopedMutator, cache: Cache, trip: Pick<Trip, 'id' | 'urlId'>): void => {
  const detailKey = tripDetailKey(trip.urlId);
  mutate(detailKey, undefined, { revalidate: false });
  cache.delete(detailKey);
  mutate(MY_TRIPS_KEY, (trips?: Trip[]) => exclude(trips, trip.id), { revalidate: false });
  mutate(MY_ARCHIVED_TRIPS_KEY, (trips?: Trip[]) => exclude(trips, trip.id), { revalidate: false });
};

/**
 * アーカイブ状態の変更を 2 つの一覧キャッシュに反映する。
 *
 * 移動先も含めて再検証しない。この関数は PATCH の送信前に呼ぶため、再検証すると
 * 更新前のサーバー状態で楽観更新を打ち消してしまう。移動後の状態は決定的なので
 * 楽観更新をそのまま正とし、以降は SWR の通常の再検証に委ねる。
 */
export const applyTripArchived = (mutate: ScopedMutator, trip: Trip, archived: boolean): void => {
  const [from, to] = archived ? [MY_TRIPS_KEY, MY_ARCHIVED_TRIPS_KEY] : [MY_ARCHIVED_TRIPS_KEY, MY_TRIPS_KEY];
  mutate(from, (trips?: Trip[]) => exclude(trips, trip.id), { revalidate: false });
  mutate(to, (trips?: Trip[]) => insert(trips, trip), { revalidate: false });
};

/** 一覧キャッシュを再検証する（Trip 追加時など、手元に確定データが無い場合）。 */
export const revalidateTripLists = (mutate: ScopedMutator): void => {
  mutate(MY_TRIPS_KEY);
  mutate(MY_ARCHIVED_TRIPS_KEY);
};
