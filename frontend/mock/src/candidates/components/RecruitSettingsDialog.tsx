import { BOTTOM_DIALOG_CLASS } from '@mock/stepFlow/stepDialog';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { Recruitment } from '../types';

interface RecruitSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recruitment: Recruitment;
  voteUrl: string;
  onSubmit: (recruitment: Recruitment) => void;
}

/** 仮: 候補の募集を開始・終了する設定。スマホは画面下のシート */
export function RecruitSettingsDialog({
  open,
  onOpenChange,
  recruitment,
  voteUrl,
  onSubmit,
}: RecruitSettingsDialogProps) {
  const [active, setActive] = useState(recruitment.active);
  const [deadline, setDeadline] = useState(recruitment.deadline ?? '');
  const [notify, setNotify] = useState(recruitment.notify);

  useEffect(() => {
    if (!open) return;
    setActive(recruitment.active);
    setDeadline(recruitment.deadline ?? '');
    setNotify(recruitment.notify);
  }, [open, recruitment]);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(voteUrl);
      toast.success('投票用 URL をコピーしました');
    } catch {
      toast.error('コピーできませんでした');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={BOTTOM_DIALOG_CLASS}>
        <DialogHeader className='text-left'>
          <DialogTitle className='text-18px'>行きたい所をみんなから集める？</DialogTitle>
          <DialogDescription className='text-12px leading-relaxed'>
            集めている間は、旅程を開いたメンバー全員が場所を追加して ♥ を付けられます
          </DialogDescription>
        </DialogHeader>
        <DialogBody className='flex flex-col gap-3.5'>
          <div className='flex items-center justify-between rounded-lg border px-3 py-2.5'>
            <Label htmlFor='recruit-active' className='font-normal text-14px'>
              集める
            </Label>
            <Switch id='recruit-active' checked={active} onCheckedChange={setActive} />
          </div>
          {active && (
            <>
              <div className='flex flex-col gap-1.5'>
                <Label htmlFor='recruit-deadline' className='text-12px'>
                  いつまで？（任意）
                </Label>
                <Input
                  id='recruit-deadline'
                  type='datetime-local'
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                />
              </div>
              <div className='flex items-center gap-2'>
                <Checkbox id='recruit-notify' checked={notify} onCheckedChange={c => setNotify(!!c)} />
                <Label htmlFor='recruit-notify' className='font-normal text-14px'>
                  通知をオンにしているメンバーに知らせる
                </Label>
              </div>
              <Button variant='outline' onClick={copyUrl}>
                投票用の URL をコピー
              </Button>
            </>
          )}
        </DialogBody>
        <DialogFooter>
          <Button
            size='lg'
            className='h-12 flex-1 sm:h-12'
            onClick={() => {
              onSubmit({ active, deadline: deadline || null, notify });
              onOpenChange(false);
            }}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
