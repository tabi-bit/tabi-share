import type { Meta, StoryObj } from '@storybook/react';

import { Textarea } from './textarea';

const meta: Meta<typeof Textarea> = {
  title: 'UI/Textarea',
  component: Textarea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    placeholder: {
      control: 'text',
    },
    disabled: {
      control: 'boolean',
    },
    className: {
      control: 'text',
    },
  },
  args: {
    placeholder: 'テキストを入力してください...',
    disabled: false,
  },
};

// biome-ignore lint/style/noDefaultExport: Storybook requires default export for meta
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'デフォルトのテキストエリア',
  },
};

export const WithValue: Story = {
  args: {
    placeholder: 'プリセット値付きテキストエリア',
    defaultValue: 'あらかじめ入力されたテキストです。\nこのように複数行も表示できます。',
  },
};

export const Disabled: Story = {
  args: {
    placeholder: '無効なテキストエリア',
    disabled: true,
    defaultValue: '編集できないテキスト',
  },
};

export const Large: Story = {
  args: {
    placeholder: '大きなテキストエリア',
    className: 'min-h-32 w-96',
  },
};

export const Small: Story = {
  args: {
    placeholder: '小さなテキストエリア',
    className: 'min-h-12 w-64',
  },
};

export const WithError: Story = {
  args: {
    placeholder: 'エラー状態のテキストエリア',
    'aria-invalid': true,
    className: 'border-destructive',
  },
};

export const Resizable: Story = {
  args: {
    placeholder: 'リサイズ可能なテキストエリア',
    className: 'resize-both min-h-24 w-80',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className='flex w-full max-w-2xl flex-col gap-4'>
      <div className='space-y-2'>
        <h3 className='font-medium text-sm'>基本パターン</h3>
        <Textarea placeholder='デフォルト' />
        <Textarea placeholder='値付き' defaultValue='入力済みテキスト' />
        <Textarea placeholder='無効状態' disabled defaultValue='編集不可' />
      </div>

      <div className='space-y-2'>
        <h3 className='font-medium text-sm'>サイズバリエーション</h3>
        <Textarea placeholder='小' className='min-h-12' />
        <Textarea placeholder='デフォルト' />
        <Textarea placeholder='大' className='min-h-32' />
      </div>

      <div className='space-y-2'>
        <h3 className='font-medium text-sm'>特殊状態</h3>
        <Textarea placeholder='エラー状態' aria-invalid={true} className='border-destructive' />
        <Textarea placeholder='リサイズ可能' className='resize-both min-h-24' />
      </div>
    </div>
  ),
};
