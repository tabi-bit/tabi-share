import { cn } from '@/lib/utils';
import { categoryStyle } from '../format';

interface CategoryThumbProps {
  category: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** 仮: Places の写真が入る位置。今はカテゴリの頭文字を置く */
export function CategoryThumb({ category, size = 'md', className }: CategoryThumbProps) {
  const { glyph, className: color } = categoryStyle(category);
  return (
    <div
      aria-hidden='true'
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg font-bold',
        size === 'sm' && 'size-12 text-16px',
        size === 'md' && 'size-16 text-18px',
        size === 'lg' && 'h-60 w-full rounded-none text-24px',
        color,
        className
      )}
    >
      {glyph}
    </div>
  );
}
