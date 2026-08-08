import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider as JotaiProvider } from 'jotai';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tripModeAtom } from '@/atoms/tripPage';
import { useEditModeBackGuard } from '@/hooks/useEditModeBackGuard';
import { appStore } from '@/lib/store';

const TripPageHost = () => {
  useEditModeBackGuard();
  return <Link to='/'>トップへ</Link>;
};

const renderTripPage = () =>
  render(
    <JotaiProvider store={appStore}>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<div>HOME PAGE</div>} />
          <Route path='/trip/:urlId' element={<TripPageHost />} />
        </Routes>
      </BrowserRouter>
    </JotaiProvider>
  );

describe('useEditModeBackGuard', () => {
  beforeEach(() => {
    appStore.set(tripModeAtom, 'edit');
    window.history.pushState({}, '', '/trip/abc');
  });

  // #187: cleanup の history.back() が画面遷移時にも走り、旅程ページへ引き戻していた
  it('Editモード中に画面遷移した場合は back せず遷移先に留まる', async () => {
    const backSpy = vi.spyOn(window.history, 'back');
    renderTripPage();

    await userEvent.click(screen.getByRole('link', { name: 'トップへ' }));
    await waitFor(() => expect(screen.getByText('HOME PAGE')).toBeInTheDocument());

    expect(backSpy).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/');
    backSpy.mockRestore();
  });

  it('ページ内でViewモードに戻った場合はダミー履歴エントリを back で消す', async () => {
    const backSpy = vi.spyOn(window.history, 'back');
    renderTripPage();

    expect((window.history.state as { editMode?: boolean } | null)?.editMode).toBe(true);

    act(() => appStore.set(tripModeAtom, 'view'));

    await waitFor(() => expect(backSpy).toHaveBeenCalledTimes(1));
    expect(window.location.pathname).toBe('/trip/abc');
    backSpy.mockRestore();
  });
});
