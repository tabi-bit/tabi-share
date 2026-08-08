import { useAtomValue } from 'jotai';
import { Route, Routes } from 'react-router-dom';
import { isOfflineReadAtom } from './atoms/network';
import { DebugLogPanel } from './components/DebugLogPanel';
import { NoIndex } from './components/NoIndex';
import { Title } from './components/Title';
import { useAuthStateSync } from './hooks/useAuth';
import { useDebugPanel } from './hooks/useDebugPanel';
import { useFcmNavigationListener } from './hooks/useFcmNavigationListener';
import { useForegroundNotificationToast } from './hooks/useForegroundNotificationToast';
import { useNetworkToast } from './hooks/useNetworkToast';
import { usePageTracking } from './hooks/usePageTracking';
import { detectEnv } from './lib/envBranding';
import { cn } from './lib/utils';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { NotifyDebugPage } from './pages/NotifyDebugPage';
import { TripPage } from './pages/TripPage';

const isProduction = detectEnv() === 'production';

const App = () => {
  const isOffline = useAtomValue(isOfflineReadAtom);
  useNetworkToast();
  usePageTracking();
  useForegroundNotificationToast();
  useFcmNavigationListener();
  useAuthStateSync();
  const isDebugPanelEnabled = useDebugPanel();

  return (
    <>
      {/* オフライン時の背景グレーオーバーレイ */}
      <div
        className={cn(
          '-z-10 pointer-events-none fixed inset-0 bg-gray-400/15 transition-opacity duration-500',
          isOffline ? 'opacity-100' : 'opacity-0'
        )}
      />
      {!isProduction && <NoIndex />}
      <Title />
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route
          path='/trip/:urlId'
          element={
            <>
              <NoIndex />
              <TripPage />
            </>
          }
        />
        {/* 通知デバッグ。導線は HomeMenu の「デバッグ」から (デバッグモード時のみ) */}
        <Route
          path='/debug/notify'
          element={
            <>
              <NoIndex />
              <NotifyDebugPage />
            </>
          }
        />
        <Route
          path='*'
          element={
            <>
              <NoIndex />
              <NotFoundPage />
            </>
          }
        />
      </Routes>
      {isDebugPanelEnabled && <DebugLogPanel />}
    </>
  );
};

export { App };
