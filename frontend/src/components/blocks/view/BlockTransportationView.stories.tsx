import type { Meta, StoryObj } from '@storybook/react';
import type { TransportationBlock } from '@/types/block';
import { BlockTransportationView } from './BlockTransportationView';

const meta: Meta<typeof BlockTransportationView> = {
  title: 'Components/Blocks/View/BlockTransportationView',
  component: BlockTransportationView,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    block: {
      description: '移動ブロックのデータ',
      transportationType: {
        control: { type: 'select' },
        options: ['car', 'bus', 'train', 'flight'],
        description: '移動手段の種類',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const baseBlock: TransportationBlock = {
  id: 1,
  type: 'transportation',
  transportationType: 'car',
  title: '移動の予定',
  startTime: new Date('2024-01-01T09:00:00'),
  endTime: new Date('2024-01-01T10:30:00'),
  pageId: 1,
};

export const Default: Story = {
  args: {
    block: baseBlock,
  },
};

export const WithDetail: Story = {
  args: {
    block: {
      ...baseBlock,
      detail: '高速道路を使用して移動します。ETCカードを忘れずに。',
    },
  },
};

export const WithLongDetail: Story = {
  args: {
    block: {
      ...baseBlock,
      title: '新宿駅 → 草津温泉',
      detail: `detail detail
• detail detail
リンク
詳細詳細
詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細詳細`,
    },
  },
};
