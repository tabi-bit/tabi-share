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
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-4'>
      <div className='w-full max-w-2xl mx-auto'>
        {/* ヘッダー */}
        <div className='text-center mb-8'>
          <h1 className='text-4xl font-bold text-gray-800 mb-2'>🚗 TabiShare</h1>
          <p className='text-lg text-gray-600'>車旅行計画アプリ</p>
        </div>

        {/* API疎通確認セクション */}
        <div className='bg-white rounded-lg shadow-md p-6 mb-8 border border-gray-200'>
          <h2 className='text-2xl font-semibold text-gray-800 mb-4 flex items-center'>🔧 API疎通確認</h2>
          <button
            type='button'
            onClick={() => void testAPI()}
            disabled={loading}
            className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
              loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow-md'
            }`}
          >
            {loading ? '確認中...' : 'API疎通テスト'}
          </button>
          {testResult && (
            <div className='mt-4'>
              <p
                className={`px-4 py-2 rounded-md ${
                  testResult.includes('エラー')
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : 'bg-green-100 text-green-800 border border-green-200'
                }`}
              >
                {testResult}
              </p>
            </div>
          )}
        </div>

        {/* 旅行一覧セクション */}
        <div className='bg-white rounded-lg shadow-md p-6 border border-gray-200'>
          <h2 className='text-2xl font-semibold text-gray-800 mb-4 flex items-center'>✈️ 旅行一覧</h2>

          {loading ? (
            <div className='flex items-center justify-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
              <span className='ml-3 text-gray-600'>読み込み中...</span>
            </div>
          ) : trips.length > 0 ? (
            <div className='space-y-4 mb-6'>
              {trips.map(trip => (
                <div
                  key={trip.id}
                  className='bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg p-4 border border-cyan-200 hover:shadow-sm transition-shadow duration-200'
                >
                  <h3 className='text-lg font-semibold text-gray-800 mb-1'>{trip.name}</h3>
                  <p className='text-gray-600'>{trip.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className='text-center py-8'>
              <p className='text-gray-500 mb-4'>旅行データがありません</p>
            </div>
          )}

          <button
            type='button'
            onClick={() => void fetchTrips()}
            disabled={loading}
            className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
              loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-sm hover:shadow-md'
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
