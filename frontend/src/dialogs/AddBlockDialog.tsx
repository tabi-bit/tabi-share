import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LazyMarkdownEditor } from '@/components/ui/markdown';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Block, ScheduleBlock, TransportationBlock, TransportationType } from '@/types/block';
import { BLOCK_TITLE_MAX_LENGTH, TRANSPORTATION_OPTIONS } from '@/types/block';

interface AddBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStartTime: Date;
  initialEndTime: Date;
  pageId: number;
  onSubmit: (block: Omit<Block, 'id'>) => Promise<void>;
}

// ユーティリティ関数: DateをHH:MM形式に変換
const formatTimeInput = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

// ユーティリティ関数: 2つのDateから時間差を計算（分単位）
const calculateDurationMinutes = (start: Date, end: Date): number => {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
};

// ユーティリティ関数: 分数を時間と分に分解
const minutesToHoursAndMinutes = (totalMinutes: number): { hours: number; minutes: number } => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes };
};

// ユーティリティ関数: 開始時間と所要時間から終了時間文字列を算出
const calculateEndTimeStr = (startTimeStr: string, durationH: string, durationM: string): string | null => {
  const h = Number.parseInt(durationH) || 0;
  const m = Number.parseInt(durationM) || 0;
  if (h === 0 && m === 0) return null;
  const start = dayjs(`2000-01-01 ${startTimeStr}`);
  if (!start.isValid()) return null;
  return start.add(h, 'hour').add(m, 'minute').format('HH:mm');
};

export const AddBlockDialog = ({
  open,
  onOpenChange,
  initialStartTime,
  initialEndTime,
  pageId,
  onSubmit,
}: AddBlockDialogProps) => {
  // 送信中の状態
  const [isSubmitting, setIsSubmitting] = useState(false);

  // タブの状態
  const [blockType, setBlockType] = useState<'schedule' | 'transportation'>('schedule');

  // 予定ブロック用のstate
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleStartTime, setScheduleStartTime] = useState(formatTimeInput(initialStartTime));
  const [scheduleDurationHours, setScheduleDurationHours] = useState(() => {
    const duration = calculateDurationMinutes(initialStartTime, initialEndTime);
    return minutesToHoursAndMinutes(duration).hours.toString();
  });
  const [scheduleDurationMinutes, setScheduleDurationMinutes] = useState(() => {
    const duration = calculateDurationMinutes(initialStartTime, initialEndTime);
    return minutesToHoursAndMinutes(duration).minutes.toString();
  });
  const [scheduleNoEndTime, setScheduleNoEndTime] = useState(false);
  const [scheduleDetail, setScheduleDetail] = useState('');

  // 移動ブロック用のstate
  const [transportationType, setTransportationType] = useState<TransportationType>('car');
  const [transportationTitle, setTransportationTitle] = useState(
    TRANSPORTATION_OPTIONS.find(opt => opt.value === 'car')?.label ?? '移動'
  );
  const [transportationStartTime, setTransportationStartTime] = useState(formatTimeInput(initialStartTime));
  const [transportationDurationHours, setTransportationDurationHours] = useState(() => {
    const duration = calculateDurationMinutes(initialStartTime, initialEndTime);
    return minutesToHoursAndMinutes(duration).hours.toString();
  });
  const [transportationDurationMinutes, setTransportationDurationMinutes] = useState(() => {
    const duration = calculateDurationMinutes(initialStartTime, initialEndTime);
    return minutesToHoursAndMinutes(duration).minutes.toString();
  });
  const [transportationNoEndTime, setTransportationNoEndTime] = useState(false);
  const [transportationDetail, setTransportationDetail] = useState('');

  // フォームをリセットする関数
  const resetForm = useCallback(() => {
    setBlockType('schedule');
    setScheduleTitle('');
    setScheduleStartTime(formatTimeInput(initialStartTime));
    const duration = calculateDurationMinutes(initialStartTime, initialEndTime);
    const { hours, minutes } = minutesToHoursAndMinutes(duration);
    setScheduleDurationHours(hours.toString());
    setScheduleDurationMinutes(minutes.toString());
    setScheduleNoEndTime(false);
    setScheduleDetail('');
    setTransportationType('car');
    setTransportationTitle('');
    setTransportationStartTime(formatTimeInput(initialStartTime));
    setTransportationDurationHours(hours.toString());
    setTransportationDurationMinutes(minutes.toString());
    setTransportationNoEndTime(false);
    setTransportationDetail('');
  }, [initialStartTime, initialEndTime]);

  // ダイアログが開いたときにフォームを新しい初期値で初期化
  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);

  // ダイアログが閉じたときにフォームをリセット
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  // サブミット処理
  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (blockType === 'schedule') {
      // 予定ブロックの処理
      if (!scheduleTitle.trim()) {
        return;
      }

      // startTimeを構築
      const [hours, minutes] = scheduleStartTime.split(':').map(Number);
      const startTime = new Date(initialStartTime);
      startTime.setHours(hours, minutes, 0, 0);

      // endTimeを計算
      let endTime: Date | null = null;
      if (!scheduleNoEndTime) {
        const durationHours = Number.parseInt(scheduleDurationHours) || 0;
        const durationMinutes = Number.parseInt(scheduleDurationMinutes) || 0;
        const totalMinutes = durationHours * 60 + durationMinutes;
        endTime = new Date(startTime.getTime() + totalMinutes * 60 * 1000);
      }

      const block: Omit<ScheduleBlock, 'id'> = {
        type: 'schedule',
        title: scheduleTitle.trim(),
        startTime,
        endTime,
        detail: scheduleDetail.trim() || null,
        pageId,
      };

      setIsSubmitting(true);
      try {
        await onSubmit(block);
        handleOpenChange(false);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // 移動ブロックの処理
      const transportationLabel = TRANSPORTATION_OPTIONS.find(opt => opt.value === transportationType)?.label ?? '移動';

      // startTimeを構築（移動ブロックでは初期時間をそのまま使用）
      const startTime = new Date(initialStartTime);

      // endTimeを計算
      let endTime: Date | null = null;
      if (!transportationNoEndTime) {
        const durationHours = Number.parseInt(transportationDurationHours) || 0;
        const durationMinutes = Number.parseInt(transportationDurationMinutes) || 0;
        const totalMinutes = durationHours * 60 + durationMinutes;
        endTime = new Date(startTime.getTime() + totalMinutes * 60 * 1000);
      }

      const block: Omit<TransportationBlock, 'id'> = {
        type: 'transportation',
        transportationType,
        title: transportationLabel,
        startTime,
        endTime,
        detail: transportationDetail.trim() || null,
        pageId,
      };

      setIsSubmitting(true);
      try {
        await onSubmit(block);
        handleOpenChange(false);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tabs value={blockType} onValueChange={value => setBlockType(value as 'schedule' | 'transportation')}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ブロックの追加</DialogTitle>
            <TabsList className='grid w-full grid-cols-2'>
              <TabsTrigger value='schedule'>予定</TabsTrigger>
              <TabsTrigger value='transportation'>移動</TabsTrigger>
            </TabsList>
          </DialogHeader>

          <DialogBody>
            {/* 予定ブロック */}
            <TabsContent value='schedule' className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='schedule-title'>タイトル</Label>
                <Input
                  id='schedule-title'
                  value={scheduleTitle}
                  onChange={e => setScheduleTitle(e.target.value)}
                  placeholder='予定のタイトル'
                  required
                  maxLength={BLOCK_TITLE_MAX_LENGTH}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='schedule-start-time'>開始時間</Label>
                <Input
                  id='schedule-start-time'
                  type='time'
                  value={scheduleStartTime}
                  onChange={e => setScheduleStartTime(e.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <Label>所要時間</Label>
                <div className='flex items-center gap-2'>
                  <Input
                    type='number'
                    min='0'
                    value={scheduleDurationHours}
                    onChange={e => setScheduleDurationHours(e.target.value)}
                    disabled={scheduleNoEndTime}
                    className='w-20'
                  />
                  <span className='text-sm'>時間</span>
                  <Input
                    type='number'
                    min='0'
                    max='59'
                    value={scheduleDurationMinutes}
                    onChange={e => setScheduleDurationMinutes(e.target.value)}
                    disabled={scheduleNoEndTime}
                    className='w-20'
                  />
                  <span className='text-sm'>分</span>
                  {!scheduleNoEndTime &&
                    calculateEndTimeStr(scheduleStartTime, scheduleDurationHours, scheduleDurationMinutes) && (
                      <span className='ml-1 font-normal text-muted-foreground'>
                        （〜{calculateEndTimeStr(scheduleStartTime, scheduleDurationHours, scheduleDurationMinutes)}）
                      </span>
                    )}
                </div>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='schedule-no-end'
                    checked={scheduleNoEndTime}
                    onCheckedChange={checked => setScheduleNoEndTime(!!checked)}
                  />
                  <Label htmlFor='schedule-no-end' className='font-normal text-sm'>
                    設定しない
                  </Label>
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='schedule-detail'>詳細</Label>
                <LazyMarkdownEditor
                  className='max-h-72'
                  id='schedule-detail'
                  value={scheduleDetail}
                  onChange={setScheduleDetail}
                  placeholder='詳細情報（任意）'
                />
              </div>
            </TabsContent>

            {/* 移動ブロック */}
            <TabsContent value='transportation' className='h-full space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='transportation-title'>タイトル</Label>
                <Input
                  id='transportation-title'
                  value={transportationTitle}
                  onChange={e => setTransportationTitle(e.target.value)}
                  placeholder='移動のタイトル'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='transportation-type'>移動手段</Label>
                <Select
                  value={transportationType}
                  onValueChange={value => setTransportationType(value as TransportationType)}
                >
                  <SelectTrigger id='transportation-type'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSPORTATION_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='transportation-start-time'>開始時間</Label>
                <Input
                  id='transportation-start-time'
                  type='time'
                  value={transportationStartTime}
                  onChange={e => setTransportationStartTime(e.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <Label>所要時間</Label>
                <div className='flex items-center gap-2'>
                  <Input
                    type='number'
                    min='0'
                    value={transportationDurationHours}
                    onChange={e => setTransportationDurationHours(e.target.value)}
                    disabled={transportationNoEndTime}
                    className='w-20'
                  />
                  <span className='text-sm'>時間</span>
                  <Input
                    type='number'
                    min='0'
                    max='59'
                    value={transportationDurationMinutes}
                    onChange={e => setTransportationDurationMinutes(e.target.value)}
                    disabled={transportationNoEndTime}
                    className='w-20'
                  />
                  <span className='text-sm'>分</span>
                  {!transportationNoEndTime &&
                    calculateEndTimeStr(
                      transportationStartTime,
                      transportationDurationHours,
                      transportationDurationMinutes
                    ) && (
                      <span className='ml-1 font-normal text-muted-foreground'>
                        （〜
                        {calculateEndTimeStr(
                          transportationStartTime,
                          transportationDurationHours,
                          transportationDurationMinutes
                        )}
                        ）
                      </span>
                    )}
                </div>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='transportation-no-end'
                    checked={transportationNoEndTime}
                    onCheckedChange={checked => setTransportationNoEndTime(!!checked)}
                  />
                  <Label htmlFor='transportation-no-end' className='font-normal text-sm'>
                    設定しない
                  </Label>
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='transportation-detail'>詳細</Label>
                <LazyMarkdownEditor
                  className='max-h-72'
                  id='transportation-detail'
                  value={transportationDetail}
                  onChange={setTransportationDetail}
                  placeholder='詳細情報（任意）'
                />
              </div>
            </TabsContent>
          </DialogBody>

          <DialogFooter>
            <Button variant='outline' onClick={() => handleOpenChange(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit} loading={isSubmitting}>
              追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Tabs>
    </Dialog>
  );
};
