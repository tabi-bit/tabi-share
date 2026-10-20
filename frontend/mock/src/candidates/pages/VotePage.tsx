import { Check, Heart, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { Trip } from '@/types/trip';
import { CategoryThumb } from '../components/CategoryThumb';
import { SubPageHeader } from '../components/SubPageHeader';
import { formatDuration, formatHours, isRejectedByAll, memberLabel, sourceLabel } from '../format';
import { ME, useCandidateMutations, useCandidates, useMembers, useUpdateMyName } from '../hooks';
import { candidatePaths } from '../paths';
import type { SpotCandidate, Vote } from '../types';

const SWIPE_THRESHOLD = 96;

/** 仮: 未投票の行きたい所を 1 枚ずつ ♥ / パスしていく画面 */
export function VotePage({ trip }: { trip: Trip }) {
  const { spots } = useCandidates(trip.id);
  const { members, me } = useMembers(trip.id);
  const { vote } = useCandidateMutations(trip.id);
  const updateMyName = useUpdateMyName(trip.id);

  // 開いた時点の未投票を固定する。投票して一覧が変わってもカードの順番を崩さないため
  const [queue, setQueue] = useState<number[] | null>(null);
  const [index, setIndex] = useState(0);
  const [counts, setCounts] = useState({ like: 0, pass: 0 });
  const [pendingVote, setPendingVote] = useState<Vote | null>(null);
  const [nickname, setNickname] = useState('');
  const [askedName, setAskedName] = useState(false);
  const [dragX, setDragX] = useState(0);
  const dragStart = useRef<number | null>(null);

  const active = spots.filter(s => !isRejectedByAll(s, members));
  if (queue == null && spots.length > 0) {
    setQueue(active.filter(s => s.votes[ME] == null).map(s => s.id));
  }
  const cards = (queue ?? []).map(id => spots.find(s => s.id === id)).filter((s): s is SpotCandidate => s != null);
  const card = cards[index];
  const done = queue != null && index >= cards.length;

  const commit = (v: Vote) => {
    if (!card) return;
    vote(card, v);
    setCounts(c => ({ ...c, [v]: c[v] + 1 }));
    setIndex(i => i + 1);
    setDragX(0);
  };

  const handleVote = (v: Vote) => {
    if (me && me.name == null && !askedName) {
      setPendingVote(v);
      return;
    }
    commit(v);
  };

  const closeNicknameSheet = async (save: boolean) => {
    if (save && nickname.trim()) await updateMyName(nickname);
    setAskedName(true);
    const v = pendingVote;
    setPendingVote(null);
    if (v) commit(v);
  };

  const others = members.filter(m => !m.isMe);
  const remainingOf = (memberId: string) => active.filter(s => s.votes[memberId] == null).length;

  return (
    <div className='flex h-dvh w-full flex-col bg-neutral-100'>
      <SubPageHeader
        backTo={candidatePaths.candidates(trip.urlId)}
        backLabel='候補に戻る'
        title={
          <div className='flex flex-col'>
            <span>行ってみたい？</span>
            <span className='font-normal text-12px text-neutral-500'>
              {done ? 'ぜんぶ見終わりました' : `あと ${cards.length - index} 件`}
            </span>
          </div>
        }
      />
      <div className='h-1 bg-teal-100'>
        <div
          className='h-1 bg-teal-500 transition-[width]'
          style={{ width: cards.length > 0 ? `${Math.round((index / cards.length) * 100)}%` : '100%' }}
        />
      </div>

      {card && (
        <div className='flex min-h-0 flex-1 flex-col gap-4 p-4'>
          <div className='relative min-h-0 flex-1'>
            {cards[index + 1] && <div className='-bottom-2 absolute inset-x-3 top-2.5 rounded-2xl bg-white/60' />}
            <article
              className='absolute inset-0 flex touch-none select-none flex-col overflow-hidden rounded-2xl bg-white shadow-xl'
              style={{
                transform: `translateX(${dragX}px) rotate(${dragX / 20}deg)`,
                transition: dragStart.current == null ? 'transform 0.2s' : 'none',
              }}
              onPointerDown={e => {
                dragStart.current = e.clientX;
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={e => {
                if (dragStart.current != null) setDragX(e.clientX - dragStart.current);
              }}
              onPointerUp={() => {
                dragStart.current = null;
                if (dragX > SWIPE_THRESHOLD) handleVote('like');
                else if (dragX < -SWIPE_THRESHOLD) handleVote('pass');
                else setDragX(0);
              }}
            >
              <div className='relative'>
                <CategoryThumb category={card.category} size='lg' className='h-52' />
                {dragX !== 0 && (
                  <span
                    className={cn(
                      'absolute top-4 rounded-md border-2 px-2 py-0.5 font-bold text-16px',
                      dragX > 0 ? 'left-4 border-teal-600 text-teal-600' : 'right-4 border-red-600 text-red-600'
                    )}
                    style={{ opacity: Math.min(1, Math.abs(dragX) / SWIPE_THRESHOLD) }}
                  >
                    {dragX > 0 ? '行きたい' : 'パス'}
                  </span>
                )}
              </div>
              <div className='flex flex-col gap-2.5 overflow-y-auto p-4'>
                <div className='flex flex-col gap-0.5'>
                  <span className='font-bold text-18px'>{card.name}</span>
                  <span className='text-12px text-neutral-500'>
                    {[card.category, ...card.tags].join(' ・ ')} ・ {sourceLabel(card, members)}
                  </span>
                </div>
                <p className='text-14px text-neutral-800 leading-relaxed'>{card.reason}</p>
                <div className='grid grid-cols-2 gap-1.5 text-12px text-neutral-600'>
                  {card.rating != null && <span>★ {card.rating}</span>}
                  <span>滞在の目安 {formatDuration(card.durationMin)}</span>
                  <span>{formatHours(card.hours)}</span>
                  {card.distanceKm != null && <span>宿から {card.distanceKm}km</span>}
                </div>
              </div>
            </article>
          </div>
          <div className='flex items-center justify-center gap-10'>
            <div className='flex flex-col items-center gap-1.5'>
              <Button
                variant='outline'
                size='icon'
                aria-label='パス'
                onClick={() => handleVote('pass')}
                className='size-16 rounded-full border-0 shadow-lg'
              >
                <X className='size-6.5 text-red-700' strokeWidth={2.5} />
              </Button>
              <span className='text-12px text-neutral-600'>パス</span>
            </div>
            <div className='flex flex-col items-center gap-1.5'>
              <Button
                size='icon'
                aria-label='行きたい'
                onClick={() => handleVote('like')}
                className='size-16 rounded-full shadow-lg'
              >
                <Heart className='size-7 fill-white text-white' />
              </Button>
              <span className='text-12px text-neutral-600'>行きたい</span>
            </div>
          </div>
          <span className='text-center text-10px text-neutral-500'>
            右にスワイプで行きたい ・ 左でパス。あとから変えられます
          </span>
        </div>
      )}

      {done && (
        <div className='flex flex-1 flex-col items-center justify-center gap-3.5 p-6 text-center'>
          <span className='inline-flex size-16 items-center justify-center rounded-full bg-teal-100'>
            <Check className='size-7.5 text-teal-700' strokeWidth={2.5} />
          </span>
          <span className='font-bold text-18px'>
            {cards.length > 0 ? 'ありがとう！' : 'まだ見ていない所はありません'}
          </span>
          {cards.length > 0 && (
            <p className='text-14px text-neutral-600 leading-relaxed'>
              行きたい {counts.like} 件 ・ パス {counts.pass} 件
              {others.some(m => remainingOf(m.id) > 0) && (
                <>
                  <br />
                  {others
                    .filter(m => remainingOf(m.id) > 0)
                    .map(memberLabel)
                    .join('・')}
                  さんが選び終わると、みんなの結果がそろいます
                </>
              )}
            </p>
          )}
          <Button asChild size='lg'>
            <Link to={candidatePaths.candidates(trip.urlId)}>みんなの結果を見る</Link>
          </Button>
        </div>
      )}

      <Sheet open={pendingVote != null} onOpenChange={open => !open && closeNicknameSheet(false)}>
        <SheetContent side='bottom' className='h-auto sm:mx-auto sm:max-w-2xl' showCloseButton={false}>
          <SheetHeader className='text-left'>
            <SheetTitle className='text-18px'>なんて呼べばいい？</SheetTitle>
            <SheetDescription className='text-12px leading-relaxed'>
              ♥ や追加した場所に表示されます。この旅の中だけの名前で、あとから変えられます
            </SheetDescription>
          </SheetHeader>
          <div className='flex flex-col gap-1.5 px-4'>
            <Label htmlFor='nickname' className='text-12px'>
              ニックネーム
            </Label>
            <Input
              id='nickname'
              placeholder='例: たろう'
              value={nickname}
              onChange={e => setNickname(e.target.value)}
            />
          </div>
          <SheetFooter className='pb-[calc(1rem+env(safe-area-inset-bottom))]'>
            <Button variant='ghost' size='lg' className='h-12 sm:h-12' onClick={() => closeNicknameSheet(false)}>
              あとで
            </Button>
            <Button size='lg' className='h-12 sm:h-12' onClick={() => closeNicknameSheet(true)}>
              決定
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
