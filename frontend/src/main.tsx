import { createStore, Provider as JotaiProvider } from 'jotai';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import './index.css';
import { App } from './App.tsx';
import { SWRProvider } from './components/SWRProvider.tsx';
import 'dayjs/locale/ja';
import dayjs from 'dayjs';
import { pwaPromptEventAtom } from './atoms/pwa';
import { initEnvBranding } from './lib/envBranding.ts';
import type { BeforeInstallPromptEvent } from './lib/pwa';

dayjs.locale('ja');
initEnvBranding();

// Jotai ストア（テスト時に差し替え可能）
const jotaiStore = createStore();

// React マウント前に発火する可能性があるため、React外でイベントを登録
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  jotaiStore.set(pwaPromptEventAtom, e as BeforeInstallPromptEvent);
});

window.addEventListener('appinstalled', () => {
  jotaiStore.set(pwaPromptEventAtom, null);
});

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
