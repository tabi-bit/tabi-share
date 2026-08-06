import type { User } from 'firebase/auth';
import { atom } from 'jotai';

/**
 * Firebase Auth の現在のユーザー。
 *
 * - `undefined`: 初期化前 (onAuthStateChanged がまだ呼ばれていない)
 * - `null`: 未認証 (匿名 session でアプリを利用中)
 * - `User`: 認証済み (バックアップ・同期機能が有効)
 */
export const authUserAtom = atom<User | null | undefined>(undefined);
