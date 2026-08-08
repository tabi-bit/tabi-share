import { act, renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import type { ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { vi } from 'vitest';
import { useArchiveTrip, useMyTrips } from '@/hooks/useMyTrips';
import type { Trip } from '@/types/trip';
import { server } from '../../tests/msw/server';

vi.mock('@/lib/migrateVisitedTrips', () => ({
  migrateVisitedTripUrlIds: () => Promise.resolve(),
}));

const apiTrip = (id: number, urlId: string) => ({
  id,
  title: `trip-${id}`,
  detail: null,
  people_num: null,
  url_id: urlId,
  start_date: null,
  end_date: null,
  walica_url: null,
  created_at: '2026-01-01T00:00:00+00:00',
  last_edited_at: '2026-01-01T00:00:00+00:00',
});

// テスト間で SWR キャッシュを共有しないよう、毎回新しい provider を張る
const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
);

describe('useMyTrips', () => {
  it('/me/trips から一覧を取得する', async () => {
    server.use(http.get('*/me/trips', () => HttpResponse.json([apiTrip(1, 'url-1'), apiTrip(2, 'url-2')])));

    const { result } = renderHook(() => useMyTrips(), { wrapper });

    await waitFor(() => expect(result.current.trips).toHaveLength(2));
    expect(result.current.trips?.map(trip => trip.urlId)).toEqual(['url-1', 'url-2']);
  });

  it('archived 指定でアーカイブ済みの一覧を取得する', async () => {
    const requestedUrls: string[] = [];
    server.use(
      http.get('*/me/trips', ({ request }) => {
        requestedUrls.push(new URL(request.url).search);
        return HttpResponse.json([apiTrip(3, 'url-3')]);
      })
    );

    const { result } = renderHook(() => useMyTrips(true), { wrapper });

    await waitFor(() => expect(result.current.trips).toHaveLength(1));
    expect(requestedUrls).toEqual(['?archived=true']);
  });
});

describe('useArchiveTrip', () => {
  it('アーカイブ状態を PATCH で送信する', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.get('*/me/trips', () => HttpResponse.json([])),
      http.patch('*/me/trips/:tripId', async ({ request, params }) => {
        bodies.push({ tripId: params.tripId, body: await request.json() });
        return new HttpResponse(null, { status: 204 });
      })
    );

    const { result } = renderHook(() => useArchiveTrip(), { wrapper });
    await result.current.setArchived({ id: 7, urlId: 'url-7' } as Trip, true);

    expect(bodies).toEqual([{ tripId: '7', body: { archived: true } }]);
  });

  // 並走すると到達順が逆転し、サーバーが UI と食い違った状態で確定しうる
  it('連続した切り替えを送信順どおりに直列化する', async () => {
    const order: boolean[] = [];
    let first = true;
    server.use(
      http.get('*/me/trips', () => HttpResponse.json([])),
      http.patch('*/me/trips/:tripId', async ({ request }) => {
        const { archived } = (await request.json()) as { archived: boolean };
        // 先行リクエストだけ遅らせて、直列化されていなければ順序が入れ替わるようにする
        if (first) {
          first = false;
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        order.push(archived);
        return new HttpResponse(null, { status: 204 });
      })
    );

    const { result } = renderHook(() => useArchiveTrip(), { wrapper });
    const trip = { id: 7, urlId: 'url-7' } as Trip;
    await act(async () => {
      const archiving = result.current.setArchived(trip, true);
      const undoing = result.current.setArchived(trip, false);
      await Promise.all([archiving, undoing]);
    });

    expect(order).toEqual([true, false]);
  });

  // PATCH 送信前に移動先を再検証すると、更新前のサーバー状態で楽観更新が打ち消される。
  // ここでは GET が常に更新前の内容を返すため、再検証が入ると移動先が空のままになる
  it('PATCH の反映前でも移動先の一覧に反映される', async () => {
    server.use(
      http.get('*/me/trips', ({ request }) =>
        HttpResponse.json(new URL(request.url).searchParams.has('archived') ? [] : [apiTrip(1, 'url-1')])
      ),
      http.patch('*/me/trips/:tripId', () => new HttpResponse(null, { status: 204 }))
    );

    const { result } = renderHook(() => ({ active: useMyTrips(), archived: useMyTrips(true), ...useArchiveTrip() }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.active.trips).toHaveLength(1));

    const trip = result.current.active.trips?.[0] as Trip;
    await act(async () => {
      await result.current.setArchived(trip, true);
    });

    expect(result.current.active.trips).toEqual([]);
    expect(result.current.archived.trips?.map(t => t.id)).toEqual([1]);

    // 「元に戻す」で通常一覧へ戻る
    await act(async () => {
      await result.current.setArchived(trip, false);
    });

    expect(result.current.archived.trips).toEqual([]);
    expect(result.current.active.trips?.map(t => t.id)).toEqual([1]);
  });
});
