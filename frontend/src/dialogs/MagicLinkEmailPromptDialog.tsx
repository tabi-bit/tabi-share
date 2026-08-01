import { signInWithEmailLink } from 'firebase/auth';
import { useAtom } from 'jotai';
import { type FormEvent, useEffect, useId, useState } from 'react';
import { magicLinkPromptUrlAtom } from '@/atoms/auth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getFirebaseAuth } from '@/lib/firebase';

const PENDING_EMAIL_STORAGE_KEY = 'auth:pendingEmail';

type Status = 'idle' | 'verifying' | 'error';

/**
 * マジックリンクを別デバイス (もしくは localStorage が消えたブラウザ) で開いた時に、
 * email を再入力してもらって sign-in を完了させるダイアログ。
 *
 * Firebase の `signInWithEmailLink` は verifier として email を要求する。
 * 送信デバイスの localStorage を参照できないケース (PC 送信 → スマホ受信 等) では
 * ここで email を補って sign-in を完了する。
 */
export const MagicLinkEmailPromptDialog = () => {
  const emailId = useId();
  const [url, setUrl] = useAtom(magicLinkPromptUrlAtom);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (url != null) {
      setEmail('');
      setStatus('idle');
      setErrorMessage(null);
    }
  }, [url]);

  if (url == null) return null;

  const isVerifying = status === 'verifying';

  const close = () => {
    setUrl(null);
    // リロード時に消費済み oobCode で再度発火しないようここで URL/localStorage をクリーンアップ
    window.history.replaceState({}, '', window.location.pathname);
    window.localStorage.removeItem(PENDING_EMAIL_STORAGE_KEY);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (email.length === 0) return;
    setStatus('verifying');
    setErrorMessage(null);
    try {
      await signInWithEmailLink(getFirebaseAuth(), email, url);
      close();
    } catch (err) {
      console.error('failed to complete magic link sign-in', err);
      setStatus('error');
      setErrorMessage('メール認証に失敗しました。メールアドレスを確認するか、リンクを送信し直してください。');
    }
  };

  return (
    <Dialog
      open
      onOpenChange={next => {
        if (isVerifying) return;
        if (!next) close();
      }}
    >
      <DialogContent
        onEscapeKeyDown={e => {
          if (isVerifying) e.preventDefault();
        }}
        onInteractOutside={e => {
          if (isVerifying) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>メールアドレスを入力してください</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form className='flex flex-col gap-4' id='magic-link-prompt-form' onSubmit={handleSubmit}>
            <p className='text-12px text-gray-600 sm:text-14px'>
              メール認証を完了するために、リンクを送信した際のメールアドレスをもう一度入力してください。
            </p>
            <div className='flex flex-col gap-2'>
              <Label htmlFor={emailId}>メールアドレス</Label>
              <Input
                autoComplete='email'
                autoFocus
                disabled={isVerifying}
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
        </DialogBody>
        <DialogFooter>
          <Button disabled={isVerifying} onClick={close} type='button' variant='outline'>
            キャンセル
          </Button>
          <Button disabled={isVerifying || email.length === 0} form='magic-link-prompt-form' type='submit'>
            {isVerifying ? '認証中...' : '認証する'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
