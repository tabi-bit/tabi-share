import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { WalicaViewer } from './WalicaViewer';

type Variant = 'auto' | 'bottom' | 'right';

const WalicaViewerHarness = ({
  walicaUrl,
  initialOpen,
  variant,
}: {
  walicaUrl: string;
  initialOpen: boolean;
  variant: Variant;
}) => {
  const [open, setOpen] = useState(initialOpen);
  return (
    <div className='flex min-h-dvh items-start justify-start bg-teal-50 p-4'>
      <Button className='bg-[#EE7B67] text-white hover:bg-[#D96B58]' onClick={() => setOpen(true)}>
        Walica
      </Button>
      <WalicaViewer open={open} onOpenChange={setOpen} walicaUrl={walicaUrl} variant={variant} />
    </div>
  );
};

const meta = {
  title: 'Components/WalicaViewer',
  component: WalicaViewerHarness,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Walica iframe を表示するビューア。モバイル(<640px)は下から, デスクトップは右から Sheet をスライドさせる。variant prop で明示切替可能。',
      },
    },
  },
  args: {
    walicaUrl: 'https://walica.jp/group/01K342T6BB8JRYD9VKXTB041FY',
    initialOpen: true,
    variant: 'auto',
  },
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['auto', 'bottom', 'right'],
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof WalicaViewerHarness>;

export default meta;
type Story = StoryObj<typeof WalicaViewerHarness>;

export const RightSide: Story = {
  args: { variant: 'right' },
  parameters: {
    docs: {
      description: {
        story: '右からシート強制。デスクトップ想定のレイアウト。',
      },
    },
  },
};

export const BottomSide: Story = {
  args: { variant: 'bottom' },
  parameters: {
    viewport: { value: 'mobile1', isRotated: false },
    docs: {
      description: {
        story: '下からシート強制。モバイル用レイアウト。',
      },
    },
  },
};

export const AutoResponsive: Story = {
  args: { variant: 'auto' },
  parameters: {
    docs: {
      description: {
        story:
          'viewport で自動選択。Storybook viewport addon で mobile1 を選ぶと下からシート / それ以外は右からシート。',
      },
    },
  },
};

export const Closed: Story = {
  args: { variant: 'auto', initialOpen: false },
  parameters: {
    docs: {
      description: {
        story: '閉じた状態から Walica ボタンを押して開く挙動を確認できるハーネス。',
      },
    },
  },
};
