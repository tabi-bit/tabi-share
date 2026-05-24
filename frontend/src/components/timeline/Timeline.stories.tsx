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
    location: null,
  },
  {
    id: 2,
    type: 'transportation',
    transportationType: 'car',
    title: '車移動',
    startTime: new Date(2024, 0, 1, 15, 0),
    endTime: new Date(2024, 0, 1, 16, 0),
    pageId: 1,
    location: null,
    destinationLocation: null,
  },
  {
    id: 3,
    type: 'schedule',
    title: '予定のタイトル（テンプレート）',
    startTime: new Date(2024, 0, 1, 17, 0),
    endTime: new Date(2024, 0, 1, 19, 0),
    pageId: 1,
    location: null,
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
    location: null,
    destinationLocation: null,
  },
  {
    id: 5,
    type: 'schedule',
    title: '点の予定',
    startTime: new Date(2024, 0, 1, 22, 0),
    endTime: null,
    pageId: 1,
    location: null,
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

// --- 重なりケース ---

/** ケース1: 同一開始時刻 + nullあり（ユーザーの例） */
export const OverlappingSameStart: Story = {
  args: {
    blocks: [
      {
        id: 1,
        type: 'schedule',
        title: '温泉旅館チェックイン',
        startTime: new Date(2024, 0, 1, 10, 0),
        endTime: new Date(2024, 0, 1, 11, 0),
        pageId: 1,
        location: null,
      },
      {
        id: 2,
        type: 'schedule',
        title: 'お土産購入',
        startTime: new Date(2024, 0, 1, 10, 0),
        endTime: null,
        pageId: 1,
        location: null,
      },
      {
        id: 3,
        type: 'transportation',
        transportationType: 'car',
        title: '駐車場まで移動',
        startTime: new Date(2024, 0, 1, 10, 0),
        endTime: new Date(2024, 0, 1, 10, 30),
        pageId: 1,
        location: null,
        destinationLocation: null,
      },
    ] satisfies Block[],
    type: 'view',
  },
};

/** ケース2: 同一開始時刻・nullなし */
export const OverlappingNoNull: Story = {
  args: {
    blocks: [
      {
        id: 1,
        type: 'transportation',
        transportationType: 'car',
        title: '駐車場まで移動',
        startTime: new Date(2024, 0, 1, 10, 0),
        endTime: new Date(2024, 0, 1, 10, 30),
        pageId: 1,
        location: null,
        destinationLocation: null,
      },
      {
        id: 2,
        type: 'schedule',
        title: '温泉旅館チェックイン',
        startTime: new Date(2024, 0, 1, 10, 0),
        endTime: new Date(2024, 0, 1, 11, 0),
        pageId: 1,
        location: null,
      },
    ] satisfies Block[],
    type: 'view',
  },
};

/** ケース3: グループ + gap + 単独ブロック */
export const OverlappingWithGap: Story = {
  args: {
    blocks: [
      {
        id: 1,
        type: 'schedule',
        title: 'お土産購入',
        startTime: new Date(2024, 0, 1, 10, 0),
        endTime: null,
        pageId: 1,
        location: null,
      },
      {
        id: 2,
        type: 'transportation',
        transportationType: 'car',
        title: '駐車場まで移動',
        startTime: new Date(2024, 0, 1, 10, 0),
        endTime: new Date(2024, 0, 1, 10, 30),
        pageId: 1,
        location: null,
        destinationLocation: null,
      },
      {
        id: 3,
        type: 'schedule',
        title: '温泉旅館チェックイン',
        startTime: new Date(2024, 0, 1, 10, 0),
        endTime: new Date(2024, 0, 1, 11, 0),
        pageId: 1,
        location: null,
      },
      {
        id: 4,
        type: 'schedule',
        title: 'ランチ',
        startTime: new Date(2024, 0, 1, 12, 0),
        endTime: new Date(2024, 0, 1, 14, 0),
        pageId: 1,
        location: null,
      },
    ] satisfies Block[],
    type: 'view',
  },
};
