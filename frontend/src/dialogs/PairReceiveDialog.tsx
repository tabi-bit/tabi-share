import { isAxiosError } from 'axios';
import { signInWithCustomToken } from 'firebase/auth';
import QrScanner from 'qr-scanner';
import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/apiClient';
import { getFirebaseAuth } from '@/lib/firebase';

interface PairReceiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RedeemPairingOut {
  custom_token: string;
}

type Status = 'idle' | 'verifying' | 'error';

/**
 * 未認証 (匿名 session) デバイスで、認証済み側から発行された 8 桁引き継ぎコードを
 * 入力して認証状態を移送するためのダイアログ。
 *
 * フロー:
 *   1. code 入力 or QR スキャン → `POST /pair/redeem` に投げて custom_token を交換
 *   2. `signInWithCustomToken` で Firebase Auth に注入
 *   3. `useAuthStateSync` の `onAuthStateChanged` が発火し `/auth/link` (パターン 2: マージ) と
 *      `/me/trips` が自動実行される
 */
export const PairReceiveDialog = ({ open, onOpenChange }: PairReceiveDialogProps) => {
  const codeInputId = useId();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState(false);

  useEffect(() => {
    if (open) return;
    setCode('');
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
        setCode(result.data);
        setScanMode(false);
      },
      { returnDetailedScanResult: true }
    );
    scanner.start().catch(err => {
      console.error('failed to start QR scanner', err);
      setErrorMessage('カメラを起動できませんでした。コードを直接入力してください。');
      setScanMode(false);
    });
    return () => {
      scanner.stop();
      scanner.destroy();
    };
  }, [scanMode]);

  const isVerifying = status === 'verifying';

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length === 0) return;
    setStatus('verifying');
    setErrorMessage(null);
    try {
      const { data } = await apiClient.post<RedeemPairingOut>('/pair/redeem', { code: trimmed });
      await signInWithCustomToken(getFirebaseAuth(), data.custom_token);
      // 成功時は onAuthStateChanged 経由で syncAuthedUser が発火する
      onOpenChange(false);
    } catch (err) {
      console.error('failed to redeem pairing code', err);
      setStatus('error');
      if (isAxiosError(err) && err.response?.status === 404) {
        setErrorMessage('コードが見つかりません。もう一度確認してください。');
      } else if (isAxiosError(err) && err.response?.status === 403) {
        setErrorMessage('コードの有効期限が切れているか、既に使用されています。');
      } else {
        setErrorMessage('認証に失敗しました。時間をおいて再度お試しください。');
      }
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
                認証済みデバイスの「他のデバイスへ引き継ぐ」で発行した 8 桁コードを入力するか、QR
                コードを読み取ってください。
              </p>
              <div className='flex flex-col gap-2'>
                <Label htmlFor={codeInputId}>引き継ぎコード</Label>
                <Input
                  autoComplete='off'
                  autoFocus
                  disabled={isVerifying}
                  id={codeInputId}
                  onChange={e => setCode(e.target.value)}
                  placeholder='A9K3-P2Q7'
                  required
                  spellCheck={false}
                  value={code}
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
              <Button disabled={isVerifying || code.trim().length === 0} form='pair-receive-form' type='submit'>
                {isVerifying ? '認証中...' : '認証する'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
