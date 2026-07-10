import type { Block } from '@/types/block';
import { BlockScheduleView } from '../blocks/view/BlockScheduleView';
import { BlockTransportationView } from '../blocks/view/BlockTransportationView';
import { formatTime } from './formatTime';
import { TimelineAxis } from './TimelineAxis';
import type { OverlapGroup } from './ViewTimeline';

interface GroupTimelineRowProps {
  group: OverlapGroup;
  isConnectedWithNext: boolean;
  /** この group より後ろに別の group が存在するか。endTime=null ブロックの trailing DottedLine 判定に使う。 */
  hasFollowingGroup: boolean;
  /** 現在時刻を含むブロックの id 集合。指定されたブロックに赤 ring / NOW バッジが付与される。 */
  nowBlockIds?: ReadonlySet<number>;
}

const renderBlock = (block: Block, isNow: boolean) => {
  switch (block.type) {
    case 'schedule':
      return <BlockScheduleView block={block} isNow={isNow} />;
    case 'transportation':
      return <BlockTransportationView block={block} isNow={isNow} />;
    default:
      return null;
  }
};

export function GroupTimelineRow({
  group,
  isConnectedWithNext,
  hasFollowingGroup,
  nowBlockIds,
}: GroupTimelineRowProps) {
  const hasSchedule = group.blocks.some(b => b.type === 'schedule');
  const themeColor = hasSchedule ? 'bg-teal-400' : 'bg-sky-200';
  // 2件以上のときだけグルーピングコンテナで囲む（単一ブロックはそのまま表示）
  const useContainer = group.blocks.length >= 2;

  const isNow = (id: number) => nowBlockIds?.has(id) ?? false;

  return (
    <div className='contents'>
      <TimelineAxis
        startTime={group.groupStart}
        endTime={group.groupEnd}
        isConnectedWithNext={isConnectedWithNext}
        hasFollowingGroup={hasFollowingGroup}
        themeColor={themeColor}
      />
      <div className='flex flex-col gap-2 pb-4'>
        {group.headerBlock && renderBlock(group.headerBlock, isNow(group.headerBlock.id))}

        {group.containerBlocks.length > 0 &&
          (useContainer ? (
            <div className='flex flex-col gap-3 rounded-xl bg-neutral-100/60 p-3'>
              {group.containerBlocks.map(block => (
                <div key={block.id}>
                  <div className='mb-1 font-medium text-12px text-neutral-500'>
                    {formatTime(block.startTime)}
                    {block.endTime && `–${formatTime(block.endTime)}`}
                  </div>
                  {renderBlock(block, isNow(block.id))}
                </div>
              ))}
            </div>
          ) : (
            group.containerBlocks.map(block => <div key={block.id}>{renderBlock(block, isNow(block.id))}</div>)
          ))}
      </div>
    </div>
  );
}
