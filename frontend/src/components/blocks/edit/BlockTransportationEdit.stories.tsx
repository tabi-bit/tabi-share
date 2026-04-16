import type { Meta, StoryObj } from '@storybook/react';
import type { TransportationBlock } from '@/types/block';
import { BlockTransportationEdit } from './BlockTransportationEdit';

const meta: Meta<typeof BlockTransportationEdit> = {
  title: 'Components/Blocks/Edit/BlockTransportationEdit',
  component: BlockTransportationEdit,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const baseBlock: TransportationBlock = {
  id: 1,
  type: 'transportation',
  transportationType: 'car',
  title: '新宿駅 → 草津温泉',
  startTime: new Date('2024-01-01T09:00:00'),
  endTime: new Date('2024-01-01T10:30:00'),
  pageId: 1,
};

export const Default: Story = {
  args: {
    block: baseBlock,
  },
  decorators: [
    Story => (
      <div style={{ width: 400, height: 80 }}>
        <Story />
      </div>
    ),
  ],
};

export const StartTimeOnly: Story = {
  args: {
    block: {
      ...baseBlock,
      endTime: null,
    },
  },
  decorators: [
    Story => (
      <div style={{ width: 400, height: 80 }}>
        <Story />
      </div>
    ),
  ],
};

export const SmallHeight: Story = {
  args: {
    block: baseBlock,
  },
  decorators: [
    Story => (
      <div style={{ width: 400, height: 50 }}>
        <Story />
      </div>
    ),
  ],
};

export const TinyHeight: Story = {
  args: {
    block: baseBlock,
  },
  decorators: [
    Story => (
      <div style={{ width: 400, height: 28 }}>
        <Story />
      </div>
    ),
  ],
};

export const Train: Story = {
  args: {
    block: {
      ...baseBlock,
      transportationType: 'train',
      title: '東京駅 → 熱海駅',
    },
  },
  decorators: [
    Story => (
      <div style={{ width: 400, height: 80 }}>
        <Story />
      </div>
    ),
  ],
};

export const Bus: Story = {
  args: {
    block: {
      ...baseBlock,
      transportationType: 'bus',
      title: '熱海駅 → 温泉街',
    },
  },
  decorators: [
    Story => (
      <div style={{ width: 400, height: 80 }}>
        <Story />
      </div>
    ),
  ],
};

export const Flight: Story = {
  args: {
    block: {
      ...baseBlock,
      transportationType: 'flight',
      title: '羽田空港 → 那覇空港',
    },
  },
  decorators: [
    Story => (
      <div style={{ width: 400, height: 80 }}>
        <Story />
      </div>
    ),
  ],
};
