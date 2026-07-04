import { useMemo } from 'react';
import { sortBlocks } from '@/lib/sortBlocks';
import { cn } from '@/lib/utils';
import type { Block } from '@/types/block';
import { ViewTimelineItem } from './ViewTimelineItem';

// --- 型定義 ---

export interface OverlapGroup {
  blocks: Block[];
  headerBlock: Block | null; // endTime=null のブロック（あれば）
  containerBlocks: Block[]; // コンテナ内に表示するブロック
  groupStart: Date;
  groupEnd: Date | null; // 全ブロックの max endTime（全 null なら null）
}

export interface TimelineItem {
  id: string;
  type: 'group' | 'gap';
  group?: OverlapGroup;
  isConnectedWithNextGroup?: boolean;
}

interface ViewTimelineProps {
  blocks: Block[];
  className?: string;
}

// --- グループ化 ---

/** 同一 startTime のブロックを OverlapGroup にまとめる */
export const groupByStartTime = (sortedBlocks: Block[]): OverlapGroup[] => {
  if (sortedBlocks.length === 0) return [];

  const groups: OverlapGroup[] = [];
  let i = 0;

  while (i < sortedBlocks.length) {
    const startMs = sortedBlocks[i].startTime.getTime();
    const groupBlocks: Block[] = [sortedBlocks[i]];
    i++;

    // 同じ startTime のブロックを集める
    while (i < sortedBlocks.length && sortedBlocks[i].startTime.getTime() === startMs) {
      groupBlocks.push(sortedBlocks[i]);
      i++;
    }

    // headerBlock: endTime === null のブロック（最初の1つ）
    const headerBlock = groupBlocks.find(b => b.endTime === null) ?? null;
    const containerBlocks = headerBlock ? groupBlocks.filter(b => b !== headerBlock) : groupBlocks;

    // groupEnd: endTime を持つブロックの中で最も遅い endTime
    const endTimes = groupBlocks.map(b => b.endTime?.getTime()).filter((t): t is number => t != null);
    const groupEnd = endTimes.length > 0 ? new Date(Math.max(...endTimes)) : null;

    groups.push({
      blocks: groupBlocks,
      headerBlock,
      containerBlocks,
      groupStart: sortedBlocks[i - 1].startTime, // 全て同じ startTime
      groupEnd,
    });
  }

  return groups;
};

// --- タイムラインアイテム構築 ---

const buildTimelineItems = (blocks: Block[]): TimelineItem[] => {
  const sorted = sortBlocks(blocks);
  const groups = groupByStartTime(sorted);
  const items: TimelineItem[] = [];

  let maxEndTime = -Infinity;

  for (let i = 0; i < groups.length; i++) {
    const currentGroup = groups[i];
    const nextGroup = i < groups.length - 1 ? groups[i + 1] : null;

    // gap 判定: 前のグループの maxEndTime と現在グループの startTime を比較
    // 直前のグループが groupEnd=null の場合、そのコンポーネント自身が DottedLine を描画するため gap は不要
    if (i > 0 && maxEndTime !== -Infinity && groups[i - 1].groupEnd !== null) {
      if (currentGroup.groupStart.getTime() > maxEndTime) {
        items.push({
          type: 'gap',
          id: `gap-${i}`,
        });
      }
    }

    // maxEndTime を更新
    const currentEnd = currentGroup.groupEnd?.getTime() ?? currentGroup.groupStart.getTime();
    maxEndTime = Math.max(maxEndTime, currentEnd);

    // isConnected 判定
    const isConnectedWithNextGroup = nextGroup
      ? nextGroup.groupStart.getTime() === currentGroup.groupEnd?.getTime()
      : false;

    items.push({
      type: 'group',
      id: `group-${currentGroup.blocks.map(b => b.id).join('-')}`,
      group: currentGroup,
      isConnectedWithNextGroup,
    });
  }

  return items;
};

// --- コンポーネント ---

export function ViewTimeline({ blocks, className }: ViewTimelineProps) {
  const timelineItems = useMemo(() => buildTimelineItems(blocks), [blocks]);

  return (
    <div className={cn('grid w-full grid-cols-[auto_1fr] gap-x-4', className)}>
      {timelineItems.map((item, index) => (
        <ViewTimelineItem key={item.id} item={item} isLastItem={index === timelineItems.length - 1} />
      ))}
    </div>
  );
}
