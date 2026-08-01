import type { User } from 'firebase/auth';
import { atom } from 'jotai';

/**
 * Firebase Auth の現在のユーザー。
 *
 * - `undefined`: 初期化前 (onAuthStateChanged がまだ呼ばれていない)
 * - `null`: 未認証 (匿名 session でアプリを利用中)
 * - `User`: メール認証済み (バックアップ・同期機能が有効)
 */
export const authUserAtom = atom<User | null | undefined>(undefined);

/**
 * マジックリンクを別デバイス (localStorage の pendingEmail が無いブラウザ) で開いた時、
 * email 再入力ダイアログを表示するためのフラグ兼データ。値は完了処理に渡す URL。
 *
 * - `null`: 表示なし
 * - `string`: そのURL (=マジックリンク) に対して email 再入力を求める
 */
export const magicLinkPromptUrlAtom = atom<string | null>(null);
