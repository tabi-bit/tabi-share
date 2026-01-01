import type { Meta, StoryObj } from '@storybook/react';
import { BlockScheduleEdit } from './BlockScheduleEdit';

const meta: Meta<typeof BlockScheduleEdit> = {
  title: 'Components/Blocks/Edit/BlockScheduleEdit',
  component: BlockScheduleEdit,
  parameters: {},
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const baseScheduleBlock = {
  id: 1,
  type: 'schedule' as const,
  startTime: new Date(2024, 0, 1, 9, 0),
  endTime: new Date(2024, 0, 1, 21, 30),
  pageId: 1,
};

export const Default: Story = {
  args: {
    block: {
      ...baseScheduleBlock,
      title: '草津温泉入浴',
      details: '湯畑周辺の温泉施設を巡る。特に西の河原公園の露天風呂がおすすめ。',
    },
  },
};

export const WithoutDetails: Story = {
  args: {
    block: {
      ...baseScheduleBlock,
      title: '昼食',
    },
  },
};

export const LongTitleAndDetails: Story = {
  args: {
    block: {
      ...baseScheduleBlock,
      title: '草津温泉街散策と湯畑見学、お土産購入とカフェタイム',
      details: '温泉街をゆっくり散策しながら、湯畑の見学と地元の名産品を購入。最後にカフェでひと休み。'.repeat(5),
    },
  },
};
