import type { Meta, StoryObj } from '@storybook/react';
import { IOSInstallInstructionDialog } from './IOSInstallInstructionDialog';

const noop = (_open: boolean) => undefined;

const meta = {
  title: 'Components/IOSInstallInstructionDialog',
  component: IOSInstallInstructionDialog,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'iOS Safari で通知購読を試みた際に PWA 未 install なら表示する誘導ダイアログ。' +
          'iOS 16.4+ は「ホーム画面に追加」した状態でしか Web Push permission を取れないため、手順を明示する。',
      },
    },
  },
} satisfies Meta<typeof IOSInstallInstructionDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: {
    open: true,
    onOpenChange: noop,
  },
  parameters: {
    docs: {
      description: {
        story: 'ダイアログが開いた状態。共有ボタン → ホーム画面に追加の 5 ステップ手順を表示。',
      },
    },
  },
};

export const Closed: Story = {
  args: {
    open: false,
    onOpenChange: noop,
  },
  parameters: {
    docs: {
      description: {
        story: '閉じた状態 (何も描画されない)。デフォルト。',
      },
    },
  },
};
