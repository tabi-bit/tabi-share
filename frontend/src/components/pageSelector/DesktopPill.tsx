import { useAtomValue, useSetAtom } from 'jotai';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import {
  selectedPageAtom,
  selectedPageIdAtom,
  selectedPageIndexAtom,
  tripModeAtom,
  tripPagesAtom,
} from '@/atoms/tripPage';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { PageLabel } from './PageLabel';
import { PageSelectorList } from './PopoverContent';
import { PILL_SURFACE_CLASSES } from './pillStyles';

type DesktopPillProps = {
  onEditPage: () => void;
  onAddPage: () => void;
};

/**
 * デスクトップ向け上部フローティング pill。
 * `[‹ ページ名 ⌄ ›]` の 3 要素構成。ヘッダー直下に絶対配置される想定。
 * - chevron 両側 = 隣接ページ 1 タップ移動 (先頭/末尾は disabled)
 * - 中央クリック = Popover が下向きに展開
 * - ラベル幅は grid stack で Trip 内最長タイトルに揃え、`max-w-[280px]` で上限クランプ
 *   → 同一 Trip 内では chevron 位置が動かず、押しやすさが安定する
 *
 * 表示条件:
 * - 閲覧モード: 2 ページ以上 (ナビゲート先がある時のみ)
 * - 編集モード: 1 ページ以上 (Popover の「+ ページを追加」導線を常時提供、chevron は両側 disabled)
 */
export const DesktopPill = ({ onEditPage, onAddPage }: DesktopPillProps) => {
  const pages = useAtomValue(tripPagesAtom);
  const selectedPage = useAtomValue(selectedPageAtom);
  const activeIndex = useAtomValue(selectedPageIndexAtom);
  const setSelectedPageId = useSetAtom(selectedPageIdAtom);
  const mode = useAtomValue(tripModeAtom);
  const [open, setOpen] = useState(false);

  if (!selectedPage) return null;
  if (mode === 'view' && pages.length <= 1) return null;

  const canPrev = activeIndex > 0;
  const canNext = activeIndex < pages.length - 1;

  return (
    <div
      className={cn(
        'hidden sm:flex',
        '-translate-x-1/2 absolute top-full left-1/2 z-20',
        'mt-3 items-center gap-0.5 rounded-full p-1',
        PILL_SURFACE_CLASSES
      )}
    >
      <NavArrowButton
        direction='prev'
        disabled={!canPrev}
        onClick={() => setSelectedPageId(pages[activeIndex - 1].id)}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type='button'
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5',
              'text-14px transition-colors hover:bg-white/60'
            )}
            aria-label='ページ一覧を開く'
          >
            <span className='grid min-w-0 max-w-[280px] grid-cols-[minmax(0,max-content)] items-center'>
              {pages.map(p => (
                <PageLabel
                  key={p.id}
                  page={p}
                  className='pointer-events-none invisible col-start-1 row-start-1 h-0 overflow-hidden'
                />
              ))}
              <PageLabel page={selectedPage} className='col-start-1 row-start-1' />
            </span>
            <ChevronDown className='size-3.5 shrink-0 text-slate-500' />
          </button>
        </PopoverTrigger>
        <PopoverContent side='bottom' sideOffset={8} align='center' className='w-[min(90vw,360px)] overflow-hidden p-0'>
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
      <NavArrowButton
        direction='next'
        disabled={!canNext}
        onClick={() => setSelectedPageId(pages[activeIndex + 1].id)}
      />
    </div>
  );
};

type NavArrowButtonProps = {
  direction: 'prev' | 'next';
  disabled: boolean;
  onClick: () => void;
};

const NavArrowButton = ({ direction, disabled, onClick }: NavArrowButtonProps) => {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;
  const label = direction === 'prev' ? '前のページ' : '次のページ';
  return (
    <button
      type='button'
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-grid size-8 cursor-pointer place-items-center rounded-full text-slate-600 transition-colors',
        'enabled:hover:bg-white/60 enabled:hover:text-teal-700',
        'disabled:cursor-not-allowed disabled:opacity-30'
      )}
    >
      <Icon className='size-4' />
    </button>
  );
};
