import { useAtomValue } from 'jotai';
import { Check, Pencil, Plus } from 'lucide-react';
import { selectedPageIdAtom, tripModeAtom, tripPagesAtom } from '@/atoms/tripPage';
import { formatDateMDWithDow } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { Page } from '@/types';

type PageSelectorListProps = {
  onSelect: (pageId: Page['id']) => void;
  onEditPage: (pageId: Page['id']) => void;
  onAddPage: () => void;
};

/**
 * pill タップで開く Popover の中身。ページ一覧 + 編集モード時のペン + 追加行。
 * 行は `<div role="button">` にして、内部の ✎ `<button>` とのボタンネストを避ける。
 */
export const PageSelectorList = ({ onSelect, onEditPage, onAddPage }: PageSelectorListProps) => {
  const pages = useAtomValue(tripPagesAtom);
  const selectedPageId = useAtomValue(selectedPageIdAtom);
  const mode = useAtomValue(tripModeAtom);

  return (
    <div className='flex max-h-[60vh] flex-col'>
      <div className='min-h-0 flex-1 overflow-y-auto py-1'>
        {pages.map((page, index) => {
          const isCurrent = page.id === selectedPageId;
          return (
            // biome-ignore lint/a11y/useSemanticElements: nested <button> would be invalid HTML; use role="button"
            <div
              key={page.id}
              role='button'
              tabIndex={0}
              aria-current={isCurrent}
              className={cn(
                'grid cursor-pointer grid-cols-[24px_1fr_auto] items-center gap-3 rounded-sm px-3 py-2 outline-none',
                'hover:bg-accent focus-visible:bg-accent'
              )}
              onClick={() => onSelect(page.id)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(page.id);
                }
              }}
            >
              <span className='text-center font-mono text-12px text-muted-foreground'>{index + 1}</span>
              <div className='flex min-w-0 flex-col'>
                <span
                  className={cn('flex min-w-0 items-center gap-1 font-medium text-14px', isCurrent && 'text-primary')}
                >
                  <span className='min-w-0 flex-1 truncate'>{page.title}</span>
                  {mode === 'edit' && (
                    <button
                      type='button'
                      aria-label={`${page.title} を編集`}
                      className='inline-grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground opacity-60 transition-opacity hover:bg-muted hover:text-foreground hover:opacity-100'
                      onClick={e => {
                        e.stopPropagation();
                        onEditPage(page.id);
                      }}
                    >
                      <Pencil className='size-3' />
                    </button>
                  )}
                </span>
                {page.date && (
                  <span className='mt-0.5 font-mono text-12px text-muted-foreground'>
                    {formatDateMDWithDow(page.date)}
                  </span>
                )}
              </div>
              <span className='inline-grid size-5 place-items-center text-primary'>
                {isCurrent && <Check className='size-4' aria-label='現在のページ' />}
              </span>
            </div>
          );
        })}
      </div>
      {mode === 'edit' && (
        <button
          type='button'
          className={cn(
            'grid shrink-0 cursor-pointer grid-cols-[24px_1fr] items-center gap-3 border-t bg-popover px-3 py-2 text-left font-semibold text-14px text-primary',
            'outline-none hover:bg-accent focus-visible:bg-accent'
          )}
          onClick={onAddPage}
        >
          <span className='inline-grid size-5 place-items-center'>
            <Plus className='size-4' />
          </span>
          <span>ページを追加</span>
        </button>
      )}
    </div>
  );
};
