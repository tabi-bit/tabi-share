import { Link } from 'react-router-dom';
import { useTrips } from '@/hooks/useTrips';

const HomePage = () => {
  const { trips } = useTrips();
  return (
    <div className='flex min-h-screen flex-col items-center bg-gradient-to-br from-blue-50 to-cyan-50 p-4'>
      <div className='w-full max-w-2xl'>
        <header className='mb-8 text-center'>
          <h1 className='mb-4 font-bold text-4xl text-gray-800'>🚗 TabiShare</h1>
          <p className='text-gray-600 text-lg'>車旅行計画アプリ</p>
        </header>

        <main>
          <h2 className='mb-4 text-center font-bold text-2xl text-gray-700'>旅程一覧(仮実装)</h2>
          {trips != null && trips.length > 0 ? (
            <ul className='space-y-4'>
              {trips.map(trip => (
                <li key={trip.id} className='rounded-lg bg-white p-4 shadow transition hover:bg-gray-50'>
                  <Link
                    to={`/trip/${trip.urlId}`}
                    className='block font-semibold text-blue-600 text-lg hover:underline'
                  >
                    {trip.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className='text-center text-gray-500'>旅程がありません。</p>
          )}
        </main>
      </div>
    </div>
  );
};

export { HomePage };
