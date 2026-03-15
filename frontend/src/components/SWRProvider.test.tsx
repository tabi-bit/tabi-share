import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

// vi.mockファクトリ内で参照するためvi.hoisted()で宣言
const { mockRunCacheCleanup, hydrateDeferred } = vi.hoisted(() => {
  const mockRunCacheCleanup = vi.fn<() => Promise<void>>();

  // hydratePromiseを外部から制御するためのdeferred
  let resolve: () => void;
  const promise = new Promise<void>(r => {
    resolve = r;
  });

  return {
    mockRunCacheCleanup,
    hydrateDeferred: {
      promise,
      resolve: () => resolve(),
    },
  };
});

vi.mock('@/lib/swrCacheProvider', () => ({
  createSwrCacheProvider: () => ({
    provider: () => new Map(),
    hydratePromise: hydrateDeferred.promise,
  }),
}));

vi.mock('@/lib/swrCacheCleanup', () => ({
  runCacheCleanup: () => mockRunCacheCleanup(),
}));

import { SWRProvider } from '@/components/SWRProvider';

describe('SWRProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunCacheCleanup.mockResolvedValue(undefined);
  });

  it('hydration完了前はchildrenがレンダリングされない', () => {
    render(
      <SWRProvider>
        <div data-testid='child'>テスト</div>
      </SWRProvider>
    );

    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

  it('hydration完了後にchildrenがレンダリングされる', async () => {
    render(
      <SWRProvider>
        <div data-testid='child'>テスト</div>
      </SWRProvider>
    );

    hydrateDeferred.resolve();

    await waitFor(() => {
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });
  });

  it('hydration完了後にrunCacheCleanup()が呼ばれる', async () => {
    render(
      <SWRProvider>
        <div>テスト</div>
      </SWRProvider>
    );

    hydrateDeferred.resolve();

    await waitFor(() => {
      expect(mockRunCacheCleanup).toHaveBeenCalledTimes(1);
    });
  });

  it('runCacheCleanup()が失敗してもchildrenは正常にレンダリングされる', async () => {
    mockRunCacheCleanup.mockRejectedValue(new Error('cleanup error'));

    render(
      <SWRProvider>
        <div data-testid='child'>テスト</div>
      </SWRProvider>
    );

    hydrateDeferred.resolve();

    await waitFor(() => {
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });
  });
});
