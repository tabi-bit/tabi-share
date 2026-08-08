import { FirebaseError } from 'firebase/app';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, type User } from 'firebase/auth';
import { useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { type ScopedMutator, useSWRConfig } from 'swr';
import { authUserAtom } from '@/atoms/auth';
import { apiClient } from '@/lib/apiClient';
import { getFirebaseAuth } from '@/lib/firebase';
import { revalidateTripLists } from '@/lib/tripCache';

/**
 * Firebase Auth 状態を Jotai atom に反映し、sign-in 検出時にサーバー側の
 * session 紐付けと旅程一覧の同期を実行する。App 直下で 1 度だけ呼び出す。
 *
 * `/auth/link` は冪等 (パターン 3: 再認証 = no-op) なので、Cookie パージ後の
 * 復帰時にもここから呼び直せば匿名 user のマージ or 昇格が発火する。
 */
export const useAuthStateSync = (): void => {
  const setAuthUser = useSetAtom(authUserAtom);
  const { mutate } = useSWRConfig();

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, user => {
      setAuthUser(user);
      if (user !== null) {
        void syncAuthedUser(user, mutate);
      }
    });
    return () => unsubscribe();
  }, [setAuthUser, mutate]);
};

/**
 * sign-in ユーザーに対してサーバー側の session を紐付け、旅程一覧を再取得する。
 *
 * `onAuthStateChanged` から呼ばれ、以下 2 系統で発火する:
 * - Google 認証で新規 sign-in した直後 (popup 完了 or Pair 引き継ぎ)
 * - 別セッションでの sign-in 状態をブラウザが復元した時 (Cookie パージ後の復帰含む)
 *
 * `/auth/link` は冪等なので、同じ user で複数回叩いても副作用は起きない。
 */
const syncAuthedUser = async (user: User, mutate: ScopedMutator): Promise<void> => {
  try {
    const idToken = await user.getIdToken();
    await apiClient.post('/auth/link', { id_token: idToken });
    revalidateTripLists(mutate);
  } catch (err) {
    console.error('failed to sync authed user', err);
    toast.error('旅程の同期に失敗しました。時間をおいて再度お試しください。');
  }
};

/**
 * Google 認証をポップアップで実行する。成功時は `onAuthStateChanged` が発火し、
 * `syncAuthedUser` が session 紐付けと旅程一覧同期を行う。
 *
 * `signInWithRedirect` ではなく popup を使う理由: redirect フローは authDomain
 * (`<project>.firebaseapp.com`) 上のクロスオリジン iframe に依存しており、
 * サードパーティストレージをブロックするブラウザ (Safari 16.1+ / Firefox 109+ /
 * Chrome M115+) では `getRedirectResult` が黙って null を返して認証が完了しない。
 * authDomain を自ドメインに変える案は Hosting preview チャンネルの URL が動的で
 * OAuth リダイレクト URI を事前登録できないため採れない。
 * https://firebase.google.com/docs/auth/web/redirect-best-practices
 *
 * なお iOS PWA (ホーム画面追加) では popup / redirect いずれも成立しないが、
 * そこは 8 桁ペアリングコードによるデバイス引き継ぎでカバーする設計。
 */
export const signInWithGoogle = async (): Promise<void> => {
  try {
    await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
  } catch (err) {
    if (err instanceof FirebaseError) {
      // ユーザーが自分でポップアップを閉じた / 連打で前のリクエストが取り消された場合は通知不要
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return;
      if (err.code === 'auth/popup-blocked') {
        console.error('Google sign-in popup was blocked', err);
        toast.error('ポップアップがブロックされました。ブラウザの設定を確認してください。');
        return;
      }
    }
    console.error('failed to sign in with Google', err);
    toast.error('Google 認証に失敗しました。時間をおいて再度お試しください。');
  }
};
