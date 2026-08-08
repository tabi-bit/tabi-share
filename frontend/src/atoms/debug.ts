import { atom } from 'jotai';

/**
 * 診断パネル (`DebugLogPanel`) の表示状態を保持する atom。
 *
 * localStorage に永続化するのは、PWA インストール後は `?debug=1` 付きの URL を
 * 開けないため。ブラウザタブやロゴ連打で一度有効化すれば、以降も表示が続く。
 */

const STORAGE_KEY = '__app_debug_panel__';

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

/** null の間は localStorage の値を正とする (初回読み取りを遅延させる) */
const overrideAtom = atom<boolean | null>(null);

/** 書き込むと localStorage への永続化も行う */
export const debugPanelEnabledAtom = atom<boolean, [boolean], void>(
  get => get(overrideAtom) ?? readStoredFlag(),
  (_get, set, enabled) => {
    writeStoredFlag(enabled);
    set(overrideAtom, enabled);
  }
);
