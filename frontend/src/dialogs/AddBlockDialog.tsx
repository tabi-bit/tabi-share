import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LazyMarkdownEditor } from '@/components/ui/markdown';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { calculateEndTimeStr } from '@/lib/utils';
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

  // 共通のState
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState(formatTimeInput(initialStartTime));
  const [durationHours, setDurationHours] = useState(() => {
    const duration = calculateDurationMinutes(initialStartTime, initialEndTime);
    return minutesToHoursAndMinutes(duration).hours.toString();
  });
  const [durationMinutes, setDurationMinutes] = useState(() => {
    const duration = calculateDurationMinutes(initialStartTime, initialEndTime);
    return minutesToHoursAndMinutes(duration).minutes.toString();
  });
  const [noEndTime, setNoEndTime] = useState(false);
  const [detail, setDetail] = useState('');

  // 移動ブロック専用Sのstate
  const [transportationType, setTransportationType] = useState<TransportationType>('car');

  // フォームをリセットする関数
  const resetForm = useCallback(() => {
    setBlockType('schedule');
    setTitle('');
    setStartTime(formatTimeInput(initialStartTime));
    const duration = calculateDurationMinutes(initialStartTime, initialEndTime);
    const { hours, minutes } = minutesToHoursAndMinutes(duration);
    setDurationHours(hours.toString());
    setDurationMinutes(minutes.toString());
    setNoEndTime(false);
    setDetail('');
    setTransportationType('car');
  }, [initialStartTime, initialEndTime]);

  // ダイアログが開いたときにフォームを新しい初期値で初期化（送信中はリセットしない）
  useEffect(() => {
    if (open && !isSubmitting) {
      resetForm();
    }
  }, [open, resetForm, isSubmitting]);

  // 送信中はダイアログを閉じない
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isSubmitting) return;
    onOpenChange(newOpen);
  };

  // サブミット処理
  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (blockType === 'schedule' && !title.trim()) {
      return;
    }

    // startTimeを構築
    const [hours, minutes] = startTime.split(':').map(Number);
    const newStartTime = new Date(initialStartTime);
    newStartTime.setHours(hours, minutes, 0, 0);

    // endTimeを計算
    let endTime: Date | null = null;
    if (!noEndTime) {
      const durationH = Number.parseInt(durationHours) || 0;
      const durationM = Number.parseInt(durationMinutes) || 0;
      const totalMinutes = durationH * 60 + durationM;
      endTime = new Date(newStartTime.getTime() + totalMinutes * 60 * 1000);
    }

    const transportationLabel = `${TRANSPORTATION_OPTIONS.find(opt => opt.value === transportationType)?.label ?? ''}移動`;

    const block: Omit<Block, 'id'> =
      blockType === 'schedule'
        ? ({
            type: blockType,
            title: title.trim(),
            startTime: newStartTime,
            endTime,
            detail: detail.trim() || null,
            pageId,
          } as Omit<ScheduleBlock, 'id'>)
        : ({
            type: blockType,
            transportationType,
            title: title.trim() || transportationLabel,
            startTime: newStartTime,
            endTime,
            detail: detail.trim() || null,
            pageId,
          } as Omit<TransportationBlock, 'id'>);

    setIsSubmitting(true);
    try {
      await onSubmit(block);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tabs value={blockType} onValueChange={value => setBlockType(value as 'schedule' | 'transportation')}>
        <DialogContent
          onInteractOutside={e => {
            if (isSubmitting) e.preventDefault();
          }}
          onEscapeKeyDown={e => {
            if (isSubmitting) e.preventDefault();
          }}
        >
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
                <Label htmlFor='schedule-title'>
                  タイトル<span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='schedule-title'
                  value={title}
                  onChange={e => setTitle(e.target.value)}
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
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <Label>所要時間</Label>
                <div className='flex items-center gap-2'>
                  <Input
                    type='number'
                    min='0'
                    value={durationHours}
                    onChange={e => setDurationHours(e.target.value)}
                    disabled={noEndTime}
                    className='w-20'
                  />
                  <span className='text-sm'>時間</span>
                  <Input
                    type='number'
                    min='0'
                    max='59'
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(e.target.value)}
                    disabled={noEndTime}
                    className='w-20'
                  />
                  <span className='text-sm'>分</span>
                  {!noEndTime && calculateEndTimeStr(startTime, durationHours, durationMinutes) && (
                    <span className='ml-1 font-normal text-muted-foreground'>
                      （〜{calculateEndTimeStr(startTime, durationHours, durationMinutes)}）
                    </span>
                  )}
                </div>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='schedule-no-end'
                    checked={noEndTime}
                    onCheckedChange={checked => setNoEndTime(!!checked)}
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
                  value={detail}
                  onChange={setDetail}
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
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder='移動のタイトル（省略可）'
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
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <Label>所要時間</Label>
                <div className='flex items-center gap-2'>
                  <Input
                    type='number'
                    min='0'
                    value={durationHours}
                    onChange={e => setDurationHours(e.target.value)}
                    disabled={noEndTime}
                    className='w-20'
                  />
                  <span className='text-sm'>時間</span>
                  <Input
                    type='number'
                    min='0'
                    max='59'
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(e.target.value)}
                    disabled={noEndTime}
                    className='w-20'
                  />
                  <span className='text-sm'>分</span>
                  {!noEndTime && calculateEndTimeStr(startTime, durationHours, durationMinutes) && (
                    <span className='ml-1 font-normal text-muted-foreground'>
                      （〜
                      {calculateEndTimeStr(startTime, durationHours, durationMinutes)}）
                    </span>
                  )}
                </div>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='transportation-no-end'
                    checked={noEndTime}
                    onCheckedChange={checked => setNoEndTime(!!checked)}
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
                  value={detail}
                  onChange={setDetail}
                  placeholder='詳細情報（省略可）'
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
