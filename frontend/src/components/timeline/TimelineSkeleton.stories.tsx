import type { Meta, StoryObj } from '@storybook/react';
import { TimelineSkeleton } from './TimelineSkeleton';

const meta: Meta<typeof TimelineSkeleton> = {
  title: 'Components/TimelineSkeleton',
  component: TimelineSkeleton,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'タイムラインコンポーネントのローディング状態を表示するスケルトンコンポーネント。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    itemCount: {
      control: { type: 'number', min: 1, max: 10 },
      description: '表示するスケルトンアイテムの数',
    },
    className: {
      control: { type: 'text' },
      description: '追加のCSSクラス',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    itemCount: 3,
  },
  parameters: {
    docs: {
      description: {
        story: 'デフォルトの3アイテム表示。一般的なローディング状態です。',
      },
    },
  },
};

export const SingleItem: Story = {
  args: {
    itemCount: 1,
  },
  parameters: {
    docs: {
      description: {
        story: '1アイテムのみ表示。最小限のローディング状態です。',
      },
    },
  },
};

export const ManyItems: Story = {
  args: {
    itemCount: 5,
  },
  parameters: {
    docs: {
      description: {
        story: '5アイテム表示。多くのブロックがある場合のローディング状態です。',
      },
    },
  },
};
