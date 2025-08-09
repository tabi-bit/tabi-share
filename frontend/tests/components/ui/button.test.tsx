import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('デフォルトのボタンがレンダリングされる', () => {
    render(<Button>テストボタン</Button>);

    const button = screen.getByRole('button', { name: 'テストボタン' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('data-slot', 'button');
  });

  it('クリックイベントが正しく動作する', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>クリックボタン</Button>);

    const button = screen.getByRole('button', { name: 'クリックボタン' });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disabled状態でクリックイベントが発火しない', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <Button onClick={handleClick} disabled>
        無効ボタン
      </Button>
    );

    const button = screen.getByRole('button', { name: '無効ボタン' });
    expect(button).toBeDisabled();

    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  describe('variant プロパティ', () => {
    describe('variant プロパティ', () => {
      it.each([
        {
          variant: 'default',
          expectedClasses: ['bg-primary', 'text-primary-foreground', 'shadow-xs'],
        },
        {
          variant: 'destructive',
          expectedClasses: ['bg-destructive', 'text-white', 'shadow-xs'],
        },
        {
          variant: 'outline',
          expectedClasses: ['border', 'bg-background', 'shadow-xs'],
        },
        {
          variant: 'secondary',
          expectedClasses: ['bg-secondary', 'text-secondary-foreground', 'shadow-xs'],
        },
        {
          variant: 'ghost',
          expectedClasses: ['hover:bg-accent', 'hover:text-accent-foreground'],
        },
        {
          variant: 'link',
          expectedClasses: ['text-primary', 'underline-offset-4'],
        },
      ] as const)('$variant variant のスタイルが適用される', ({ variant, expectedClasses }) => {
        render(<Button variant={variant}>{variant}</Button>);
        const button = screen.getByRole('button', { name: variant });
        expect(button).toHaveClass(...expectedClasses);
      });
    });
  });

  describe('size プロパティ', () => {
    it.each([
      {
        size: 'default',
        expectedClasses: ['h-9', 'px-4', 'py-2'],
      },
      {
        size: 'sm',
        expectedClasses: ['h-8', 'px-3'],
      },
      {
        size: 'lg',
        expectedClasses: ['h-10', 'px-6'],
      },
      {
        size: 'icon',
        expectedClasses: ['size-9'],
      },
    ] as const)('$size size のスタイルが適用される', ({ size, expectedClasses }) => {
      render(<Button size={size}>{size}サイズ</Button>);
      const button = screen.getByRole('button', { name: `${size}サイズ` });
      expect(button).toHaveClass(...expectedClasses);
    });
  });

  it('カスタムclassNameが適用される', () => {
    render(<Button className='custom-class'>カスタムクラス</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('asChild=true でSlotとして動作する', () => {
    render(
      <Button asChild>
        <a href='/test'>リンクボタン</a>
      </Button>
    );

    const link = screen.getByRole('link', { name: 'リンクボタン' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
    expect(link).toHaveAttribute('data-slot', 'button');
  });

  it('その他のpropsが正しく渡される', () => {
    render(<Button type='submit'>送信</Button>);

    const button = screen.getByRole('button', { name: '送信' });
    expect(button).toHaveAttribute('type', 'submit');
  });
});
