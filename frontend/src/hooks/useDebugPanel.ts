import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { debugPanelEnabledAtom } from '@/atoms/debug';

/**
 * `DebugLogPanel` の表示可否と、その有効化手段 (URL query / ロゴ連打)。
 * 詳細は [@docs/debug_logger.md](../../../docs/debug_logger.md)。
 */

const DEBUG_PARAM = 'debug';

/** ロゴ連打で切り替えるまでのタップ数と、連打とみなすタップ間隔 */
const REQUIRED_TAPS = 7;
const TAP_INTERVAL_MS = 800;
/** 残り何回から通知を出すか (Android の開発者オプションと同じく途中から気づける) */
const HINT_FROM_REMAINING = 3;

const parseParam = (param: string | null): boolean | null => {
  if (param === '1') return true;
  if (param === '0') return false;
  return null;
};

/** ロゴは画面遷移で unmount されうるので、連打の途中経過は module scope に置く */
const tapState = { count: 0, lastTapAt: 0 };

/** `?debug=1` / `?debug=0` を状態に反映しつつ、パネルの表示可否を返す */
export const useDebugPanel = (): boolean => {
  const [searchParams] = useSearchParams();
  const requested = parseParam(searchParams.get(DEBUG_PARAM));
  const [enabled, setEnabled] = useAtom(debugPanelEnabledAtom);

  useEffect(() => {
    if (requested == null) return;
    setEnabled(requested);
  }, [requested, setEnabled]);

  return enabled;
};

/**
 * ロゴを短時間に 7 回タップすると診断パネルの表示を切り替える。
 * PWA インストール後は query 付き URL を開けないため、URL に頼らない有効化手段が要る。
 */
export const useDebugTapGesture = (): (() => void) => {
  const enabled = useAtomValue(debugPanelEnabledAtom);
  const setEnabled = useSetAtom(debugPanelEnabledAtom);

  return () => {
    const now = Date.now();
    tapState.count = now - tapState.lastTapAt > TAP_INTERVAL_MS ? 1 : tapState.count + 1;
    tapState.lastTapAt = now;

    if (tapState.count >= REQUIRED_TAPS) {
      tapState.count = 0;
      setEnabled(!enabled);
      toast.success(enabled ? 'デバッグモードをOFFにしました' : 'デバッグモードをONにしました', { id: 'debug-tap' });
      return;
    }

    const remaining = REQUIRED_TAPS - tapState.count;
    if (remaining <= HINT_FROM_REMAINING) {
      toast(`あと${remaining}回でデバッグモードを切り替えます`, { id: 'debug-tap' });
    }
  };
};
