import { sortBlocks } from '@/lib/sortBlocks';
import type { Block, ScheduleBlock } from '@/types/block';

/** テスト用の最小 ScheduleBlock を生成 */
const makeBlock = (id: number, start: string, end: string | null): ScheduleBlock => ({
  id,
  type: 'schedule',
  title: `block-${id}`,
  startTime: new Date(start),
  endTime: end != null ? new Date(end) : null,
  detail: null,
  pageId: 1,
  location: null,
});

describe('sortBlocks', () => {
  it('startTime 昇順に並び替える', () => {
    const blocks: Block[] = [
      makeBlock(1, '2026-01-01T12:00:00Z', '2026-01-01T13:00:00Z'),
      makeBlock(2, '2026-01-01T09:00:00Z', '2026-01-01T10:00:00Z'),
      makeBlock(3, '2026-01-01T10:30:00Z', '2026-01-01T11:00:00Z'),
    ];

    const sorted = sortBlocks(blocks);

    expect(sorted.map(b => b.id)).toEqual([2, 3, 1]);
  });

  it('startTime が同じ場合は endTime=null を先頭にする', () => {
    const blocks: Block[] = [
      makeBlock(1, '2026-01-01T09:00:00Z', '2026-01-01T11:00:00Z'),
      makeBlock(2, '2026-01-01T09:00:00Z', null),
      makeBlock(3, '2026-01-01T09:00:00Z', '2026-01-01T10:00:00Z'),
    ];

    const sorted = sortBlocks(blocks);

    expect(sorted.map(b => b.id)).toEqual([2, 3, 1]);
  });

  it('元の配列を破壊しない（非破壊ソート）', () => {
    const blocks: Block[] = [
      makeBlock(1, '2026-01-01T12:00:00Z', null),
      makeBlock(2, '2026-01-01T09:00:00Z', null),
    ];

    const sorted = sortBlocks(blocks);

    expect(blocks.map(b => b.id)).toEqual([1, 2]);
    expect(sorted).not.toBe(blocks);
  });
});
