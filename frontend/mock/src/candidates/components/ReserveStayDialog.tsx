import { StepPanel } from '@mock/stepFlow/StepPanel';
import { SummaryRow } from '@mock/stepFlow/SummaryRow';
import { STEP_DIALOG_CLASS } from '@mock/stepFlow/stepDialog';
import { useStepNavigation } from '@mock/stepFlow/useStepNavigation';
import { Camera, Check, ClipboardPaste, ImageIcon, Sparkles, X } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { formatPrice, MEAL_LABELS, SITE_LABELS } from '../format';
import { runWithTasks } from '../generating';
import { extractReservation } from '../hooks';
import { SAMPLE_RESERVATION_MAIL } from '../seed';
import type { BookingSite, ExtractedReservation, Meal, StayCandidate } from '../types';
import { AiOrb } from './AiOrb';
import { GeneratingView } from './GeneratingView';

export type ReserveInput = {
  site: BookingSite;
  price: number | null;
  meal: Meal | null;
  checkIn: string;
  checkOut: string;
  memo: string;
};

type Field = 'site' | 'price' | 'meal' | 'time' | 'memo';

interface ReserveStayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stay: StayCandidate;
  night: number;
  onSubmit: (input: ReserveInput) => void;
}

const ALL_SITES: BookingSite[] = ['jalan', 'rakuten', 'booking', 'official'];

const STEPS = [
  { key: 'site', question: 'どこで予約した？', hint: 'メンバー全員に「予約済み」と表示されます' },
  { key: 'price', question: '料金と食事は？', hint: '分かる範囲で大丈夫です' },
  { key: 'time', question: 'チェックインは？', hint: '編集画面でブロックにするときの開始時刻になります' },
  { key: 'confirm', question: 'これでいい？', hint: '行をタップすると、その場で直せます' },
] as const;

const AI_TASKS = [
  '文面から予約サイトを見分ける',
  '料金を 1 人 1 泊あたりに直す',
  'プラン名から食事を読み取る',
  'チェックイン・アウトの時刻を確認',
];

/** AI が入れた値の印 */
const aiMark = <Sparkles aria-label='AI が入力' className='size-3.5 shrink-0 self-center text-violet-600' />;

/**
 * 仮: 宿を「予約済み」にする。1 問ずつ聞き、予約メールを貼れば AI がまとめて埋めて確認まで飛ぶ。
 * スマホは全画面、sm 以上は中央のダイアログ
 */
export function ReserveStayDialog({ open, onOpenChange, stay, night, onSubmit }: ReserveStayDialogProps) {
  const nav = useStepNavigation(STEPS.length);
  const [site, setSite] = useState<BookingSite | null>(null);
  const [price, setPrice] = useState('');
  const [meal, setMeal] = useState<Meal | null>(null);
  const [checkIn, setCheckIn] = useState('15:00');
  const [checkOut, setCheckOut] = useState('10:00');
  const [memo, setMemo] = useState('');
  const [aiFilled, setAiFilled] = useState<Field[]>([]);
  const [mode, setMode] = useState<'steps' | 'ai-input' | 'ai-reading'>('steps');
  const [aiText, setAiText] = useState('');
  const [aiDone, setAiDone] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: nav.reset は毎回作られるため依存に入れない
  useEffect(() => {
    if (!open) return;
    nav.reset();
    setSite(null);
    setPrice('');
    setMeal(null);
    setCheckIn(stay.checkIn ?? '15:00');
    setCheckOut(stay.checkOut ?? '10:00');
    setMemo('');
    setAiFilled([]);
    setMode('steps');
  }, [open, stay]);

  const current = STEPS[nav.index];
  const sites = [...stay.links.map(l => l.site), ...ALL_SITES.filter(s => !stay.links.some(l => l.site === s))];
  const canGoNext = current.key !== 'confirm' && !(current.key === 'site' && !site);
  const markOf = (f: Field): ReactNode => (aiFilled.includes(f) ? aiMark : null);

  /** 入力済みの値は変えず、空欄だけを埋める */
  const applyAi = (r: ExtractedReservation) => {
    const filled: Field[] = [];
    if (!site && r.site) {
      setSite(r.site);
      filled.push('site');
    }
    if (!price && r.price != null) {
      setPrice(String(r.price));
      filled.push('price');
    }
    if (!meal && r.meal) {
      setMeal(r.meal);
      filled.push('meal');
    }
    if (r.checkIn || r.checkOut) {
      if (r.checkIn) setCheckIn(r.checkIn);
      if (r.checkOut) setCheckOut(r.checkOut);
      filled.push('time');
    }
    if (!memo && r.memo) {
      setMemo(r.memo);
      filled.push('memo');
    }
    setAiFilled(filled);
  };

  const readWithAi = async () => {
    setAiDone(0);
    setMode('ai-reading');
    const result = await runWithTasks(AI_TASKS.length, setAiDone, extractReservation(aiText));
    applyAi(result);
    setMode('steps');
    nav.goTo(STEPS.length - 1);
  };

  const submit = () => {
    if (!site) return;
    onSubmit({ site, price: price ? Number(price) : null, meal, checkIn, checkOut, memo });
  };

  const siteOptions = (
    <div className='flex flex-col gap-2'>
      {sites.map(s => {
        const link = stay.links.find(l => l.site === s);
        return (
          <Button
            key={s}
            type='button'
            variant='outline'
            aria-pressed={site === s}
            onClick={() => setSite(s)}
            className={cn(
              'h-12 justify-between rounded-lg px-4 font-normal sm:h-12',
              site === s && 'border-primary bg-teal-50 hover:bg-teal-50'
            )}
          >
            <span className='flex items-baseline gap-2'>
              <span className='font-medium text-14px'>{SITE_LABELS[s]}</span>
              {link?.price != null && (
                <span className='text-12px text-neutral-500'>
                  {formatPrice(link.price)}
                  {link.meal && ` ・ ${MEAL_LABELS[link.meal]}`}
                </span>
              )}
            </span>
            {site === s && <Check className='size-4 text-primary' />}
          </Button>
        );
      })}
    </div>
  );

  const priceInput = (
    <div className='flex flex-col gap-1.5'>
      <Label htmlFor='reserve-price' className='text-12px'>
        1 人 1 泊あたり（円）
      </Label>
      <Input
        id='reserve-price'
        inputMode='numeric'
        placeholder='例: 18500'
        value={price}
        onChange={e => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
      />
    </div>
  );

  const mealTabs = (
    <Tabs value={meal ?? ''} onValueChange={v => setMeal(v as Meal)}>
      <TabsList className='w-full'>
        {(Object.keys(MEAL_LABELS) as Meal[]).map(m => (
          <TabsTrigger key={m} value={m}>
            {MEAL_LABELS[m]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );

  const timeInputs = (
    <div className='grid grid-cols-2 gap-3'>
      <div className='flex flex-col gap-1.5'>
        <Label htmlFor='reserve-in' className='text-12px'>
          チェックイン
        </Label>
        <Input id='reserve-in' type='time' value={checkIn} onChange={e => setCheckIn(e.target.value)} />
      </div>
      <div className='flex flex-col gap-1.5'>
        <Label htmlFor='reserve-out' className='text-12px'>
          チェックアウト
        </Label>
        <Input id='reserve-out' type='time' value={checkOut} onChange={e => setCheckOut(e.target.value)} />
      </div>
    </div>
  );

  const memoInput = (
    <Input
      aria-label='メモ'
      placeholder='例: 駐車場は着いたら電話する'
      value={memo}
      onChange={e => setMemo(e.target.value)}
    />
  );

  const closeButton = (
    <DialogClose asChild>
      <Button type='button' variant='ghost' size='icon' aria-label='閉じる'>
        <X className='size-5' />
      </Button>
    </DialogClose>
  );

  const body = (() => {
    if (mode === 'ai-reading') {
      return (
        <div className='flex min-h-0 flex-1 flex-col bg-linear-to-b from-violet-50 to-teal-50'>
          <DialogTitle className='sr-only'>予約メールを読み取っています</DialogTitle>
          <DialogDescription className='sr-only'>読み取れたら、確認の画面に進みます</DialogDescription>
          <GeneratingView
            tasks={AI_TASKS}
            doneCount={aiDone}
            title='予約メールを読み取っています'
            subtitle='空欄だけを埋めます'
          />
        </div>
      );
    }

    if (mode === 'ai-input') {
      return (
        <>
          <div className='flex min-h-0 flex-1 items-center justify-center sm:hidden'>
            <AiOrb size={72} />
          </div>
          <StepPanel
            className='sm:flex-1'
            stepCount={1}
            index={0}
            direction='forward'
            eyebrow='AI で入力'
            title='予約メールを貼ろう'
            hint='スクショや文面から、空欄をまとめて埋めます'
            TitleComponent={DialogTitle}
            DescriptionComponent={DialogDescription}
            onBack={() => setMode('steps')}
            onSubmit={aiText.trim() ? readWithAi : undefined}
            trailing={closeButton}
            footer={
              <Button type='submit' size='lg' className='h-12 sm:h-12' disabled={!aiText.trim()}>
                <Sparkles />
                読み取る
              </Button>
            }
          >
            <div className='flex gap-2'>
              {[
                { icon: <ImageIcon />, label: '画像' },
                { icon: <Camera />, label: '撮影' },
                { icon: <ClipboardPaste />, label: 'ペースト' },
              ].map(b => (
                <Button
                  key={b.label}
                  type='button'
                  variant='outline'
                  className='flex-1'
                  onClick={() => setAiText(SAMPLE_RESERVATION_MAIL)}
                >
                  {b.icon}
                  {b.label}
                </Button>
              ))}
            </div>
            <Textarea
              rows={7}
              aria-label='予約メールの文面'
              placeholder='予約確認メールの文面を貼り付け'
              value={aiText}
              onChange={e => setAiText(e.target.value)}
              className='text-12px'
            />
            <span className='text-12px text-neutral-500'>画像と文面は読み取りにだけ使い、保存しません</span>
          </StepPanel>
        </>
      );
    }

    return (
      <>
        <div className='flex min-h-0 flex-1 flex-col items-center justify-center gap-1 px-6 pt-[env(safe-area-inset-top)] text-center sm:hidden'>
          <span className='text-12px text-neutral-500'>{night}泊目の宿</span>
          <span className='font-bold text-18px text-gray-800'>{stay.name}</span>
        </div>
        <StepPanel
          className='sm:flex-1'
          stepCount={STEPS.length}
          index={nav.index}
          direction={nav.direction}
          eyebrow={current.key === 'confirm' ? '最後の確認' : `${nav.index + 1} / ${STEPS.length - 1}`}
          title={current.question}
          hint={
            current.key === 'confirm' && aiFilled.length > 0 ? (
              <>
                <Sparkles className='mr-0.5 inline size-3.5 align-[-2px] text-violet-600' />
                の行は AI が入れた値です。合っているか確認してください
              </>
            ) : (
              current.hint
            )
          }
          TitleComponent={DialogTitle}
          DescriptionComponent={DialogDescription}
          onBack={nav.index > 0 ? nav.back : undefined}
          onSwipeNext={canGoNext ? nav.next : undefined}
          onSubmit={canGoNext ? nav.next : current.key === 'confirm' ? submit : undefined}
          trailing={closeButton}
          footer={
            <>
              {current.key === 'site' && (
                <Button
                  type='button'
                  variant='outline'
                  size='lg'
                  className='h-12 sm:h-12'
                  onClick={() => {
                    // モックではクリップボードの代わりにサンプルの予約メールを入れる
                    setAiText(SAMPLE_RESERVATION_MAIL);
                    setMode('ai-input');
                  }}
                >
                  <Sparkles className='text-violet-600' />
                  予約メールからまとめて入力
                </Button>
              )}
              {current.key === 'price' && (
                <Button type='submit' size='lg' className='h-12 sm:h-12'>
                  {price || meal ? '次へ' : 'あとで入れる'}
                </Button>
              )}
              {(current.key === 'site' || current.key === 'time') && (
                <Button type='submit' size='lg' className='h-12 sm:h-12' disabled={!canGoNext}>
                  次へ
                </Button>
              )}
              {current.key === 'confirm' && (
                <Button type='submit' size='lg' className='h-12 sm:h-12' disabled={!site}>
                  予約済みにする
                </Button>
              )}
            </>
          }
        >
          {current.key === 'site' && siteOptions}
          {current.key === 'price' && (
            <div className='flex flex-col gap-4'>
              {priceInput}
              <div className='flex flex-col gap-1.5'>
                <span className='font-medium text-12px'>食事</span>
                {mealTabs}
              </div>
            </div>
          )}
          {current.key === 'time' && (
            <div className='flex flex-col gap-4'>
              {timeInputs}
              <div className='flex flex-col gap-1.5'>
                <span className='font-medium text-12px'>メモ（任意）</span>
                {memoInput}
              </div>
            </div>
          )}
          {current.key === 'confirm' && (
            <Accordion type='single' collapsible className='rounded-lg border px-3'>
              <AccordionItem value='site'>
                <AccordionTrigger className='min-w-0 items-center py-3.5 hover:no-underline'>
                  <SummaryRow
                    label='予約サイト'
                    value={site ? SITE_LABELS[site] : '選んでください'}
                    empty={!site}
                    invalid={!site}
                    mark={markOf('site')}
                  />
                </AccordionTrigger>
                <AccordionContent>{siteOptions}</AccordionContent>
              </AccordionItem>
              <AccordionItem value='price'>
                <AccordionTrigger className='min-w-0 items-center py-3.5 hover:no-underline'>
                  <SummaryRow
                    label='料金'
                    value={price ? `1人 ${formatPrice(Number(price))}` : '未入力'}
                    empty={!price}
                    mark={markOf('price')}
                  />
                </AccordionTrigger>
                <AccordionContent>{priceInput}</AccordionContent>
              </AccordionItem>
              <AccordionItem value='meal'>
                <AccordionTrigger className='min-w-0 items-center py-3.5 hover:no-underline'>
                  <SummaryRow
                    label='食事'
                    value={meal ? MEAL_LABELS[meal] : '未入力'}
                    empty={!meal}
                    mark={markOf('meal')}
                  />
                </AccordionTrigger>
                <AccordionContent>{mealTabs}</AccordionContent>
              </AccordionItem>
              <AccordionItem value='time'>
                <AccordionTrigger className='min-w-0 items-center py-3.5 hover:no-underline'>
                  <SummaryRow
                    label='時刻'
                    value={`IN ${checkIn} ・ OUT ${checkOut}`}
                    empty={false}
                    mark={markOf('time')}
                  />
                </AccordionTrigger>
                <AccordionContent>{timeInputs}</AccordionContent>
              </AccordionItem>
              <AccordionItem value='memo'>
                <AccordionTrigger className='min-w-0 items-center py-3.5 hover:no-underline'>
                  <SummaryRow label='メモ' value={memo || 'なし'} empty={!memo} mark={markOf('memo')} />
                </AccordionTrigger>
                <AccordionContent>{memoInput}</AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </StepPanel>
      </>
    );
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className={STEP_DIALOG_CLASS}>
        {body}
      </DialogContent>
    </Dialog>
  );
}
