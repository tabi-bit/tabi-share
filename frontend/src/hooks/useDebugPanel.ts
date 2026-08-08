import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * `DebugLogPanel` の表示可否。`?debug=1` で有効化、`?debug=0` で解除する。
 *
 * 状態を localStorage に永続化するのは、PWA インストール後は query 付き URL を
 * 開けないため。ブラウザタブで一度有効化してからインストールすれば、以降は
 * query 無しでもパネルが出続ける。
 */

const STORAGE_KEY = '__app_debug_panel__';
const DEBUG_PARAM = 'debug';

const readStoredFlag = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const writeStoredFlag = (enabled: boolean): void => {
  try {
    if (enabled) localStorage.setItem(STORAGE_KEY, '1');
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private Browsing 等で localStorage が使えなくても診断以外に影響させない
  }
};

const parseParam = (param: string | null): boolean | null => {
  if (param === '1') return true;
  if (param === '0') return false;
  return null;
};

export const useDebugPanel = (): boolean => {
  const [searchParams] = useSearchParams();
  const requested = parseParam(searchParams.get(DEBUG_PARAM));
  const [stored, setStored] = useState(readStoredFlag);

  useEffect(() => {
    if (requested == null) return;
    writeStoredFlag(requested);
    setStored(requested);
  }, [requested]);

  // 永続化 effect の前でも query の指定を即座に反映させる
  return requested ?? stored;
};
