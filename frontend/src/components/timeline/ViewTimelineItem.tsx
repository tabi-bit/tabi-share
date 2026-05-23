import { DottedLine } from './DottedLine';
import { GroupTimelineRow } from './GroupTimelineRow';
import type { TimelineItem } from './ViewTimeline';

interface ViewTimelineItemProps {
  item: TimelineItem;
  isLastItem: boolean;
}

export function ViewTimelineItem({ item, isLastItem }: ViewTimelineItemProps) {
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

  return (
    <GroupTimelineRow
      group={group}
      isConnectedWithNext={item.isConnectedWithNextGroup ?? false}
      isLastItem={isLastItem}
    />
  );
}
