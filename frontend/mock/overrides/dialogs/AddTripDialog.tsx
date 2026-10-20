import { ConfirmStep } from '@mock/home/components/addTrip/ConfirmStep';
import { DatesField } from '@mock/home/components/addTrip/DatesField';
import { DestinationField } from '@mock/home/components/addTrip/DestinationField';
import { NotesFields } from '@mock/home/components/addTrip/NotesFields';
import { StepPanel } from '@mock/stepFlow/StepPanel';
import { STEP_DIALOG_CLASS } from '@mock/stepFlow/stepDialog';
import { useStepNavigation } from '@mock/stepFlow/useStepNavigation';
import { Sparkles, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useCreateTrip } from '@/hooks/useTrips';
import { isValidWalicaUrl } from '@/lib/walica';
import type { CreateTripFromApi } from '@/types/trip';

/** [mock] 作成後の進め方。ai は候補集め (新フロー)、manual は従来どおり旅程を直接編集する */
export type TripStartMode = 'ai' | 'manual';

interface AddTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (trip: CreateTripFromApi, mode: TripStartMode, destination: string) => void;
}

const STEPS = [
  { key: 'destination', question: '旅行の名前をつけよう', hint: 'みんなに共有される名前です。あとから変えられます' },
  { key: 'dates', question: '期間は？', hint: '決まっていなければ、あとで入れられます' },
  { key: 'notes', question: '他に書いておきたいことは？', hint: 'なければそのまま進めて大丈夫です' },
  { key: 'confirm', question: 'これでいい？', hint: '行をタップすると、その場で直せます' },
] as const;

/**
 * [mock] 旅程の追加を 1 問ずつのステップにし、最後に確認・修正できるようにしたもの。
 * スマホは全画面 (ネイティブアプリの画面遷移風) で操作を下に寄せ、sm 以上は中央のダイアログで出す。
 */
export const AddTripDialog = ({ open, onOpenChange, onCreated }: AddTripDialogProps) => {
  const idPrefix = useId();
  const nav = useStepNavigation(STEPS.length);
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [walicaUrl, setWalicaUrl] = useState('');
  const [pendingMode, setPendingMode] = useState<TripStartMode | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { createTrip, isCreating } = useCreateTrip();

  // ダイアログが開いたときにフォームを初期化
  // biome-ignore lint/correctness/useExhaustiveDependencies: nav.reset は毎回作られるため依存に入れない
  useEffect(() => {
    if (open && !isCreating) {
      nav.reset();
      setTitle('');
      setDetail('');
      setStartDate(null);
      setEndDate(null);
      setWalicaUrl('');
      setPendingMode(null);
    }
  }, [open, isCreating]);

  const trimmedTitle = title.trim();
  const trimmedWalicaUrl = walicaUrl.trim();
  const isWalicaUrlInvalid = trimmedWalicaUrl !== '' && !isValidWalicaUrl(trimmedWalicaUrl);
  const current = STEPS[nav.index];
  const canCreate = trimmedTitle !== '' && !isWalicaUrlInvalid;

  const setDates = (start: Date | null, end: Date | null) => {
    setStartDate(start);
    setEndDate(end);
  };

  const canGoNext =
    current.key !== 'confirm' &&
    !(current.key === 'destination' && !trimmedTitle) &&
    !(current.key === 'notes' && isWalicaUrlInvalid);

  const handleSubmit = async (mode: TripStartMode) => {
    if (!canCreate) return;
    setPendingMode(mode);
    const newTrip = await createTrip({
      title: trimmedTitle,
      detail: detail.trim() || undefined,
      peopleNum: undefined,
      startDate,
      endDate,
      walicaUrl: trimmedWalicaUrl || null,
    });
    setPendingMode(null);
    if (newTrip) {
      onCreated?.(newTrip, mode, trimmedTitle);
      onOpenChange(false);
    }
  };

  // 作成中はダイアログを閉じない
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isCreating) return;
    onOpenChange(nextOpen);
  };

  const notesProps = {
    idPrefix,
    detail,
    onDetailChange: setDetail,
    walicaUrl,
    onWalicaUrlChange: setWalicaUrl,
    isWalicaUrlInvalid,
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={e => {
          e.preventDefault();
          titleInputRef.current?.focus();
        }}
        onInteractOutside={e => {
          if (isCreating) e.preventDefault();
        }}
        onEscapeKeyDown={e => {
          if (isCreating) e.preventDefault();
        }}
        className={STEP_DIALOG_CLASS}
      >
        {/* スマホの上部の空き。あとで何か置く想定 */}
        <div data-slot='add-trip-top' className='min-h-0 flex-1 pt-[env(safe-area-inset-top)] sm:hidden' />
        <StepPanel
          className='sm:flex-1'
          stepCount={STEPS.length}
          index={nav.index}
          direction={nav.direction}
          eyebrow={current.key === 'confirm' ? '最後の確認' : `${nav.index + 1} / ${STEPS.length - 1}`}
          title={current.question}
          hint={current.hint}
          TitleComponent={DialogTitle}
          DescriptionComponent={DialogDescription}
          onBack={nav.index > 0 ? nav.back : undefined}
          onSwipeNext={canGoNext ? nav.next : undefined}
          onSubmit={canGoNext ? nav.next : undefined}
          trailing={
            <DialogClose asChild>
              <Button type='button' variant='ghost' size='icon' aria-label='閉じる' disabled={isCreating}>
                <X className='size-5' />
              </Button>
            </DialogClose>
          }
          footer={
            <>
              {current.key === 'destination' && (
                <Button type='submit' size='lg' className='h-12 sm:h-12' disabled={!trimmedTitle}>
                  次へ
                </Button>
              )}
              {current.key === 'dates' && (
                <>
                  <Button
                    type='button'
                    variant='ghost'
                    size='lg'
                    className='h-12 sm:h-12'
                    onClick={() => {
                      setDates(null, null);
                      nav.next();
                    }}
                  >
                    まだ決まっていない
                  </Button>
                  <Button type='submit' size='lg' className='h-12 sm:h-12' disabled={!startDate}>
                    次へ
                  </Button>
                </>
              )}
              {current.key === 'notes' && (
                <Button type='submit' size='lg' className='h-12 sm:h-12' disabled={isWalicaUrlInvalid}>
                  {detail.trim() || trimmedWalicaUrl ? '次へ' : 'とくにない'}
                </Button>
              )}
              {current.key === 'confirm' && (
                <>
                  <Button
                    type='button'
                    variant='outline'
                    size='lg'
                    className='h-12 sm:h-12'
                    onClick={() => handleSubmit('manual')}
                    disabled={!canCreate || (isCreating && pendingMode !== 'manual')}
                    loading={isCreating && pendingMode === 'manual'}
                  >
                    一から自分で考える
                  </Button>
                  <Button
                    type='button'
                    size='lg'
                    className='h-12 sm:h-12'
                    onClick={() => handleSubmit('ai')}
                    disabled={!canCreate || (isCreating && pendingMode !== 'ai')}
                    loading={isCreating && pendingMode === 'ai'}
                  >
                    <Sparkles />
                    AIといっしょに考える
                  </Button>
                </>
              )}
            </>
          }
        >
          {current.key === 'destination' && (
            <DestinationField id={`${idPrefix}-title`} value={title} onChange={setTitle} inputRef={titleInputRef} />
          )}
          {current.key === 'dates' && <DatesField start={startDate} end={endDate} onChange={setDates} />}
          {current.key === 'notes' && <NotesFields {...notesProps} />}
          {current.key === 'confirm' && (
            <ConfirmStep
              {...notesProps}
              title={title}
              onTitleChange={setTitle}
              start={startDate}
              end={endDate}
              onDatesChange={setDates}
            />
          )}
        </StepPanel>
      </DialogContent>
    </Dialog>
  );
};
