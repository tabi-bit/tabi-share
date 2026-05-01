import { MapPin, X } from 'lucide-react';
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
import { calculateEndTimeStr } from '@/lib/utils';
import type { Block, TransportationBlock, TransportationType } from '@/types/block';
import { BLOCK_TITLE_MAX_LENGTH, TRANSPORTATION_OPTIONS } from '@/types/block';
import type { LocationUpdate } from '@/types/location';
import { PlaceSearchDialog } from './PlaceSearchDialog';

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

export const EditBlockDialog = ({ open, onOpenChange, block, onSubmit, onDelete }: EditBlockDialogProps) => {
  const isSchedule = block.type === 'schedule';

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

  // 場所設定用のstate
  // pendingLocation: PUT 送信までの下書き。id 付き=既存維持、id無し=新規、null=解除
  // 毎回 block.location に埋め込んで PUT するので dirty フラグは不要。
  const [placeDialogOpen, setPlaceDialogOpen] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<LocationUpdate | null>(block.location);

  // ダイアログが開いたときにフォームを初期化
  useEffect(() => {
    if (open) {
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
      setPendingLocation(block.location);
    }
  }, [open, block]);

  // 削除処理（楽観更新のためfire-and-forget）
  const handleDelete = () => {
    onDelete(block.id);
    onOpenChange(false);
  };

  // サブミット処理（楽観更新のためfire-and-forget）
  const handleSubmit = () => {
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

    if (isSchedule) {
      const updatedBlock: Block = {
        ...block,
        title: title.trim(),
        startTime: newStartTime,
        endTime: newEndTime,
        detail: detail.trim() || null,
        location: pendingLocation,
      };
      onSubmit(updatedBlock);
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
      onSubmit(updatedBlock);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ブロックの編集</DialogTitle>
          {/* ブロックタイプのラベル */}
          <div className='text-muted-foreground text-sm'>{isSchedule ? '予定' : '移動'}</div>
        </DialogHeader>

        <DialogBody>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='edit-title'>
                タイトル<span className='text-red-500'>*</span>
              </Label>
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
            {/* 場所設定（予定ブロックのみ） */}
            {isSchedule && (
              <div className='space-y-2'>
                <div className='flex items-center justify-start gap-2'>
                  <Label>場所</Label>
                  {!pendingLocation && (
                    <Button variant='outline' size='sm' onClick={() => setPlaceDialogOpen(true)}>
                      <MapPin className='mr-1 h-4 w-4' />
                      場所を設定
                    </Button>
                  )}
                </div>
                {pendingLocation && (
                  <div className='flex items-center gap-2 rounded-md border p-2'>
                    <MapPin className='h-4 w-4 shrink-0 text-muted-foreground' />
                    <div className='min-w-0 flex-1'>
                      <div className='truncate text-sm'>{pendingLocation.name}</div>
                      {pendingLocation.address && (
                        <div className='truncate text-muted-foreground text-xs'>{pendingLocation.address}</div>
                      )}
                    </div>
                    <Button variant='ghost' size='sm' className='shrink-0' onClick={() => setPlaceDialogOpen(true)}>
                      変更
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-6 w-6 shrink-0'
                      onClick={() => setPendingLocation(null)}
                    >
                      <X className='h-3 w-3' />
                    </Button>
                  </div>
                )}
              </div>
            )}

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
          <Button onClick={handleSubmit}>更新</Button>
        </DialogFooter>
      </DialogContent>

      {/* 場所検索ダイアログ */}
      {isSchedule && (
        <PlaceSearchDialog
          open={placeDialogOpen}
          onOpenChange={setPlaceDialogOpen}
          onConfirm={locationData => setPendingLocation(locationData)}
          initialLocation={pendingLocation}
        />
      )}
    </Dialog>
  );
};
