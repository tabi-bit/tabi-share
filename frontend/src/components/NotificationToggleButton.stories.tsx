import type { Meta, StoryObj } from '@storybook/react';
import { NotificationToggleButtonView } from './NotificationToggleButton';

const meta = {
  title: 'Components/NotificationToggleButton',
  component: NotificationToggleButtonView,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Trip 閲覧ヘッダーに配置する通知トグルボタン。' +
          'ベル/斜線ベル アイコンで購読状態を切り替える。購読成功時のトーストにテスト送信アクションが乗る。' +
          'iOS Safari で PWA 未 install の場合は install 誘導ダイアログを表示する。',
      },
    },
  },
} satisfies Meta<typeof NotificationToggleButtonView>;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = (): void => undefined;
const noopBool = (_open: boolean) => undefined;

export const Unsubscribed: Story = {
  args: {
    isSubscribed: false,
    isLoading: false,
    disabled: false,
    onToggleClick: noop,
    iosDialogOpen: false,
    onIosDialogOpenChange: noopBool,
  },
  parameters: {
    docs: {
      description: {
        story: '未購読状態。斜線ベル (BellOff) アイコンのみ表示。タップで購読フローに入る。',
      },
    },
  },
};

export const Subscribed: Story = {
  args: {
    isSubscribed: true,
    isLoading: false,
    disabled: false,
    onToggleClick: noop,
    iosDialogOpen: false,
    onIosDialogOpenChange: noopBool,
  },
  parameters: {
    docs: {
      description: {
        story:
          '購読中状態。塗りベル (Bell) アイコンでのみ表示。テスト送信は購読成功トーストのアクション経由で呼び出す。',
      },
    },
  },
};

export const Loading: Story = {
  args: {
    isSubscribed: false,
    isLoading: true,
    disabled: true,
    onToggleClick: noop,
    iosDialogOpen: false,
    onIosDialogOpenChange: noopBool,
  },
  parameters: {
    docs: {
      description: {
        story: '購読 API 呼び出し中。スピナー (Loader2) 表示、ボタン disabled。',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    isSubscribed: false,
    isLoading: false,
    disabled: true,
    onToggleClick: noop,
    iosDialogOpen: false,
    onIosDialogOpenChange: noopBool,
  },
  parameters: {
    docs: {
      description: {
        story: 'tripId が null 等で操作不能。ボタンは disabled でグレーアウト。',
      },
    },
  },
};

export const IOSInstallDialogOpen: Story = {
  args: {
    isSubscribed: false,
    isLoading: false,
    disabled: false,
    onToggleClick: noop,
    iosDialogOpen: true,
    onIosDialogOpenChange: noopBool,
  },
  parameters: {
    docs: {
      description: {
        story:
          'iOS Safari で PWA 未 install な状態でベルをタップした後の表示。' +
          'ダイアログでホーム画面追加の手順を案内する。',
      },
    },
  },
};
