import { ja } from 'date-fns/locale/ja';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { formatTripRangeYMD } from '@/lib/date';
import { cn } from '@/lib/utils';

interface DatesFieldProps {
  start: Date | null;
  end: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
  /** 確認画面では「未定に戻す」を出す */
  clearable?: boolean;
}

/** 常に開いたカレンダーで期間を選ぶ */
export const DatesField = ({ start, end, onChange, clearable = false }: DatesFieldProps) => {
  const rangeText = formatTripRangeYMD(start, end);
  return (
    <div className='flex flex-col items-center gap-3'>
      <Calendar
        locale={ja}
        mode='range'
        selected={{ from: start ?? undefined, to: end ?? undefined } as DateRange}
        defaultMonth={start ?? undefined}
        onSelect={range => onChange(range?.from ?? null, range?.to ?? null)}
        className='rounded-lg border'
      />
      <div className='flex items-center gap-2'>
        <span className={cn('text-14px', rangeText ? 'font-medium text-teal-800' : 'text-neutral-500')}>
          {rangeText ?? '開始日と終了日をタップ'}
        </span>
        {clearable && rangeText && (
          <Button
            type='button'
            variant='link'
            size='sm'
            className='h-auto p-0 sm:h-auto'
            onClick={() => onChange(null, null)}
          >
            未定に戻す
          </Button>
        )}
      </div>
    </div>
  );
};
