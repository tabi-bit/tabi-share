import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { AddTripDialog } from '@/dialogs/AddTripDialog';
import { useTrips } from '@/hooks/useTrips';

const HomePage = () => {
  const { trips } = useTrips();
  const navigate = useNavigate();
  const [addTripDialogOpen, setAddTripDialogOpen] = useState(false);

  return (
    <div className='flex h-screen w-full flex-col overflow-auto bg-teal-50'>
      <Header variant='logoOnly' />

      <div className='flex flex-1 flex-col items-center p-4'>
        <div className='w-full max-w-2xl'>
          {/* ヘッダー行 */}
          <div className='mb-6 flex items-center justify-between'>
            <h2 className='font-bold text-2xl text-gray-800'>旅程一覧</h2>
            <Button onClick={() => setAddTripDialogOpen(true)} size='sm'>
              + 旅程を追加
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
            <p className='mt-8 text-center text-gray-500'>旅程がまだありません。</p>
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

export { HomePage };
