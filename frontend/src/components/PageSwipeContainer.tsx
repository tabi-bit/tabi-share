import useEmblaCarousel from 'embla-carousel-react';
import { useAtom, useAtomValue } from 'jotai';
import { type ReactNode, useEffect, useRef } from 'react';
import { selectedPageIdAtom, selectedPageIndexAtom, tripPagesAtom } from '@/atoms/tripPage';
import { cn } from '@/lib/utils';
import type { Page } from '@/types';

type PageSwipeContainerProps = {
  renderPage: (page: Page) => ReactNode;
  /** アクティブなスライドのスクロールコンテナが変わったときに通知するコールバック */
  onActiveSlideChange?: (el: HTMLDivElement | null) => void;
  className?: string;
};

const PageSwipeContainer = ({ renderPage, onActiveSlideChange, className }: PageSwipeContainerProps) => {
  const pages = useAtomValue(tripPagesAtom);
  const [selectedPageId, setSelectedPageId] = useAtom(selectedPageIdAtom);
  const activeSnapIndex = useAtomValue(selectedPageIndexAtom);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    startIndex: activeSnapIndex,
    watchSlides: true,
  });

  // スワイプ → selectedPageId の同期
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      const index = emblaApi.selectedScrollSnap();
      const page = pages[index];
      if (page && page.id !== selectedPageId) {
        setSelectedPageId(page.id);
      }
    };
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, pages, selectedPageId, setSelectedPageId]);

  // selectedPageId → embla スライド位置の同期（pill / keyboard 経由の変更時）
  useEffect(() => {
    if (!emblaApi) return;
    if (activeSnapIndex !== emblaApi.selectedScrollSnap()) {
      emblaApi.scrollTo(activeSnapIndex);
    }
  }, [emblaApi, activeSnapIndex]);

  // アクティブスライドの scroll コンテナを外部に通知
  useEffect(() => {
    if (!onActiveSlideChange) return;
    const activeSlide = slideRefs.current[activeSnapIndex] ?? null;
    onActiveSlideChange(activeSlide);
  }, [activeSnapIndex, onActiveSlideChange]);

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
    </div>
  );
};

export { PageSwipeContainer };
