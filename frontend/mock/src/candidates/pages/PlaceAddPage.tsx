import { StepPanel } from '@mock/stepFlow/StepPanel';
import { StepScreen } from '@mock/stepFlow/StepScreen';
import { SummaryRow } from '@mock/stepFlow/SummaryRow';
import { STEP_PAGE_PANEL_CLASS } from '@mock/stepFlow/stepDialog';
import { useStepNavigation } from '@mock/stepFlow/useStepNavigation';
import { Check, MapPin, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { Trip } from '@/types/trip';
import { PlaceholderMap } from '../components/PlaceholderMap';
import { likersOf, memberLabel } from '../format';
import { searchPlaces, useCandidateMutations, useCandidates, useMembers } from '../hooks';
import { candidatePaths } from '../paths';
import type { CandidateKind, PlaceSearchResult } from '../types';

/** パネルに収まる件数。残りは地図のピンから選ぶ */
const MAX_RESULTS = 5;

const KIND_LABELS: Record<CandidateKind, string> = { spot: '行きたい所', stay: '宿' };

const STEPS = [
  { key: 'where', question: 'どこを追加する？', hint: '名前で探すか、上の地図のピンをタップ' },
  { key: 'note', question: 'みんなにひとこと', hint: 'なければそのまま進めて大丈夫です' },
  { key: 'confirm', question: 'これでいい？', hint: '行をタップすると、その場で直せます' },
] as const;

/** 仮: 場所を検索して候補 (行きたい所 / 宿) に追加する画面。本実装では PlaceSearchDialog の検索に寄せる */
export function PlaceAddPage({ trip }: { trip: Trip }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const nav = useStepNavigation(STEPS.length);
  const { candidates } = useCandidates(trip.id);
  const { members } = useMembers(trip.id);
  const { create } = useCandidateMutations(trip.id);

  const [query, setQuery] = useState('強羅');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [selected, setSelected] = useState<PlaceSearchResult | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<CandidateKind>(params.get('kind') === 'stay' ? 'stay' : 'spot');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const hits = await searchPlaces(query);
      if (!cancelled) setResults(hits);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const current = STEPS[nav.index];
  const backTo = candidatePaths.candidates(trip.urlId, kind === 'stay' ? 'stays' : 'spots');
  const existing = selected ? candidates?.find(c => c.name === selected.name && c.kind === kind) : undefined;
  const canGoNext = current.key !== 'confirm' && !(current.key === 'where' && !selected);

  const pick = (place: PlaceSearchResult) => {
    setSelected(place);
    setName(place.name);
    setKind(place.isLodging ? 'stay' : 'spot');
  };

  const submit = async () => {
    if (!(selected && name.trim())) return;
    setSubmitting(true);
    try {
      await create(
        kind === 'stay'
          ? {
              kind,
              name,
              category: '宿',
              rating: selected.rating,
              location: selected.location,
              nights: [1],
              links: [],
              memo: note,
            }
          : {
              kind,
              name,
              category: selected.type === '飲食店' ? 'ごはん' : '景色',
              rating: selected.rating,
              location: selected.location,
              hours: selected.hours,
              durationMin: 60,
              reason: '',
              source: { type: 'member', memberId: 'me', note: note || null },
            }
      );
      toast.success(existing ? `「${name}」に ♥ を付けました` : `「${name}」を候補に追加しました`);
      navigate(backTo);
    } finally {
      setSubmitting(false);
    }
  };

  const map = (
    <PlaceholderMap
      className='size-full'
      pins={results.map((r, i) => {
        const isSelected = r.placeId === selected?.placeId;
        return {
          id: r.placeId,
          position: r.location,
          ariaLabel: r.name,
          callout: r.name,
          selected: isSelected,
          priority: i,
          onClick: () => pick(r),
          className: cn('rounded-full', isSelected ? 'size-4 bg-primary' : 'size-3 bg-neutral-500'),
        };
      })}
    />
  );

  const kindTabs = (
    <Tabs value={kind} onValueChange={v => setKind(v as CandidateKind)}>
      <TabsList className='w-full'>
        <TabsTrigger value='spot'>行きたい所</TabsTrigger>
        <TabsTrigger value='stay'>宿</TabsTrigger>
      </TabsList>
    </Tabs>
  );

  const noteInput = (
    <Input
      aria-label='ひとこと'
      placeholder={kind === 'stay' ? '例: 部屋に露天風呂あり' : '例: 朝イチで行きたい！ / 雨だったらここ'}
      value={note}
      onChange={e => setNote(e.target.value)}
    />
  );

  return (
    <StepScreen top={map} topClassName='p-0'>
      <StepPanel
        className={STEP_PAGE_PANEL_CLASS}
        stepCount={STEPS.length}
        index={nav.index}
        direction={nav.direction}
        eyebrow={current.key === 'confirm' ? '最後の確認' : `${nav.index + 1} / ${STEPS.length - 1}`}
        title={current.question}
        hint={current.hint}
        onBack={nav.index > 0 ? nav.back : undefined}
        onSwipeNext={canGoNext ? nav.next : undefined}
        onSubmit={canGoNext ? nav.next : submit}
        trailing={
          <Button asChild variant='ghost' size='icon' aria-label='閉じる'>
            <Link to={backTo}>
              <X className='size-5' />
            </Link>
          </Button>
        }
        footer={
          <>
            {current.key === 'where' && (
              <Button type='submit' size='lg' className='h-12 sm:h-12' disabled={!selected}>
                次へ
              </Button>
            )}
            {current.key === 'note' && (
              <Button type='submit' size='lg' className='h-12 sm:h-12'>
                {note.trim() ? '次へ' : 'とくにない'}
              </Button>
            )}
            {current.key === 'confirm' && (
              <Button type='submit' size='lg' className='h-12 sm:h-12' loading={submitting} disabled={!name.trim()}>
                {existing ? '♥ とひとことを付ける' : `${KIND_LABELS[kind]}に追加`}
              </Button>
            )}
          </>
        }
      >
        {current.key === 'where' && (
          <div className='flex flex-col gap-2'>
            <div className='relative'>
              <Search className='-translate-y-1/2 absolute top-1/2 left-3 size-4 text-neutral-400' />
              <Input
                aria-label='場所を検索'
                value={query}
                onChange={e => setQuery(e.target.value)}
                className='h-12 pl-9 text-16px'
              />
            </div>
            <ul className='flex flex-col'>
              {results.slice(0, MAX_RESULTS).map(r => {
                const isSelected = selected?.placeId === r.placeId;
                const inStock = candidates?.some(c => c.name === r.name);
                return (
                  <li key={r.placeId}>
                    <Button
                      type='button'
                      variant='ghost'
                      aria-pressed={isSelected}
                      onClick={() => pick(r)}
                      className={cn(
                        'h-auto w-full items-start justify-start gap-2.5 whitespace-normal rounded-lg px-2 py-2.5 text-left font-normal sm:h-auto',
                        isSelected && 'bg-teal-50 hover:bg-teal-50'
                      )}
                    >
                      <MapPin
                        className={cn('mt-0.5 size-4 shrink-0', isSelected ? 'text-primary' : 'text-neutral-400')}
                      />
                      <span className='flex min-w-0 flex-1 flex-col'>
                        <span className='font-medium text-14px'>{r.name}</span>
                        <span className='truncate text-12px text-neutral-500'>
                          {inStock ? '候補にあります ・ ' : ''}
                          {r.address}
                        </span>
                      </span>
                      {isSelected && <Check className='mt-0.5 size-4 shrink-0 text-primary' />}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {current.key === 'note' && (
          <div className='flex flex-col gap-2'>
            {noteInput}
            <span className='text-12px text-neutral-500'>
              {kind === 'stay' ? '宿のメモとして表示されます' : '候補に「あなたが追加」とこのひとことが表示されます'}
            </span>
          </div>
        )}

        {current.key === 'confirm' && (
          <div className='flex flex-col gap-3'>
            <Accordion type='single' collapsible className='rounded-lg border px-3'>
              <AccordionItem value='name'>
                <AccordionTrigger className='min-w-0 items-center py-3.5 hover:no-underline'>
                  <SummaryRow label='場所' value={name.trim() || '入力してください'} empty={!name.trim()} />
                </AccordionTrigger>
                <AccordionContent className='flex flex-col gap-1.5'>
                  <Input aria-label='場所名' value={name} onChange={e => setName(e.target.value)} />
                  <span className='text-12px text-neutral-500'>{selected?.address}</span>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value='kind'>
                <AccordionTrigger className='min-w-0 items-center py-3.5 hover:no-underline'>
                  <SummaryRow label='種類' value={KIND_LABELS[kind]} empty={false} />
                </AccordionTrigger>
                <AccordionContent>{kindTabs}</AccordionContent>
              </AccordionItem>
              <AccordionItem value='note'>
                <AccordionTrigger className='min-w-0 items-center py-3.5 hover:no-underline'>
                  <SummaryRow label='ひとこと' value={note.trim() || 'なし'} empty={!note.trim()} />
                </AccordionTrigger>
                <AccordionContent>{noteInput}</AccordionContent>
              </AccordionItem>
            </Accordion>
            {existing && (
              <p className='text-12px text-neutral-600 leading-relaxed'>
                {existing.source.type === 'member'
                  ? `${memberLabel(members.find(m => existing.source.type === 'member' && m.id === existing.source.memberId))}さんが追加済みです`
                  : 'AI の提案で追加済みです'}
                （♥ {likersOf(existing).length}）。追加すると、あなたの ♥ とひとことが付きます。
              </p>
            )}
            {kind === 'stay' && !existing && (
              <p className='text-12px text-neutral-600 leading-relaxed'>
                料金や予約サイトは、比べたくなったときに宿の候補から入れられます。
              </p>
            )}
          </div>
        )}
      </StepPanel>
    </StepScreen>
  );
}
