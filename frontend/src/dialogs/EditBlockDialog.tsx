import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LazyMarkdownEditor } from '@/components/ui/markdown';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Block, TransportationBlock, TransportationType } from '@/types/block';
import { BLOCK_TITLE_MAX_LENGTH, TRANSPORTATION_OPTIONS } from '@/types/block';

interface EditBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: Block;
  onSubmit: (block: Block) => Promise<void>;
  onDelete: (blockId: number) => Promise<void>;
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

export const EditBlockDialog = ({ open, onOpenChange, block, onSubmit, onDelete }: EditBlockDialogProps) => {
  const isSchedule = block.type === 'schedule';
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 共通のstate
  const [title, setTitle] = useState(block.title);
  const [startTime, setStartTime] = useState(formatTimeInput(block.startTime));
  const [durationHours, setDurationHours] = useState(() => {
    if (block.endTime) {
      const duration = calculateDurationMinutes(block.startTime, block.endTime);
      return minutesToHoursAndMinutes(duration).hours.toString();
    }
    return '0';
  });
  const [durationMinutes, setDurationMinutes] = useState(() => {
    if (block.endTime) {
      const duration = calculateDurationMinutes(block.startTime, block.endTime);
      return minutesToHoursAndMinutes(duration).minutes.toString();
    }
    return '0';
  });
  const [noEndTime, setNoEndTime] = useState(block.endTime === null);
  const [detail, setDetail] = useState(block.detail ?? '');

  // 移動モード用のstate
  const [transportationType, setTransportationType] = useState<TransportationType>(
    block.type === 'transportation' ? block.transportationType : 'car'
  );

  // ダイアログが開いたときにフォームを初期化（送信中はリセットしない）
  useEffect(() => {
    if (open && !isSubmitting) {
      setTitle(block.title);
      setStartTime(formatTimeInput(block.startTime));
      if (block.endTime) {
        const duration = calculateDurationMinutes(block.startTime, block.endTime);
        const { hours, minutes } = minutesToHoursAndMinutes(duration);
        setDurationHours(hours.toString());
        setDurationMinutes(minutes.toString());
      } else {
        setDurationHours('0');
        setDurationMinutes('0');
      }
      setNoEndTime(block.endTime === null);
      setDetail(block.detail ?? '');
      if (block.type === 'transportation') {
        setTransportationType(block.transportationType);
      }
    }
  }, [open, block, isSubmitting]);

  // 削除処理
  const handleDelete = async () => {
    await onDelete(block.id);
    onOpenChange(false);
  };

  // サブミット処理
  const handleSubmit = async () => {
    if (!title.trim()) {
      return;
    }

    // startTimeを構築
    const [hours, minutes] = startTime.split(':').map(Number);
    const newStartTime = new Date(block.startTime);
    newStartTime.setHours(hours, minutes, 0, 0);

    // endTimeを計算
    let newEndTime: Date | null = null;
    if (!noEndTime) {
      const totalMinutes = (Number.parseInt(durationHours) || 0) * 60 + (Number.parseInt(durationMinutes) || 0);
      newEndTime = new Date(newStartTime.getTime() + totalMinutes * 60 * 1000);
    }

    setIsSubmitting(true);
    try {
      if (isSchedule) {
        const updatedBlock: Block = {
          ...block,
          title: title.trim(),
          startTime: newStartTime,
          endTime: newEndTime,
          detail: detail.trim() || null,
        };
        await onSubmit(updatedBlock);
      } else {
        const updatedBlock: Block = {
          ...block,
          type: 'transportation',
          title: title.trim(),
          startTime: newStartTime,
          endTime: newEndTime,
          detail: detail.trim() || null,
          transportationType,
        } as TransportationBlock;
        await onSubmit(updatedBlock);
      }

      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={open => {
        if (!open && isSubmitting) return;
        onOpenChange(open);
      }}
    >
      <DialogContent
        onInteractOutside={e => {
          if (isSubmitting) e.preventDefault();
        }}
        onEscapeKeyDown={e => {
          if (isSubmitting) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>ブロックの編集</DialogTitle>
          {/* ブロックタイプのラベル */}
          <div className='text-muted-foreground text-sm'>{isSchedule ? '予定' : '移動'}</div>
        </DialogHeader>

        <DialogBody>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='edit-title'>タイトル</Label>
              <Input
                id='edit-title'
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={isSchedule ? '予定のタイトル' : '移動のタイトル'}
                required
                maxLength={BLOCK_TITLE_MAX_LENGTH}
              />
            </div>
            {!isSchedule && (
              <div className='space-y-2'>
                <Label htmlFor='edit-transportation-type'>移動手段</Label>
                <Select
                  value={transportationType}
                  onValueChange={value => setTransportationType(value as TransportationType)}
                >
                  <SelectTrigger id='edit-transportation-type'>
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
            )}
            <div className='space-y-2'>
              <Label htmlFor='edit-start-time'>開始時間</Label>
              <Input id='edit-start-time' type='time' value={startTime} onChange={e => setStartTime(e.target.value)} />
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
                <Checkbox id='edit-no-end' checked={noEndTime} onCheckedChange={checked => setNoEndTime(!!checked)} />
                <Label htmlFor='edit-no-end' className='font-normal text-sm'>
                  設定しない
                </Label>
              </div>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='edit-detail'>詳細</Label>
              <LazyMarkdownEditor
                className='max-h-72'
                id='edit-detail'
                value={detail}
                onChange={setDetail}
                placeholder='詳細情報（任意）'
              />
            </div>
          </div>
        </DialogBody>

        <DialogFooter className='flex justify-between'>
          {/* 左側: 削除ボタン */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant='destructive' className='mr-auto'>
                削除
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>ブロックを削除しますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  この操作は取り消せません。ブロック「{block.title}」を削除します。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction variant='destructive' onClick={handleDelete}>
                  削除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* 右側: キャンセル・更新ボタン */}
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} loading={isSubmitting}>
            更新
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
