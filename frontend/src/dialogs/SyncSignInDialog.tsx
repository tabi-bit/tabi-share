import { type FormEvent, useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sendMagicLink } from '@/hooks/useAuth';

interface SyncSignInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Status = 'idle' | 'sending' | 'sent' | 'error';

/**
 * メールアドレスを入力してマジックリンクを送信するダイアログ。
 * "同期" セクションから開かれる。認証が完了するのは、届いたメールのリンクを
 * 同じデバイスで開いた時 (useAuthStateSync 内の completeMagicLinkSignIn) 。
 */
export const SyncSignInDialog = ({ open, onOpenChange }: SyncSignInDialogProps) => {
  const emailId = useId();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEmail('');
      setStatus('idle');
      setErrorMessage(null);
    }
  }, [open]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (email.length === 0) return;
    setStatus('sending');
    setErrorMessage(null);
    try {
      await sendMagicLink(email);
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : '送信に失敗しました。時間をおいて再度お試しください。');
    }
  };

  const isSending = status === 'sending';

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (isSending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        onInteractOutside={e => {
          if (isSending) e.preventDefault();
        }}
        onEscapeKeyDown={e => {
          if (isSending) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>メールで同期を有効にする</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {status === 'sent' ? (
            <p className='text-14px text-gray-700 sm:text-16px'>
              <span className='font-semibold'>{email}</span> にリンクを送信しました。
              <br />
              メールを開き、同じデバイスでリンクをタップしてください。
            </p>
          ) : (
            <form className='flex flex-col gap-4' id='sync-signin-form' onSubmit={handleSubmit}>
              <p className='text-12px text-gray-600 sm:text-14px'>
                届いたメールのリンクを同じデバイスで開くと、同期が有効になります。
              </p>
              <div className='flex flex-col gap-2'>
                <Label htmlFor={emailId}>メールアドレス</Label>
                <Input
                  autoComplete='email'
                  autoFocus
                  disabled={isSending}
                  id={emailId}
                  onChange={e => setEmail(e.target.value)}
                  placeholder='you@example.com'
                  required
                  type='email'
                  value={email}
                />
              </div>
              {errorMessage != null && <p className='text-12px text-red-600 sm:text-14px'>{errorMessage}</p>}
            </form>
          )}
        </DialogBody>
        <DialogFooter>
          {status === 'sent' ? (
            <Button onClick={() => onOpenChange(false)} type='button'>
              閉じる
            </Button>
          ) : (
            <>
              <Button disabled={isSending} onClick={() => onOpenChange(false)} type='button' variant='outline'>
                キャンセル
              </Button>
              <Button disabled={isSending || email.length === 0} form='sync-signin-form' type='submit'>
                {isSending ? '送信中...' : 'リンクを送信'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
