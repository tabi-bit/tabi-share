/**
 * W3C 仕様の BeforeInstallPromptEvent 型定義
 * TypeScript 標準 lib.dom.d.ts に未収録のため独自定義
 */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}
