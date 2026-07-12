import { useAtomValue, useSetAtom } from 'jotai';
import { ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { selectedPageAtom, selectedPageIdAtom, selectedPageIndexAtom, tripPagesAtom } from '@/atoms/tripPage';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { PageLabel } from './PageLabel';
import { PageSelectorList } from './PopoverContent';
import { PILL_SURFACE_CLASSES } from './pillStyles';

type MobilePillProps = {
  onEditPage: () => void;
  onAddPage: () => void;
};

const MAX_DOTS = 5;

/**
 * モバイル向け下部フローティング pill。
 * `[ドット群 | ページ名 ⌄]` を 1 行に統合。タップで Popover が上向きに展開。
 * ページ数が MAX_DOTS を超える場合は「2/8」の番号表記に切替。
 *
 * `position: fixed` は Header の backdrop-filter が containing block を作ってしまい
 * viewport 基準にならなくなるため、`document.body` へ Portal してその外に出す。
 */
export const MobilePill = ({ onEditPage, onAddPage }: MobilePillProps) => {
  const pages = useAtomValue(tripPagesAtom);
  const selectedPage = useAtomValue(selectedPageAtom);
  const activeIndex = useAtomValue(selectedPageIndexAtom);
  const setSelectedPageId = useSetAtom(selectedPageIdAtom);
  const [open, setOpen] = useState(false);

  if (pages.length <= 1 || !selectedPage) return null;

  const showNumberInsteadOfDots = pages.length > MAX_DOTS;

  const pill = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type='button'
          className={cn(
            'sm:hidden',
            '-translate-x-1/2 fixed bottom-2 left-1/2 z-20',
            'flex max-w-[90vw] items-center gap-2 rounded-full px-2 py-1.5',
            PILL_SURFACE_CLASSES,
            'transition-colors hover:bg-white/85'
          )}
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
          aria-label='ページを選択'
        >
          {showNumberInsteadOfDots ? (
            <span className='inline-flex items-center px-1 font-semibold text-12px text-slate-700'>
              {activeIndex + 1}
              <span className='mx-1 font-normal text-slate-500'>of</span>
              {pages.length}
            </span>
          ) : (
            <span className='flex items-center gap-1 px-1'>
              {pages.map((page, i) => (
                <span
                  key={page.id}
                  className={cn(
                    'block rounded-full transition-all',
                    i === activeIndex ? 'h-1.5 w-4 bg-teal-600' : 'size-1.5 bg-slate-400/60'
                  )}
                />
              ))}
            </span>
          )}
          <span className='h-4 w-px bg-slate-300/70' />
          <PageLabel page={selectedPage} className='max-w-[60vw] text-14px' />
          <ChevronUp className='size-3.5 shrink-0 text-slate-500' />
        </button>
      </PopoverTrigger>
      <PopoverContent side='top' sideOffset={8} align='center' className='w-[min(90vw,360px)] p-0'>
        <PageSelectorList
          onSelect={id => {
            setSelectedPageId(id);
            setOpen(false);
          }}
          onEditPage={id => {
            setSelectedPageId(id);
            setOpen(false);
            onEditPage();
          }}
          onAddPage={() => {
            setOpen(false);
            onAddPage();
          }}
        />
      </PopoverContent>
    </Popover>
  );

  return createPortal(pill, document.body);
};
