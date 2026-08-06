import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithRedirect,
  type User,
} from 'firebase/auth';
import { useSetAtom } from 'jotai';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { authUserAtom } from '@/atoms/auth';
import { apiClient } from '@/lib/apiClient';
import { getFirebaseAuth } from '@/lib/firebase';
import { mergeServerVisitedTripUrlIds } from './useVisitedTrips';

interface MyTripsOut {
  url_ids: string[];
}

/**
 * Firebase Auth 状態を Jotai atom に反映し、sign-in 検出時にサーバー側の
 * session 紐付けと旅程一覧の同期を実行する。App 直下で 1 度だけ呼び出す。
 *
 * - `/auth/link` は冪等 (パターン 3: 再認証 = no-op) なので、Cookie パージ後の
 *   復帰時にもここから呼び直せば匿名 user のマージ or 昇格が発火する
 * - `signInWithRedirect` の戻り (Google OAuth の redirect callback) は
 *   `getRedirectResult` で捕捉するが、成功時は onAuthStateChanged が発火するので
 *   ここでは主にエラーハンドリングのために呼び出す
 * - StrictMode の dev double-invoke を ref フラグでガードする
 */
export const useAuthStateSync = (): void => {
  const setAuthUser = useSetAtom(authUserAtom);
  const redirectCompletedRef = useRef(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, user => {
      setAuthUser(user);
      if (user !== null) {
        void syncAuthedUser(user);
      }
    });
    return () => unsubscribe();
  }, [setAuthUser]);

  useEffect(() => {
    if (redirectCompletedRef.current) return;
    redirectCompletedRef.current = true;
    void completeRedirectSignInIfPresent();
  }, []);
};

const completeRedirectSignInIfPresent = async (): Promise<void> => {
  try {
    // 成功時は onAuthStateChanged が発火するので、ここでは主にエラー検知のために呼ぶ
    await getRedirectResult(getFirebaseAuth());
  } catch (err) {
    console.error('failed to complete redirect sign-in', err);
    toast.error('Google 認証に失敗しました。時間をおいて再度お試しください。');
  }
};

/**
 * sign-in ユーザーに対してサーバー側の session を紐付け、旅程一覧を IndexedDB に同期する。
 *
 * `onAuthStateChanged` から呼ばれ、以下 2 系統で発火する:
 * - Google 認証で新規 sign-in した直後 (redirect 戻り or Pair 引き継ぎ)
 * - 別セッションでの sign-in 状態をブラウザが復元した時 (Cookie パージ後の復帰含む)
 *
 * `/auth/link` は冪等なので、同じ user で複数回叩いても副作用は起きない。
 */
const syncAuthedUser = async (user: User): Promise<void> => {
  try {
    const idToken = await user.getIdToken();
    await apiClient.post('/auth/link', { id_token: idToken });
    const { data } = await apiClient.get<MyTripsOut>('/me/trips');
    await mergeServerVisitedTripUrlIds(data.url_ids);
  } catch (err) {
    console.error('failed to sync authed user', err);
    toast.error('旅程の同期に失敗しました。時間をおいて再度お試しください。');
  }
};

/** Google 認証を開始する (外部 OAuth ページへリダイレクト)。戻り処理は useAuthStateSync に集約。 */
export const signInWithGoogle = async (): Promise<void> => {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  await signInWithRedirect(auth, provider);
};
