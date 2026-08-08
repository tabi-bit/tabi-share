import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useDebugPanel } from '@/hooks/useDebugPanel';

const STORAGE_KEY = '__app_debug_panel__';

const renderWithSearch = (search: string) =>
  renderHook(() => useDebugPanel(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[`/${search}`]}>{children}</MemoryRouter>
    ),
  });

describe('useDebugPanel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('query も localStorage も無ければ非表示', () => {
    const { result } = renderWithSearch('');
    expect(result.current).toBe(false);
  });

  it('?debug=1 で表示され localStorage に永続化される', () => {
    const { result } = renderWithSearch('?debug=1');
    expect(result.current).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('1');
  });

  it('永続化済みなら query 無しでも表示される (PWA インストール後の経路)', () => {
    localStorage.setItem(STORAGE_KEY, '1');
    const { result } = renderWithSearch('');
    expect(result.current).toBe(true);
  });

  it('?debug=0 で非表示になり localStorage も解除される', () => {
    localStorage.setItem(STORAGE_KEY, '1');
    const { result } = renderWithSearch('?debug=0');
    expect(result.current).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('debug 以外の query は状態に影響しない', () => {
    localStorage.setItem(STORAGE_KEY, '1');
    const { result } = renderWithSearch('?focusBlock=42');
    expect(result.current).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('1');
  });
});
