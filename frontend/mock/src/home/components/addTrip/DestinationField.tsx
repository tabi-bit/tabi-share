import type { Ref } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { TRIP_TITLE_MAX_LENGTH } from '@/types/trip';

interface DestinationFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  inputRef?: Ref<HTMLInputElement>;
  /** ステップ画面の大きな入力欄か、確認画面の通常サイズか */
  size?: 'lg' | 'default';
}

export const DestinationField = ({ id, value, onChange, inputRef, size = 'lg' }: DestinationFieldProps) => (
  <div className='flex flex-col gap-2'>
    <Label htmlFor={id} className='sr-only'>
      旅行の名前
    </Label>
    <Input
      ref={inputRef}
      id={id}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder='例: 箱根でのんびり温泉旅'
      enterKeyHint='next'
      maxLength={TRIP_TITLE_MAX_LENGTH}
      aria-invalid={size === 'default' && !value.trim()}
      className={cn(size === 'lg' && 'h-14 text-18px sm:h-14 sm:text-18px')}
    />
  </div>
);
