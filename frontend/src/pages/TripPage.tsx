import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { isOfflineReadAtom } from '@/atoms/network';
import { selectedPageIdAtom, tripAtom, tripModeAtom, tripPagesAtom } from '@/atoms/tripPage';
import { FetchErrorView } from '@/components/FetchErrorView';
import { Header } from '@/components/Header';
import { HeaderSkeleton } from '@/components/HeaderSkeleton';
import { PageSwipeContainer } from '@/components/PageSwipeContainer';
import { addPageDialogOpenAtom } from '@/components/pageSelector';
import { Title } from '@/components/Title';
import { TimelineSkeleton } from '@/components/timeline';
import { Button } from '@/components/ui/button';
import { useActivePage } from '@/hooks/useActivePage';
import { useDragAutoScroll } from '@/hooks/useDragAutoScroll';
import { useEditModeBackGuard } from '@/hooks/useEditModeBackGuard';
import { useFocusBlockOnMount } from '@/hooks/useFocusBlockOnMount';
import { usePages } from '@/hooks/usePages';
import { useTripByUrlId } from '@/hooks/useTrips';
import { isNotFoundError } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { EditTripLayout } from './TripPage/EditTripLayout';
import { ViewTripLayout } from './TripPage/ViewTripLayout';

const TripPage = () => {
  // useDragAutoScroll は ref を読み続けるので維持。Header は state で再 attach するため両方持つ
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollContainerEl, setScrollContainerEl] = useState<HTMLDivElement | null>(null);
  const handleScrollContainerChange = (el: HTMLDivElement | null) => {
    scrollContainerRef.current = el;
    setScrollContainerEl(el);
  };
  const { isDraggingRef, startDrag, stopDrag } = useDragAutoScroll(scrollContainerRef);
  const [selectedPageId, setSelectedPageId] = useAtom(selectedPageIdAtom);
  const [mode, setMode] = useAtom(tripModeAtom);
  const setTripAtom = useSetAtom(tripAtom);
  const setTripPages = useSetAtom(tripPagesAtom);
  const setAddPageDialogOpen = useSetAtom(addPageDialogOpenAtom);
  const [minLoadingComplete, setMinLoadingComplete] = useState(false);
  const { urlId } = useParams<{ urlId: string }>();
  const navigate = useNavigate();

  const isOffline = useAtomValue(isOfflineReadAtom);
  const refreshInterval = isOffline ? 0 : mode === 'edit' ? 5000 : 0;
  const { trip, error: tripError, isLoading: isTripLoading } = useTripByUrlId(urlId ?? null, { refreshInterval });
  const { pages, error: pagesError, isLoading: isPagesLoading } = usePages(trip?.id ?? null, { refreshInterval });
  const { storedPageId, isActivePageInitialized, saveActivePageId } = useActivePage(trip?.id ?? null);
  useFocusBlockOnMount();
  useEditModeBackGuard();

  const isLoading = isTripLoading || isPagesLoading || !minLoadingComplete;
  const isError = tripError || pagesError;
  // pages 側は存在しない trip でも 403 を返すため、404 判定は trip の取得結果で行う
  const isTripNotFound = isNotFoundError(tripError);

  // マウント解除時に atom をリセット
  useEffect(() => {
    return () => {
      setTripAtom(null);
      setTripPages([]);
      setSelectedPageId(undefined);
      setMode('view');
      setAddPageDialogOpen(false);
    };
  }, [setTripAtom, setTripPages, setSelectedPageId, setMode, setAddPageDialogOpen]);

  // SWR → atom 同期
  useEffect(() => {
    if (trip) setTripAtom(trip);
  }, [trip, setTripAtom]);

  // usePages がソート済みで返すため、そのまま atom に同期する
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

  // 初期選択ページの決定 / 削除等による stale ID の再同期。
  // 未選択、または現存 pages に存在しない ID を指している場合に、
  // IndexedDB の保存値 (現存すれば) → ソート済み先頭 の順で再選択する。
  useEffect(() => {
    if (pages == null || pages.length === 0) return;
    if (!isActivePageInitialized) return;
    if (selectedPageId != null && pages.some(page => page.id === selectedPageId)) return;

    const restoredId =
      storedPageId != null && pages.some(page => page.id === storedPageId) ? storedPageId : pages[0].id;
    setSelectedPageId(restoredId);
  }, [pages, selectedPageId, storedPageId, isActivePageInitialized, setSelectedPageId]);

  // 表示中ページが変わるたびに IndexedDB へ永続化（再訪時に復帰するため）
  useEffect(() => {
    if (selectedPageId != null) saveActivePageId(selectedPageId);
  }, [selectedPageId, saveActivePageId]);

  useEffect(() => {
    if (mode === 'view') {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [mode]);

  // オフライン時は編集モードを強制解除
  useEffect(() => {
    if (isOffline && mode === 'edit') {
      setMode('view');
    }
  }, [isOffline, mode, setMode]);

  // 削除済み・存在しない旅程URL（自身の削除操作、共有相手による削除、ブックマーク等）はトップへ逃がす
  useEffect(() => {
    if (!isTripNotFound) return;
    // StrictMode の二重実行やポーリング再失敗でトーストが重ならないよう id で dedupe する
    toast.error('旅程が見つかりませんでした', { id: 'trip-not-found' });
    navigate('/', { replace: true });
  }, [isTripNotFound, navigate]);

  // 404 はトップへ遷移するだけなのでエラー表示は出さず、遷移までスケルトンを見せる
  if (isError && !isTripNotFound) {
    return (
      <div className='flex h-dvh w-full flex-col'>
        <HeaderSkeleton />
        <div className='flex flex-1 flex-col items-center overflow-auto'>
          <FetchErrorView error={tripError ?? pagesError} className='w-full max-w-3xl p-4' />
        </div>
      </div>
    );
  }

  if (isLoading || isTripNotFound) {
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
          <Header variant='full' scrollContainer={scrollContainerEl} isDraggingRef={isDraggingRef} />
          {pages.length === 0 && (
            <div className='flex flex-1 items-center justify-center px-4'>
              {mode === 'edit' ? (
                <Button onClick={() => setAddPageDialogOpen(true)}>
                  <Plus className='size-4' />
                  ページを追加
                </Button>
              ) : (
                <p className='text-gray-500'>編集モードからページを追加してください</p>
              )}
            </div>
          )}
          {pages.length > 0 && mode === 'view' && (
            <PageSwipeContainer
              onActiveSlideChange={handleScrollContainerChange}
              className='min-h-0 flex-1'
              renderPage={page => (
                <div
                  className={cn(
                    'flex min-h-full flex-col items-center pt-4',
                    pages.length > 1 && 'pb-24 sm:pt-16 sm:pb-4'
                  )}
                >
                  <ViewTripLayout
                    selectedPageId={page.id}
                    pageDate={page.date ?? null}
                    tripDetail={trip.detail ?? null}
                    isFirstPage={page.id === pages[0].id}
                  />
                </div>
              )}
            />
          )}
          {pages.length > 0 && mode === 'edit' && (
            <div
              ref={handleScrollContainerChange}
              className='flex flex-1 flex-col items-center overflow-auto overscroll-y-none pt-4 pb-24 sm:pt-16 sm:pb-4'
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
