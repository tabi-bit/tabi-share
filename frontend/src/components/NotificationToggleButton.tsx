import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useTripSubscription } from '@/hooks/useTripSubscription';
import { useConfirm } from '@/lib/confirm';
import { fetchFcmToken, requestNotificationPermission } from '@/lib/messaging';
import { isNotificationSupported, needsIOSInstallForNotification } from '@/lib/platform';
import { cn } from '@/lib/utils';
import { IOSInstallInstructionDialog } from './IOSInstallInstructionDialog';
import { Button } from './ui/button';

// テスト送信誘導 toast の表示秒数。デフォルト (4 秒) だとユーザがアクションを押す前に消えるため長めに。
const SUBSCRIBE_TOAST_DURATION_MS = 10000;

type NotificationToggleButtonViewProps = {
  isSubscribed: boolean;
  isLoading: boolean;
  disabled: boolean;
  onToggleClick: () => void;
  iosDialogOpen: boolean;
  onIosDialogOpenChange: (open: boolean) => void;
  className?: string;
};

export const NotificationToggleButtonView = ({
  isSubscribed,
  isLoading,
  disabled,
  onToggleClick,
  iosDialogOpen,
  onIosDialogOpenChange,
  className,
}: NotificationToggleButtonViewProps) => {
  return (
    <>
      <div className={cn('flex flex-row items-center gap-1', className)}>
        <Button
          variant='default'
          size='icon'
          className='size-7 sm:size-9'
          onClick={onToggleClick}
          disabled={disabled}
          aria-label={isSubscribed ? '通知を無効にする' : '通知を有効にする'}
          aria-pressed={isSubscribed}
        >
          {isLoading ? (
            <Loader2 className='size-4 animate-spin sm:size-5' />
          ) : isSubscribed ? (
            <Bell className='size-4 sm:size-5' />
          ) : (
            <BellOff className='size-4 sm:size-5' />
          )}
        </Button>
      </div>
      <IOSInstallInstructionDialog open={iosDialogOpen} onOpenChange={onIosDialogOpenChange} />
    </>
  );
};

type NotificationToggleButtonProps = {
  tripId: number | null;
  /** Trip.start_date が未設定なら「日付未設定です」アラートを出したうえで購読させる */
  tripHasStartDate: boolean;
  className?: string;
};

const getBrowserTimezone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

export const NotificationToggleButton = ({ tripId, tripHasStartDate, className }: NotificationToggleButtonProps) => {
  const { isSubscribed, isLoading, subscribe, unsubscribe, sendTest } = useTripSubscription(tripId);
  const [iosDialogOpen, setIosDialogOpen] = useState(false);
  // useTripSubscription.isLoading は SWR GET のみ反映で click 中の非同期処理をカバーできないため、
  // ローカル pending state で spinner + 連打防止する。
  const [isPending, setIsPending] = useState(false);
  const confirm = useConfirm();

  const handleTestSend = useCallback(async () => {
    try {
      const fcmToken = await fetchFcmToken();
      if (fcmToken == null) {
        toast.error('通知トークンの取得に失敗しました');
        return;
      }
      await sendTest({ fcmToken });
      toast.success('テスト通知を送信しました');
    } catch {
      toast.error('テスト送信に失敗しました');
    }
  }, [sendTest]);

  const handleClick = useCallback(async () => {
    if (tripId == null || isPending) return;

    if (isSubscribed) {
      setIsPending(true);
      try {
        const fcmToken = await fetchFcmToken();
        if (fcmToken == null) {
          toast.error('通知を解除できませんでした', { description: '通知トークンを取得できませんでした' });
          return;
        }
        await unsubscribe({ fcmToken });
        toast.success('通知を無効にしました');
      } catch {
        toast.error('通知を解除できませんでした', {
          description: '時間を置いて再度お試しください',
        });
      } finally {
        setIsPending(false);
      }
      return;
    }

    // iOS Safari は PWA install 後でないと permission リクエスト自体不可なので誘導ダイアログへ
    if (needsIOSInstallForNotification()) {
      setIosDialogOpen(true);
      return;
    }

    // 既に permission が denied なら requestPermission は再プロンプトしない (silently denied 返し) ため、
    // 呼び出し前に判定して OS 設定への誘導メッセージを出す
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      toast.error('通知が OS 設定でブロックされています', {
        description: 'iOS: 設定 > 通知 > たびしぇあ / Android: 設定 > アプリ > たびしぇあ',
      });
      return;
    }

    if (!tripHasStartDate) {
      const confirmed = await confirm({
        title: 'この旅程は日付が未設定です',
        description: '日付を設定するまで通知は届きません。それでも通知を有効にしますか？',
        confirmText: '有効化する',
        cancelText: 'やめる',
      });
      if (!confirmed) return;
    }

    setIsPending(true);
    try {
      const permission = await requestNotificationPermission();
      if (permission === 'denied') {
        toast.error('通知が拒否されました', {
          description: 'OS 設定から許可してください (iOS: 設定 > 通知 / Android: 設定 > アプリ)',
        });
        return;
      }
      if (permission !== 'granted') {
        toast.error('通知を有効にできませんでした', {
          description: '許可プロンプトが閉じられました。もう一度お試しください',
        });
        return;
      }

      const fcmToken = await fetchFcmToken();
      if (fcmToken == null) {
        toast.error('通知を有効にできませんでした', {
          description: '通知トークンを取得できませんでした。ブラウザや OS の設定をご確認ください',
        });
        return;
      }

      await subscribe({
        fcmToken,
        timezone: getBrowserTimezone(),
        userAgent: navigator.userAgent,
      });
      // 常設のテスト送信ボタンを置くと見栄えが悪いので、購読成功トーストにアクションとして埋め込む
      toast.success('通知を有効にしました', {
        duration: SUBSCRIBE_TOAST_DURATION_MS,
        action: {
          label: 'テスト送信',
          onClick: () => {
            handleTestSend();
          },
        },
      });
    } catch (err) {
      // 予期しないエラー (Firebase 初期化失敗 / SW 登録失敗 / 通信エラー等) の総合フォールバック
      toast.error('通知を有効にできませんでした', {
        description: err instanceof Error && err.message ? err.message : '設定などをご確認ください',
      });
    } finally {
      setIsPending(false);
    }
  }, [tripId, isPending, isSubscribed, tripHasStartDate, subscribe, unsubscribe, confirm, handleTestSend]);

  // Web Push 非対応ブラウザではボタン自体を出さない (macOS Safari 非 PWA / insecure context 等)。
  // iOS Safari (未 install) は Notification API は生えている前提でここでは弾かず、
  // click 時に needsIOSInstallForNotification() で install 誘導ダイアログへ回す。
  if (!isNotificationSupported()) return null;

  const showLoading = isLoading || isPending;
  return (
    <NotificationToggleButtonView
      isSubscribed={isSubscribed}
      isLoading={showLoading}
      disabled={tripId == null || showLoading}
      onToggleClick={handleClick}
      iosDialogOpen={iosDialogOpen}
      onIosDialogOpenChange={setIosDialogOpen}
      className={className}
    />
  );
};
