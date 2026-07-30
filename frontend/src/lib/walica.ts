const WALICA_HOSTNAME = 'walica.jp';

export const isValidWalicaUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname === WALICA_HOSTNAME;
  } catch {
    return false;
  }
};
