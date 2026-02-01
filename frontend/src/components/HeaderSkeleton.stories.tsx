import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { HeaderSkeleton } from './HeaderSkeleton';

const meta = {
  title: 'Components/HeaderSkeleton',
  component: HeaderSkeleton,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'ヘッダーコンポーネントのローディング状態を表示するスケルトンコンポーネント。',
      },
    },
  },
  decorators: [
    Story => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  argTypes: {
    className: {
      control: { type: 'text' },
      description: '追加のCSSクラス',
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof HeaderSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'デフォルトのスケルトン表示。ヘッダーデータ読み込み中に表示されます。',
      },
    },
  },
};
