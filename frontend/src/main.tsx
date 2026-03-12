import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import './index.css';
import { App } from './App.tsx';
import 'dayjs/locale/ja';
import dayjs from 'dayjs';
import { initEnvBranding } from './lib/envBranding.ts';

dayjs.locale('ja');
initEnvBranding();
const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <BrowserRouter>
        <App />
        <Toaster position='bottom-center' richColors />
      </BrowserRouter>
    </StrictMode>
  );
} else {
  throw new Error("Root element with id 'root' not found.");
}
