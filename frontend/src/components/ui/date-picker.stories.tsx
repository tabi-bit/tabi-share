import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { DatePicker, DateRangePicker } from './date-picker';

const meta: Meta<typeof DatePicker> = {
  title: 'UI/DatePicker',
  component: DatePicker,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DatePicker>;

const ControlledDatePicker = ({
  initial = null,
  highlightStart,
  highlightEnd,
  invalid,
}: {
  initial?: Date | null;
  highlightStart?: Date | null;
  highlightEnd?: Date | null;
  invalid?: boolean;
}) => {
  const [value, setValue] = useState<Date | null>(initial);
  return (
    <div className='w-72'>
      <DatePicker
        value={value}
        onChange={setValue}
        highlightStart={highlightStart}
        highlightEnd={highlightEnd}
        invalid={invalid}
      />
    </div>
  );
};

const ControlledDateRangePicker = ({
  initialStart = null,
  initialEnd = null,
}: {
  initialStart?: Date | null;
  initialEnd?: Date | null;
}) => {
  const [start, setStart] = useState<Date | null>(initialStart);
  const [end, setEnd] = useState<Date | null>(initialEnd);
  return (
    <div className='w-72'>
      <DateRangePicker
        start={start}
        end={end}
        onChange={(s, e) => {
          setStart(s);
          setEnd(e);
        }}
      />
    </div>
  );
};

export const Default: Story = {
  render: () => <ControlledDatePicker />,
  parameters: {
    docs: {
      description: {
        story: '未選択の単一日付ピッカー。クリックでカレンダーを開く。',
      },
    },
  },
};

export const Selected: Story = {
  render: () => <ControlledDatePicker initial={new Date(2026, 4, 25)} />,
  parameters: {
    docs: {
      description: {
        story: '日付選択済み。✕ ボタンで未選択に戻せる。',
      },
    },
  },
};

export const WithTripRangeHighlight: Story = {
  render: () => <ControlledDatePicker highlightStart={new Date(2026, 4, 24)} highlightEnd={new Date(2026, 4, 26)} />,
  parameters: {
    docs: {
      description: {
        story: 'Trip 期間（05/24〜05/26）をハイライト表示。範囲外も選択可。',
      },
    },
  },
};

export const Invalid: Story = {
  render: () => (
    <ControlledDatePicker
      initial={new Date(2026, 4, 30)}
      highlightStart={new Date(2026, 4, 24)}
      highlightEnd={new Date(2026, 4, 26)}
      invalid
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Trip 期間外の日付が選択されている状態（warning 配色）。',
      },
    },
  },
};

export const Range: Story = {
  render: () => <ControlledDateRangePicker />,
  parameters: {
    docs: {
      description: {
        story: '期間選択（DateRangePicker）。範囲カレンダーで開始日と終了日を指定。',
      },
    },
  },
};

export const RangeSelected: Story = {
  render: () => <ControlledDateRangePicker initialStart={new Date(2026, 4, 24)} initialEnd={new Date(2026, 4, 26)} />,
  parameters: {
    docs: {
      description: {
        story: '期間選択済み。',
      },
    },
  },
};

export const RangeStartOnly: Story = {
  render: () => <ControlledDateRangePicker initialStart={new Date(2026, 4, 24)} />,
  parameters: {
    docs: {
      description: {
        story: '開始日のみ設定（終了日なし）。表示は `YYYY/MM/DD(曜) 〜`。',
      },
    },
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className='flex flex-col gap-6'>
      <div className='space-y-2'>
        <p className='text-muted-foreground text-sm'>DatePicker - 未選択</p>
        <ControlledDatePicker />
      </div>
      <div className='space-y-2'>
        <p className='text-muted-foreground text-sm'>DatePicker - 選択済み</p>
        <ControlledDatePicker initial={new Date(2026, 4, 25)} />
      </div>
      <div className='space-y-2'>
        <p className='text-muted-foreground text-sm'>DatePicker - Trip 期間ハイライト</p>
        <ControlledDatePicker highlightStart={new Date(2026, 4, 24)} highlightEnd={new Date(2026, 4, 26)} />
      </div>
      <div className='space-y-2'>
        <p className='text-muted-foreground text-sm'>DatePicker - 範囲外警告</p>
        <ControlledDatePicker
          initial={new Date(2026, 4, 30)}
          highlightStart={new Date(2026, 4, 24)}
          highlightEnd={new Date(2026, 4, 26)}
          invalid
        />
      </div>
      <div className='space-y-2'>
        <p className='text-muted-foreground text-sm'>DateRangePicker - 未選択</p>
        <ControlledDateRangePicker />
      </div>
      <div className='space-y-2'>
        <p className='text-muted-foreground text-sm'>DateRangePicker - 選択済み</p>
        <ControlledDateRangePicker initialStart={new Date(2026, 4, 24)} initialEnd={new Date(2026, 4, 26)} />
      </div>
      <div className='space-y-2'>
        <p className='text-muted-foreground text-sm'>DateRangePicker - 開始日のみ</p>
        <ControlledDateRangePicker initialStart={new Date(2026, 4, 24)} />
      </div>
    </div>
  ),
};
