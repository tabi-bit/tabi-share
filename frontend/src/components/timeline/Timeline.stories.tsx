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

// --- 現在時刻インジケータ ---

const nowSampleBlocks: Block[] = [
  {
    id: 1,
    type: 'schedule',
    title: '朝食',
    startTime: new Date(2024, 0, 1, 8, 0),
    endTime: new Date(2024, 0, 1, 9, 0),
    pageId: 1,
    location: null,
  },
  {
    id: 2,
    type: 'transportation',
    transportationType: 'car',
    title: '観光地へ移動',
    startTime: new Date(2024, 0, 1, 9, 0),
    endTime: new Date(2024, 0, 1, 10, 0),
    pageId: 1,
    location: null,
    destinationLocation: null,
  },
  {
    id: 3,
    type: 'schedule',
    title: '観光',
    startTime: new Date(2024, 0, 1, 10, 0),
    endTime: new Date(2024, 0, 1, 12, 0),
    pageId: 1,
    location: null,
  },
  {
    id: 4,
    type: 'schedule',
    title: 'ランチ',
    startTime: new Date(2024, 0, 1, 13, 0),
    endTime: new Date(2024, 0, 1, 14, 0),
    pageId: 1,
    location: null,
  },
];

/** NOW: ブロック時間内 (10:00-12:00 の観光中、now=11:00) → 該当ブロックに赤 ring + NOW バッジ */
export const NowInsideBlock: Story = {
  args: {
    blocks: nowSampleBlocks,
    type: 'view',
    pageDate: new Date(2024, 0, 1),
    now: new Date(2024, 0, 1, 11, 0),
  },
};

/** NOW: gap 内 (12:00-13:00 の間、now=12:30) → gap 中央にライン */
export const NowInGap: Story = {
  args: {
    blocks: nowSampleBlocks,
    type: 'view',
    pageDate: new Date(2024, 0, 1),
    now: new Date(2024, 0, 1, 12, 30),
  },
};

/** NOW: 旅程開始前 (now=6:00, 最初のブロック=8:00) → 先頭に張り付き */
export const NowBeforeStart: Story = {
  args: {
    blocks: nowSampleBlocks,
    type: 'view',
    pageDate: new Date(2024, 0, 1),
    now: new Date(2024, 0, 1, 6, 0),
  },
};

/** NOW: 旅程終了後 (now=18:00, 最後のブロック終了=14:00) → 末尾に張り付き */
export const NowAfterEnd: Story = {
  args: {
    blocks: nowSampleBlocks,
    type: 'view',
    pageDate: new Date(2024, 0, 1),
    now: new Date(2024, 0, 1, 18, 0),
  },
};

/** NOW: 末尾ブロックが endTime=null + bottom-stuck (末尾ブロックからの inline 点線が出ないことを確認) */
export const NowAfterEndOfNullBlock: Story = {
  args: {
    blocks: [
      {
        id: 1,
        type: 'schedule',
        title: '朝食',
        startTime: new Date(2024, 0, 1, 8, 0),
        endTime: new Date(2024, 0, 1, 9, 0),
        pageId: 1,
        location: null,
      },
      {
        id: 2,
        type: 'schedule',
        title: '点の予定 (最後)',
        startTime: new Date(2024, 0, 1, 15, 0),
        endTime: null,
        pageId: 1,
        location: null,
      },
    ] satisfies Block[],
    type: 'view',
    pageDate: new Date(2024, 0, 1),
    now: new Date(2024, 0, 1, 18, 0),
  },
};

/** NOW: endTime=null ブロック後の暗黙 gap */
export const NowInImplicitGap: Story = {
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
        type: 'schedule',
        title: '夕食',
        startTime: new Date(2024, 0, 1, 18, 0),
        endTime: new Date(2024, 0, 1, 19, 0),
        pageId: 1,
        location: null,
      },
    ] satisfies Block[],
    type: 'view',
    pageDate: new Date(2024, 0, 1),
    now: new Date(2024, 0, 1, 14, 0),
  },
};
