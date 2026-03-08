import type { Meta, StoryObj } from '@storybook/react';
import type { Block } from '@/types/block';
import { Timeline } from './Timeline';

const meta: Meta<typeof Timeline> = {
  title: 'Components/Timeline',
  component: Timeline,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['view', 'edit'],
      description: 'タイムラインの表示モード',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleBlocks: Block[] = [
  {
    id: 1,
    type: 'schedule',
    title: '予定のタイトル（テンプレート）',
    startTime: new Date(2024, 0, 1, 12, 0),
    endTime: new Date(2024, 0, 1, 14, 0),
    detail: `detail detail
• detail detail
リンク`.repeat(20),
    pageId: 1,
  },
  {
    id: 2,
    type: 'transportation',
    transportationType: 'car',
    title: '車移動',
    startTime: new Date(2024, 0, 1, 15, 0),
    endTime: new Date(2024, 0, 1, 16, 0),
    pageId: 1,
  },
  {
    id: 3,
    type: 'schedule',
    title: '予定のタイトル（テンプレート）',
    startTime: new Date(2024, 0, 1, 17, 0),
    endTime: new Date(2024, 0, 1, 19, 0),
    pageId: 1,
  },
  {
    id: 4,
    type: 'transportation',
    transportationType: 'car',
    title: '車移動',
    startTime: new Date(2024, 0, 1, 19, 0),
    endTime: new Date(2024, 0, 1, 20, 0),
    detail: `detail detail
    • detail detail
    リンク`.repeat(20),
    pageId: 1,
  },
  {
    id: 5,
    type: 'schedule',
    title: '点の予定',
    startTime: new Date(2024, 0, 1, 22, 0),
    endTime: null,
    pageId: 1,
  },
];

export const ViewMode: Story = {
  args: {
    blocks: sampleBlocks,
    type: 'view',
  },
};

export const EditMode: Story = {
  args: {
    blocks: sampleBlocks,
    type: 'edit',
  },
};
