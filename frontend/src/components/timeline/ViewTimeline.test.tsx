import { render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';

import type { ScheduleBlock, TransportationBlock } from '@/types/block';
import { groupByStartTime, ViewTimeline } from './ViewTimeline';

vi.mock('../blocks/view/BlockScheduleView', () => ({
  BlockScheduleView: ({ block }: { block: ScheduleBlock }) => (
    <div data-testid={`schedule-${block.id}`}>{block.title}</div>
  ),
}));

vi.mock('../blocks/view/BlockTransportationView', () => ({
  BlockTransportationView: ({ block }: { block: TransportationBlock }) => (
    <div data-testid={`transportation-${block.id}`}>{block.title}</div>
  ),
}));

// --- ファクトリ ---

const at = (h: number, m = 0): Date => new Date(2026, 0, 1, h, m);

const makeSchedule = (id: number, start: Date, end: Date | null, title = `S${id}`): ScheduleBlock => ({
  id,
  type: 'schedule',
  title,
  startTime: start,
  endTime: end,
  detail: null,
  pageId: 1,
  location: null,
});

const makeTransport = (id: number, start: Date, end: Date | null, title = `T${id}`): TransportationBlock => ({
  id,
  type: 'transportation',
  title,
  startTime: start,
  endTime: end,
  detail: null,
  pageId: 1,
  location: null,
  transportationType: 'train',
  destinationLocation: null,
});

// --- ヘルパー ---

const countBorderDashed = (container: HTMLElement): number => {
  return container.querySelectorAll('.border-dashed').length;
};

describe('groupByStartTime', () => {
  it('空配列を渡すと空配列を返す', () => {
    expect(groupByStartTime([])).toEqual([]);
  });

  it('単一ブロックは1グループになり、groupEnd は endTime と一致する', () => {
    const block = makeSchedule(1, at(9), at(10));
    const groups = groupByStartTime([block]);

    expect(groups).toHaveLength(1);
    expect(groups[0].blocks).toEqual([block]);
    expect(groups[0].groupStart).toEqual(at(9));
    expect(groups[0].groupEnd).toEqual(at(10));
    expect(groups[0].headerBlock).toBeNull();
    expect(groups[0].containerBlocks).toEqual([block]);
  });

  it('異なる startTime のブロックは別々のグループに分かれる', () => {
    const a = makeSchedule(1, at(9), at(10));
    const b = makeSchedule(2, at(11), at(12));
    const groups = groupByStartTime([a, b]);

    expect(groups).toHaveLength(2);
    expect(groups[0].blocks).toEqual([a]);
    expect(groups[1].blocks).toEqual([b]);
  });

  it('同一 startTime の複数ブロックは1グループにまとめられる', () => {
    const a = makeSchedule(1, at(9), at(10));
    const b = makeSchedule(2, at(9), at(11));
    const groups = groupByStartTime([a, b]);

    expect(groups).toHaveLength(1);
    expect(groups[0].blocks).toHaveLength(2);
    expect(groups[0].groupStart).toEqual(at(9));
  });

  it('グループ内に endTime=null のブロックがあると headerBlock に設定され containerBlocks から除外される', () => {
    const headerCandidate = makeSchedule(1, at(9), null, 'header');
    const other = makeSchedule(2, at(9), at(10), 'other');
    // sortBlocks 後は endTime=null が先頭になる前提
    const groups = groupByStartTime([headerCandidate, other]);

    expect(groups).toHaveLength(1);
    expect(groups[0].headerBlock).toBe(headerCandidate);
    expect(groups[0].containerBlocks).toEqual([other]);
  });

  it('グループの全ブロックが endTime=null のとき groupEnd は null になる', () => {
    const a = makeSchedule(1, at(9), null);
    const b = makeSchedule(2, at(9), null);
    const groups = groupByStartTime([a, b]);

    expect(groups).toHaveLength(1);
    expect(groups[0].groupEnd).toBeNull();
  });

  it('groupEnd はグループ内の endTime の最大値になる', () => {
    const a = makeSchedule(1, at(9), at(10));
    const b = makeSchedule(2, at(9), at(13));
    const c = makeSchedule(3, at(9), at(11));
    const groups = groupByStartTime([a, b, c]);

    expect(groups).toHaveLength(1);
    expect(groups[0].groupEnd).toEqual(at(13));
  });
});

describe('ViewTimeline', () => {
  describe('空・基本表示', () => {
    it('blocks=[] のとき子要素が描画されない', () => {
      const { container } = render(<ViewTimeline blocks={[]} />);
      const root = container.firstChild as HTMLElement;

      expect(root).not.toBeNull();
      expect(root.children).toHaveLength(0);
    });

    it('endTime を持つ単一スケジュールブロックで開始・終了時刻ラベルが両方表示される', () => {
      const block = makeSchedule(1, at(9), at(10));
      render(<ViewTimeline blocks={[block]} />);

      expect(screen.getByText('09:00')).toBeInTheDocument();
      expect(screen.getByText('10:00')).toBeInTheDocument();
      expect(screen.getByTestId('schedule-1')).toBeInTheDocument();
    });
  });

  describe('endTime=null の単一ブロック', () => {
    it('開始時刻ラベルのみ表示され、終了時刻ラベルは出ない', () => {
      const block = makeSchedule(1, at(9), null);
      render(<ViewTimeline blocks={[block]} />);

      expect(screen.getAllByText('09:00')).toHaveLength(1);
      // 終了時刻ラベル候補（10:00 など）は存在しない
      expect(screen.queryByText('10:00')).not.toBeInTheDocument();
    });

    it('リストの最後でないとき DottedLine（破線）が描画される', () => {
      const a = makeSchedule(1, at(9), null);
      const b = makeSchedule(2, at(11), at(12));
      const { container } = render(<ViewTimeline blocks={[a, b]} />);

      // a の自前 DottedLine = 1 つ（border-dashed の div を 2 つ含む）
      // 直前 group の groupEnd=null なので gap は追加されない
      expect(countBorderDashed(container)).toBe(2);
    });

    it('リストの最後のとき DottedLine は描画されない', () => {
      const block = makeSchedule(1, at(9), null);
      const { container } = render(<ViewTimeline blocks={[block]} />);

      expect(countBorderDashed(container)).toBe(0);
    });
  });

  describe('連結・gap 判定', () => {
    it('前ブロックの endTime と次ブロックの startTime が一致するとき、中間の時刻ラベルが重複しない', () => {
      const a = makeSchedule(1, at(9), at(10));
      const b = makeSchedule(2, at(10), at(11));
      render(<ViewTimeline blocks={[a, b]} />);

      expect(screen.getAllByText('10:00')).toHaveLength(1);
      expect(screen.getByText('09:00')).toBeInTheDocument();
      expect(screen.getByText('11:00')).toBeInTheDocument();
    });

    it('連続しない2ブロックの間に gap（DottedLine）が描画される', () => {
      const a = makeSchedule(1, at(9), at(10));
      const b = makeSchedule(2, at(11), at(12));
      const { container } = render(<ViewTimeline blocks={[a, b]} />);

      // gap が 1 つ = border-dashed が 2 つ
      expect(countBorderDashed(container)).toBe(2);
    });

    it('直前グループの groupEnd=null のとき、次グループの前に追加の gap は描画されない', () => {
      const a = makeSchedule(1, at(9), null);
      const b = makeSchedule(2, at(11), at(12));
      const { container } = render(<ViewTimeline blocks={[a, b]} />);

      // a 自身の DottedLine のみで、追加の gap DottedLine は無い
      // border-dashed は 2（a の DottedLine 内の 2 つ）
      expect(countBorderDashed(container)).toBe(2);
    });
  });

  describe('同一 startTime グループ表示', () => {
    it('同一 startTime の2ブロックが1つのコンテナにまとめて描画される', () => {
      const a = makeSchedule(1, at(9), at(10));
      const b = makeSchedule(2, at(9), at(11));
      const { container } = render(<ViewTimeline blocks={[a, b]} />);

      const groupContainer = container.querySelector<HTMLElement>('.bg-neutral-100\\/60');
      expect(groupContainer).not.toBeNull();
      expect(within(groupContainer!).getByTestId('schedule-1')).toBeInTheDocument();
      expect(within(groupContainer!).getByTestId('schedule-2')).toBeInTheDocument();
    });

    it('グループ内に endTime=null のブロックがあると、それはコンテナの外（header 位置）に描画される', () => {
      const header = makeSchedule(1, at(9), null, 'header');
      const other = makeSchedule(2, at(9), at(10), 'other');
      const { container } = render(<ViewTimeline blocks={[header, other]} />);

      const groupContainer = container.querySelector<HTMLElement>('.bg-neutral-100\\/60');
      expect(groupContainer).not.toBeNull();
      // header はコンテナ外に居る
      expect(within(groupContainer!).queryByTestId('schedule-1')).not.toBeInTheDocument();
      expect(within(groupContainer!).getByTestId('schedule-2')).toBeInTheDocument();
      // ただし全体としては描画されている
      expect(screen.getByTestId('schedule-1')).toBeInTheDocument();
    });

    it('グループ内が全て endTime 持ちの場合、全ブロックがコンテナ内に描画される（header なし）', () => {
      const a = makeSchedule(1, at(9), at(10));
      const b = makeSchedule(2, at(9), at(11));
      const c = makeSchedule(3, at(9), at(12));
      const { container } = render(<ViewTimeline blocks={[a, b, c]} />);

      const groupContainer = container.querySelector<HTMLElement>('.bg-neutral-100\\/60');
      expect(groupContainer).not.toBeNull();
      expect(within(groupContainer!).getByTestId('schedule-1')).toBeInTheDocument();
      expect(within(groupContainer!).getByTestId('schedule-2')).toBeInTheDocument();
      expect(within(groupContainer!).getByTestId('schedule-3')).toBeInTheDocument();
    });

    it('3ブロック以上の同時刻グループでも全てがコンテナ内に並んで描画される', () => {
      const blocks = [
        makeSchedule(1, at(9), at(10)),
        makeSchedule(2, at(9), at(11)),
        makeTransport(3, at(9), at(12)),
        makeSchedule(4, at(9), at(13)),
      ];
      const { container } = render(<ViewTimeline blocks={blocks} />);

      const groupContainer = container.querySelector<HTMLElement>('.bg-neutral-100\\/60');
      expect(groupContainer).not.toBeNull();
      expect(within(groupContainer!).getByTestId('schedule-1')).toBeInTheDocument();
      expect(within(groupContainer!).getByTestId('schedule-2')).toBeInTheDocument();
      expect(within(groupContainer!).getByTestId('transportation-3')).toBeInTheDocument();
      expect(within(groupContainer!).getByTestId('schedule-4')).toBeInTheDocument();
    });
  });

  describe('テーマカラー', () => {
    it('単一 schedule ブロックは bg-teal-400 の丸が描画される', () => {
      const block = makeSchedule(1, at(9), at(10));
      const { container } = render(<ViewTimeline blocks={[block]} />);

      const circle = container.querySelector('.rounded-full');
      expect(circle).not.toBeNull();
      expect(circle).toHaveClass('bg-teal-400');
    });

    it('単一 transportation ブロックは bg-sky-200 の丸が描画される', () => {
      const block = makeTransport(1, at(9), at(10));
      const { container } = render(<ViewTimeline blocks={[block]} />);

      const circle = container.querySelector('.rounded-full');
      expect(circle).not.toBeNull();
      expect(circle).toHaveClass('bg-sky-200');
    });

    it.each([
      {
        name: 'schedule + transportation の混在',
        blocks: [makeSchedule(1, at(9), at(10)), makeTransport(2, at(9), at(11))],
        expectedClass: 'bg-teal-400',
      },
      {
        name: 'transportation のみ',
        blocks: [makeTransport(1, at(9), at(10)), makeTransport(2, at(9), at(11))],
        expectedClass: 'bg-sky-200',
      },
    ])('同時刻グループのテーマカラー: $name → $expectedClass', ({ blocks, expectedClass }) => {
      const { container } = render(<ViewTimeline blocks={blocks} />);

      const circle = container.querySelector('.rounded-full');
      expect(circle).not.toBeNull();
      expect(circle).toHaveClass(expectedClass);
    });
  });

  describe('時刻フォーマット', () => {
    it('24時間表記の HH:mm 形式で表示される', () => {
      const block = makeSchedule(1, at(13, 30), at(15, 45));
      render(<ViewTimeline blocks={[block]} />);

      expect(screen.getByText('13:30')).toBeInTheDocument();
      expect(screen.getByText('15:45')).toBeInTheDocument();
    });

    it('1桁の時・分は 0 パディングされる', () => {
      const block = makeSchedule(1, at(9, 5), at(9, 30));
      render(<ViewTimeline blocks={[block]} />);

      expect(screen.getByText('09:05')).toBeInTheDocument();
      expect(screen.getByText('09:30')).toBeInTheDocument();
    });
  });
});
