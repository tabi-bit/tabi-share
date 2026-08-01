import {
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  type User,
} from 'firebase/auth';
import { useSetAtom } from 'jotai';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { authUserAtom, magicLinkPromptUrlAtom } from '@/atoms/auth';
import { apiClient } from '@/lib/apiClient';
import { getFirebaseAuth } from '@/lib/firebase';
import { mergeServerVisitedTripUrlIds } from './useVisitedTrips';

/**
 * マジックリンクの遷移先。同じデバイスの同じブラウザで戻ってくることを想定し、
 * SPA のトップにリダイレクトする (クエリでリンク検証情報が付いてくる)。
 */
const getActionCodeSettings = () => ({
  url: `${window.location.origin}/`,
  handleCodeInApp: true,
});

const PENDING_EMAIL_STORAGE_KEY = 'auth:pendingEmail';

interface MyTripsOut {
  url_ids: string[];
}

/**
 * Firebase Auth 状態を Jotai atom に反映し、sign-in 検出時にサーバー側の
 * session 紐付けと旅程一覧の同期を実行する。App 直下で 1 度だけ呼び出す。
 *
 * - `/auth/link` は冪等 (パターン 3: 再認証 = no-op) なので、Cookie パージ後の
 *   復帰時にもここから呼び直せば匿名 user のマージ or 昇格が発火する (H-2 対応)。
 * - StrictMode の dev double-invoke で `signInWithEmailLink` が消費済み oobCode
 *   で 2 回目に失敗するのを ref フラグでガードする (M-2 対応)。
 */
export const useAuthStateSync = (): void => {
  const setAuthUser = useSetAtom(authUserAtom);
  const setMagicLinkPromptUrl = useSetAtom(magicLinkPromptUrlAtom);
  const magicLinkCompletedRef = useRef(false);

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
    if (magicLinkCompletedRef.current) return;
    magicLinkCompletedRef.current = true;
    void completeMagicLinkSignInIfPresent(setMagicLinkPromptUrl);
  }, [setMagicLinkPromptUrl]);
};

/**
 * URL がマジックリンクなら Firebase の sign-in を完了する。
 * サーバーへの紐付け (`/auth/link`) と旅程一覧同期 (`/me/trips`) は
 * `onAuthStateChanged` 側で行うため、ここでは Firebase 側の完了と
 * URL / localStorage のクリーンアップに責務を絞る。
 *
 * localStorage の pendingEmail が無い場合 (PC 送信 → スマホ受信 等の別デバイス完了ケース) は
 * atom 経由で MagicLinkEmailPromptDialog を開き、そちらで email 再入力 + `signInWithEmailLink`
 * を実行する。この場合の URL/localStorage クリーンアップは Dialog 側の責務。
 */
const completeMagicLinkSignInIfPresent = async (setMagicLinkPromptUrl: (url: string | null) => void): Promise<void> => {
  const auth = getFirebaseAuth();
  const url = window.location.href;
  if (!isSignInWithEmailLink(auth, url)) return;

  const email = window.localStorage.getItem(PENDING_EMAIL_STORAGE_KEY);
  if (email == null) {
    // 別デバイスで開いたケース: Dialog に完了処理を委譲する
    setMagicLinkPromptUrl(url);
    return;
  }

  try {
    await signInWithEmailLink(auth, email, url);
  } catch (err) {
    console.error('failed to complete magic link sign-in', err);
    toast.error('メール認証に失敗しました。リンクの有効期限が切れているか、消費済みの可能性があります。');
  } finally {
    // 成功でも失敗でも、リロード時に消費済み oobCode で再度失敗しないようクリーンアップ
    window.localStorage.removeItem(PENDING_EMAIL_STORAGE_KEY);
    window.history.replaceState({}, '', window.location.pathname);
  }
};

/**
 * sign-in ユーザーに対してサーバー側の session を紐付け、旅程一覧を IndexedDB に同期する。
 *
 * `onAuthStateChanged` から呼ばれ、以下 2 系統で発火する:
 * - マジックリンクで新規 sign-in した直後
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

/** マジックリンクを送信する。email は localStorage に保存しておき、戻ってきた時に使う。 */
export const sendMagicLink = async (email: string): Promise<void> => {
  window.localStorage.setItem(PENDING_EMAIL_STORAGE_KEY, email);
  await sendSignInLinkToEmail(getFirebaseAuth(), email, getActionCodeSettings());
};
