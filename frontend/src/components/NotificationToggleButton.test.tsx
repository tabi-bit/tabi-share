import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToast.success(...args),
    error: (...args: unknown[]) => mockToast.error(...args),
  },
}));

const mockConfirm = vi.fn();
vi.mock('@/lib/confirm', () => ({
  useConfirm: () => mockConfirm,
}));

const mockFetchFcmToken = vi.fn();
const mockRequestNotificationPermission = vi.fn();
vi.mock('@/lib/messaging', () => ({
  fetchFcmToken: () => mockFetchFcmToken(),
  requestNotificationPermission: () => mockRequestNotificationPermission(),
}));

const mockIsNotificationSupported = vi.fn();
const mockNeedsIOSInstall = vi.fn();
vi.mock('@/lib/platform', () => ({
  isNotificationSupported: () => mockIsNotificationSupported(),
  needsIOSInstallForNotification: () => mockNeedsIOSInstall(),
}));

const subscriptionMock = {
  isSubscribed: false,
  isLoading: false,
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  sendTest: vi.fn(),
};
vi.mock('@/hooks/useTripSubscription', () => ({
  useTripSubscription: () => subscriptionMock,
}));

import { NotificationToggleButton } from './NotificationToggleButton';

const setNotificationPermission = (permission: NotificationPermission) => {
  Object.defineProperty(globalThis, 'Notification', {
    value: { permission, requestPermission: vi.fn() },
    configurable: true,
    writable: true,
  });
};

describe('NotificationToggleButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionMock.isSubscribed = false;
    subscriptionMock.isLoading = false;
    subscriptionMock.subscribe.mockResolvedValue(undefined);
    subscriptionMock.unsubscribe.mockResolvedValue(undefined);
    subscriptionMock.sendTest.mockResolvedValue(undefined);
    mockConfirm.mockResolvedValue(true);
    mockFetchFcmToken.mockResolvedValue('token-abc');
    mockRequestNotificationPermission.mockResolvedValue('granted');
    mockIsNotificationSupported.mockReturnValue(true);
    mockNeedsIOSInstall.mockReturnValue(false);
    setNotificationPermission('default');
  });

  describe('OFF → ON (購読フロー)', () => {
    it('ブラウザ非対応時はボタン自体を出さない', () => {
      mockIsNotificationSupported.mockReturnValue(false);
      render(<NotificationToggleButton tripId={1} tripHasStartDate={true} />);
      expect(screen.queryByRole('button', { name: '通知を有効にする' })).toBeNull();
    });

    it('OS 設定で既に denied なら OS 設定への誘導トーストを出し requestPermission を呼ばない', async () => {
      setNotificationPermission('denied');
      const user = userEvent.setup();
      render(<NotificationToggleButton tripId={1} tripHasStartDate={true} />);
      await user.click(screen.getByRole('button', { name: '通知を有効にする' }));
      expect(mockToast.error).toHaveBeenCalledWith('通知が OS 設定でブロックされています', expect.any(Object));
      expect(mockRequestNotificationPermission).not.toHaveBeenCalled();
    });

    it('permission リクエストで denied が返ればエラートースト', async () => {
      mockRequestNotificationPermission.mockResolvedValue('denied');
      const user = userEvent.setup();
      render(<NotificationToggleButton tripId={1} tripHasStartDate={true} />);
      await user.click(screen.getByRole('button', { name: '通知を有効にする' }));
      expect(mockToast.error).toHaveBeenCalledWith('通知が拒否されました', expect.any(Object));
      expect(subscriptionMock.subscribe).not.toHaveBeenCalled();
    });

    it('permission が default (プロンプト閉じ) なら別のエラートースト', async () => {
      mockRequestNotificationPermission.mockResolvedValue('default');
      const user = userEvent.setup();
      render(<NotificationToggleButton tripId={1} tripHasStartDate={true} />);
      await user.click(screen.getByRole('button', { name: '通知を有効にする' }));
      expect(mockToast.error).toHaveBeenCalledWith(
        '通知を有効にできませんでした',
        expect.objectContaining({ description: expect.stringContaining('プロンプトが閉じられました') })
      );
    });

    it('FCM token が null なら token 取得失敗のエラートースト', async () => {
      mockFetchFcmToken.mockResolvedValue(null);
      const user = userEvent.setup();
      render(<NotificationToggleButton tripId={1} tripHasStartDate={true} />);
      await user.click(screen.getByRole('button', { name: '通知を有効にする' }));
      expect(mockToast.error).toHaveBeenCalledWith(
        '通知を有効にできませんでした',
        expect.objectContaining({ description: expect.stringContaining('通知トークンを取得できませんでした') })
      );
    });

    it('subscribe が throw した場合、error.message を description に載せる', async () => {
      subscriptionMock.subscribe.mockRejectedValue(new Error('server 500'));
      const user = userEvent.setup();
      render(<NotificationToggleButton tripId={1} tripHasStartDate={true} />);
      await user.click(screen.getByRole('button', { name: '通知を有効にする' }));
      expect(mockToast.error).toHaveBeenCalledWith(
        '通知を有効にできませんでした',
        expect.objectContaining({ description: 'server 500' })
      );
    });

    it('subscribe が message 無しの Error で throw なら fallback description', async () => {
      subscriptionMock.subscribe.mockRejectedValue(new Error());
      const user = userEvent.setup();
      render(<NotificationToggleButton tripId={1} tripHasStartDate={true} />);
      await user.click(screen.getByRole('button', { name: '通知を有効にする' }));
      expect(mockToast.error).toHaveBeenCalledWith(
        '通知を有効にできませんでした',
        expect.objectContaining({ description: expect.stringContaining('設定などをご確認ください') })
      );
    });

    it('全ステップ成功時に success トースト + subscribe が正しい引数で呼ばれる', async () => {
      const user = userEvent.setup();
      render(<NotificationToggleButton tripId={1} tripHasStartDate={true} />);
      await user.click(screen.getByRole('button', { name: '通知を有効にする' }));
      expect(subscriptionMock.subscribe).toHaveBeenCalledWith(
        expect.objectContaining({
          fcmToken: 'token-abc',
          timezone: expect.any(String),
          userAgent: expect.any(String),
        })
      );
      expect(mockToast.success).toHaveBeenCalledWith(
        '通知を有効にしました',
        expect.objectContaining({
          duration: expect.any(Number),
          action: expect.objectContaining({ label: 'テスト送信', onClick: expect.any(Function) }),
        })
      );
    });

    it('購読成功トーストの action.onClick を叩くと sendTest が呼ばれる', async () => {
      const user = userEvent.setup();
      render(<NotificationToggleButton tripId={1} tripHasStartDate={true} />);
      await user.click(screen.getByRole('button', { name: '通知を有効にする' }));
      const opts = mockToast.success.mock.calls[0]?.[1] as { action: { onClick: () => void } } | undefined;
      opts?.action.onClick();
      // action.onClick は非同期処理を起動するので次tickまで待つ
      await Promise.resolve();
      await Promise.resolve();
      expect(subscriptionMock.sendTest).toHaveBeenCalledWith({ fcmToken: 'token-abc' });
    });

    it('Trip.start_date 未設定で confirm キャンセルなら以降のフローを実行しない', async () => {
      mockConfirm.mockResolvedValue(false);
      const user = userEvent.setup();
      render(<NotificationToggleButton tripId={1} tripHasStartDate={false} />);
      await user.click(screen.getByRole('button', { name: '通知を有効にする' }));
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('日付が未設定') })
      );
      expect(mockRequestNotificationPermission).not.toHaveBeenCalled();
      expect(subscriptionMock.subscribe).not.toHaveBeenCalled();
    });

    it('Trip.start_date 未設定でも confirm 承認なら続行する', async () => {
      const user = userEvent.setup();
      render(<NotificationToggleButton tripId={1} tripHasStartDate={false} />);
      await user.click(screen.getByRole('button', { name: '通知を有効にする' }));
      expect(subscriptionMock.subscribe).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('通知を有効にしました', expect.any(Object));
    });

    it('iOS 未 install なら install 誘導ダイアログが開き permission リクエストしない', async () => {
      mockNeedsIOSInstall.mockReturnValue(true);
      const user = userEvent.setup();
      render(<NotificationToggleButton tripId={1} tripHasStartDate={true} />);
      await user.click(screen.getByRole('button', { name: '通知を有効にする' }));
      expect(await screen.findByText(/インストールが必要/)).toBeInTheDocument();
      expect(mockRequestNotificationPermission).not.toHaveBeenCalled();
    });
  });

  describe('ON → OFF (解除フロー)', () => {
    beforeEach(() => {
      subscriptionMock.isSubscribed = true;
    });

    it('token 取得失敗ならエラートースト', async () => {
      mockFetchFcmToken.mockResolvedValue(null);
      const user = userEvent.setup();
      render(<NotificationToggleButton tripId={1} tripHasStartDate={true} />);
      await user.click(screen.getByRole('button', { name: '通知を無効にする' }));
      expect(mockToast.error).toHaveBeenCalledWith('通知を解除できませんでした', expect.any(Object));
      expect(subscriptionMock.unsubscribe).not.toHaveBeenCalled();
    });

    it('unsubscribe が throw したらエラートースト', async () => {
      subscriptionMock.unsubscribe.mockRejectedValue(new Error('nope'));
      const user = userEvent.setup();
      render(<NotificationToggleButton tripId={1} tripHasStartDate={true} />);
      await user.click(screen.getByRole('button', { name: '通知を無効にする' }));
      expect(mockToast.error).toHaveBeenCalledWith(
        '通知を解除できませんでした',
        expect.objectContaining({ description: expect.stringContaining('時間を置いて') })
      );
    });

    it('成功時に success トースト + unsubscribe が正しい引数で呼ばれる', async () => {
      const user = userEvent.setup();
      render(<NotificationToggleButton tripId={1} tripHasStartDate={true} />);
      await user.click(screen.getByRole('button', { name: '通知を無効にする' }));
      expect(subscriptionMock.unsubscribe).toHaveBeenCalledWith({ fcmToken: 'token-abc' });
      expect(mockToast.success).toHaveBeenCalledWith('通知を無効にしました');
    });
  });

  describe('tripId が null', () => {
    it('button は disabled になり操作しても何も起きない', async () => {
      const user = userEvent.setup();
      render(<NotificationToggleButton tripId={null} tripHasStartDate={true} />);
      const button = screen.getByRole('button', { name: '通知を有効にする' });
      expect(button).toBeDisabled();
      await user.click(button);
      expect(mockRequestNotificationPermission).not.toHaveBeenCalled();
      expect(subscriptionMock.subscribe).not.toHaveBeenCalled();
    });
  });
});
