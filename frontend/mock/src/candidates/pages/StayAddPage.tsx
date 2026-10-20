import { StepPanel } from '@mock/stepFlow/StepPanel';
import { StepScreen } from '@mock/stepFlow/StepScreen';
import { SummaryRow } from '@mock/stepFlow/SummaryRow';
import { STEP_PAGE_PANEL_CLASS } from '@mock/stepFlow/stepDialog';
import { useStepNavigation } from '@mock/stepFlow/useStepNavigation';
import { Check, Link2, LoaderCircle, Search, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Trip } from '@/types/trip';
import { formatPrice, MEAL_LABELS, PRICE_UNIT_LABELS, SITE_LABELS } from '../format';
import { previewStayUrl, useCandidateMutations, useCandidates } from '../hooks';
import { candidatePaths } from '../paths';
import { PLACE_POOL } from '../seed';
import type { Meal, ParsedStayUrl, PriceUnit } from '../types';

type ReadStage = 'ogp' | 'render';
type StageState = 'running' | 'done' | 'failed';

const STAGE_LABELS: Record<ReadStage, Record<StageState, string>> = {
  ogp: {
    running: 'ページの情報を確認しています',
    done: 'ページの情報から読み取りました',
    failed: 'ページの情報には宿名がありませんでした',
  },
  render: {
    running: 'ページを開いて、AI が読み取っています',
    done: 'ページを開いて AI が読み取りました',
    failed: 'ページを開いても読み取れませんでした',
  },
};

const isUrl = (text: string) => /^https?:\/\/\S+$/.test(text.trim());

/** 宿名を取れなかった URL に、場所検索で選んだ宿を当てる (モックでは固定の候補) */
const pickLodgingFromSearch = (row: ParsedStayUrl): ParsedStayUrl => {
  const lodging = PLACE_POOL.find(p => p.isLodging);
  if (!lodging) return row;
  return { ...row, status: 'ok', name: lodging.name, pageTitle: '（場所検索で選択）', location: lodging.location };
};

const STEPS = [
  { key: 'url', question: '宿のページの URL は？', hint: '予約サイトでも公式サイトでも大丈夫です' },
  { key: 'price', question: 'いくらだった？', hint: '分からなければ、あとで入れられます' },
  { key: 'memo', question: 'どこが良かった？', hint: 'みんなに伝えたいことを書いておけます' },
  { key: 'confirm', question: 'これでいい？', hint: '行をタップすると、その場で直せます' },
] as const;

/**
 * 仮: 宿のページの URL から候補に追加する画面。
 * 自動で取るのはリンクプレビューと同じ範囲 (宿名・画像) と、宿名から引いた場所だけ。料金・食事・メモは人が入れる
 */
export function StayAddPage({ trip }: { trip: Trip }) {
  const navigate = useNavigate();
  const nav = useStepNavigation(STEPS.length);
  const { stays } = useCandidates(trip.id);
  const { create, update } = useCandidateMutations(trip.id);
  const [url, setUrl] = useState('');
  const [stages, setStages] = useState<Partial<Record<ReadStage, StageState>>>({});
  const loading = Object.values(stages).includes('running');
  const [preview, setPreview] = useState<ParsedStayUrl | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [priceUnit, setPriceUnit] = useState<PriceUnit>('person');
  const [meal, setMeal] = useState<Meal | null>(null);
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const current = STEPS[nav.index];
  const backTo = candidatePaths.candidates(trip.urlId, 'stays');
  const located = preview?.location != null;
  const canSubmit = name.trim() !== '' && located;

  /** OGP で読めなければページを開いて AI で読む。どちらでも読めなければ、宿名と場所を入れてもらう */
  const read = async () => {
    if (!isUrl(url) || loading) return;
    const target = url.trim();
    setStages({ ogp: 'running' });
    let row = await previewStayUrl(trip.id, target, 'ogp');
    if (row.status === 'failed') {
      setStages({ ogp: 'failed', render: 'running' });
      row = await previewStayUrl(trip.id, target, 'render');
      setStages({ ogp: 'failed', render: row.status === 'failed' ? 'failed' : 'done' });
    } else {
      setStages({ ogp: 'done' });
    }
    setPreview(row);
    setName(row.name ?? '');
    // 読めた段階を一瞬見せてから進む
    setTimeout(() => {
      setStages({});
      nav.next();
    }, 600);
  };

  const pickPlace = () => {
    if (!preview) return;
    const picked = pickLodgingFromSearch(preview);
    setPreview(picked);
    if (!name.trim()) setName(picked.name ?? '');
  };

  const submit = async () => {
    if (!(preview && canSubmit)) return;
    setSubmitting(true);
    try {
      const link = { site: preview.site, url: preview.url, price: price ? Number(price) : null, priceUnit, meal };
      const target = preview.status === 'duplicate' ? stays.find(s => s.id === preview.duplicateOf) : undefined;
      if (target) {
        await update(target.id, {
          links: [...target.links.filter(l => l.site !== link.site), link],
          memo: memo.trim() ? [target.memo, memo.trim()].filter(Boolean).join('\n') : target.memo,
        });
        toast.success(`「${target.name}」に${SITE_LABELS[link.site]}の情報を足しました`);
      } else if (preview.location) {
        await create({
          kind: 'stay',
          name: name.trim(),
          category: '宿',
          location: preview.location,
          nights: [1],
          links: [link],
          memo: memo.trim(),
        });
        toast.success(`「${name.trim()}」を宿の候補に追加しました`);
      }
      navigate(backTo);
    } finally {
      setSubmitting(false);
    }
  };

  const priceFields = (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-1.5'>
        <Label htmlFor='stay-price' className='text-12px'>
          1 泊の料金（円）
        </Label>
        <div className='flex gap-2'>
          <Input
            id='stay-price'
            inputMode='numeric'
            placeholder='例: 18500'
            value={price}
            onChange={e => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
            className='flex-1'
          />
          <Tabs value={priceUnit} onValueChange={v => setPriceUnit(v as PriceUnit)}>
            <TabsList className='h-9'>
              {(Object.keys(PRICE_UNIT_LABELS) as PriceUnit[]).map(u => (
                <TabsTrigger key={u} value={u} className='px-3'>
                  {PRICE_UNIT_LABELS[u]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>
      <div className='flex flex-col gap-1.5'>
        <span className='font-medium text-12px'>食事</span>
        <Tabs value={meal ?? ''} onValueChange={v => setMeal(v as Meal)}>
          <TabsList className='w-full'>
            {(Object.keys(MEAL_LABELS) as Meal[]).map(m => (
              <TabsTrigger key={m} value={m}>
                {MEAL_LABELS[m]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );

  const memoField = (
    <Textarea
      aria-label='メモ'
      rows={4}
      placeholder='例: 部屋に露天風呂あり。湖が見える部屋は +¥2,000'
      value={memo}
      onChange={e => setMemo(e.target.value)}
    />
  );

  const priceSummary = price
    ? `${PRICE_UNIT_LABELS[priceUnit]} ${formatPrice(Number(price))}${meal ? ` ・ ${MEAL_LABELS[meal]}` : ''}`
    : meal
      ? MEAL_LABELS[meal]
      : '未入力';

  return (
    <StepScreen
      top={
        preview && nav.index > 0 ? (
          <div className='flex w-full max-w-sm items-center gap-3 rounded-xl bg-white p-2.5 shadow-sm'>
            <div className='flex size-14 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-[9px] text-slate-500'>
              [OGP]
            </div>
            <div className='flex min-w-0 flex-col'>
              <span className={cn('truncate font-bold text-14px', !name && 'text-neutral-400')}>
                {name || '宿名を読み取れませんでした'}
              </span>
              {preview.source === 'rendered' && (
                <span className='flex items-center gap-1 text-10px text-violet-700'>
                  <Sparkles className='size-3' />
                  AI がページから読み取りました。違っていたら直してください
                </span>
              )}
              <span className='truncate text-12px text-neutral-500'>
                {SITE_LABELS[preview.site]} ・ {preview.location?.address ?? '場所はまだ選んでいません'}
              </span>
            </div>
          </div>
        ) : (
          <span className='inline-flex size-16 items-center justify-center rounded-full bg-white text-primary shadow-sm'>
            <Link2 className='size-7' />
          </span>
        )
      }
    >
      <StepPanel
        className={STEP_PAGE_PANEL_CLASS}
        stepCount={STEPS.length}
        index={nav.index}
        direction={nav.direction}
        eyebrow={current.key === 'confirm' ? '最後の確認' : `${nav.index + 1} / ${STEPS.length - 1}`}
        title={current.question}
        hint={current.hint}
        onBack={nav.index > 0 ? nav.back : undefined}
        onSwipeNext={current.key !== 'url' && current.key !== 'confirm' ? nav.next : undefined}
        onSubmit={current.key === 'url' ? read : current.key === 'confirm' ? submit : nav.next}
        trailing={
          <Button asChild variant='ghost' size='icon' aria-label='閉じる'>
            <Link to={backTo}>
              <X className='size-5' />
            </Link>
          </Button>
        }
        footer={
          <>
            {current.key === 'url' && (
              <Button type='submit' size='lg' className='h-12 sm:h-12' disabled={!isUrl(url)} loading={loading}>
                読み込む
              </Button>
            )}
            {current.key === 'price' && (
              <Button type='submit' size='lg' className='h-12 sm:h-12'>
                {price || meal ? '次へ' : 'あとで入れる'}
              </Button>
            )}
            {current.key === 'memo' && (
              <Button type='submit' size='lg' className='h-12 sm:h-12'>
                {memo.trim() ? '次へ' : 'とくにない'}
              </Button>
            )}
            {current.key === 'confirm' && (
              <Button type='submit' size='lg' className='h-12 sm:h-12' loading={submitting} disabled={!canSubmit}>
                {preview?.status === 'duplicate' ? '候補にある宿に情報を足す' : '宿の候補に追加'}
              </Button>
            )}
          </>
        }
      >
        {current.key === 'url' && (
          <div className='flex flex-col gap-2'>
            <Input
              aria-label='宿のページの URL'
              inputMode='url'
              placeholder='https://'
              value={url}
              disabled={loading}
              onChange={e => setUrl(e.target.value)}
              className='h-12 text-14px'
            />
            {Object.keys(stages).length > 0 ? (
              <ol className='flex flex-col gap-2 pt-1' aria-live='polite'>
                {(['ogp', 'render'] as const).map(stage => {
                  const state = stages[stage];
                  if (!state) return null;
                  return (
                    <li key={stage} className='fade-in-0 flex animate-in items-center gap-2 text-14px'>
                      {state === 'running' ? (
                        <LoaderCircle
                          className={cn('size-4 animate-spin', stage === 'render' ? 'text-violet-600' : 'text-primary')}
                        />
                      ) : state === 'done' ? (
                        <Check className='size-4 text-teal-600' strokeWidth={3} />
                      ) : (
                        <X className='size-4 text-neutral-400' />
                      )}
                      <span className={state === 'running' ? 'font-medium text-gray-900' : 'text-neutral-500'}>
                        {STAGE_LABELS[stage][state]}
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <span className='text-12px text-neutral-500 leading-relaxed'>
                宿名と写真を読み込みます。料金はページから取れないことが多いので、次の画面で入れてください。
              </span>
            )}
          </div>
        )}

        {current.key === 'price' && priceFields}
        {current.key === 'memo' && memoField}

        {current.key === 'confirm' && preview && (
          <div className='flex flex-col gap-3'>
            {preview.status === 'duplicate' && (
              <p className='text-12px text-neutral-600 leading-relaxed'>
                この宿はもう候補にあります。{SITE_LABELS[preview.site]}のリンクと料金・メモを、その宿に足します。
              </p>
            )}
            <Accordion
              type='single'
              collapsible
              defaultValue={canSubmit ? undefined : 'name'}
              className='rounded-lg border px-3'
            >
              <AccordionItem value='name'>
                <AccordionTrigger className='min-w-0 items-center py-3.5 hover:no-underline'>
                  <SummaryRow
                    label='宿'
                    value={name.trim() || '入力してください'}
                    empty={!name.trim()}
                    invalid={!name.trim()}
                    mark={
                      preview.source === 'rendered' && name.trim() ? (
                        <Sparkles
                          aria-label='AI が読み取り'
                          className='size-3.5 shrink-0 self-center text-violet-600'
                        />
                      ) : null
                    }
                  />
                </AccordionTrigger>
                <AccordionContent>
                  <Input aria-label='宿名' value={name} onChange={e => setName(e.target.value)} />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value='place'>
                <AccordionTrigger className='min-w-0 items-center py-3.5 hover:no-underline'>
                  <SummaryRow
                    label='場所'
                    value={preview.location?.address ?? '選んでください'}
                    empty={!located}
                    invalid={!located}
                  />
                </AccordionTrigger>
                <AccordionContent>
                  <Button type='button' variant='outline' className='w-full' onClick={pickPlace}>
                    <Search />
                    {located ? '違う場合は検索して選び直す' : '場所を検索して選ぶ'}
                  </Button>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value='price'>
                <AccordionTrigger className='min-w-0 items-center py-3.5 hover:no-underline'>
                  <SummaryRow label='料金' value={priceSummary} empty={!(price || meal)} />
                </AccordionTrigger>
                <AccordionContent>{priceFields}</AccordionContent>
              </AccordionItem>
              <AccordionItem value='memo'>
                <AccordionTrigger className='min-w-0 items-center py-3.5 hover:no-underline'>
                  <SummaryRow label='メモ' value={memo.trim() || 'なし'} empty={!memo.trim()} />
                </AccordionTrigger>
                <AccordionContent>{memoField}</AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </StepPanel>
    </StepScreen>
  );
}
