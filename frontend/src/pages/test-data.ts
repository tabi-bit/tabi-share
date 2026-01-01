import type { Block, Page } from '@/types';
import type { Trip } from '@/types/trip';

export const demoBlocks2: Block[] = [
  {
    id: '1',
    type: 'schedule',
    title: '予定のタイトル（テンプレート）',
    startTime: new Date(2024, 0, 1, 12, 0),
    endTime: new Date(2024, 0, 1, 14, 0),
    details: `detail detail
• detail detail
リンク`.repeat(20),
  },
  {
    id: '2',
    type: 'transportation',
    transportationType: 'car',
    title: '車移動',
    startTime: new Date(2024, 0, 1, 15, 0),
    endTime: new Date(2024, 0, 1, 16, 0),
  },
  {
    id: '3',
    type: 'schedule',
    title: '予定のタイトル（テンプレート）',
    startTime: new Date(2024, 0, 1, 17, 0),
    endTime: new Date(2024, 0, 1, 19, 0),
  },
  {
    id: '4',
    type: 'transportation',
    transportationType: 'car',
    title: '車移動',
    startTime: new Date(2024, 0, 1, 19, 0),
    endTime: new Date(2024, 0, 1, 20, 0),
    details: `detail detail
• detail detail
リンク`.repeat(20),
  },
];

export const demoBlocks1: Block[] = [
  {
    id: '1',
    type: 'schedule',
    title: '予定のタイトル（テンプレート）',
    startTime: new Date(2024, 0, 1, 12, 0),
    endTime: new Date(2024, 0, 1, 14, 0),
    details: `detail detail
• detail detail
リンク`.repeat(20),
  },
  {
    id: '2',
    type: 'transportation',
    transportationType: 'car',
    title: '車移動',
    startTime: new Date(2024, 0, 1, 15, 0),
    endTime: new Date(2024, 0, 1, 16, 0),
  },
  {
    id: '3',
    type: 'schedule',
    title: '予定のタイトル（テンプレート）',
    startTime: new Date(2024, 0, 1, 17, 0),
    endTime: new Date(2024, 0, 1, 19, 0),
  },
  {
    id: '4',
    type: 'transportation',
    transportationType: 'car',
    title: '車移動',
    startTime: new Date(2024, 0, 1, 19, 0),
    endTime: new Date(2024, 0, 1, 20, 0),
    details: `detail detail
• detail detail
リンク`.repeat(20),
  },
  {
    id: '5',
    type: 'schedule',
    title: '予定のタイトル（テンプレート）',
    startTime: new Date(2024, 0, 1, 20, 0),
    endTime: new Date(2024, 0, 1, 22, 0),
    details: `detail detail
• detail detail
リンク`.repeat(20),
  },
  {
    id: '6',
    type: 'transportation',
    transportationType: 'car',
    title: '車移動',
    startTime: new Date(2024, 0, 1, 22, 0),
    endTime: new Date(2024, 0, 1, 23, 0),
  },
  {
    id: '7',
    type: 'schedule',
    title: '予定のタイトル（テンプレート）',
    startTime: new Date(2024, 0, 1, 23, 0),
    endTime: new Date(2024, 0, 2, 1, 0),
  },
  {
    id: '8',
    type: 'transportation',
    transportationType: 'car',
    title: '車移動',
    startTime: new Date(2024, 0, 2, 1, 0),
    endTime: new Date(2024, 0, 2, 2, 0),
    details: `detail detail
• detail detail
リンク`.repeat(20),
  },
];

export const demoPages: Page[] = [
  {
    id: 1,
    title: '1日目',
    tripId: 1,
  },
  {
    id: 2,
    title: '2日目',
    tripId: 1,
  },
  {
    id: 3,
    title: '3日目',
    tripId: 1,
  },
];

export const demoTrip: Trip = {
  id: 1,
  urlId: 'trip1',
  title: 'サンプル旅行',
};
