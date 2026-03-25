import { Provider as JotaiProvider } from 'jotai';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import './index.css';
import { App } from './App.tsx';
import { SWRProvider } from './components/SWRProvider.tsx';
import 'dayjs/locale/ja';
import dayjs from 'dayjs';
import { isOfflineAtom } from './atoms/network';
import { pwaPromptEventAtom } from './atoms/pwa';
import { initEnvBranding } from './lib/envBranding.ts';
import { evaluateNetwork } from './lib/networkDetection';
import type { BeforeInstallPromptEvent } from './lib/pwa';
import { appStore } from './lib/store';

dayjs.locale('ja');
initEnvBranding();

const jotaiStore = appStore;

// React マウント前に発火する可能性があるため、React外でイベントを登録
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  jotaiStore.set(pwaPromptEventAtom, e as BeforeInstallPromptEvent);
});

window.addEventListener('appinstalled', () => {
  jotaiStore.set(pwaPromptEventAtom, null);
});

// ネットワーク状態検知
window.addEventListener('offline', () => {
  console.log('[Network] 🔴 OFFLINE (reason: browser-offline-event)');
  jotaiStore.set(isOfflineAtom, true);
});

window.addEventListener('online', () => {
  evaluateNetwork(jotaiStore);
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    evaluateNetwork(jotaiStore);
  }
});

// 起動時のネットワーク状態判定（非同期、Reactマウントをブロックしない）
evaluateNetwork(jotaiStore);

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <JotaiProvider store={jotaiStore}>
        <BrowserRouter>
          <SWRProvider>
            <App />
            <Toaster position='bottom-center' richColors />
          </SWRProvider>
        </BrowserRouter>
      </JotaiProvider>
    </StrictMode>
  );
} else {
  throw new Error("Root element with id 'root' not found.");
}
