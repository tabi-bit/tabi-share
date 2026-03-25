'use client';

import { ClockIcon } from '@radix-ui/react-icons';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const CLOCK_SIZE = 200;
const CLOCK_CENTER = CLOCK_SIZE / 2;
const NUMBER_RADIUS = CLOCK_SIZE / 2 - 20;

function ClockTimePicker() {
  const [date, setDate] = React.useState(new Date());
  const [isOpen, setIsOpen] = React.useState(false);
  const [mode, setMode] = React.useState<'hour' | 'minute'>('hour');
  const clockRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const hasHourShiftedRef = React.useRef(false);

  const handleTimeUpdate = (newTime: { hour?: number; minute?: number }) => {
    setDate(prevDate => {
      const newDate = new Date(prevDate);
      const currentHours = newDate.getHours();
      let hourWasActuallyChanged = false;

      if (newTime.hour !== undefined) {
        let targetHour = newTime.hour;
        // 12時間制の値を24時間制に変換
        if (targetHour === 12) {
          targetHour = currentHours >= 12 ? 12 : 0; // 現在がPMなら12時PM、AMなら12時AM(0時)
        } else {
          // 1-11時の場合、現在のAM/PMを維持
          targetHour = currentHours >= 12 ? targetHour + 12 : targetHour;
        }

        if (currentHours !== targetHour) {
          hourWasActuallyChanged = true;
        }
        newDate.setHours(targetHour);
      }
      if (newTime.minute !== undefined) {
        newDate.setMinutes(newTime.minute);
      }

      if (hourWasActuallyChanged) {
        hasHourShiftedRef.current = true;
      }
      return newDate;
    });
  };

  const handleInteraction = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!clockRef.current) return;
    const rect = clockRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - CLOCK_CENTER;
    const y = e.clientY - rect.top - CLOCK_CENTER;

    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    if (mode === 'hour') {
      const hour = Math.round(angle / 30) % 12 || 12;
      handleTimeUpdate({ hour });
    } else if (mode === 'minute') {
      const minute = Math.round(angle / 6) % 60;
      handleTimeUpdate({ minute });
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // ターゲット要素にポインターをロック（枠外に出ても追従）
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    hasHourShiftedRef.current = false;
    handleInteraction(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    handleInteraction(e);
  };

  const handlePointerUp = (_e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    // 指を離したとき、時モードなら分モードへ
    if (mode === 'hour' && hasHourShiftedRef.current) {
      setMode('minute');
    }
    hasHourShiftedRef.current = false;
  };

  const handleChangeAMPM = (v: string) => {
    setDate(prevDate => {
      const newDate = new Date(prevDate);
      const currentHours = newDate.getHours();
      if (v === 'PM' && currentHours < 12) {
        newDate.setHours(currentHours + 12);
      } else if (v === 'AM' && currentHours >= 12) {
        newDate.setHours(currentHours - 12);
      }
      return newDate;
    });
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
        >
          <ClockIcon className='mr-2 h-4 w-4' />
          {date ? (
            date.toLocaleTimeString(navigator.language, { hour: '2-digit', minute: '2-digit', hour12: true })
          ) : (
            <span>hh:mm aa</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='-translate-x-1/2 -translate-y-1/2 fixed top-1/2 left-1/2 w-auto p-0'>
        <div className='p-4'>
          {/* Header: Selected time and mode toggle */}
          <div className='mb-4 flex items-end justify-center'>
            <Button variant={mode === 'hour' ? 'default' : 'ghost'} onClick={() => setMode('hour')}>
              {date.getHours() % 12 || 12}
            </Button>
            <span className='mx-2 text-2xl'>:</span>
            <Button variant={mode === 'minute' ? 'default' : 'ghost'} onClick={() => setMode('minute')}>
              {date.getMinutes().toString().padStart(2, '0')}
            </Button>
            {/* AM/PM toggle */}
            <div className='ml-4 flex flex-col'>
              <Button variant='ghost' onClick={() => handleChangeAMPM(date.getHours() > 12 ? 'AM' : 'PM')}>
                {date.getHours() >= 12 ? '午後' : '午前'}
              </Button>
            </div>
          </div>

          {/* Clock face */}
          <div
            role='slider'
            aria-valuemin={0}
            aria-valuemax={mode === 'hour' ? 12 : 59}
            aria-valuenow={mode === 'hour' ? date.getHours() % 12 || 12 : date.getMinutes()}
            aria-label={mode === 'hour' ? 'Select hour' : 'Select minute'}
            tabIndex={0}
            ref={clockRef}
            className='relative cursor-pointer select-none rounded-full bg-blue-50'
            style={{ width: CLOCK_SIZE, height: CLOCK_SIZE, touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Numbers will be placed here */}
            {(mode === 'hour' ? hours : minutes).map(value => {
              const angle = (mode === 'hour' ? value / 12 : value / 60) * 360 - 90; // -90 to start from top
              const x = CLOCK_CENTER + NUMBER_RADIUS * Math.cos(angle * (Math.PI / 180));
              const y = CLOCK_CENTER + NUMBER_RADIUS * Math.sin(angle * (Math.PI / 180));
              const isSelected =
                mode === 'hour'
                  ? value === (date.getHours() % 12 === 0 ? 12 : date.getHours() % 12)
                  : value === date.getMinutes();

              return (
                <div
                  key={value}
                  className={cn(
                    'absolute flex h-8 w-8 items-center justify-center rounded-full',
                    isSelected ? 'bg-blue-500 text-white' : 'bg-transparent'
                  )}
                  style={{
                    left: x - 16,
                    top: y - 16,
                  }}
                >
                  {mode === 'minute' ? value.toString().padStart(2, '0') : value}
                </div>
              );
            })}

            {/* Hour hand */}
            <div
              className='absolute rounded-full bg-blue-500'
              style={{
                width: '3px',
                height: CLOCK_CENTER * 0.6, // 時針の長さ
                left: CLOCK_CENTER - 3 / 2, // 針の幅が3pxなので
                top: CLOCK_CENTER - CLOCK_CENTER * 0.6, // 針の高さ分上に移動
                transformOrigin: '50% 100%',
                transform: `rotateZ(${(date.getHours() % 12) * 30}deg)`,
              }}
            />

            {/* Minute hand */}
            <div
              className='absolute rounded-full bg-blue-500'
              style={{
                width: '3px',
                height: CLOCK_CENTER * 0.7, // 分針の長さ
                left: CLOCK_CENTER - 3 / 2, // 針の幅が3pxなので
                top: CLOCK_CENTER - CLOCK_CENTER * 0.7, // 針の高さ分上に移動
                transformOrigin: '50% 100%',
                transform: `rotateZ(${date.getMinutes() * 6}deg)`,
              }}
            />

            {/* Center dot */}
            <div
              className='absolute rounded-full bg-blue-700'
              style={{
                width: '8px',
                height: '8px',
                left: CLOCK_CENTER - 8 / 2,
                top: CLOCK_CENTER - 8 / 2,
              }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { ClockTimePicker };
