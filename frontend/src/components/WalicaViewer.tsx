import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/useIsMobile';

type WalicaViewerVariant = 'auto' | 'bottom' | 'right';

interface WalicaViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walicaUrl: string;
  /** シートの出現方向。既定 'auto' は viewport (sm 未満) で bottom, それ以上で right を選択 */
  variant?: WalicaViewerVariant;
}

export const WalicaViewer = ({ open, onOpenChange, walicaUrl, variant = 'auto' }: WalicaViewerProps) => {
  const isMobile = useIsMobile();
  const side: 'bottom' | 'right' = variant === 'auto' ? (isMobile ? 'bottom' : 'right') : variant;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle>Walica</SheetTitle>
        </SheetHeader>
        <SheetBody className='flex flex-col p-0'>
          {/* sandbox は敢えて未指定: Walica 側の form / cookie / popup を制限すると割り勘 UI が機能不全になる */}
          <iframe
            src={walicaUrl}
            className='h-full min-h-0 w-full flex-1 border-0'
            title='Walica 割り勘'
            referrerPolicy='strict-origin-when-cross-origin'
            loading='lazy'
            allow='clipboard-write'
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
};
