import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Page } from '@/types';
import type { Trip } from '@/types/trip';
import { Logo } from './Logo';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type HeaderProps = {
  trip: Trip;
  pages: Page[];
  mode?: 'view' | 'edit';
  selectedPageId?: Page['id'];
  onSelectPage: (pageId: Page['id']) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  setMode: Dispatch<SetStateAction<'view' | 'edit'>>;
  className?: string;
};

export function Header({
  pages,
  trip,
  mode = 'view',
  selectedPageId,
  onSelectPage,
  setMode,
  className,
  scrollContainerRef,
}: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollY = useRef(0);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef?.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const deltaY = scrollTop - scrollY.current;

    // isScrolledの次の状態を計算する
    let nextIsScrolled = isScrolled;

    if (scrollTop < 50) {
      // ページ最上部では常に表示
      nextIsScrolled = false;
    } else if (Math.abs(deltaY) > 10) {
      if (deltaY < 0 && isScrolled) {
        // 上スクロール and ヘッダーが非表示中 -> 表示させる
        nextIsScrolled = false;
      } else if (deltaY > 0 && !isScrolled) {
        // 下スクロール and ヘッダーが表示中 -> 非表示にさせる
        nextIsScrolled = true;
      }
    }

    if (nextIsScrolled !== isScrolled) {
      setIsScrolled(nextIsScrolled);
    } else {
      // 状態が変化しなかった場合のみ、スクロール位置の基準を更新
      // レイアウトシフトによる誤作動を防ぐ
      scrollY.current = scrollTop;
    }
  }, [isScrolled, scrollContainerRef]);

  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll, scrollContainerRef]);

  const selectedPage = selectedPageId ? pages.find(page => page.id === selectedPageId) : pages[0];

  return (
    <div
      data-component='header'
      className={cn(
        'sticky top-0 right-0 left-0 z-10 flex w-full flex-col justify-center gap-1 bg-teal-50/80 px-6 py-2 backdrop-blur-sm transition-all duration-300 ease-in-out',
        className
      )}
    >
      <Logo size={isScrolled ? 'small' : 'medium'} />
      <div className='flex flex-row items-center justify-center gap-4'>
        <div className={cn('transition-all duration-300 ease-in-out', isScrolled ? 'text-16px' : 'text-20px')}>
          {trip.title}
        </div>
        {isScrolled ? (
          selectedPage && (
            <Badge variant='outline' className='bg-white transition-all duration-300 ease-in-out'>
              {selectedPage.title}
            </Badge>
          )
        ) : (
          <Select value={String(selectedPageId)} onValueChange={v => onSelectPage(Number(v))}>
            <SelectTrigger className='bg-white transition-all duration-300 ease-in-out'>
              <SelectValue placeholder='ページ選択' />
            </SelectTrigger>
            <SelectContent>
              {pages.map(page => (
                <SelectItem key={page.id} value={String(page.id)}>
                  {page.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {!isScrolled && (
          <div className='flex flex-row gap-x-4 transition-all duration-300 ease-in-out'>
            {mode === 'edit' ? (
              <>
                <Button variant='default' onClick={() => setMode('view')}>
                  閲覧モード
                </Button>
                <Button variant='secondary'>ページ情報編集</Button>
              </>
            ) : (
              <Button variant='default' onClick={() => setMode('edit')}>
                編集モード
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
