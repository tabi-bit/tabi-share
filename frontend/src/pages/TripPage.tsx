import { useAtomValue } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { isOfflineReadAtom } from '@/atoms/network';
import { FetchErrorView } from '@/components/FetchErrorView';
import { Header } from '@/components/Header';
import { HeaderSkeleton } from '@/components/HeaderSkeleton';
import { Title } from '@/components/Title';
import { TimelineSkeleton } from '@/components/timeline';
import { useDragAutoScroll } from '@/hooks/useDragAutoScroll';
import { usePages } from '@/hooks/usePages';
import { useTripByUrlId } from '@/hooks/useTrips';
import { useVisitedTrips } from '@/hooks/useVisitedTrips';
import type { Page } from '@/types';
import { EditTripLayout } from './TripPage/EditTripLayout';
import { ViewTripLayout } from './TripPage/ViewTripLayout';

const TripPage = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { isDraggingRef, startDrag, stopDrag } = useDragAutoScroll(scrollContainerRef);
  const [selectedPageId, setSelectedPageId] = useState<Page['id']>();
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [minLoadingComplete, setMinLoadingComplete] = useState(false);
  const { urlId } = useParams<{ urlId: string }>();

  const isOffline = useAtomValue(isOfflineReadAtom);
  const refreshInterval = isOffline ? 0 : mode === 'edit' ? 5000 : 0;
  const { trip, error: tripError, isLoading: isTripLoading } = useTripByUrlId(urlId ?? null, { refreshInterval });
  const { pages, error: pagesError, isLoading: isPagesLoading } = usePages(trip?.id ?? null, { refreshInterval });
  const { addVisitedTrip } = useVisitedTrips();

  const isLoading = isTripLoading || isPagesLoading || !minLoadingComplete;
  const isError = tripError || pagesError;

  // 1秒間の最小ローディング表示を管理
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadingComplete(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (selectedPageId == null && pages != null && pages.length > 0) {
      setSelectedPageId(pages[0].id);
    }
  }, [pages, selectedPageId]);

  useEffect(() => {
    if (mode === 'view') {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [mode]);

  // Editモード中のブラウザバックを阻止し、Viewモードに戻す
  useEffect(() => {
    if (mode !== 'edit') return;

    history.pushState({ editMode: true }, '', location.href);
    let poppedByBack = false;

    const handlePopState = () => {
      poppedByBack = true;
      setMode('view');
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      // ボタン等でViewに戻った場合、pushStateで追加したエントリを消す
      if (!poppedByBack) {
        history.back();
      }
    };
  }, [mode]);

  // オフライン時は編集モードを強制解除
  useEffect(() => {
    if (isOffline && mode === 'edit') {
      setMode('view');
    }
  }, [isOffline, mode]);

  // Tripが読み込まれたら訪問済みリストに追加
  useEffect(() => {
    if (trip) {
      addVisitedTrip(trip.urlId);
    }
  }, [trip, addVisitedTrip]);

  if (isError) {
    return (
      <div className='flex h-dvh w-full flex-col items-center overflow-auto'>
        <HeaderSkeleton />
        <FetchErrorView error={tripError ?? pagesError} className='w-full max-w-3xl p-4' />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='flex h-dvh w-full flex-col items-center overflow-auto'>
        <HeaderSkeleton />
        <TimelineSkeleton className='w-full max-w-3xl p-4' />
      </div>
    );
  }

  return (
    <>
      {isError && <div>Error</div>}
      {isLoading && <div>Loading...</div>}
      {trip && pages && (
        <div
          ref={scrollContainerRef}
          className='flex h-dvh w-full flex-col items-center justify-between gap-4 overflow-auto overscroll-y-none'
        >
          <Title>{trip.title}</Title>
          <Header
            variant='full'
            selectedPageId={selectedPageId}
            pages={pages}
            onSelectPage={setSelectedPageId}
            setMode={setMode}
            trip={trip}
            mode={mode}
            scrollContainerRef={scrollContainerRef}
            isDraggingRef={isDraggingRef}
          />
          {pages.length === 0 && (
            <div className='flex h-full items-center justify-center text-gray-500'>
              編集モードからページを追加してください
            </div>
          )}
          {selectedPageId != null && mode === 'view' && (
            <ViewTripLayout
              selectedPageId={selectedPageId}
              tripDetail={trip.detail ?? null}
              isFirstPage={selectedPageId === pages[0].id}
            />
          )}
          {selectedPageId != null && mode === 'edit' && (
            <EditTripLayout
              selectedPageId={selectedPageId}
              onDragStart={startDrag}
              onDragEnd={stopDrag}
              refreshInterval={refreshInterval}
            />
          )}
        </div>
      )}
    </>
  );
};

export { TripPage };
