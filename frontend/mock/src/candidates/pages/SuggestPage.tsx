import { Slider } from '@mock/components/ui/slider';
import { useTripPlanningSummaries } from '@mock/home/hooks';
import { StepPanel } from '@mock/stepFlow/StepPanel';
import { STEP_PAGE_PANEL_CLASS } from '@mock/stepFlow/stepDialog';
import { useStepNavigation } from '@mock/stepFlow/useStepNavigation';
import { Sparkles, Undo2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { TransportationIcon } from '@/components/blocks/TransportationIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePages } from '@/hooks/usePages';
import { formatDateMDWithDow } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { Trip } from '@/types/trip';
import { AiOrb } from '../components/AiOrb';
import { CategoryThumb } from '../components/CategoryThumb';
import { GeneratingView } from '../components/GeneratingView';
import { RotatingPhrase } from '../components/RotatingPhrase';
import { SubPageHeader } from '../components/SubPageHeader';
import { Typewriter } from '../components/Typewriter';
import { formatDuration, formatPrice } from '../format';
import { dismissSuggestion, requestSuggestions, useCandidateMutations, useCandidates } from '../hooks';
import { candidatePaths } from '../paths';
import type { Suggestion, SuggestRequest } from '../types';

/** やりたいことの選択肢。よく選ばれそうなものを先頭に置く */
const WISHES = [
  '温泉',
  'グルメ',
  '景色',
  '食べ歩き',
  'カフェ',
  '寺社',
  '自然・ハイキング',
  '体験・ものづくり',
  '美術館・博物館',
  '歴史・街並み',
  '買い物・お土産',
  '地元の市場',
  'アクティビティ',
  '夜景',
  '写真映え',
  'のんびり',
  '子どもと楽しむ',
  '動物とふれあう',
  'ペットと一緒',
  '雨でもOK',
];
const TRANSPORT_LABELS: Record<SuggestRequest['transport'], string> = {
  car: '車',
  train: '公共交通機関',
  walk: '徒歩',
};

/** 予算スライダー。右端は「上限なし」 */
const BUDGET_MAX = 50000;
const BUDGET_STEP = 1000;

const ALL_STEPS = [
  { key: 'where', question: 'どのあたりを回る？', hint: 'エリアと移動手段から、寄れる範囲を考えます' },
  { key: 'when', question: 'いつ行く？', hint: '空き時間を指定すると、前後の予定から寄れる所を探します' },
  { key: 'what', question: '何がしたい？', hint: 'いくつ選んでも大丈夫です' },
] as const;

/** 「いつ行く？」は前後の予定から寄れる所を探すための質問なので、旅程にブロックが 1 つも無ければ聞かない */
const stepsFor = (hasItinerary: boolean) => ALL_STEPS.filter(s => hasItinerary || s.key !== 'when');

type FormState = {
  area: string;
  transport: SuggestRequest['transport'];
  whenType: 'any' | 'slot';
  pageId: number | null;
  start: string;
  end: string;
  /** スライダーの値。BUDGET_MAX は上限なし */
  budget: number;
  wishes: string[];
  freeText: string;
};

const DEFAULT_FORM: FormState = {
  area: '箱根・強羅周辺',
  transport: 'car',
  whenType: 'slot',
  pageId: null,
  start: '13:00',
  end: '15:00',
  budget: 5000,
  wishes: ['温泉', '景色'],
  freeText: '海が見える場所も 1 つ入れてほしい',
};

const storageKey = (tripId: number) => `mock-suggest-form-v2-${tripId}`;

const loadForm = (tripId: number): FormState | null => {
  try {
    const raw = localStorage.getItem(storageKey(tripId));
    return raw ? (JSON.parse(raw) as FormState) : null;
  } catch {
    return null;
  }
};

const budgetLabel = (budget: number): string =>
  budget >= BUDGET_MAX ? '上限なし' : budget === 0 ? '無料の所だけ' : `1人 ${formatPrice(budget)} くらいまで`;

/** 生成中に流す「AI がやっていること」。少しずつ進んで見えるよう、条件から文言を組み立てる */
const buildTasks = (form: FormState, slotLabel: string | null, stockCount: number, hasItinerary: boolean): string[] => [
  !hasItinerary
    ? '旅程はまだ空なので、エリア全体から探す準備'
    : slotLabel
      ? `今の旅程を読み込み（${slotLabel} の空き）`
      : '今の旅程を読み込み',
  `ストック済みの ${stockCount} 件と重ならないように整理`,
  `${form.area}で「${form.wishes.join('」「') || 'おすすめ'}」に合う所を探索`,
  'Google マップで場所と営業時間を確認',
  'おすすめの理由をまとめています',
];

const TASK_INTERVAL_MS = 650;
const REVEAL_INTERVAL_MS = 500;

type Phase = 'steps' | 'generating' | 'result';

/** 仮: 条件を 3 ステップで聞いて、AI に行きたい所を提案してもらう画面 */
export function SuggestPage({ trip }: { trip: Trip }) {
  const [params] = useSearchParams();
  const { pages } = usePages(trip.id);
  const { spots } = useCandidates(trip.id);
  const { create } = useCandidateMutations(trip.id);
  const navigate = useNavigate();
  const { summaryOf, isLoading: isSummaryLoading } = useTripPlanningSummaries();
  const hasItinerary = summaryOf(trip.id)?.hasItinerary ?? false;
  const STEPS = stepsFor(hasItinerary);
  const nav = useStepNavigation(STEPS.length);

  const saved = loadForm(trip.id);
  // 旅の作成直後は、入力した旅行先をエリアに入れて開く
  const areaFromCreate = params.get('area');
  const [form, setForm] = useState<FormState>(() =>
    areaFromCreate ? { ...DEFAULT_FORM, area: areaFromCreate } : (saved ?? DEFAULT_FORM)
  );
  const [phase, setPhase] = useState<Phase>('steps');
  const [tasks, setTasks] = useState<string[]>([]);
  const [doneCount, setDoneCount] = useState(0);
  const [result, setResult] = useState<{ excludedCount: number; suggestions: Suggestion[] } | null>(null);
  const [revealed, setRevealed] = useState(0);
  // 「いらない」を選んだ提案。条件を変えて探し直しても、同じ提案には印を残す
  const [excluded, setExcluded] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(f => ({ ...f, [key]: value }));
  const pageId = form.pageId ?? pages?.[0]?.id ?? null;
  const selectedPage = pages?.find(p => p.id === pageId);
  // 「いつ行く？」を聞かないときは、日時を決めずに探す
  const whenType = hasItinerary ? form.whenType : 'any';
  const slotLabel = whenType === 'slot' && selectedPage ? `${selectedPage.title} ${form.start}–${form.end}` : null;
  const current = STEPS[nav.index];
  const canGoNext = !(current.key === 'where' && !form.area.trim());

  const run = async () => {
    try {
      localStorage.setItem(storageKey(trip.id), JSON.stringify(form));
    } catch {
      // 保存できなくても提案は続ける
    }
    const taskList = buildTasks(form, slotLabel, spots.length, hasItinerary);
    setTasks(taskList);
    setDoneCount(0);
    setRevealed(0);
    setPhase('generating');

    // AI の処理段階を順に進めて見せる。実際の待ち時間は API 側の遅延に任せる
    const progress = new Promise<void>(resolve => {
      taskList.forEach((_, i) => {
        timersRef.current.push(
          setTimeout(
            () => {
              setDoneCount(i + 1);
              if (i === taskList.length - 1) resolve();
            },
            TASK_INTERVAL_MS * (i + 1)
          )
        );
      });
    });
    const req: SuggestRequest = {
      area: form.area,
      transport: form.transport,
      when:
        whenType === 'slot' && pageId ? { type: 'slot', pageId, start: form.start, end: form.end } : { type: 'any' },
      budgetPerPerson: form.budget >= BUDGET_MAX ? null : form.budget,
      wishes: form.wishes,
      freeText: form.freeText,
    };
    const [response] = await Promise.all([requestSuggestions(trip.id, req), progress]);
    setResult(response);
    setPhase('result');
    // 見つかった順に 1 件ずつ出す
    response.suggestions.forEach((_, i) => {
      timersRef.current.push(setTimeout(() => setRevealed(i + 1), REVEAL_INTERVAL_MS * i));
    });
  };

  const toggleExcluded = (key: string) =>
    setExcluded(ex => (ex.includes(key) ? ex.filter(k => k !== key) : [...ex, key]));

  /** 「いらない」以外をまとめてストックし、「いらない」は今後この旅程では提案しない */
  const saveAll = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const keep = result.suggestions.filter(s => !excluded.includes(s.key));
      for (const s of keep) {
        await create({
          kind: 'spot',
          name: s.name,
          category: s.category,
          rating: s.rating,
          location: s.location,
          durationMin: s.durationMin,
          hours: s.hours,
          reason: s.reason,
          tags: s.tags,
          source: { type: 'ai', basis: form.wishes.length > 0 ? `自分の「${form.wishes[0]}」から` : null },
        });
      }
      for (const s of result.suggestions.filter(s => excluded.includes(s.key))) {
        await dismissSuggestion(trip.id, s.key);
      }
      toast.success(keep.length > 0 ? `${keep.length} か所をストックしました` : '今回の提案は見送りました');
      navigate(candidatePaths.candidates(trip.urlId));
    } finally {
      setSaving(false);
    }
  };

  if (phase === 'generating') {
    return (
      <div className='flex h-dvh w-full flex-col bg-linear-to-b from-violet-50 to-teal-50'>
        <GeneratingView tasks={tasks} doneCount={doneCount} />
      </div>
    );
  }

  if (phase === 'result' && result) {
    const shown = result.suggestions.slice(0, revealed);
    const writing = revealed < result.suggestions.length;
    const keepCount = result.suggestions.filter(s => !excluded.includes(s.key)).length;
    const conditions = [
      form.area,
      TRANSPORT_LABELS[form.transport],
      slotLabel ?? 'いつでも',
      budgetLabel(form.budget),
      form.wishes.join(' / '),
      form.freeText,
    ].filter(Boolean);

    return (
      <div className='relative flex h-dvh w-full flex-col'>
        <SubPageHeader
          backTo={candidatePaths.candidates(trip.urlId)}
          backLabel='候補に戻る'
          title={
            <span className='flex items-center gap-1.5'>
              <Sparkles className='size-4 text-violet-600' />
              {writing ? (
                <span className='font-normal text-neutral-500'>提案を書いています…</span>
              ) : (
                `${result.suggestions.length} か所を見つけました`
              )}
            </span>
          }
          right={
            <Button
              variant='ghost'
              size='sm'
              className='font-normal text-neutral-600'
              onClick={() => {
                nav.reset();
                setPhase('steps');
              }}
            >
              条件を変える
            </Button>
          }
        />
        <div className='flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-3 pb-4'>
          {/* 条件は見たいときに見られれば十分なので、薄くして一覧と間をあける */}
          <section aria-label='探した条件' className='flex flex-col gap-0.5 pb-6 text-12px text-neutral-400'>
            <span className='text-10px'>この条件で探しました</span>
            <span className='leading-relaxed'>{conditions.join(' ・ ')}</span>
            {result.excludedCount > 0 && (
              <span className='text-10px'>
                Google マップで場所を確認できなかった {result.excludedCount} 件は除いています
              </span>
            )}
          </section>
          <p className='pb-2.5 text-14px text-neutral-700'>
            いらない所だけ外してください。残りはまとめてストックに入れます
          </p>
          <div className='flex flex-col gap-2.5'>
            {shown.map(s => {
              const isExcluded = excluded.includes(s.key);
              return (
                <article
                  key={s.key}
                  className={cn(
                    'fade-in-0 slide-in-from-bottom-3 flex animate-in flex-col gap-2 rounded-xl border bg-white p-3 transition-opacity duration-500',
                    isExcluded ? 'border-dashed opacity-50' : 'border-violet-100'
                  )}
                >
                  <div className='flex gap-2.5'>
                    <CategoryThumb category={s.category} size='sm' className='size-14' />
                    <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                      <span className='flex min-w-0 items-baseline gap-2'>
                        <span className={cn('truncate font-bold text-14px', isExcluded && 'line-through')}>
                          {s.name}
                        </span>
                        <span className='shrink-0 text-10px text-neutral-500'>{s.category}</span>
                      </span>
                      <span className='text-12px text-neutral-700 tabular-nums'>
                        ★{s.rating} ・ 滞在 {formatDuration(s.durationMin)} ・ {s.hoursLabel} ・ {s.distanceLabel}
                      </span>
                    </div>
                    <Button
                      variant={isExcluded ? 'outline' : 'ghost'}
                      size='sm'
                      aria-pressed={isExcluded}
                      onClick={() => toggleExcluded(s.key)}
                      className='shrink-0 self-start text-neutral-600'
                    >
                      {isExcluded ? (
                        <>
                          <Undo2 />
                          戻す
                        </>
                      ) : (
                        <>
                          <X />
                          いらない
                        </>
                      )}
                    </Button>
                  </div>
                  {!isExcluded && <Typewriter text={s.reason} className='text-12px text-neutral-600 leading-relaxed' />}
                </article>
              );
            })}
            {writing && <div className='ai-shimmer-block h-28 w-full rounded-xl' />}
          </div>
        </div>
        <div className='flex shrink-0 flex-col gap-1.5 border-t bg-background px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]'>
          {excluded.length > 0 && !writing && (
            <span className='text-center text-12px text-neutral-500'>
              外した {excluded.length} か所は、この旅ではもう提案しません
            </span>
          )}
          <Button size='lg' className='h-12 sm:h-12' disabled={writing} loading={saving} onClick={saveAll}>
            {writing ? '提案を書いています…' : keepCount > 0 ? `${keepCount} か所をストックに入れる` : '今回は見送る'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='flex h-dvh w-full flex-col bg-linear-to-b from-violet-50 to-teal-50'>
      {/* 上部の空き。AI に頼んでいる画面だと分かるよう球を置く */}
      <div className='flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 pt-[env(safe-area-inset-top)]'>
        <AiOrb size={72} />
        <RotatingPhrase />
        {saved && !areaFromCreate && <span className='text-12px text-neutral-500'>前回の条件を入れています</span>}
      </div>
      {/* 旅程の有無でステップ数が変わるため、確認できるまでは枠だけ出す */}
      {isSummaryLoading ? (
        <div className={cn(STEP_PAGE_PANEL_CLASS, 'bg-background')} />
      ) : (
        <StepPanel
          className={STEP_PAGE_PANEL_CLASS}
          stepCount={STEPS.length}
          index={nav.index}
          direction={nav.direction}
          eyebrow={`${nav.index + 1} / ${STEPS.length}`}
          title={current.question}
          hint={current.hint}
          onBack={nav.index > 0 ? nav.back : undefined}
          onSwipeNext={canGoNext && current.key !== 'what' ? nav.next : undefined}
          onSubmit={canGoNext ? (current.key === 'what' ? run : nav.next) : undefined}
          trailing={
            <Button asChild variant='ghost' size='icon' aria-label='閉じる'>
              <Link to={candidatePaths.candidates(trip.urlId)}>
                <X className='size-5' />
              </Link>
            </Button>
          }
          footer={
            current.key === 'what' ? (
              <Button
                type='submit'
                size='lg'
                className='h-12 bg-linear-to-r from-violet-600 to-teal-500 text-white hover:opacity-90 sm:h-12'
              >
                <Sparkles />
                提案してもらう
              </Button>
            ) : (
              <Button type='submit' size='lg' className='h-12 sm:h-12' disabled={!canGoNext}>
                次へ
              </Button>
            )
          }
        >
          {current.key === 'where' && (
            <div className='flex flex-col gap-5'>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='suggest-area' className='text-12px'>
                  エリア
                </Label>
                <Input
                  id='suggest-area'
                  value={form.area}
                  onChange={e => set('area', e.target.value)}
                  className='h-14 text-18px sm:h-14 sm:text-18px'
                />
              </div>
              <div className='flex flex-col gap-2'>
                <span className='font-medium text-12px'>移動手段</span>
                <Tabs value={form.transport} onValueChange={v => set('transport', v as FormState['transport'])}>
                  <TabsList className='h-auto w-full'>
                    {(Object.keys(TRANSPORT_LABELS) as FormState['transport'][]).map(t => (
                      <TabsTrigger key={t} value={t} className='flex-col gap-1 py-2.5 text-12px'>
                        {/* ブロックの移動アイコンと同じものを使う */}
                        <TransportationIcon type={t} className='size-6 opacity-80 sm:size-6' />
                        {TRANSPORT_LABELS[t]}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            </div>
          )}

          {current.key === 'when' && (
            <div className='flex flex-col gap-4'>
              <Tabs value={form.whenType} onValueChange={v => set('whenType', v as FormState['whenType'])}>
                <TabsList className='h-11 w-full'>
                  <TabsTrigger value='any'>いつでも</TabsTrigger>
                  <TabsTrigger value='slot'>空き時間を指定</TabsTrigger>
                </TabsList>
              </Tabs>
              {form.whenType === 'slot' ? (
                <div className='flex flex-col gap-3'>
                  <Select
                    value={pageId != null ? String(pageId) : undefined}
                    onValueChange={v => set('pageId', Number(v))}
                  >
                    <SelectTrigger className='w-full' aria-label='日'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {pages?.map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.title} {p.date ? formatDateMDWithDow(p.date) : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className='flex items-center gap-2'>
                    <Input
                      type='time'
                      aria-label='開始'
                      value={form.start}
                      onChange={e => set('start', e.target.value)}
                    />
                    <span className='text-14px'>〜</span>
                    <Input type='time' aria-label='終了' value={form.end} onChange={e => set('end', e.target.value)} />
                  </div>
                </div>
              ) : (
                <p className='rounded-lg bg-neutral-50 px-3 py-2.5 text-12px text-neutral-600 leading-relaxed'>
                  日にちを決めずに、旅全体で行けそうな所を探します。
                </p>
              )}
            </div>
          )}

          {current.key === 'what' && (
            <div className='flex flex-col gap-3'>
              <div className='flex flex-wrap gap-1.5'>
                {WISHES.map(w => {
                  const on = form.wishes.includes(w);
                  return (
                    <Button
                      key={w}
                      type='button'
                      variant='outline'
                      size='sm'
                      aria-pressed={on}
                      onClick={() => set('wishes', on ? form.wishes.filter(x => x !== w) : [...form.wishes, w])}
                      className={cn(
                        'h-7 rounded-full px-2.5 text-12px sm:h-7 sm:px-2.5 sm:text-12px',
                        on && 'border-primary bg-teal-50 text-teal-700 hover:bg-teal-50'
                      )}
                    >
                      {w}
                    </Button>
                  );
                })}
              </div>
              <div className='flex flex-col gap-2.5'>
                <div className='flex items-baseline justify-between'>
                  <Label htmlFor='suggest-budget' className='text-12px'>
                    予算の目安
                  </Label>
                  <span className='font-bold text-14px text-teal-800 tabular-nums'>{budgetLabel(form.budget)}</span>
                </div>
                <Slider
                  id='suggest-budget'
                  aria-label='1人あたりの予算の目安'
                  min={0}
                  max={BUDGET_MAX}
                  step={BUDGET_STEP}
                  value={[form.budget]}
                  onValueChange={([v]) => set('budget', v)}
                />
              </div>
              <div className='flex flex-col gap-1.5'>
                <Label htmlFor='suggest-free' className='text-12px'>
                  ひとこと（任意）
                </Label>
                <Input
                  id='suggest-free'
                  placeholder='例: 子どもが飽きない所 / 運転は 30 分以内'
                  value={form.freeText}
                  onChange={e => set('freeText', e.target.value)}
                />
              </div>
            </div>
          )}
        </StepPanel>
      )}
    </div>
  );
}
