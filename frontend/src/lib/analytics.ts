import { detectEnv } from './envBranding';

type GtagArgs =
  | ['js', Date]
  | ['config', string, Record<string, unknown>?]
  | ['event', string, Record<string, unknown>?];

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: GtagArgs) => void;
  }
}

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
// preview は staging と同じ .env.stg を使うが、レポートに混入させたくないので送信しない
const isTrackedEnv = detectEnv() !== 'preview';

export const initAnalytics = () => {
  if (!(GA_ID && isTrackedEnv)) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer ?? [];
  const gtag: (...args: GtagArgs) => void = (...args) => {
    window.dataLayer?.push(args);
  };
  window.gtag = gtag;
  gtag('js', new Date());
  // send_page_view=false: 初回自動送信を止め、SPA 遷移を手動追跡する
  gtag('config', GA_ID, { send_page_view: false });
};

export const trackPageview = (path: string) => {
  if (!(GA_ID && isTrackedEnv)) return;
  window.gtag?.('config', GA_ID, { page_path: path });
};
