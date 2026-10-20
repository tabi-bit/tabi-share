import { candidatePaths } from '@mock/candidates/paths';
import { CurvedArrow } from '@mock/home/components/CurvedArrow';
import { HomeTripListItem } from '@mock/home/components/HomeTripListItem';
import { NewTripButton } from '@mock/home/components/NewTripButton';
import { TripSections } from '@mock/home/components/TripSections';
import { VisitedGlobeCard } from '@mock/home/components/VisitedGlobeCard';
import { updatePlanningPhase, useTripPlanningSummaries } from '@mock/home/hooks';
import { tripLinkOf } from '@mock/home/status';
import { useAtomValue } from 'jotai';
import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { isOfflineReadAtom } from '@/atoms/network';
import { FetchErrorView } from '@/components/FetchErrorView';
import { Header } from '@/components/Header';
import { HomeMenu } from '@/components/HomeMenu';
import { Logo } from '@/components/Logo';
import { PwaInstallBanner } from '@/components/PwaInstallBanner';
import { SyncSection } from '@/components/SyncSection';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useArchiveTrip, useMyTrips } from '@/hooks/useMyTrips';
import { sortTripsByLastEdited } from '@/lib/sortTrips';
import type { Trip } from '@/types/trip';
// 相対パスは実ファイル位置 (src/pages) 基準で解決され、src/dialogs の差し替え版を読む
import { AddTripDialog } from '../dialogs/AddTripDialog';

const ARCHIVED_PARAM = 'archived';
const LEAVE_ANIMATION_MS = 150;

const HomePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isArchivedView = searchParams.get(ARCHIVED_PARAM) === '1';

  // 通常一覧とアーカイブ済みを常に両方持つ。トグルの件数表示と、
  // 「元に戻す」で移動先リストが即座に整合することの両方に必要
  const { trips: activeTrips, isLoading: isActiveLoading, error: activeError } = useMyTrips();
  const { trips: archivedTrips, isLoading: isArchivedLoading, error: archivedError } = useMyTrips(true);
  const { setArchived } = useArchiveTrip();
  // [mock] 状態バッジ用の進み具合
  const { summaryOf } = useTripPlanningSummaries();

  const navigate = useNavigate();
  const [addTripDialogOpen, setAddTripDialogOpen] = useState(false);
  const [leavingTripId, setLeavingTripId] = useState<Trip['id'] | null>(null);
  const isOffline = useAtomValue(isOfflineReadAtom);
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const trips = isArchivedView ? archivedTrips : activeTrips;
  const isLoading = isArchivedView ? isArchivedLoading : isActiveLoading;
  const error = isArchivedView ? archivedError : activeError;
  const archivedCount = archivedTrips?.length ?? 0;
  const hasTrips = trips != null && trips.length > 0;
  const sortedTrips = hasTrips ? sortTripsByLastEdited(trips) : trips;

  // アーカイブ済みを全て戻したら通常一覧へ返る。
  // 0 件の状態で直接開いた場合は空表示のままにしたいので、一度でも件数を持った時のみ
  const hadArchivedRef = useRef(false);
  useEffect(() => {
    if (!isArchivedView) {
      hadArchivedRef.current = false;
      return;
    }
    if (archivedTrips == null) return;
    if (archivedTrips.length > 0) {
      hadArchivedRef.current = true;
    } else if (hadArchivedRef.current) {
      setSearchParams({}, { replace: true });
    }
  }, [isArchivedView, archivedTrips, setSearchParams]);

  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingArchiveRef = useRef<(() => void) | null>(null);

  // 退出アニメーションの待機中に画面を離れても、アーカイブ自体は取りこぼさず送る
  useEffect(
    () => () => {
      if (leaveTimerRef.current == null) return;
      clearTimeout(leaveTimerRef.current);
      pendingArchiveRef.current?.();
    },
    []
  );

  const handleToggleArchive = (trip: Trip) => {
    if (leavingTripId != null) return;

    const nextArchived = !isArchivedView;
    const send = () => {
      leaveTimerRef.current = null;
      pendingArchiveRef.current = null;
      void setArchived(trip, nextArchived);
    };
    const commit = () => {
      setLeavingTripId(null);
      send();
      toast(`「${trip.title}」を${nextArchived ? 'アーカイブしました' : '旅程一覧に戻しました'}`, {
        action: { label: '元に戻す', onClick: () => void setArchived(trip, !nextArchived) },
      });
    };

    if (prefersReducedMotion) {
      commit();
      return;
    }
    setLeavingTripId(trip.id);
    pendingArchiveRef.current = send;
    leaveTimerRef.current = setTimeout(commit, LEAVE_ANIMATION_MS);
  };

  const listDisabled = isOffline || leavingTripId != null;
  const openAddTrip = () => setAddTripDialogOpen(true);

  const archiveToggle =
    !isArchivedView && archivedCount > 0 ? (
      <button
        className='-ml-1.5 flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold text-12px text-teal-700 tabular-nums hover:bg-teal-500/10'
        onClick={() => setSearchParams({ [ARCHIVED_PARAM]: '1' })}
        type='button'
      >
        アーカイブ済み ({archivedCount})
        <ChevronRight className='size-3.5' />
      </button>
    ) : null;

  const loadingView = isLoading && (
    <div className='mt-8 flex justify-center'>
      <LoaderCircle className='size-8 animate-spin text-gray-400' aria-label='読み込み中' />
    </div>
  );

  const isEmpty = !(isLoading || hasTrips || error != null);

  return (
    // [mock] PC (760px 以上) は左サイドバー + メイン、スマホは 1 カラム
    <div className='flex h-dvh w-full bg-teal-50'>
      <h1 className='sr-only'>たびしぇあ | 旅程を簡単に作成・共有</h1>

      <aside className='hidden w-80 shrink-0 flex-col border-teal-100 border-r bg-white/60 min-[760px]:flex'>
        <div className='flex items-center justify-between px-4 pt-3 pb-2'>
          <Logo size='small' />
          <HomeMenu />
        </div>
        <div className='px-3 pb-3'>
          <NewTripButton
            variant='button'
            className='h-11 text-14px sm:h-11'
            disabled={isOffline}
            onClick={openAddTrip}
          />
        </div>
        <nav
          aria-label='旅の一覧'
          className='min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(1rem+env(safe-area-inset-bottom))]'
        >
          {activeError != null && !isActiveLoading && <FetchErrorView error={activeError} />}
          {isActiveLoading && (
            <div className='mt-8 flex justify-center'>
              <LoaderCircle className='size-6 animate-spin text-gray-400' aria-label='読み込み中' />
            </div>
          )}
          {activeTrips != null && activeTrips.length === 0 && (
            <p className='mt-6 text-center text-12px text-gray-500'>旅程がまだありません</p>
          )}
          {activeTrips != null && activeTrips.length > 0 && (
            <TripSections
              compact
              trips={activeTrips}
              summaryOf={summaryOf}
              leavingTripId={isArchivedView ? null : leavingTripId}
              disabled={listDisabled || isArchivedView}
              onToggleArchive={handleToggleArchive}
            />
          )}
          <div className='mt-3 px-1'>{archiveToggle}</div>
        </nav>
      </aside>

      <div className='flex min-w-0 flex-1 flex-col overflow-auto'>
        <Header variant='logoOnly' className='min-[760px]:hidden' />

        <main className='flex flex-1 flex-col items-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] min-[760px]:p-10'>
          <div className='relative w-full max-w-2xl'>
            {/* [mock] 行った所にピンが立つ地球儀 */}
            {!isArchivedView && <VisitedGlobeCard className='mb-4 h-60 min-[760px]:h-80' />}

            {/* "同期" セクション (issue #194)。閉じるボタンあり、閉じたら Header メニューから再アクセス */}
            <SyncSection />

            {/* PWA インストール導線。閉じるボタンあり、閉じたら Header メニューから再アクセス */}
            <PwaInstallBanner className='mb-4' />

            {isArchivedView ? (
              <>
                <div className='mb-2 flex items-center justify-between'>
                  <h2 className='font-bold text-2xl text-gray-800'>アーカイブ済み</h2>
                  <Button onClick={() => setSearchParams({})} size='sm' variant='outline'>
                    <ChevronLeft className='size-4' />
                    旅程一覧へ
                  </Button>
                </div>
                <p className='mb-6 text-12px text-gray-500'>しまった旅程はここに残ります。いつでも戻せます。</p>
                {error != null && !isLoading && <FetchErrorView error={error} />}
                {isEmpty && <p className='mt-8 text-center text-gray-500'>アーカイブした旅程はありません。</p>}
                {loadingView}
                {!isLoading && hasTrips && sortedTrips != null && (
                  <ul>
                    {sortedTrips.map(trip => {
                      const summary = summaryOf(trip.id);
                      return (
                        <HomeTripListItem
                          archived
                          disabled={listDisabled}
                          key={trip.id}
                          leaving={leavingTripId === trip.id}
                          onToggleArchive={handleToggleArchive}
                          to={tripLinkOf(trip, summary)}
                          trip={trip}
                        />
                      );
                    })}
                  </ul>
                )}
              </>
            ) : (
              <>
                {/* PC: メイン領域は次の旅をつくる導線だけ置き、一覧はサイドバーに出す */}
                <div className='hidden min-[760px]:block'>
                  <h2 className='mt-6 mb-6 font-bold text-[32px] text-gray-800'>次はどこへ行く？</h2>
                  <NewTripButton variant='card' disabled={isOffline} onClick={openAddTrip} />
                </div>

                <div className='min-[760px]:hidden'>
                  <NewTripButton variant='button' disabled={isOffline} onClick={openAddTrip} className='mb-3' />
                  <div className='mb-4'>{archiveToggle}</div>

                  {error != null && !isLoading && <FetchErrorView error={error} />}
                  {isEmpty && (
                    <div className='relative flex flex-col items-center px-4 sm:px-0'>
                      <p className='relative mt-12 w-full text-center text-gray-500'>
                        旅程がまだありません。
                        <br />
                        共有してもらうか新しく作りましょう！
                      </p>
                      {/* テキストから上の「新しい旅をつくる」への点線カーブ矢印 */}
                      <CurvedArrow className='-top-2 absolute right-4 h-20 text-gray-400' />
                    </div>
                  )}
                  {loadingView}
                  {!isLoading && hasTrips && trips != null && (
                    <TripSections
                      trips={trips}
                      summaryOf={summaryOf}
                      leavingTripId={leavingTripId}
                      disabled={listDisabled}
                      onToggleArchive={handleToggleArchive}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* 旅程追加ダイアログ */}
      <AddTripDialog
        open={addTripDialogOpen}
        onOpenChange={setAddTripDialogOpen}
        onCreated={async (trip, mode, destination) => {
          // [mock] AI といっしょに考える → 候補集め (新フロー) の AI 提案へ。自分で考える → 従来の旅程画面へ
          if (mode === 'ai') {
            await updatePlanningPhase(trip.id, 'collecting');
            navigate(`${candidatePaths.suggest(trip.urlId)}?area=${encodeURIComponent(destination)}`);
            return;
          }
          navigate(candidatePaths.trip(trip.urlId));
        }}
      />
    </div>
  );
};

export { HomePage };
