import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback } from 'react';
import { pwaIsReadyAtom, pwaPromptEventAtom } from '@/atoms/pwa';

export type PWAInstallResult = 'accepted' | 'dismissed' | 'unavailable';

export const usePWAInstall = () => {
  const isReady = useAtomValue(pwaIsReadyAtom);
  const promptEvent = useAtomValue(pwaPromptEventAtom);
  const setPromptEvent = useSetAtom(pwaPromptEventAtom);

  const installApp = useCallback(async (): Promise<PWAInstallResult> => {
    if (promptEvent === null) return 'unavailable';

    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;

    // プロンプトは一度しか使用できないため、使用後にnullリセット
    setPromptEvent(null);

    return outcome;
  }, [promptEvent, setPromptEvent]);

  return { isReady, installApp };
};
