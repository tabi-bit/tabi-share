import { BOTTOM_DIALOG_CLASS } from '@mock/stepFlow/stepDialog';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPrice, likerNames, MEAL_LABELS, priceUnitSuffix, SITE_LABELS, sourceLabel } from '../format';
import type { BookingLink, Meal, Member, StayCandidate, StayDecision } from '../types';

interface StayDetailDialogProps {
  stay: StayCandidate | null;
  night: number;
  totalNights: number;
  members: Member[];
  decision: StayDecision | null;
  rangeLabel: string | null;
  onOpenChange: (open: boolean) => void;
  onDecide: () => void;
  onReserve: () => void;
  onUndoDecision: () => void;
  onUpdateLink: (link: BookingLink) => void;
  onUpdateNights: (nights: number[]) => void;
}

function LinkRow({
  link,
  booked,
  onSave,
}: {
  link: BookingLink;
  booked: boolean;
  onSave: (link: BookingLink) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState('');
  const [meal, setMeal] = useState<Meal>('none');

  return (
    <div className='flex flex-col'>
      <div className='flex items-center gap-1.5 text-12px'>
        <span className='font-medium text-neutral-700'>{SITE_LABELS[link.site]}</span>
        {link.price != null ? (
          <>
            <span className='font-bold'>{formatPrice(link.price)}</span>
            <span className='text-10px text-neutral-500'>{priceUnitSuffix(link.priceUnit)}</span>
            {link.meal && <span className='text-10px text-neutral-500'>・ {MEAL_LABELS[link.meal]}</span>}
          </>
        ) : (
          !editing && (
            <Button
              variant='link'
              size='sm'
              className='h-auto p-0 text-12px sm:h-auto'
              onClick={() => setEditing(true)}
            >
              ＋ 料金・食事を書く
            </Button>
          )
        )}
        <span className='flex-1' />
        {booked && <span className='font-bold text-10px text-teal-700'>ここで予約</span>}
        <a href={link.url} target='_blank' rel='noopener noreferrer' className='text-12px text-teal-700'>
          開く
        </a>
      </div>
      {editing && (
        <div className='flex items-center gap-1.5 pt-1 pb-0.5'>
          <Input
            inputMode='numeric'
            placeholder='1人1泊'
            aria-label={`${SITE_LABELS[link.site]}の1人1泊の料金`}
            value={price}
            onChange={e => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
            className='h-8 w-24'
          />
          <Select value={meal} onValueChange={v => setMeal(v as Meal)}>
            <SelectTrigger className='h-8 flex-1' aria-label='食事'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(MEAL_LABELS) as Meal[]).map(m => (
                <SelectItem key={m} value={m}>
                  {MEAL_LABELS[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size='sm'
            disabled={!price}
            onClick={() => {
              onSave({ ...link, price: Number(price), meal });
              setEditing(false);
            }}
          >
            保存
          </Button>
        </div>
      )}
    </div>
  );
}

/** 仮: 宿の詳細。料金の比較・メモ・何泊目か・決定の操作は一覧に出さずここにまとめる */
export function StayDetailDialog({
  stay,
  night,
  totalNights,
  members,
  decision,
  rangeLabel,
  onOpenChange,
  onDecide,
  onReserve,
  onUndoDecision,
  onUpdateLink,
  onUpdateNights,
}: StayDetailDialogProps) {
  if (!stay) return null;
  const decidedHere = decision?.candidateId === stay.id;
  const reservedSite = decidedHere ? decision.reservedSite : null;
  const likers = likerNames(stay, members);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className={BOTTOM_DIALOG_CLASS}>
        <DialogHeader className='text-left'>
          <span className='text-12px text-neutral-500'>{night}泊目の宿</span>
          <DialogTitle className='text-18px'>{stay.name}</DialogTitle>
          <DialogDescription className='text-12px'>
            {decidedHere
              ? reservedSite
                ? `${SITE_LABELS[reservedSite]}で予約済み`
                : 'ここに決めました（まだ予約していません）'
              : sourceLabel(stay, members)}
          </DialogDescription>
        </DialogHeader>
        <div className='flex flex-col gap-3'>
          <div className='flex flex-col gap-1.5 rounded-lg border px-3 py-2.5'>
            {stay.links.map(link => (
              <LinkRow key={link.site} link={link} booked={reservedSite === link.site} onSave={onUpdateLink} />
            ))}
          </div>
          {stay.memo && <p className='text-12px text-neutral-700 leading-relaxed'>{stay.memo}</p>}
          <div className='flex flex-col gap-0.5 text-12px text-neutral-600'>
            {rangeLabel && <span>♥ の行きたい所まで {rangeLabel}</span>}
            {likers && <span>行きたい: {likers}</span>}
            {decidedHere && decision.checkIn && (
              <span>
                IN {decision.checkIn} ・ OUT {decision.checkOut ?? '—'}
              </span>
            )}
            <span>
              {stay.nights.map(n => `${n}泊目`).join('・')}の候補{' '}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant='link' size='sm' className='h-auto p-0 text-12px sm:h-auto sm:text-12px'>
                    変える
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='flex w-44 flex-col gap-2 p-3'>
                  <span className='font-medium text-12px'>何泊目の候補？</span>
                  {Array.from({ length: totalNights }, (_, i) => i + 1).map(n => (
                    <div key={n} className='flex items-center gap-2'>
                      <Checkbox
                        id={`stay-${stay.id}-night-${n}`}
                        checked={stay.nights.includes(n)}
                        onCheckedChange={checked => {
                          const next = checked ? [...stay.nights, n].sort() : stay.nights.filter(x => x !== n);
                          if (next.length > 0) onUpdateNights(next);
                        }}
                      />
                      <Label htmlFor={`stay-${stay.id}-night-${n}`} className='font-normal text-14px'>
                        {n}泊目
                      </Label>
                    </div>
                  ))}
                </PopoverContent>
              </Popover>
            </span>
          </div>
        </div>
        <div className='flex flex-col gap-2 pt-1'>
          {decidedHere && (
            <Button variant='ghost' size='lg' className='h-12 sm:h-12' onClick={onUndoDecision}>
              決めたのを取り消す
            </Button>
          )}
          {!decision && (
            <Button size='lg' className='h-12 sm:h-12' onClick={onDecide}>
              {night}泊目はここにする
            </Button>
          )}
          {decidedHere && !reservedSite && (
            <Button size='lg' className='h-12 sm:h-12' onClick={onReserve}>
              予約済みにする
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
