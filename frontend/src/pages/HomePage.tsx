import type React from 'react';
import { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { AddTripDialog } from '@/dialogs/AddTripDialog';
import { useVisitedTrips } from '@/hooks/useVisitedTrips';
import { cn } from '@/lib/utils';

const HomePage = () => {
  const { trips } = useVisitedTrips();
  const navigate = useNavigate();
  const [addTripDialogOpen, setAddTripDialogOpen] = useState(false);

  return (
    <div className='flex h-dvh w-full flex-col overflow-auto bg-teal-50'>
      <Header variant='logoOnly' />

      <div className='flex flex-1 flex-col items-center p-4'>
        <div className='relative w-full max-w-2xl'>
          {/* ヘッダー行 */}
          <div className='mb-6 flex items-center justify-between'>
            <h2 className='font-bold text-2xl text-gray-800'>最近見た旅程一覧</h2>
            <Button onClick={() => setAddTripDialogOpen(true)} size='sm'>
              + 新しく旅に出る
            </Button>
          </div>

          {/* Trip一覧 */}
          {trips != null && trips.length > 0 ? (
            <div className='space-y-3'>
              {trips.map(trip => (
                <Link
                  key={trip.id}
                  to={`/trip/${trip.urlId}`}
                  className='block rounded-lg bg-white p-4 shadow-sm transition hover:shadow-md'
                >
                  <h3 className='mb-1 font-semibold text-gray-900 text-lg'>{trip.title}</h3>
                  {trip.detail && <p className='line-clamp-2 text-gray-600 text-sm'>{trip.detail}</p>}
                  {trip.peopleNum && <p className='mt-2 text-gray-500 text-xs'>参加人数: {trip.peopleNum}人</p>}
                </Link>
              ))}
            </div>
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
