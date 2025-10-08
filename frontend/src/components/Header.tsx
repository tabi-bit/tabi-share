import { useCallback, useEffect, useState } from 'react';
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
  selectedPageId?: string;
  onSelectPage: (pageId: string) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
};

export function Header({
  pages,
  trip,
  mode = 'view',
  selectedPageId,
  onSelectPage,
  className,
  scrollContainerRef,
}: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef?.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    // ヘッダーの大きさを考慮して間を空ける
    if (!isScrolled && scrollTop > 100) {
      setIsScrolled(true);
      return;
    } else if (isScrolled && scrollTop <= 50) {
      setIsScrolled(false);
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
          <Select value={selectedPageId} onValueChange={v => onSelectPage(v)}>
            <SelectTrigger className='bg-white transition-all duration-300 ease-in-out'>
              <SelectValue placeholder='ページ選択' />
            </SelectTrigger>
            <SelectContent>
              {pages.map(page => (
                <SelectItem key={page.id} value={page.id}>
                  {page.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {!isScrolled && (
          <div className='transition-all duration-300 ease-in-out'>
            {mode === 'edit' ? (
              <Button variant='secondary'>ページ情報編集</Button>
            ) : (
              <Button variant='default'>編集モード</Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
