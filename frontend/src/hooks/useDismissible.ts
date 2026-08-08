import { useEffect, useState } from 'react';
import { db } from '@/lib/db';

/**
 * バナーやセクションを「閉じる (再表示しない)」フラグを IndexedDB に永続化するフック。
 *
 * 呼び出し側は `dismissed === true` の間は該当 UI を非表示にする。`isLoaded === false` の間は
 * 状態が未確定なので、閉じるボタンを含むセクションを描画しない (ちらつき防止)。
 *
 * dismiss 状態は Header メニュー等の隠し動線からユーザーが該当機能を再度呼び出せるため、
 * reset は今回は提供しない (ボタン自体は消えたままで、動線はメニューに集約する設計)。
 */
export const useDismissible = (
  key: string
): {
  dismissed: boolean;
  isLoaded: boolean;
  dismiss: () => void;
} => {
  const [dismissed, setDismissed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    db.userSettings
      .get(key)
      .then(entry => {
        if (cancelled) return;
        setDismissed(entry?.value === true);
        setIsLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setIsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const dismiss = (): void => {
    setDismissed(true);
    db.userSettings.put({ key, value: true }).catch(() => {
      // fire-and-forget (状態は state 側で表示制御しているので、書き込み失敗は次回起動時に再表示されるだけ)
    });
  };

  return { dismissed, isLoaded, dismiss };
};
