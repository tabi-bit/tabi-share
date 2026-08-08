import { afterEach, describe, expect, it, vi } from 'vitest';
import { shouldShowNotificationButton } from './platform';

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

const setUserAgent = (ua: string) => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);
};

const setStandalone = (standalone: boolean) => {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    query => ({ matches: standalone && query.includes('standalone') }) as MediaQueryList
  );
};

/** iOS Safari のタブは Notification / PushManager を露出しない */
const setWebPushApis = (available: boolean) => {
  for (const key of ['Notification', 'PushManager'] as const) {
    if (available) {
      vi.stubGlobal(key, class {});
    } else {
      Reflect.deleteProperty(window, key);
    }
  }
  Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true });
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('shouldShowNotificationButton', () => {
  it('iOS 非 PWA は Web Push API が無くても true (install で解決できるため)', () => {
    setUserAgent(IPHONE_UA);
    setStandalone(false);
    setWebPushApis(false);
    expect(shouldShowNotificationButton()).toBe(true);
  });

  it('iOS PWA は true', () => {
    setUserAgent(IPHONE_UA);
    setStandalone(true);
    setWebPushApis(true);
    expect(shouldShowNotificationButton()).toBe(true);
  });

  it('対応ブラウザは true', () => {
    setUserAgent(ANDROID_UA);
    setStandalone(false);
    setWebPushApis(true);
    expect(shouldShowNotificationButton()).toBe(true);
  });

  it('iOS 以外の非対応ブラウザは false', () => {
    setUserAgent(ANDROID_UA);
    setStandalone(false);
    setWebPushApis(false);
    expect(shouldShowNotificationButton()).toBe(false);
  });
});
