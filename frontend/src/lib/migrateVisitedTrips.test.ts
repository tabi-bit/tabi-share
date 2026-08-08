import { HttpResponse, http } from 'msw';
import { vi } from 'vitest';
import { server } from '../../tests/msw/server';

const mockDbGet = vi.fn();
const mockDbDelete = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    swrCache: {},
    userSettings: {
      get: (...args: unknown[]) => mockDbGet(...args),
      delete: (...args: unknown[]) => mockDbDelete(...args),
    },
  },
}));

/** 移行はモジュールスコープで一度きりにメモ化されるため、毎回読み込み直す */
const loadMigrate = async () => {
  vi.resetModules();
  const { migrateVisitedTripUrlIds } = await import('@/lib/migrateVisitedTrips');
  return migrateVisitedTripUrlIds;
};

describe('migrateVisitedTripUrlIds', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    mockDbGet.mockResolvedValue(undefined);
    mockDbDelete.mockResolvedValue(undefined);
  });

  it('台帳の urlId をすべて取得してアクセス権を張り直し、台帳を削除する', async () => {
    mockDbGet.mockResolvedValue({ key: 'visitedTripUrlIds', value: ['url-1', 'url-2'] });
    const fetched: string[] = [];
    server.use(
      http.get('*/trips/url/:urlId', ({ params }) => {
        fetched.push(String(params.urlId));
        return HttpResponse.json({ id: 1, url_id: String(params.urlId) });
      })
    );

    await (await loadMigrate())();

    expect(fetched.sort()).toEqual(['url-1', 'url-2']);
    expect(mockDbDelete).toHaveBeenCalledWith('visitedTripUrlIds');
  });

  it('localStorage に残った台帳も対象にする', async () => {
    localStorage.setItem('visitedTripUrlIds', JSON.stringify(['legacy-1']));
    const fetched: string[] = [];
    server.use(
      http.get('*/trips/url/:urlId', ({ params }) => {
        fetched.push(String(params.urlId));
        return HttpResponse.json({ id: 1, url_id: String(params.urlId) });
      })
    );

    await (await loadMigrate())();

    expect(fetched).toEqual(['legacy-1']);
    expect(localStorage.getItem('visitedTripUrlIds')).toBeNull();
  });

  it('削除済み trip の 404 は移行済みとして扱う', async () => {
    mockDbGet.mockResolvedValue({ key: 'visitedTripUrlIds', value: ['gone'] });
    server.use(http.get('*/trips/url/:urlId', () => new HttpResponse(null, { status: 404 })));

    await (await loadMigrate())();

    expect(mockDbDelete).toHaveBeenCalledWith('visitedTripUrlIds');
  });

  it('通信に失敗したら台帳を残して次回に持ち越す', async () => {
    mockDbGet.mockResolvedValue({ key: 'visitedTripUrlIds', value: ['url-1'] });
    server.use(http.get('*/trips/url/:urlId', () => new HttpResponse(null, { status: 500 })));

    await (await loadMigrate())();

    expect(mockDbDelete).not.toHaveBeenCalled();
  });

  it('台帳が無ければ何も取得しない', async () => {
    let called = false;
    server.use(
      http.get('*/trips/url/:urlId', () => {
        called = true;
        return HttpResponse.json({});
      })
    );

    await (await loadMigrate())();

    expect(called).toBe(false);
  });
});
