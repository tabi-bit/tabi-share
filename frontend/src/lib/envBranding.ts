type AppEnv = 'production' | 'staging' | 'local' | 'preview';

export const detectEnv = (): AppEnv => {
  const env = import.meta.env.VITE_APP_ENV;
  if (env === 'local') return 'local';
  if (env === 'staging') {
    // preview環境もVITE_APP_ENV=stagingのため、baseURIで判別
    const prMatch = document.baseURI.match(/tabi-share-[^-]+--pr(\d+)-/);
    if (prMatch) return 'preview';
    return 'staging';
  }
  return 'production';
};

export const extractPrNumber = (): string | null => {
  const match = document.baseURI.match(/tabi-share-[^-]+--pr(\d+)-/);
  return match ? match[1] : null;
};

export type { AppEnv };

/** 環境ラベルを返す。productionはnull */
export const getEnvLabel = (): { env: AppEnv; label: string; color: string } | null => {
  const env = detectEnv();
  if (env === 'production') return null;
  if (env === 'preview') {
    const prNum = extractPrNumber() ?? '??';
    return { env, label: `pr${prNum}`, color: '#8b5cf6' };
  }
  if (env === 'staging') return { env, label: 'stg', color: '#f59e0b' };
  return { env, label: 'local', color: '#22c55e' };
};

export const initEnvBranding = () => {
  const env = detectEnv();
  if (env === 'production') return;

  // favicon切り替え
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (link) {
    const faviconMap: Record<Exclude<AppEnv, 'production'>, string> = {
      staging: '/favicon-stg.svg',
      local: '/favicon-local.svg',
      preview: '/favicon-preview.svg',
    };
    link.href = faviconMap[env];
  }
};
