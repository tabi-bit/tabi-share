import { renderHook } from '@testing-library/react';
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

describe('useFcmNavigationListener', () => {
  beforeEach(() => {
    swListeners.clear();
    mockNavigate.mockClear();
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: swStub,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: undefined,
    });
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

  it('現在 URL と一致するときは navigate しない', () => {
    renderHook(() => useFcmNavigationListener());

    dispatchSwMessage({ type: 'FCM_NAVIGATE', url: window.location.href });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
