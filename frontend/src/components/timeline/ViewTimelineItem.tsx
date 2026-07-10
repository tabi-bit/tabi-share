import { DottedLine } from './DottedLine';
import { GroupTimelineRow } from './GroupTimelineRow';
import { NowIndicator } from './NowIndicator';
import type { TimelineItem } from './ViewTimeline';

interface ViewTimelineItemProps {
  item: TimelineItem;
}

export function ViewTimelineItem({ item }: ViewTimelineItemProps) {
  if (item.type === 'gap') {
    return (
      <div className='relative col-span-2 grid h-8 grid-cols-subgrid'>
        <DottedLine />
        <div />
        {item.ratio != null && <NowIndicator ratio={item.ratio} className='pointer-events-none absolute inset-0' />}
      </div>
    );
  }

  if (item.type === 'now') {
    return <NowIndicator className='col-span-2' />;
  }

  const group = item.group;
  if (!group) return null;

  return (
    <GroupTimelineRow
      group={group}
      isConnectedWithNext={item.isConnectedWithNextGroup ?? false}
      hasFollowingGroup={item.hasFollowingGroup ?? false}
      nowBlockIds={item.nowBlockIds}
    />
  );
}
