import { HttpResponse, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isOfflineAtom } from '@/atoms/network';
import { tripAtom } from '@/atoms/tripPage';
import { server } from '../../tests/msw/server';
import { apiClient } from './apiClient';
import { appStore } from './store';

const URL_ID = 'abc123';

const setTrip = (urlId: string | null): void => {
  appStore.set(
    tripAtom,
    urlId === null
      ? null
      : {
          id: 1,
          title: 't',
          detail: null,
          peopleNum: null,
          urlId,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          lastEditedAt: new Date('2026-01-01T00:00:00Z'),
        }
  );
};

describe('apiClient — 認可Cookie失効リカバリ', () => {
  beforeEach(() => {
    appStore.set(isOfflineAtom, false);
    setTrip(URL_ID);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('403 を受けたリクエストは refresh + 1回リトライで成功する（正常系）', async () => {
    let putCount = 0;
    let refreshCount = 0;
    server.use(
      http.get(`*/trips/url/${URL_ID}`, () => {
        refreshCount += 1;
        return HttpResponse.json({ id: 1, title: 'x', url_id: URL_ID });
      }),
      http.put('*/trips/1', () => {
        putCount += 1;
        return putCount === 1 ? new HttpResponse(null, { status: 403 }) : HttpResponse.json({ ok: true });
      })
    );

    const res = await apiClient.put('/trips/1', { title: 'x' });

    expect(res.status).toBe(200);
    expect(refreshCount).toBe(1);
    expect(putCount).toBe(2);
  });

  it('並列で 403 が起きても refresh は 1 回に集約され、全リクエストがリトライされる', async () => {
    let refreshCount = 0;
    const callCounts = new Map<string, number>();
    server.use(
      http.get(`*/trips/url/${URL_ID}`, () => {
        refreshCount += 1;
        return HttpResponse.json({ id: 1, title: 'x', url_id: URL_ID });
      }),
      http.put('*/trips/:id', ({ params }) => {
        const key = String(params.id);
        const count = (callCounts.get(key) ?? 0) + 1;
        callCounts.set(key, count);
        return count === 1 ? new HttpResponse(null, { status: 403 }) : HttpResponse.json({ ok: true });
      })
    );

    const results = await Promise.all([
      apiClient.put('/trips/1', {}),
      apiClient.put('/trips/2', {}),
      apiClient.put('/trips/3', {}),
    ]);

    expect(results.map(r => r.status)).toEqual([200, 200, 200]);
    expect(refreshCount).toBe(1);
    // 各 URL が 1回目=403、2回目=200(リトライ) の計 2 回呼ばれていることを確認
    expect(callCounts.get('1')).toBe(2);
    expect(callCounts.get('2')).toBe(2);
    expect(callCounts.get('3')).toBe(2);
  });

  it('refresh が失敗した場合は元リクエストをリトライせず 403 エラーが伝播する', async () => {
    let putCount = 0;
    let refreshCount = 0;
    server.use(
      http.get(`*/trips/url/${URL_ID}`, () => {
        refreshCount += 1;
        return new HttpResponse(null, { status: 500 });
      }),
      http.put('*/trips/1', () => {
        putCount += 1;
        return new HttpResponse(null, { status: 403 });
      })
    );

    await expect(apiClient.put('/trips/1', {})).rejects.toThrow();
    expect(refreshCount).toBe(1);
    expect(putCount).toBe(1);
  });

  it('リトライ自体が失敗した場合はそのエラーが呼び出し元に伝播する（元 403 で握りつぶさない）', async () => {
    let putCount = 0;
    server.use(
      http.get(`*/trips/url/${URL_ID}`, () => HttpResponse.json({ id: 1, title: 'x', url_id: URL_ID })),
      http.put('*/trips/1', () => {
        putCount += 1;
        return putCount === 1 ? new HttpResponse(null, { status: 403 }) : new HttpResponse(null, { status: 500 });
      })
    );

    // 修正前は元 403 が toAppError されて返っていたが、修正後はリトライ時の 500 が伝播する
    await expect(apiClient.put('/trips/1', {})).rejects.toMatchObject({
      statusCode: 500,
    });
    expect(putCount).toBe(2);
  });

  it('refresh エンドポイント自身が 403 を返してもリトライしない（自己ループ防止）', async () => {
    let refreshCount = 0;
    server.use(
      http.get(`*/trips/url/${URL_ID}`, () => {
        refreshCount += 1;
        return new HttpResponse(null, { status: 403 });
      })
    );

    await expect(apiClient.get(`/trips/url/${URL_ID}`)).rejects.toThrow();
    expect(refreshCount).toBe(1);
  });

  it('tripAtom に urlId が無い場合は refresh を起動しない', async () => {
    setTrip(null);
    let refreshCount = 0;
    server.use(
      http.get('*/trips/url/:urlId', () => {
        refreshCount += 1;
        return new HttpResponse(null, { status: 403 });
      }),
      http.put('*/trips/1', () => new HttpResponse(null, { status: 403 }))
    );

    await expect(apiClient.put('/trips/1', {})).rejects.toThrow();
    expect(refreshCount).toBe(0);
  });
});
