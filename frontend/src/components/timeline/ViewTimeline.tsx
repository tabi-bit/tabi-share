import { isSameLocalDate } from '@/lib/date';
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

interface GroupItem {
  type: 'group';
  id: string;
  group: OverlapGroup;
  isConnectedWithNextGroup: boolean;
  /** この group より後ろに別の group が存在するか。endTime=null の trailing DottedLine 判定に使う。 */
  hasFollowingGroup: boolean;
  /** 現在時刻を含むブロック id 集合（全 group で共通の Set を共有）。 */
  nowBlockIds?: ReadonlySet<number>;
}

interface GapItem {
  type: 'gap';
  id: string;
  /** gap 上に絶対配置する NOW オーバーレイの縦位置比率 (0〜1)。未設定なら NOW を重ねない。 */
  ratio?: number;
}

interface NowItem {
  type: 'now';
  id: string;
}

export type TimelineItem = GroupItem | GapItem | NowItem;

interface ViewTimelineProps {
  blocks: Block[];
  /** そのページの日付。今日と一致する場合のみ NOW インジケータを表示する。 */
  pageDate?: Date | null;
  /** 現在時刻。省略時は NOW インジケータを表示しない。 */
  now?: Date | null;
  className?: string;
}

// --- グループ化 ---

/**
 * 時間帯が重なるブロックを OverlapGroup にまとめる (sweep-line)。
 * - 判定は「次ブロックの startTime が running max endTime より前」か「groupStart と一致」。
 *   → 完全一致 (同時刻開始) と包含 (長いブロックの内側で開始) を同じロジックで扱う。
 * - groupEnd が null (headerBlock のみで開始) の場合は完全一致のみ merge する。
 * - グループの opener が endTime=null の場合、その opener を headerBlock としてコンテナ外に描画。
 *   後発 (mid-group) の endTime=null は containerBlocks 側に置く。
 */
const shouldMergeIntoGroup = (group: OverlapGroup, block: Block): boolean => {
  const startMs = block.startTime.getTime();
  return startMs === group.groupStart.getTime() || (group.groupEnd !== null && startMs < group.groupEnd.getTime());
};

const openGroup = (block: Block): OverlapGroup => {
  const isHeader = block.endTime === null;
  return {
    blocks: [block],
    headerBlock: isHeader ? block : null,
    containerBlocks: isHeader ? [] : [block],
    groupStart: block.startTime,
    groupEnd: block.endTime,
  };
};

const extendGroup = (group: OverlapGroup, block: Block): void => {
  group.blocks.push(block);
  group.containerBlocks.push(block);
  const endMs = block.endTime?.getTime();
  if (endMs !== undefined && (group.groupEnd === null || endMs > group.groupEnd.getTime())) {
    group.groupEnd = new Date(endMs);
  }
};

export const groupOverlappingBlocks = (sortedBlocks: Block[]): OverlapGroup[] =>
  sortedBlocks.reduce<OverlapGroup[]>((groups, block) => {
    const last = groups.length > 0 ? groups[groups.length - 1] : null;
    if (last && shouldMergeIntoGroup(last, block)) {
      extendGroup(last, block);
    } else {
      groups.push(openGroup(block));
    }
    return groups;
  }, []);

// --- NOW 判定ヘルパー ---

/**
 * `source` の時刻 (H:M:S.ms) を `dateSource` の年月日にリベースした Date を返す。
 * ブロック時刻は年月日部分が任意 anchor 日なので (block.ts コメント参照)、`now` を
 * 同じ anchor 日にそろえてから `.getTime()` 比較を行うために使う。
 */
const rebaseTimeOntoDate = (source: Date, dateSource: Date): Date =>
  new Date(
    dateSource.getFullYear(),
    dateSource.getMonth(),
    dateSource.getDate(),
    source.getHours(),
    source.getMinutes(),
    source.getSeconds(),
    source.getMilliseconds()
  );

/** 現在時刻を含むブロック（endTime あり、startTime ≤ now ≤ endTime）の id 集合を全ブロックから求める。 */
const collectNowBlockIds = (groups: OverlapGroup[], nowTime: number): ReadonlySet<number> => {
  const ids = new Set<number>();
  for (const g of groups) {
    for (const b of g.blocks) {
      if (b.endTime != null && b.startTime.getTime() <= nowTime && nowTime <= b.endTime.getTime()) {
        ids.add(b.id);
      }
    }
  }
  return ids;
};

// --- タイムラインアイテム構築 ---

/**
 * ソート済み groups と現在時刻から TimelineItem 列を構築する。
 * `groups` の再生成 (sort/group) を抑えるため、呼び出し側で memoize しておくのを想定。
 */
export const buildTimelineItems = (groups: OverlapGroup[], now: Date | null = null): TimelineItem[] => {
  const items: TimelineItem[] = [];
  // ブロック側は「時刻データ + 任意 anchor 日」で持っているため、実時刻の now をそのまま
  // .getTime() 比較すると年月日ズレの影響で常に bottom-stuck 側に落ちてしまう。
  // 先頭ブロックの anchor 日にリベースしてから比較する。
  const anchor = groups[0]?.blocks[0]?.startTime;
  const rebasedNow = now != null && anchor != null ? rebaseTimeOntoDate(now, anchor) : now;
  const nowTime = rebasedNow?.getTime() ?? null;

  const nowBlockIds = nowTime != null ? collectNowBlockIds(groups, nowTime) : null;
  const isInBlock = (nowBlockIds?.size ?? 0) > 0;

  // in-block のときはブロックに赤 ring/バッジで表現するため、追加の NOW 行を挿入しない
  let nowInserted = nowTime == null || isInBlock;

  if (!nowInserted && groups.length > 0 && nowTime != null && nowTime < groups[0].groupStart.getTime()) {
    items.push({ type: 'now', id: 'now-top' });
    nowInserted = true;
  }

  let maxEndTime = -Infinity;

  for (let i = 0; i < groups.length; i++) {
    const currentGroup = groups[i];
    const nextGroup = i < groups.length - 1 ? groups[i + 1] : null;

    // 直前グループが groupEnd=null の場合、そのグループの inline DottedLine が gap を埋めるので独立 gap 不要
    const hasExplicitGap =
      i > 0 &&
      maxEndTime !== -Infinity &&
      groups[i - 1].groupEnd !== null &&
      currentGroup.groupStart.getTime() > maxEndTime;

    const nowInPreBoundary =
      !nowInserted &&
      nowTime != null &&
      i > 0 &&
      maxEndTime !== -Infinity &&
      nowTime >= maxEndTime &&
      nowTime < currentGroup.groupStart.getTime();

    if (nowInPreBoundary && nowTime != null) {
      // 明示的/暗黙どちらの gap でも、gap 上に absolute overlay で NOW を重ねる (点線を途切れさせない)
      const gapDuration = currentGroup.groupStart.getTime() - maxEndTime;
      const ratio = gapDuration > 0 ? (nowTime - maxEndTime) / gapDuration : 0.5;
      items.push({ type: 'gap', id: `gap-${i}`, ratio });
      nowInserted = true;
    } else if (hasExplicitGap) {
      items.push({ type: 'gap', id: `gap-${i}` });
    }

    const currentEnd = currentGroup.groupEnd?.getTime() ?? currentGroup.groupStart.getTime();
    maxEndTime = Math.max(maxEndTime, currentEnd);

    const isConnectedWithNextGroup =
      nextGroup != null && nextGroup.groupStart.getTime() === currentGroup.groupEnd?.getTime();

    items.push({
      type: 'group',
      id: `group-${currentGroup.blocks.map(b => b.id).join('-')}`,
      group: currentGroup,
      isConnectedWithNextGroup,
      hasFollowingGroup: nextGroup != null,
      nowBlockIds: nowBlockIds ?? undefined,
    });
  }

  // 末尾より後（旅程終了後）。空タイムラインでは maxEndTime=-Infinity のままこの分岐で処理される。
  if (!nowInserted && nowTime != null && nowTime > maxEndTime) {
    items.push({ type: 'now', id: 'now-bottom' });
  }

  return items;
};

// --- コンポーネント ---

export function ViewTimeline({ blocks, pageDate, now, className }: ViewTimelineProps) {
  // React Compiler が pageDate/now/blocks 変化時のみ再計算するようメモ化する
  const effectiveNow = pageDate && now && isSameLocalDate(pageDate, now) ? now : null;
  const groups = groupOverlappingBlocks(sortBlocks(blocks));
  const timelineItems = buildTimelineItems(groups, effectiveNow);

  return (
    <div className={cn('grid w-full grid-cols-[auto_1fr] gap-x-4', className)}>
      {timelineItems.map(item => (
        <ViewTimelineItem key={item.id} item={item} />
      ))}
    </div>
  );
}
