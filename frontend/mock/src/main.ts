import { getResponse } from 'msw';
import { apiClient } from '@/lib/apiClient';
import { resetDb } from './db';
import { handlers } from './handlers';

// ?reset=1 で閲覧者の localStorage に溜まったモックデータを初期状態に戻す
const url = new URL(window.location.href);
if (url.searchParams.has('reset')) {
  resetDb();
  url.searchParams.delete('reset');
  window.location.replace(url);
} else {
  /**
   * Service Worker (setupWorker) は使わず、ページ内の fetch で /api を横取りする。
   * モバイルでタブを裏に回すと SW が止まり、復帰時の再取得が素通りして Vite の index.html が返り
   * ZodError になるため。
   */
  const originalFetch = window.fetch.bind(window);
  const mockFetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    if (new URL(request.url).pathname.startsWith('/api/')) {
      const response = await getResponse(handlers, request);
      return (
        response ??
        new Response(JSON.stringify({ detail: 'モックに該当するハンドラがありません' }), {
          status: 501,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }
    return originalFetch(input, init);
  };
  window.fetch = mockFetch;
  // axios は XHR を使うため、fetch アダプタに切り替えて上の横取りを通す
  apiClient.defaults.adapter = 'fetch';
  apiClient.defaults.env = { ...apiClient.defaults.env, fetch: mockFetch };

  // 以前の版で登録された MSW の Service Worker が残っていれば外す
  const registrations = (await navigator.serviceWorker?.getRegistrations()) ?? [];
  await Promise.all(
    registrations.filter(r => r.active?.scriptURL.endsWith('/mockServiceWorker.js')).map(r => r.unregister())
  );

  await import('../../src/main.tsx');
}
