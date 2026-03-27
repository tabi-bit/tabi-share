'use client';

import { ClockIcon } from '@radix-ui/react-icons';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import type { CarouselApi } from '@/components/ui/carousel';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

function TimePicker() {
  const [date, setDate] = React.useState<Date>(new Date());
  const [isOpen, setIsOpen] = React.useState(false);
  const [hourApi, setHourApi] = React.useState<CarouselApi>();
  const [minuteApi, setMinuteApi] = React.useState<CarouselApi>();

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const handleTimeChange = React.useCallback((type: 'hour' | 'minute' | 'ampm', value: string) => {
    setDate(prevDate => {
      const newDate = new Date(prevDate);
      if (type === 'hour') {
        const currentHours = newDate.getHours();
        const newHour = parseInt(value);
        newDate.setHours((newHour % 12) + (currentHours >= 12 ? 12 : 0));
      } else if (type === 'minute') {
        newDate.setMinutes(parseInt(value));
      } else if (type === 'ampm') {
        const currentHours = newDate.getHours();
        if (value === 'PM' && currentHours < 12) {
          newDate.setHours(currentHours + 12);
        } else if (value === 'AM' && currentHours >= 12) {
          newDate.setHours(currentHours - 12);
        }
      }
      return newDate;
    });
  }, []);

  React.useEffect(() => {
    if (!hourApi) return;
    const handleSelect = () => {
      const selectedHour = hours[hourApi.selectedScrollSnap()];
      handleTimeChange('hour', selectedHour.toString());
    };
    hourApi.on('select', handleSelect);
    return () => {
      hourApi.off('select', handleSelect);
    };
  }, [hourApi, hours, handleTimeChange]);

  React.useEffect(() => {
    if (!minuteApi) return;
    const handleSelect = () => {
      const selectedMinute = minutes[minuteApi.selectedScrollSnap()];
      handleTimeChange('minute', selectedMinute.toString());
    };
    minuteApi.on('select', handleSelect);
    return () => {
      minuteApi.off('select', handleSelect);
    };
  }, [minuteApi, minutes, handleTimeChange]);

  React.useEffect(() => {
    if (hourApi) {
      const currentHour = date.getHours();
      const hourValue = currentHour % 12 === 0 ? 12 : currentHour % 12;
      const hourIndex = hours.indexOf(hourValue);
      hourApi.scrollTo(hourIndex);
    }
    if (minuteApi) {
      minuteApi.scrollTo(date.getMinutes());
    }
  }, [hourApi, minuteApi, date, hours]);

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
        <div
          className={cn('flex items-center justify-center p-4', 'touch-none select-none', 'webkit-touch-callout-none')}
          style={{
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
            userSelect: 'none',
          }}
        >
          <Carousel
            setApi={setHourApi}
            opts={{
              loop: true,
            }}
            orientation='vertical'
            className='w-full'
            style={{
              maskImage: 'linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)',
            }}
            onWheel={e => {
              if (e.deltaY < 0) {
                hourApi?.scrollPrev();
              } else {
                hourApi?.scrollNext();
              }
            }}
          >
            <CarouselContent className='h-32'>
              {hours.map(hour => (
                <CarouselItem key={hour} className='flex basis-1/3 items-center justify-center'>
                  <div className='flex h-full w-full items-center justify-center text-lg'>{hour}</div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          <span className='mx-2 text-lg'>:</span>
          <Carousel
            setApi={setMinuteApi}
            opts={{
              loop: true,
              skipSnaps: false,
              dragFree: true,
            }}
            orientation='vertical'
            className='w-full'
            style={{
              maskImage: 'linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)',
              touchAction: 'none',
            }}
            onWheel={e => {
              if (e.deltaY < 0) {
                minuteApi?.scrollPrev();
              } else {
                minuteApi?.scrollNext();
              }
            }}
          >
            <CarouselContent className='h-32'>
              {minutes.map(minute => (
                <CarouselItem key={minute} className='flex basis-1/3 items-center justify-center'>
                  <div className='flex h-full w-full items-center justify-center text-lg'>
                    {minute.toString().padStart(2, '0')}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          <div className='ml-4 flex items-center justify-center'>
            <Button variant='ghost' onClick={() => handleTimeChange('ampm', date.getHours() >= 12 ? 'AM' : 'PM')}>
              {date.getHours() >= 12 ? '午後' : '午前'}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { TimePicker };
