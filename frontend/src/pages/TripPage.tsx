import { useParams } from 'react-router-dom';

const TripPage = () => {
  const { tripId } = useParams<{ tripId: string }>();

  return (
    <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4'>
      <div className='mx-auto w-full max-w-4xl text-center'>
        <h1 className='mb-4 font-bold text-3xl text-gray-800'>旅程詳細・編集</h1>
        <p className='mb-6 text-gray-600'>Trip ID: {tripId}</p>
        <p className='text-gray-500'>ブロック式旅程管理機能（実装予定）</p>
      </div>
    </div>
  );
};

export { TripPage };
