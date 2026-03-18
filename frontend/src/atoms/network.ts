import { atom } from 'jotai';

/**
 * ネットワークのオフライン状態を保持するatom
 * 初期値は navigator.onLine の逆値（暫定判定）
 * main.tsx での evaluateNetwork 実行後に正確な値に上書きされる
 */
export const isOfflineAtom = atom<boolean>(!navigator.onLine);

/**
 * ユーザーによる強制オフラインモードの状態を保持するatom
 * これが true の場合、ネットワーク状態に関わらずオフラインモードとして振る舞う
 */
export const isForcedOfflineAtom = atom<boolean>(false);

/**
 * コンポーネント用の読み取り専用 derived atom
 */
export const isOfflineReadAtom = atom<boolean>(get => get(isOfflineAtom) || get(isForcedOfflineAtom));
