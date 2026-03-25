import { atom } from 'jotai';
import type { BeforeInstallPromptEvent } from '@/lib/pwa';

/**
 * beforeinstallprompt イベントを保持するatom
 * null = インストール不可（既にインストール済み or 非対応ブラウザ）
 */
export const pwaPromptEventAtom = atom<BeforeInstallPromptEvent | null>(null);

/**
 * PWAインストールが可能な状態かどうか（derived read-only atom）
 */
export const pwaIsReadyAtom = atom<boolean>(get => get(pwaPromptEventAtom) !== null);
