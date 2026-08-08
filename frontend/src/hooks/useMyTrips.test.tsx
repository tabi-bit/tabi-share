import { renderHook, waitFor } from '@testing-library/react';
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
});
