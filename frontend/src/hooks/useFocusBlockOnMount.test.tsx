import { act, render, waitFor } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { HttpResponse, http } from 'msw';
import type { ReactNode } from 'react';
import { BrowserRouter, MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { selectedPageIdAtom } from '@/atoms/tripPage';
import { useFocusBlockOnMount } from '@/hooks/useFocusBlockOnMount';
import { appStore } from '@/lib/store';
import { server } from '../../tests/msw/server';

// jsdom は scrollIntoView を提供しないので prototype に stub を生やす
const scrollIntoViewMock = vi.fn();
Element.prototype.scrollIntoView = scrollIntoViewMock as unknown as Element['scrollIntoView'];

const scheduleBlockJson = (id: number, pageId: number) => ({
  id,
  page_id: pageId,
  block_type: 'event' as const,
  title: 'schedule block',
  start_time: '2026-01-01T09:00:00',
  end_time: '2026-01-01T10:00:00',
  detail: null,
  location_id: null,
  location: null,
});

const LocationCapture = ({ onLocation }: { onLocation: (search: string) => void }) => {
  const location = useLocation();
  onLocation(location.search);
  return null;
};

const HookHost = () => {
  useFocusBlockOnMount();
  return <div data-block-id='42'>target</div>;
};

const renderWithRouter = (initialPath: string, onLocation: (search: string) => void) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <JotaiProvider store={appStore}>
      <MemoryRouter initialEntries={[initialPath]}>
        <LocationCapture onLocation={onLocation} />
        <Routes>
          <Route path='*' element={children} />
        </Routes>
      </MemoryRouter>
    </JotaiProvider>
  );
  return render(<HookHost />, { wrapper: Wrapper });
};

describe('useFocusBlockOnMount', () => {
  beforeEach(() => {
    appStore.set(selectedPageIdAtom, undefined);
    scrollIntoViewMock.mockReset();
  });

  it('?focusBlock が無ければ何もしない', async () => {
    let currentSearch = '';
    renderWithRouter('/trip/abc', s => {
      currentSearch = s;
    });

    // マウント直後に副作用が完了する
    await waitFor(() => {
      expect(currentSearch).toBe('');
    });
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
    expect(appStore.get(selectedPageIdAtom)).toBeUndefined();
  });

  it('非数値の focusBlock は block fetch せず query param のみ掃除する', async () => {
    let apiCalled = false;
    server.use(
      http.get('*/blocks/*', () => {
        apiCalled = true;
        return HttpResponse.json({});
      })
    );

    let currentSearch = 'initial';
    renderWithRouter('/trip/abc?focusBlock=abc', s => {
      currentSearch = s;
    });

    await waitFor(() => {
      expect(currentSearch).toBe('');
    });
    expect(apiCalled).toBe(false);
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
    expect(appStore.get(selectedPageIdAtom)).toBeUndefined();
  });

  it('block ロード成功時に selectedPageId 切り替え + scrollIntoView + query param 掃除を行う', async () => {
    server.use(http.get('*/blocks/42', () => HttpResponse.json(scheduleBlockJson(42, 7))));

    let currentSearch = 'initial';
    renderWithRouter('/trip/abc?focusBlock=42', s => {
      currentSearch = s;
    });

    await waitFor(() => {
      expect(appStore.get(selectedPageIdAtom)).toBe(7);
    });
    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    });
    await waitFor(() => {
      expect(currentSearch).toBe('');
    });
  });

  it('block が 404 の場合は selectedPageId を変えず query param のみ掃除する', async () => {
    server.use(http.get('*/blocks/999', () => new HttpResponse(null, { status: 404 })));

    let currentSearch = 'initial';
    renderWithRouter('/trip/abc?focusBlock=999', s => {
      currentSearch = s;
    });

    await waitFor(() => {
      expect(currentSearch).toBe('');
    });
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
    expect(appStore.get(selectedPageIdAtom)).toBeUndefined();
  });

  it('同一マウント中に focusBlock が 42→99 と変わったら 2 回目も再処理する', async () => {
    server.use(
      http.get('*/blocks/42', () => HttpResponse.json(scheduleBlockJson(42, 7))),
      http.get('*/blocks/99', () => HttpResponse.json(scheduleBlockJson(99, 11)))
    );

    // SW → postMessage → useFcmNavigationListener の navigate() で同一マウント中に
    // URL の focusBlock が差し替わるフローを再現するため、テスト内で navigate を外に取り出す。
    const navigateHandle: { current: ((to: string) => void) | null } = { current: null };
    const NavigateHandle = () => {
      navigateHandle.current = useNavigate();
      return null;
    };

    const searchRef = { current: '' };
    const captureSearch = (s: string) => {
      searchRef.current = s;
    };

    // 初期 URL を含めて BrowserRouter に載せる (window.history 経由で navigate 可能)
    window.history.replaceState({}, '', '/trip/abc?focusBlock=42');

    const Wrapper = ({ children }: { children: ReactNode }) => (
      <JotaiProvider store={appStore}>
        <BrowserRouter>
          <NavigateHandle />
          <LocationCapture onLocation={captureSearch} />
          <Routes>
            <Route path='*' element={children} />
          </Routes>
        </BrowserRouter>
      </JotaiProvider>
    );

    render(
      <>
        <HookHost />
        <div data-block-id='99'>target-99</div>
      </>,
      { wrapper: Wrapper }
    );

    // 1 回目: focusBlock=42 の処理完了を待つ
    await waitFor(() => {
      expect(appStore.get(selectedPageIdAtom)).toBe(7);
    });
    await waitFor(() => {
      expect(searchRef.current).toBe('');
    });
    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    });

    // 2 回目: SPA navigate で URL に別の focusBlock を差し込む
    scrollIntoViewMock.mockClear();
    act(() => {
      navigateHandle.current?.('/trip/abc?focusBlock=99');
    });

    await waitFor(() => {
      expect(appStore.get(selectedPageIdAtom)).toBe(11);
    });
    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    });
    await waitFor(() => {
      expect(searchRef.current).toBe('');
    });
  });

  it('focusBlock=0 は block ID として無効なので query 掃除だけ行う', async () => {
    let apiCalled = false;
    server.use(
      http.get('*/blocks/*', () => {
        apiCalled = true;
        return HttpResponse.json({});
      })
    );

    let currentSearch = 'initial';
    renderWithRouter('/trip/abc?focusBlock=0', s => {
      currentSearch = s;
    });

    await waitFor(() => {
      expect(currentSearch).toBe('');
    });
    expect(apiCalled).toBe(false);
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
    expect(appStore.get(selectedPageIdAtom)).toBeUndefined();
  });

  it('同じ focusBlock=42 が clearParam 後にもう一度来ても再処理する', async () => {
    server.use(http.get('*/blocks/42', () => HttpResponse.json(scheduleBlockJson(42, 7))));

    const navigateHandle: { current: ((to: string) => void) | null } = { current: null };
    const NavigateHandle = () => {
      navigateHandle.current = useNavigate();
      return null;
    };

    const searchRef = { current: '' };
    const captureSearch = (s: string) => {
      searchRef.current = s;
    };

    window.history.replaceState({}, '', '/trip/abc?focusBlock=42');

    const Wrapper = ({ children }: { children: ReactNode }) => (
      <JotaiProvider store={appStore}>
        <BrowserRouter>
          <NavigateHandle />
          <LocationCapture onLocation={captureSearch} />
          <Routes>
            <Route path='*' element={children} />
          </Routes>
        </BrowserRouter>
      </JotaiProvider>
    );

    render(
      <>
        <HookHost />
      </>,
      { wrapper: Wrapper }
    );

    // 1 回目: focusBlock=42 の処理完了 (page 切替 + scroll + clearParam) を待つ
    await waitFor(() => {
      expect(appStore.get(selectedPageIdAtom)).toBe(7);
    });
    await waitFor(() => {
      expect(searchRef.current).toBe('');
    });
    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    });

    // 2 回目: URL が /trip/abc に戻った状態から、同じ block へ再通知タップを再現
    scrollIntoViewMock.mockClear();
    appStore.set(selectedPageIdAtom, undefined);
    act(() => {
      navigateHandle.current?.('/trip/abc?focusBlock=42');
    });

    await waitFor(() => {
      expect(appStore.get(selectedPageIdAtom)).toBe(7);
    });
    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    });
    await waitFor(() => {
      expect(searchRef.current).toBe('');
    });
  });
});
