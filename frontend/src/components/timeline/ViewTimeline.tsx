import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { Block } from '@/types/block';
import { BlockScheduleView } from '../blocks/view/BlockScheduleView';
import { BlockTransportationView } from '../blocks/view/BlockTransportationView';

// --- 型定義 ---

interface OverlapGroup {
  blocks: Block[];
  headerBlock: Block | null; // endTime=null のブロック（あれば）
  containerBlocks: Block[]; // コンテナ内に表示するブロック
  groupStart: Date;
  groupEnd: Date | null; // 全ブロックの max endTime（全 null なら null）
}

interface TimelineItem {
  id: string;
  type: 'group' | 'gap';
  group?: OverlapGroup;
  isConnectedWithNextGroup?: boolean;
}

interface ViewTimelineProps {
  blocks: Block[];
  className?: string;
}

// --- ユーティリティ ---

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const renderBlock = (block: Block) => {
  switch (block.type) {
    case 'schedule':
      return <BlockScheduleView block={block} />;
    case 'transportation':
      return <BlockTransportationView block={block} />;
    default:
      return null;
  }
};

// --- ソート ---

const sortBlocks = (blocks: Block[]): Block[] => {
  return [...blocks].sort((a, b) => {
    const startDiff = a.startTime.getTime() - b.startTime.getTime();
    if (startDiff !== 0) return startDiff;
    // startTime が同じ場合: endTime 昇順（null 先頭）
    if (a.endTime === null && b.endTime === null) return 0;
    if (a.endTime === null) return -1;
    if (b.endTime === null) return 1;
    return a.endTime.getTime() - b.endTime.getTime();
  });
};

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

// --- 単一ブロック表示（既存と同じ） ---

interface SingleBlockTimelineProps {
  block: Block;
  isConnectedWithNext: boolean;
  isLastItem: boolean;
}

function SingleBlockTimeline({ block, isConnectedWithNext, isLastItem }: SingleBlockTimelineProps) {
  const themeColor = block.type === 'schedule' ? 'bg-teal-400' : 'bg-sky-200';

  return (
    <div className='contents'>
      {/* 時間軸(左) */}
      <div className='flex flex-row gap-2'>
        <div className='flex flex-col justify-between'>
          <div className='flex h-6 flex-row items-center font-medium text-14px text-gray-700 sm:h-8 sm:text-18px'>
            {formatTime(block.startTime)}
          </div>
          {!isConnectedWithNext && block.endTime && (
            <div className='flex h-6 flex-row items-center font-medium text-14px text-gray-700 sm:h-8 sm:text-18px'>
              {formatTime(block.endTime)}
            </div>
          )}
        </div>
        <div className='flex min-h-24 flex-col items-center justify-between'>
          <div className={cn('h-6 w-6 shrink-0 rounded-full sm:h-8 sm:w-8', themeColor)} />
          {block.endTime ? (
            <div className={cn('-my-4 h-full w-2', themeColor)}></div>
          ) : (
            !isLastItem && <DottedLine className='h-full self-end' />
          )}
          {!isConnectedWithNext && block.endTime && (
            <div className={cn('h-6 w-6 shrink-0 rounded-full sm:h-8 sm:w-8', themeColor)} />
          )}
        </div>
      </div>

      {/* ブロック内容(右) */}
      <div className='pb-4'>{renderBlock(block)}</div>
    </div>
  );
}

// --- 複数ブロックグループ表示 ---

interface MultiBlockGroupTimelineProps {
  group: OverlapGroup;
  isConnectedWithNext: boolean;
  isLastItem: boolean;
}

function MultiBlockGroupTimeline({ group, isConnectedWithNext, isLastItem }: MultiBlockGroupTimelineProps) {
  const hasSchedule = group.blocks.some(b => b.type === 'schedule');
  const themeColor = hasSchedule ? 'bg-teal-400' : 'bg-sky-200';

  return (
    <div className='contents'>
      {/* 時間軸(左) */}
      <div className='flex flex-row gap-2'>
        <div className='flex flex-col justify-between'>
          <div className='flex h-6 flex-row items-center font-medium text-14px text-gray-700 sm:h-8 sm:text-18px'>
            {formatTime(group.groupStart)}
          </div>
          {!isConnectedWithNext && group.groupEnd && (
            <div className='flex h-6 flex-row items-center font-medium text-14px text-gray-700 sm:h-8 sm:text-18px'>
              {formatTime(group.groupEnd)}
            </div>
          )}
        </div>
        <div className='flex min-h-24 flex-col items-center justify-between'>
          <div className={cn('h-6 w-6 shrink-0 rounded-full sm:h-8 sm:w-8', themeColor)} />
          {group.groupEnd ? (
            <div className={cn('-my-4 h-full w-2', themeColor)}></div>
          ) : (
            !isLastItem && <DottedLine className='h-full self-end' />
          )}
          {!isConnectedWithNext && group.groupEnd && (
            <div className={cn('h-6 w-6 shrink-0 rounded-full sm:h-8 sm:w-8', themeColor)} />
          )}
        </div>
      </div>

      {/* ブロック内容(右) */}
      <div className='flex flex-col gap-2 pb-4'>
        {/* ヘッダーブロック（endTime=null） */}
        {group.headerBlock && renderBlock(group.headerBlock)}

        {/* コンテナ（他のブロック） */}
        {group.containerBlocks.length > 0 && (
          <div className='flex flex-col gap-3 rounded-xl bg-neutral-100/60 p-3'>
            {group.containerBlocks.map(block => (
              <div key={block.id}>
                <div className='mb-1 font-medium text-12px text-neutral-500'>
                  {formatTime(block.startTime)}
                  {block.endTime && `–${formatTime(block.endTime)}`}
                </div>
                {renderBlock(block)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- タイムラインアイテム ---

interface ViewTimelineItemProps {
  item: TimelineItem;
  isLastItem: boolean;
}

function ViewTimelineItem({ item, isLastItem }: ViewTimelineItemProps) {
  if (item.type === 'gap') {
    return (
      <div className='contents'>
        <DottedLine />
        <div />
      </div>
    );
  }

  const group = item.group;
  if (!group) return null;
  const isSingleBlock = group.blocks.length === 1;

  if (isSingleBlock) {
    return (
      <SingleBlockTimeline
        block={group.blocks[0]}
        isConnectedWithNext={item.isConnectedWithNextGroup ?? false}
        isLastItem={isLastItem}
      />
    );
  }

  return (
    <MultiBlockGroupTimeline
      group={group}
      isConnectedWithNext={item.isConnectedWithNextGroup ?? false}
      isLastItem={isLastItem}
    />
  );
}

// --- 破線 ---

const DottedLine = ({ ...props }: React.ComponentProps<'div'>) => {
  const { className, ...rest } = props;

  return (
    <div className={cn('flex h-8 flex-row pe-2.5 sm:pe-3.5', className)} {...rest}>
      <div className='grow border-neutral-600 border-r-2 border-dashed' />
      <div className='border-neutral-600 border-l-2 border-dashed'></div>
    </div>
  );
};
