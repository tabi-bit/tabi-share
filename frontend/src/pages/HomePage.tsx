import { useAtomValue } from 'jotai';
import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import type React from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { isOfflineReadAtom } from '@/atoms/network';
import { Header } from '@/components/Header';
import { PwaInstallBanner } from '@/components/PwaInstallBanner';
import { SyncSection } from '@/components/SyncSection';
import { TripListItem } from '@/components/TripListItem';
import { Button } from '@/components/ui/button';
import { AddTripDialog } from '@/dialogs/AddTripDialog';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useArchiveTrip, useMyTrips } from '@/hooks/useMyTrips';
import { sortTripsByLastEdited } from '@/lib/sortTrips';
import { cn } from '@/lib/utils';
import type { Trip } from '@/types/trip';

const ARCHIVED_PARAM = 'archived';
const LEAVE_ANIMATION_MS = 150;

const HomePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isArchivedView = searchParams.get(ARCHIVED_PARAM) === '1';

  // 通常一覧とアーカイブ済みを常に両方持つ。トグルの件数表示と、
  // 「元に戻す」で移動先リストが即座に整合することの両方に必要
  const { trips: activeTrips, isLoading: isActiveLoading } = useMyTrips();
  const { trips: archivedTrips, isLoading: isArchivedLoading } = useMyTrips(true);
  const { setArchived } = useArchiveTrip();

  const navigate = useNavigate();
  const [addTripDialogOpen, setAddTripDialogOpen] = useState(false);
  const [leavingTripId, setLeavingTripId] = useState<Trip['id'] | null>(null);
  const isOffline = useAtomValue(isOfflineReadAtom);
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const trips = isArchivedView ? archivedTrips : activeTrips;
  const isLoading = isArchivedView ? isArchivedLoading : isActiveLoading;
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
  useEffect(() => () => clearTimeout(leaveTimerRef.current ?? undefined), []);

  const handleToggleArchive = (trip: Trip) => {
    if (leavingTripId != null) return;

    const nextArchived = !isArchivedView;
    const commit = () => {
      setLeavingTripId(null);
      void setArchived(trip, nextArchived);
      toast(`「${trip.title}」を${nextArchived ? 'アーカイブしました' : '旅程一覧に戻しました'}`, {
        action: { label: '元に戻す', onClick: () => void setArchived(trip, !nextArchived) },
      });
    };

    if (prefersReducedMotion) {
      commit();
      return;
    }
    setLeavingTripId(trip.id);
    leaveTimerRef.current = setTimeout(commit, LEAVE_ANIMATION_MS);
  };

  return (
    <div className='flex h-dvh w-full flex-col overflow-auto bg-teal-50'>
      <Header variant='logoOnly' />
      <h1 className='sr-only'>たびしぇあ | 旅程を簡単に作成・共有</h1>

      <div className='flex flex-1 flex-col items-center p-4'>
        <div className='relative w-full max-w-2xl'>
          {/* "同期" セクション (issue #194)。閉じるボタンあり、閉じたら Header メニューから再アクセス */}
          <SyncSection />

          {/* PWA インストール導線。閉じるボタンあり、閉じたら Header メニューから再アクセス */}
          <PwaInstallBanner className='mb-4' />

          {/* ヘッダー行 */}
          <div className='mb-2 flex items-center justify-between'>
            <h2 className='font-bold text-2xl text-gray-800'>
              {isArchivedView ? 'アーカイブ済み' : '最近見た旅程一覧'}
            </h2>
            {isArchivedView ? (
              <Button onClick={() => setSearchParams({})} size='sm' variant='outline'>
                <ChevronLeft className='size-4' />
                旅程一覧へ
              </Button>
            ) : (
              <Button onClick={() => setAddTripDialogOpen(true)} size='sm' disabled={isOffline}>
                + 新しく旅に出る
              </Button>
            )}
          </div>

          <div className='mb-6'>
            {isArchivedView ? (
              <p className='text-12px text-gray-500'>しまった旅程はここに残ります。いつでも戻せます。</p>
            ) : (
              archivedCount > 0 && (
                <button
                  className='-ml-1.5 flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold text-12px text-teal-700 tabular-nums hover:bg-teal-500/10'
                  onClick={() => setSearchParams({ [ARCHIVED_PARAM]: '1' })}
                  type='button'
                >
                  アーカイブ済み ({archivedCount})
                  <ChevronRight className='size-3.5' />
                </button>
              )
            )}
          </div>

          {!(isLoading || hasTrips) &&
            (isArchivedView ? (
              <p className='mt-8 text-center text-gray-500'>アーカイブした旅程はありません。</p>
            ) : (
              <div className='relative flex flex-col items-center px-24 sm:px-0'>
                <p className='relative mt-8 w-full text-center text-gray-500'>
                  旅程がまだありません。
                  <br />
                  共有してもらうか新しく作りましょう！
                </p>
                {/* テキストから右上ボタンへの点線カーブ矢印 */}
                <CurvedArrow className='-top-6 absolute right-4 h-24 text-gray-400 sm:right-16' />
              </div>
            ))}

          {isLoading && (
            <div className='mt-8 flex justify-center'>
              <LoaderCircle className='size-8 animate-spin text-gray-400' aria-label='読み込み中' />
            </div>
          )}

          {/* Trip一覧 */}
          {!isLoading && hasTrips && sortedTrips != null && (
            <ul>
              {sortedTrips.map(trip => (
                <TripListItem
                  archived={isArchivedView}
                  disabled={isOffline || leavingTripId != null}
                  key={trip.id}
                  leaving={leavingTripId === trip.id}
                  onToggleArchive={handleToggleArchive}
                  trip={trip}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 旅程追加ダイアログ */}
      <AddTripDialog
        open={addTripDialogOpen}
        onOpenChange={setAddTripDialogOpen}
        onCreated={trip => {
          navigate(`/trip/${trip.urlId}`);
        }}
      />
    </div>
  );
};

const CurvedArrow = ({ className, ...props }: React.ComponentProps<'svg'>) => {
  const markerId = useId();
  const ARROW_HEAD_SIZE = 30;
  const ARROW_LINE_SIZE = 150;
  const ARROW_CP = Math.round((ARROW_LINE_SIZE * 4) / 7);

  return (
    <svg
      className={cn('pointer-events-none text-gray-400', className)}
      viewBox={`${-ARROW_HEAD_SIZE} ${-ARROW_HEAD_SIZE} ${ARROW_LINE_SIZE + ARROW_HEAD_SIZE * 2} ${ARROW_LINE_SIZE + ARROW_HEAD_SIZE * 2}`}
      role='img'
      aria-label='ボタンへの誘導矢印'
      {...props}
    >
      <defs>
        <marker
          id={markerId}
          markerUnits='userSpaceOnUse'
          markerWidth={ARROW_HEAD_SIZE}
          markerHeight={ARROW_HEAD_SIZE}
          refX={ARROW_HEAD_SIZE}
          refY={ARROW_HEAD_SIZE / 2}
          orient='auto'
        >
          <polygon
            points={`0 0, ${ARROW_HEAD_SIZE} ${ARROW_HEAD_SIZE / 2}, 0 ${ARROW_HEAD_SIZE}`}
            fill='currentColor'
          />
        </marker>
      </defs>
      <path
        d={`M0,${ARROW_LINE_SIZE} C${ARROW_CP},${ARROW_LINE_SIZE} ${ARROW_LINE_SIZE},${ARROW_CP} ${ARROW_LINE_SIZE},0`}
        fill='none'
        stroke='currentColor'
        strokeWidth='3'
        strokeDasharray='20 10'
        strokeLinecap='round'
        markerEnd={`url(#${markerId})`}
      />
    </svg>
  );
};

export { HomePage };
