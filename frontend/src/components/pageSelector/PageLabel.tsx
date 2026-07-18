import { formatDateMDWithDow } from '@/lib/date';
import { cn } from '@/lib/utils';

type PageLabelProps = {
  page: { title: string; date?: Date | null };
  className?: string;
};

/**
 * `[M/D(曜)] タイトル` の pill / Popover 共通ラベル。
 * pill 内では 1 行に横並び。長いタイトルは `truncate` で省略。
 */
export const PageLabel = ({ page, className }: PageLabelProps) => (
  <span className={cn('flex min-w-0 items-center gap-x-2', className)}>
    {page.date && (
      <span className='shrink-0 whitespace-nowrap font-mono text-12px text-slate-500'>
        {formatDateMDWithDow(page.date)}
      </span>
    )}
    <span className='min-w-0 truncate'>{page.title}</span>
  </span>
);
