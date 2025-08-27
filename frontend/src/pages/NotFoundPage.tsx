import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-pink-50 p-4'>
      <div className='mx-auto w-full max-w-lg text-center'>
        <h1 className='mb-4 font-bold text-6xl text-gray-800'>404</h1>
        <h2 className='mb-6 font-semibold text-2xl text-gray-600'>ページが見つかりません</h2>
        <p className='mb-8 text-gray-500'>お探しのページは存在しないか、移動している可能性があります。</p>
        <Link
          to='/'
          className='rounded-lg bg-blue-500 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-600'
        >
          ホームに戻る
        </Link>
      </div>
    </div>
  );
};

export { NotFoundPage };
