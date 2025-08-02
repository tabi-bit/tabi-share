import { useCallback, useEffect, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

interface Trip {
  id: number;
  name: string;
  description: string;
}

interface ApiResponse {
  message: string;
}

interface TripsResponse {
  trips: Trip[];
}

function App() {
  const [testResult, setTestResult] = useState<string>('');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const testAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/test`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = (await response.json()) as ApiResponse;
      setTestResult(data.message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      setTestResult(`API接続エラー: ${errorMessage}`);
    }
    setLoading(false);
  };

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/trips`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = (await response.json()) as TripsResponse;
      setTrips(data.trips);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      console.error('旅行データ取得エラー:', errorMessage);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchTrips();
  }, [fetchTrips]);

  return (
    <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 p-4'>
      <div className='mx-auto w-full max-w-2xl'>
        {/* ヘッダー */}
        <div className='mb-8 text-center'>
          <h1 className='mb-2 font-bold text-4xl text-gray-800'>🚗 TabiShare</h1>
          <p className='text-gray-600 text-lg'>車旅行計画アプリ</p>
        </div>

        {/* API疎通確認セクション */}
        <div className='mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-md'>
          <h2 className='mb-4 flex items-center font-semibold text-2xl text-gray-800'>🔧 API疎通確認</h2>
          <button
            type='button'
            onClick={() => void testAPI()}
            disabled={loading}
            className={`rounded-lg px-6 py-2 font-medium transition-all duration-200 ${
              loading
                ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                : 'bg-blue-500 text-white shadow-sm hover:bg-blue-600 hover:shadow-md'
            }`}
          >
            {loading ? '確認中...' : 'API疎通テスト'}
          </button>
          {testResult && (
            <div className='mt-4'>
              <p
                className={`rounded-md px-4 py-2 ${
                  testResult.includes('エラー')
                    ? 'border border-red-200 bg-red-100 text-red-800'
                    : 'border border-green-200 bg-green-100 text-green-800'
                }`}
              >
                {testResult}
              </p>
            </div>
          )}
        </div>

        {/* 旅行一覧セクション */}
        <div className='rounded-lg border border-gray-200 bg-white p-6 shadow-md'>
          <h2 className='mb-4 flex items-center font-semibold text-2xl text-gray-800'>✈️ 旅行一覧</h2>

          {loading ? (
            <div className='flex items-center justify-center py-8'>
              <div className='h-8 w-8 animate-spin rounded-full border-blue-500 border-b-2'></div>
              <span className='ml-3 text-gray-600'>読み込み中...</span>
            </div>
          ) : trips.length > 0 ? (
            <div className='mb-6 space-y-4'>
              {trips.map(trip => (
                <div
                  key={trip.id}
                  className='rounded-lg border border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50 p-4 transition-shadow duration-200 hover:shadow-sm'
                >
                  <h3 className='mb-1 font-semibold text-gray-800 text-lg'>{trip.name}</h3>
                  <p className='text-gray-600'>{trip.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className='py-8 text-center'>
              <p className='mb-4 text-gray-500'>旅行データがありません</p>
            </div>
          )}

          <button
            type='button'
            onClick={() => void fetchTrips()}
            disabled={loading}
            className={`rounded-lg px-6 py-2 font-medium transition-all duration-200 ${
              loading
                ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                : 'bg-cyan-500 text-white shadow-sm hover:bg-cyan-600 hover:shadow-md'
            }`}
          >
            旅行データを再取得
          </button>
        </div>
      </div>
    </div>
  );
}

export { App };
