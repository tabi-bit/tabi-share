import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

import { useFcmNavigationListener } from '@/hooks/useFcmNavigationListener';

type SwEventListener = (event: MessageEvent) => void;

const swListeners = new Set<SwEventListener>();

const swStub = {
  addEventListener: (type: string, listener: SwEventListener) => {
    if (type === 'message') swListeners.add(listener);
  },
  removeEventListener: (type: string, listener: SwEventListener) => {
    if (type === 'message') swListeners.delete(listener);
  },
};

const dispatchSwMessage = (data: unknown) => {
  const event = { data } as MessageEvent;
  for (const listener of swListeners) listener(event);
};

// jsdom は Cache API 未実装なのでインメモリスタブを差し込む
const cacheEntries = new Map<string, string>();

const cacheStub: Cache = {
  put: async (request: RequestInfo | URL, response: Response) => {
    const key = typeof request === 'string' ? request : (request as Request).url;
    cacheEntries.set(key, await response.text());
  },
  match: async (request: RequestInfo | URL) => {
    const key = typeof request === 'string' ? request : (request as Request).url;
    const value = cacheEntries.get(key);
    return value === undefined ? undefined : new Response(value);
  },
  delete: async (request: RequestInfo | URL) => {
    const key = typeof request === 'string' ? request : (request as Request).url;
    return cacheEntries.delete(key);
  },
} as unknown as Cache;

const cachesStub: CacheStorage = {
  open: async () => cacheStub,
} as unknown as CacheStorage;

const INTENT_KEY = 'http://localhost:3000/__fcm_pending_nav__';

const seedPendingIntent = (url: string) => {
  cacheEntries.set(INTENT_KEY, url);
};

describe('useFcmNavigationListener', () => {
  beforeEach(() => {
    swListeners.clear();
    cacheEntries.clear();
    mockNavigate.mockClear();
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: swStub,
    });
    vi.stubGlobal('caches', cachesStub);
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: undefined,
    });
    vi.unstubAllGlobals();
  });

  it('FCM_NAVIGATE メッセージ受信で navigate() を pathname+search+hash 付きで呼ぶ', () => {
    renderHook(() => useFcmNavigationListener());

    dispatchSwMessage({ type: 'FCM_NAVIGATE', url: 'http://localhost:3000/trip/abc?focusBlock=42#top' });

    expect(mockNavigate).toHaveBeenCalledExactlyOnceWith('/trip/abc?focusBlock=42#top');
  });

  it('FCM_NAVIGATE 以外のメッセージは無視する', () => {
    renderHook(() => useFcmNavigationListener());

    dispatchSwMessage({ type: 'SOME_OTHER', url: 'http://localhost:3000/trip/xxx' });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('別 origin の URL は無視する (open-redirect 対策)', () => {
    renderHook(() => useFcmNavigationListener());

    dispatchSwMessage({ type: 'FCM_NAVIGATE', url: 'https://evil.example.com/trip/abc' });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('非 http scheme (javascript:) は同 origin にならず遷移しない', () => {
    renderHook(() => useFcmNavigationListener());

    dispatchSwMessage({ type: 'FCM_NAVIGATE', url: 'javascript:alert(1)' });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('url が string でなければ無視する', () => {
    renderHook(() => useFcmNavigationListener());

    dispatchSwMessage({ type: 'FCM_NAVIGATE', url: 42 });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('data が undefined でも throw しない', () => {
    renderHook(() => useFcmNavigationListener());

    expect(() => dispatchSwMessage(undefined)).not.toThrow();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('unmount 時に listener を解除する', () => {
    const { unmount } = renderHook(() => useFcmNavigationListener());

    expect(swListeners.size).toBe(1);
    unmount();
    expect(swListeners.size).toBe(0);
  });

  it('navigator.serviceWorker が無い環境でも throw しない', () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: undefined,
    });

    expect(() => renderHook(() => useFcmNavigationListener())).not.toThrow();
    expect(swListeners.size).toBe(0);
  });

  it('mount 時に Cache Storage に intent があれば navigate する (postMessage 未着 fallback)', async () => {
    seedPendingIntent('http://localhost:3000/trip/xyz?focusBlock=7');

    renderHook(() => useFcmNavigationListener());

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledExactlyOnceWith('/trip/xyz?focusBlock=7');
    });
    expect(cacheEntries.has(INTENT_KEY)).toBe(false);
  });

  it('mount 時に intent が現在 URL と一致するなら navigate しない', async () => {
    seedPendingIntent(window.location.href);

    renderHook(() => useFcmNavigationListener());

    await Promise.resolve();
    await Promise.resolve();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('visibilitychange (visible) で cache 内 intent を消化する', async () => {
    renderHook(() => useFcmNavigationListener());

    seedPendingIntent('http://localhost:3000/trip/later?focusBlock=99');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledExactlyOnceWith('/trip/later?focusBlock=99');
    });
  });

  it('postMessage で navigate した場合は cache 内 intent も掃除する (二重 navigate 防止)', async () => {
    seedPendingIntent('http://localhost:3000/trip/abc?focusBlock=42');

    renderHook(() => useFcmNavigationListener());

    dispatchSwMessage({ type: 'FCM_NAVIGATE', url: 'http://localhost:3000/trip/abc?focusBlock=42' });

    await waitFor(() => {
      expect(cacheEntries.has(INTENT_KEY)).toBe(false);
    });
    // navigate は message 経由の 1 回のみ。mount 時 applyIntent は cache が既に空になってて no-op
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });
});
