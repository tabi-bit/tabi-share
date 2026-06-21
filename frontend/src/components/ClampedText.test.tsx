import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// useLineClamp は ResizeObserver に依存するため、ClampedText 単体の描画・props 透過を
// 検証する目的では固定値を返すモックに差し替える（行数計算自体は useLineClamp.test で検証）。
vi.mock('@/hooks/useLineClamp', () => ({
  useLineClamp: () => ({ ref: { current: null }, lineClamp: 3 }),
}));

import { ClampedText } from './ClampedText';

describe('ClampedText', () => {
  it('children のテキストを表示する', () => {
    render(<ClampedText>サンプルタイトル</ClampedText>);
    expect(screen.getByText('サンプルタイトル')).toBeInTheDocument();
  });

  it('div の属性(className・任意属性)を外側ラッパーに透過する', () => {
    render(
      <ClampedText className='outer-class' data-testid='clamp' aria-label='タイトル'>
        テキスト
      </ClampedText>
    );
    const outer = screen.getByTestId('clamp');
    expect(outer).toHaveClass('outer-class');
    expect(outer).toHaveAttribute('aria-label', 'タイトル');
  });

  it('内側要素に省略表示用のスタイルとクリップを適用する', () => {
    render(<ClampedText>テキスト</ClampedText>);
    const inner = screen.getByText('テキスト');
    expect(inner).toHaveClass('overflow-hidden');
    expect(inner).toHaveStyle({ display: '-webkit-box' });
  });
});
