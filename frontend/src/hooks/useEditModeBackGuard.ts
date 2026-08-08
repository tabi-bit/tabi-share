import { useAtom } from 'jotai';
import { useEffect } from 'react';
import { tripModeAtom } from '@/atoms/tripPage';

/**
 * Editモード中のブラウザバックを阻止し、Viewモードに戻す。
 * ダミー履歴エントリを1件積み、その popstate をViewモード復帰に読み替える。
 */
export const useEditModeBackGuard = () => {
  const [mode, setMode] = useAtom(tripModeAtom);

  useEffect(() => {
    if (mode !== 'edit') return;

    history.pushState({ editMode: true }, '', location.href);
    let poppedByBack = false;

    const handlePopState = () => {
      poppedByBack = true;
      setMode('view');
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      // 画面遷移による unmount では current entry が遷移先のものに変わっている。
      // ここで back() すると遷移先から旅程ページへ引き戻される (#187)
      const isDummyEntryCurrent = (history.state as { editMode?: boolean } | null)?.editMode === true;
      if (!poppedByBack && isDummyEntryCurrent) {
        history.back();
      }
    };
  }, [mode, setMode]);
};
