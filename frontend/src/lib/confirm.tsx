import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ConfirmVariant = 'default' | 'destructive';

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

type PendingConfirm = {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
};

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * confirm ダイアログを Promise ベースで呼び出せるプロバイダ。
 * root に 1 つ置けば `useConfirm()` から呼び出せる。同時に複数呼ばれた場合は FIFO で 1 つずつ表示。
 */
export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [queue, setQueue] = useState<PendingConfirm[]>([]);
  const current = queue[0] ?? null;
  // Cancel/Action の onClick と Radix の onOpenChange(false) の 2 段発火で dequeue が重複するのを防ぐ。
  // buttons は「次に閉じる時の結果」を ref に置くだけ、実際の dequeue は onOpenChange に一元化する。
  const pendingResult = useRef<boolean | null>(null);

  const confirm = useCallback<ConfirmFn>(options => {
    return new Promise<boolean>(resolve => {
      setQueue(q => [...q, { options, resolve }]);
    });
  }, []);

  const handleOpenChange = (open: boolean) => {
    if (open) return;
    const result = pendingResult.current ?? false;
    pendingResult.current = null;
    setQueue(q => {
      const [head, ...rest] = q;
      head?.resolve(result);
      return rest;
    });
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={current !== null} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{current?.options.title}</AlertDialogTitle>
            {current?.options.description && (
              <AlertDialogDescription>{current.options.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                pendingResult.current = false;
              }}
            >
              {current?.options.cancelText ?? 'キャンセル'}
            </AlertDialogCancel>
            <AlertDialogAction
              variant={current?.options.variant === 'destructive' ? 'destructive' : undefined}
              onClick={() => {
                pendingResult.current = true;
              }}
            >
              {current?.options.confirmText ?? 'OK'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
};

/**
 * 確認ダイアログを Promise で呼び出すフック。呼び出し側は state を持たずに async/await で書ける。
 *
 * ```tsx
 * const confirm = useConfirm();
 * const ok = await confirm({ title: '削除しますか?', variant: 'destructive' });
 * if (!ok) return;
 * ```
 */
export const useConfirm = (): ConfirmFn => {
  const ctx = useContext(ConfirmContext);
  if (ctx === null) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return ctx;
};
