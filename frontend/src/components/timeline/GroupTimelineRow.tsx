import type { Block } from '@/types/block';
import { BlockScheduleView } from '../blocks/view/BlockScheduleView';
import { BlockTransportationView } from '../blocks/view/BlockTransportationView';
import { formatTime } from './formatTime';
import { TimelineAxis } from './TimelineAxis';
import type { OverlapGroup } from './ViewTimeline';

interface GroupTimelineRowProps {
  group: OverlapGroup;
  isConnectedWithNext: boolean;
  isLastItem: boolean;
}

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

export function GroupTimelineRow({ group, isConnectedWithNext, isLastItem }: GroupTimelineRowProps) {
  const hasSchedule = group.blocks.some(b => b.type === 'schedule');
  const themeColor = hasSchedule ? 'bg-teal-400' : 'bg-sky-200';
  // 2件以上のときだけグルーピングコンテナで囲む（単一ブロックはそのまま表示）
  const useContainer = group.blocks.length >= 2;

  return (
    <div className='contents'>
      <TimelineAxis
        startTime={group.groupStart}
        endTime={group.groupEnd}
        isConnectedWithNext={isConnectedWithNext}
        isLastItem={isLastItem}
        themeColor={themeColor}
      />
      <div className='flex flex-col gap-2 pb-4'>
        {group.headerBlock && renderBlock(group.headerBlock)}

        {group.containerBlocks.length > 0 &&
          (useContainer ? (
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
          ) : (
            group.containerBlocks.map(block => <div key={block.id}>{renderBlock(block)}</div>)
          ))}
      </div>
    </div>
  );
}
