import { cn } from '@/lib/utils';
import type { Block } from '@/types/block';
import { BlockScheduleView } from '../blocks/view/BlockScheduleView';
import { BlockTransportationView } from '../blocks/view/BlockTransportationView';

interface ViewTimelineProps {
  blocks: Block[];
  className?: string;
}

interface TimelineItem {
  id: string;
  type: 'block' | 'gap';
  isConnectedWithNextBlock?: boolean; // 次のブロックの開始時間と終了時間が同じかどうか（blockタイプの場合）
  block?: Block;
}

export function ViewTimeline({ blocks, className }: ViewTimelineProps) {
  // ブロックを時間順にソート
  const sortedBlocks = [...blocks].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  // タイムラインアイテムを構築（ブロックと間隔を含む）
  const timelineItems: TimelineItem[] = [];

  for (let i = 0; i < sortedBlocks.length; i++) {
    const currentBlock = sortedBlocks[i];
    const previousBlock = i > 0 ? sortedBlocks[i - 1] : null;
    const nextBlock = i < sortedBlocks.length - 1 ? sortedBlocks[i + 1] : null;

    // 前のブロックとの間に時間間隔があるかが設定されていない場合、破線ブロックを追加
    // ただし、前ブロックが終了時間を持たない場合は間隔を入れない（例: 終了時間が未定のスケジュール）
    if (
      previousBlock &&
      previousBlock.endTime != null &&
      previousBlock.endTime.getTime() !== currentBlock.startTime.getTime()
    ) {
      timelineItems.push({
        type: 'gap',
        id: `gap-${previousBlock.id}-${currentBlock.id}`,
      });
    }

    timelineItems.push({
      type: 'block',
      block: currentBlock,
      id: String(currentBlock.id),
      isConnectedWithNextBlock: nextBlock ? nextBlock.startTime.getTime() === currentBlock.endTime?.getTime() : false,
    });
  }

  return (
    <div className={cn('grid w-full grid-cols-[auto_1fr] gap-x-4', className)}>
      {timelineItems.map(item => (
        <ViewTimelineBlock key={item.id} item={item} />
      ))}
    </div>
  );
}

interface ViewTimelineBlockProps {
  item: TimelineItem;
}

function ViewTimelineBlock({ item }: ViewTimelineBlockProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const themeColor = item.type === 'block' && item.block?.type === 'schedule' ? 'bg-teal-400' : 'bg-sky-200';

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

  return (
    <div className='contents'>
      {/* 時間軸(左) */}
      {item.type === 'block' && item.block?.startTime && (
        <div className='flex flex-row gap-2'>
          <div className='flex flex-col justify-between'>
            {/* 時間ラベル */}
            <div className='flex h-6 flex-row items-center font-medium text-14px text-gray-700 sm:h-8 sm:text-18px'>
              {formatTime(item.block.startTime)}
            </div>
            {!item.isConnectedWithNextBlock && item.block.endTime && (
              <div className='flex h-6 flex-row items-center font-medium text-14px text-gray-700 sm:h-8 sm:text-18px'>
                {formatTime(item.block.endTime)}
              </div>
            )}
          </div>
          <div className='flex min-h-24 flex-col items-center justify-between'>
            {/* ●およびライン */}
            <div className={cn('h-6 w-6 shrink-0 rounded-full sm:h-8 sm:w-8', themeColor)} />
            {item.block.endTime ? (
              <div className={cn('-my-4 h-full w-2', themeColor)}></div>
            ) : (
              <DottedLine className='h-full self-end' />
            )}
            {!item.isConnectedWithNextBlock && item.block.endTime && (
              <div className={cn('h-6 w-6 shrink-0 rounded-full sm:h-8 sm:w-8', themeColor)} />
            )}
          </div>
        </div>
      )}
      {item.type === 'gap' && <DottedLine />}

      {/* ブロック内容(右) */}
      {item.type === 'block' && item.block && <div className='pb-4'>{renderBlock(item.block)}</div>}
      {item.type === 'gap' && <div /> /* 固定高さの空スペース */}
    </div>
  );
}

const DottedLine = ({ ...props }: React.ComponentProps<'div'>) => {
  const { className, ...rest } = props;

  return (
    <div className={cn('flex h-8 flex-row pe-2.5 sm:pe-3.5', className)} {...rest}>
      <div className='grow border-neutral-600 border-r-2 border-dashed' />
      <div className='border-neutral-600 border-l-2 border-dashed'></div>
    </div>
  );
};
