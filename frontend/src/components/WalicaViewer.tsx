import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerBody, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/useIsMobile';

type WalicaViewerVariant = 'auto' | 'dialog' | 'drawer';

interface WalicaViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walicaUrl: string;
  /** 表示バリアント。既定 'auto' は viewport (sm 未満) に応じて自動選択。Storybook 等で明示上書き可能 */
  variant?: WalicaViewerVariant;
}

export const WalicaViewer = ({ open, onOpenChange, walicaUrl, variant = 'auto' }: WalicaViewerProps) => {
  const isMobile = useIsMobile();
  const resolvedVariant: 'dialog' | 'drawer' = variant === 'auto' ? (isMobile ? 'drawer' : 'dialog') : variant;

  // sandbox は敢えて未指定: Walica 側の form / cookie / popup を制限すると割り勘 UI が機能不全になる
  const iframeNode = (
    <iframe
      src={walicaUrl}
      className='h-full min-h-0 w-full flex-1 border-0'
      title='Walica 割り勘'
      referrerPolicy='no-referrer-when-downgrade'
      loading='lazy'
      allow='clipboard-write'
    />
  );

  if (resolvedVariant === 'drawer') {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className='h-[92dvh]'>
          <DrawerHeader>
            <DrawerTitle>Walica</DrawerTitle>
          </DrawerHeader>
          <DrawerBody className='flex flex-col p-0'>{iframeNode}</DrawerBody>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size='large' showCloseButton>
        <DialogHeader>
          <DialogTitle>Walica</DialogTitle>
        </DialogHeader>
        <DialogBody className='flex flex-col p-0'>{iframeNode}</DialogBody>
      </DialogContent>
    </Dialog>
  );
};
