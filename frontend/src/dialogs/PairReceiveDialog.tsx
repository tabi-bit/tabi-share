import { signInWithCustomToken } from 'firebase/auth';
import QrScanner from 'qr-scanner';
import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { getFirebaseAuth } from '@/lib/firebase';

interface PairReceiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Status = 'idle' | 'verifying' | 'error';

/**
 * 未認証 (匿名 session) デバイスで、認証済み側から発行された引き継ぎコード
 * (Firebase Custom Token) を受け取るためのダイアログ。
 *
 * 手段: textarea へのペースト or QR カメラスキャン (iOS 18.1.1+ / それ以外は動作)。
 * カメラ利用不可な環境ではペースト UI にフォールバックする。
 *
 * `signInWithCustomToken` 成功後は、`useAuthStateSync` の `onAuthStateChanged` が
 * 発火して `/auth/link` (パターン 2: マージ) と `/me/trips` が自動実行される。
 */
export const PairReceiveDialog = ({ open, onOpenChange }: PairReceiveDialogProps) => {
  const textareaId = useId();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState(false);

  useEffect(() => {
    if (open) return;
    setToken('');
    setStatus('idle');
    setErrorMessage(null);
    setScanMode(false);
  }, [open]);

  useEffect(() => {
    if (!scanMode || videoRef.current == null) return;
    const video = videoRef.current;
    const scanner = new QrScanner(
      video,
      result => {
        setToken(result.data);
        setScanMode(false);
      },
      { returnDetailedScanResult: true }
    );
    scannerRef.current = scanner;
    scanner.start().catch(err => {
      console.error('failed to start QR scanner', err);
      setErrorMessage('カメラを起動できませんでした。コードを直接貼り付けてください。');
      setScanMode(false);
    });
    return () => {
      scanner.stop();
      scanner.destroy();
      scannerRef.current = null;
    };
  }, [scanMode]);

  const isVerifying = status === 'verifying';

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const trimmed = token.trim();
    if (trimmed.length === 0) return;
    setStatus('verifying');
    setErrorMessage(null);
    try {
      await signInWithCustomToken(getFirebaseAuth(), trimmed);
      // 成功時は onAuthStateChanged 経由で syncAuthedUser が発火する。
      // ダイアログはここで閉じてしまって OK (トップの useAuthStateSync が受け取る)。
      onOpenChange(false);
    } catch (err) {
      console.error('failed to sign in with custom token', err);
      setStatus('error');
      setErrorMessage('認証に失敗しました。コードの有効期限が切れているか、正しくない可能性があります。');
    }
  };

  return (
    <Dialog
      onOpenChange={next => {
        if (isVerifying) return;
        onOpenChange(next);
      }}
      open={open}
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
          <DialogTitle>他のデバイスから引き継ぐ</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {scanMode ? (
            <div className='flex flex-col gap-2'>
              <video className='w-full rounded bg-black' ref={videoRef}>
                <track kind='captions' />
              </video>
              <Button onClick={() => setScanMode(false)} size='sm' type='button' variant='outline'>
                キャンセル
              </Button>
            </div>
          ) : (
            <form className='flex flex-col gap-4' id='pair-receive-form' onSubmit={handleSubmit}>
              <p className='text-12px text-gray-600 sm:text-14px'>
                認証済みデバイスの「他のデバイスへ引き継ぐ」で発行したコードを貼り付けるか、QR
                コードを読み取ってください。
              </p>
              <div className='flex flex-col gap-2'>
                <Label htmlFor={textareaId}>引き継ぎコード</Label>
                <textarea
                  className='h-24 w-full resize-none rounded border border-gray-300 p-2 font-mono text-10px sm:text-12px'
                  disabled={isVerifying}
                  id={textareaId}
                  onChange={e => setToken(e.target.value)}
                  required
                  value={token}
                />
              </div>
              <Button
                disabled={isVerifying}
                onClick={() => setScanMode(true)}
                size='sm'
                type='button'
                variant='outline'
              >
                QR コードを読み取る
              </Button>
              {errorMessage != null && <p className='text-12px text-red-600 sm:text-14px'>{errorMessage}</p>}
            </form>
          )}
        </DialogBody>
        <DialogFooter>
          {!scanMode && (
            <>
              <Button disabled={isVerifying} onClick={() => onOpenChange(false)} type='button' variant='outline'>
                キャンセル
              </Button>
              <Button disabled={isVerifying || token.trim().length === 0} form='pair-receive-form' type='submit'>
                {isVerifying ? '認証中...' : '認証する'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
