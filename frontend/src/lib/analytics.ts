import { detectEnv } from './envBranding';

type GtagArgs =
  | ['js', Date]
  | ['config', string, Record<string, unknown>?]
  | ['event', string, Record<string, unknown>?];

declare global {
  interface Window {
    dataLayer?: IArguments[];
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
  // GA4/GTM は Arguments オブジェクトかどうかで gtag コマンドを識別するため、
  // rest parameter で Array を push すると silent failure になる。公式スニペットに揃える。
  // ref: https://developers.google.com/tag-platform/gtagjs/install
  function gtag() {
    // biome-ignore lint/complexity/noArguments: GA4 gtag は Arguments オブジェクトを push する必要がある
    window.dataLayer?.push(arguments);
  }
  window.gtag = gtag as (...args: GtagArgs) => void;
  window.gtag('js', new Date());
  // send_page_view=false: 初回自動送信を止め、SPA 遷移を手動追跡する
  window.gtag('config', GA_ID, { send_page_view: false });
};

export const trackPageview = (path: string) => {
  if (!(GA_ID && isTrackedEnv)) return;
  window.gtag?.('config', GA_ID, { page_path: path });
};
