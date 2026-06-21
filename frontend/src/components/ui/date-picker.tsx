import { ja } from 'date-fns/locale/ja';
import { CalendarIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDateYMDWithDow, formatTripRangeYMD } from '@/lib/date';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value: Date | null;
  onChange: (value: Date | null) => void;
  /** 強調表示する基準範囲（Trip 期間など） */
  highlightStart?: Date | null;
  highlightEnd?: Date | null;
  placeholder?: string;
  id?: string;
  invalid?: boolean;
}

/**
 * 単一日付選択用のピッカー。Popover + Calendar の組み合わせ。
 */
export const DatePicker = ({
  value,
  onChange,
  highlightStart,
  highlightEnd,
  placeholder = '日付を選択',
  id,
  invalid = false,
}: DatePickerProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className='relative'>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type='button'
            variant='outline'
            className={cn(
              'w-full justify-start gap-2 pr-9 font-normal',
              !value && 'text-muted-foreground',
              invalid && 'border-amber-400 bg-amber-50 hover:bg-amber-50'
            )}
          >
            <CalendarIcon className='size-4 shrink-0' />
            <span className='flex-1 text-left'>{value ? formatDateYMDWithDow(value) : placeholder}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='start'>
          <Calendar
            locale={ja}
            mode='single'
            selected={value ?? undefined}
            defaultMonth={value ?? highlightStart ?? undefined}
            onSelect={d => {
              onChange(d ?? null);
              setOpen(false);
            }}
            modifiers={{
              tripRange:
                highlightStart || highlightEnd
                  ? (date: Date) => {
                      if (highlightStart && date < highlightStart) return false;
                      if (highlightEnd && date > highlightEnd) return false;
                      return Boolean(highlightStart) || Boolean(highlightEnd);
                    }
                  : undefined,
            }}
            modifiersClassNames={{
              tripRange: 'bg-teal-50 text-teal-900',
            }}
          />
        </PopoverContent>
      </Popover>
      {value && (
        <button
          type='button'
          aria-label='クリア'
          onClick={() => onChange(null)}
          className='-translate-y-1/2 absolute top-1/2 right-2 rounded p-0.5 text-muted-foreground hover:text-foreground'
        >
          <XIcon className='size-3.5' />
        </button>
      )}
    </div>
  );
};

interface DateRangePickerProps {
  start: Date | null;
  end: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
  placeholder?: string;
  id?: string;
}

/**
 * 期間（開始日〜終了日）選択用のピッカー。片方のみの設定も可能。
 */
export const DateRangePicker = ({ start, end, onChange, placeholder = '期間を選択', id }: DateRangePickerProps) => {
  const [open, setOpen] = useState(false);
  const display = formatTripRangeYMD(start, end);

  return (
    <div className='relative'>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type='button'
            variant='outline'
            className={cn('w-full justify-start gap-2 pr-9 font-normal', !display && 'text-muted-foreground')}
          >
            <CalendarIcon className='size-4 shrink-0' />
            <span className='flex-1 text-left'>{display ?? placeholder}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='start'>
          <Calendar
            locale={ja}
            mode='range'
            selected={{ from: start ?? undefined, to: end ?? undefined } as DateRange}
            defaultMonth={start ?? end ?? undefined}
            onSelect={range => {
              onChange(range?.from ?? null, range?.to ?? null);
            }}
          />
        </PopoverContent>
      </Popover>
      {display && (
        <button
          type='button'
          aria-label='クリア'
          onClick={() => onChange(null, null)}
          className='-translate-y-1/2 absolute top-1/2 right-2 rounded p-0.5 text-muted-foreground hover:text-foreground'
        >
          <XIcon className='size-3.5' />
        </button>
      )}
    </div>
  );
};
