import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { isOfflineReadAtom } from '@/atoms/network';
import { selectedPageIdAtom, tripAtom, tripModeAtom, tripPagesAtom } from '@/atoms/tripPage';
import { FetchErrorView } from '@/components/FetchErrorView';
import { Header } from '@/components/Header';
import { HeaderSkeleton } from '@/components/HeaderSkeleton';
import { PageSwipeContainer } from '@/components/PageSwipeContainer';
import { Title } from '@/components/Title';
import { TimelineSkeleton } from '@/components/timeline';
import { useDragAutoScroll } from '@/hooks/useDragAutoScroll';
import { usePages } from '@/hooks/usePages';
import { useTripByUrlId } from '@/hooks/useTrips';
import { useVisitedTrips } from '@/hooks/useVisitedTrips';
import { EditTripLayout } from './TripPage/EditTripLayout';
import { ViewTripLayout } from './TripPage/ViewTripLayout';

const TripPage = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { isDraggingRef, startDrag, stopDrag } = useDragAutoScroll(scrollContainerRef);
  const [selectedPageId, setSelectedPageId] = useAtom(selectedPageIdAtom);
  const [mode, setMode] = useAtom(tripModeAtom);
  const setTripAtom = useSetAtom(tripAtom);
  const setTripPages = useSetAtom(tripPagesAtom);
  const [minLoadingComplete, setMinLoadingComplete] = useState(false);
  const { urlId } = useParams<{ urlId: string }>();

  const isOffline = useAtomValue(isOfflineReadAtom);
  const refreshInterval = isOffline ? 0 : mode === 'edit' ? 5000 : 0;
  const { trip, error: tripError, isLoading: isTripLoading } = useTripByUrlId(urlId ?? null, { refreshInterval });
  const { pages, error: pagesError, isLoading: isPagesLoading } = usePages(trip?.id ?? null, { refreshInterval });
  const { addVisitedTrip } = useVisitedTrips();

  const isLoading = isTripLoading || isPagesLoading || !minLoadingComplete;
  const isError = tripError || pagesError;

  // マウント解除時に atom をリセット
  useEffect(() => {
    return () => {
      setTripAtom(null);
      setTripPages([]);
      setSelectedPageId(undefined);
      setMode('view');
    };
  }, [setTripAtom, setTripPages, setSelectedPageId, setMode]);

  // SWR → atom 同期
  useEffect(() => {
    if (trip) setTripAtom(trip);
  }, [trip, setTripAtom]);

  useEffect(() => {
    if (pages) setTripPages(pages);
  }, [pages, setTripPages]);

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
  }, [pages, selectedPageId, setSelectedPageId]);

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
  }, [mode, setMode]);

  // オフライン時は編集モードを強制解除
  useEffect(() => {
    if (isOffline && mode === 'edit') {
      setMode('view');
    }
  }, [isOffline, mode, setMode]);

  // Tripが読み込まれたら訪問済みリストに追加
  useEffect(() => {
    if (trip) {
      addVisitedTrip(trip.urlId);
    }
  }, [trip, addVisitedTrip]);

  if (isError) {
    return (
      <div className='flex h-dvh w-full flex-col'>
        <HeaderSkeleton />
        <div className='flex flex-1 flex-col items-center overflow-auto'>
          <FetchErrorView error={tripError ?? pagesError} className='w-full max-w-3xl p-4' />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='flex h-dvh w-full flex-col'>
        <HeaderSkeleton />
        <div className='flex flex-1 flex-col items-center overflow-auto'>
          <TimelineSkeleton className='w-full max-w-3xl p-4' />
        </div>
      </div>
    );
  }

  return (
    <>
      {trip && pages && (
        <div className='flex h-dvh w-full flex-col'>
          <Title>{trip.title}</Title>
          <Header variant='full' scrollContainerRef={scrollContainerRef} isDraggingRef={isDraggingRef} />
          {pages.length === 0 && (
            <div className='flex flex-1 items-center justify-center text-gray-500'>
              編集モードからページを追加してください
            </div>
          )}
          {pages.length > 0 && mode === 'view' && (
            <PageSwipeContainer
              activeSlideScrollRef={scrollContainerRef}
              className='min-h-0 flex-1'
              renderPage={page => (
                <div className='flex h-full flex-col items-center pt-4'>
                  <ViewTripLayout
                    selectedPageId={page.id}
                    tripDetail={trip.detail ?? null}
                    isFirstPage={page.id === pages[0].id}
                  />
                </div>
              )}
            />
          )}
          {mode === 'edit' && (
            <div
              ref={scrollContainerRef}
              className='flex flex-1 flex-col items-center overflow-auto overscroll-y-none pt-4'
            >
              {selectedPageId != null && (
                <EditTripLayout
                  selectedPageId={selectedPageId}
                  onDragStart={startDrag}
                  onDragEnd={stopDrag}
                  refreshInterval={refreshInterval}
                />
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export { TripPage };
