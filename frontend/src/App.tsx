import { useAtomValue } from 'jotai';
import { Route, Routes } from 'react-router-dom';
import { isOfflineReadAtom } from './atoms/network';
import { Title } from './components/Title';
import { useNetworkToast } from './hooks/useNetworkToast';
import { cn } from './lib/utils';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { TripPage } from './pages/TripPage';

const App = () => {
  const isOffline = useAtomValue(isOfflineReadAtom);
  useNetworkToast();

  return (
    <>
      {/* オフライン時の背景グレーオーバーレイ */}
      <div
        className={cn(
          '-z-10 pointer-events-none fixed inset-0 bg-gray-400/15 transition-opacity duration-500',
          isOffline ? 'opacity-100' : 'opacity-0'
        )}
      />
      <Title />
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/trip/:urlId' element={<TripPage />} />
        <Route path='*' element={<NotFoundPage />} />
      </Routes>
    </>
  );
};

export { App };
