import useEmblaCarousel from 'embla-carousel-react';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Page } from '@/types';

type PageSwipeContainerProps = {
  pages: Page[];
  selectedPageId: Page['id'] | undefined;
  onSelectPage: (pageId: Page['id']) => void;
  renderPage: (page: Page) => ReactNode;
  /** 現在アクティブなスライドのスクロールコンテナの ref を外部に公開する */
  activeSlideScrollRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
};

const PageSwipeContainer = ({
  pages,
  selectedPageId,
  onSelectPage,
  renderPage,
  activeSlideScrollRef,
  className,
}: PageSwipeContainerProps) => {
  const selectedIndex = pages.findIndex(p => p.id === selectedPageId);
  const [activeSnapIndex, setActiveSnapIndex] = useState(selectedIndex >= 0 ? selectedIndex : 0);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    startIndex: selectedIndex >= 0 ? selectedIndex : 0,
    watchSlides: true,
  });

  // スワイプ → selectedPageId の同期 + ドットインジケーター更新
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    setActiveSnapIndex(index);
    const page = pages[index];
    if (page && page.id !== selectedPageId) {
      onSelectPage(page.id);
    }
  }, [emblaApi, pages, selectedPageId, onSelectPage]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // selectedPageId → embla スライド位置の同期（Header Select から変更された場合）
  useEffect(() => {
    if (!emblaApi) return;
    const targetIndex = pages.findIndex(p => p.id === selectedPageId);
    if (targetIndex >= 0 && targetIndex !== emblaApi.selectedScrollSnap()) {
      emblaApi.scrollTo(targetIndex);
    }
  }, [emblaApi, pages, selectedPageId]);

  // アクティブスライドの scroll コンテナを外部 ref に接続
  useEffect(() => {
    if (!activeSlideScrollRef) return;
    const activeSlide = slideRefs.current[activeSnapIndex] ?? null;
    // MutableRefObject として current を書き換え
    (activeSlideScrollRef as React.MutableRefObject<HTMLDivElement | null>).current = activeSlide;
  }, [activeSnapIndex, activeSlideScrollRef]);

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div ref={emblaRef} className='min-h-0 flex-1 overflow-hidden'>
        <div className='flex h-full'>
          {pages.map((page, index) => (
            <div
              key={page.id}
              ref={(node: HTMLDivElement | null) => {
                slideRefs.current[index] = node;
              }}
              className='h-full min-w-0 flex-[0_0_100%] overflow-y-auto overscroll-y-none'
            >
              {renderPage(page)}
            </div>
          ))}
        </div>
      </div>
      {/* ドットインジケーター */}
      {pages.length > 1 && (
        <div className='-translate-x-1/2 fixed bottom-1 left-1/2 flex items-center justify-center gap-1.5 rounded-full bg-white/80 px-1 py-1'>
          {pages.map((page, index) => (
            <button
              key={page.id}
              type='button'
              className={cn(
                'size-2 rounded-full transition-colors',
                index === activeSnapIndex ? 'bg-teal-600' : 'bg-gray-300'
              )}
              onClick={() => onSelectPage(page.id)}
              aria-label={page.title}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export { PageSwipeContainer };
