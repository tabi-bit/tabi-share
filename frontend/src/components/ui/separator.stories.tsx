/** biome-ignore-all lint/a11y/useValidAnchor: sample code */
import type { Meta, StoryObj } from '@storybook/react';

import { Separator } from './separator';

const meta: Meta<typeof Separator> = {
  title: 'UI/Separator',
  component: Separator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
    },
    decorative: {
      control: 'boolean',
    },
    className: {
      control: 'text',
    },
  },
  args: {
    orientation: 'horizontal',
    decorative: true,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => (
    <div className='w-64 p-4'>
      <div className='space-y-1'>
        <h4 className='font-medium text-sm leading-none'>セクション1</h4>
        <p className='text-muted-foreground text-sm'>最初のセクションの内容です。</p>
      </div>
      <Separator {...args} className='my-4' />
      <div className='space-y-1'>
        <h4 className='font-medium text-sm leading-none'>セクション2</h4>
        <p className='text-muted-foreground text-sm'>二番目のセクションの内容です。</p>
      </div>
    </div>
  ),
};

export const Horizontal: Story = {
  render: args => (
    <div className='w-96 p-4'>
      <div className='space-y-1'>
        <h4 className='font-medium text-sm leading-none'>タイトル</h4>
        <p className='text-muted-foreground text-sm'>水平方向のセパレーターのサンプルです。</p>
      </div>
      <Separator {...args} orientation='horizontal' className='my-4' />
      <div className='space-y-1'>
        <h4 className='font-medium text-sm leading-none'>コンテンツ</h4>
        <p className='text-muted-foreground text-sm'>セパレーターで区切られた下側のコンテンツです。</p>
      </div>
    </div>
  ),
};

export const Vertical: Story = {
  render: args => (
    <div className='p-4'>
      <div className='flex h-5 items-center space-x-4 text-sm'>
        <div>メニュー1</div>
        <Separator {...args} orientation='vertical' />
        <div>メニュー2</div>
        <Separator {...args} orientation='vertical' />
        <div>メニュー3</div>
      </div>
    </div>
  ),
};

export const InNavigation: Story = {
  render: args => (
    <div className='p-4'>
      <nav className='flex items-center space-x-1 font-medium text-sm'>
        <a href='#' className='text-muted-foreground hover:text-foreground'>
          ホーム
        </a>
        <Separator {...args} orientation='vertical' className='h-4' />
        <a href='#' className='text-muted-foreground hover:text-foreground'>
          製品
        </a>
        <Separator {...args} orientation='vertical' className='h-4' />
        <a href='#' className='text-foreground'>
          価格
        </a>
      </nav>
    </div>
  ),
};

export const InCardList: Story = {
  render: args => (
    <div className='w-80 p-4'>
      <div className='space-y-4'>
        <div>
          <h3 className='font-semibold'>タスク1</h3>
          <p className='text-muted-foreground text-sm'>最初のタスクの説明です。</p>
        </div>
        <Separator {...args} />
        <div>
          <h3 className='font-semibold'>タスク2</h3>
          <p className='text-muted-foreground text-sm'>二番目のタスクの説明です。</p>
        </div>
        <Separator {...args} />
        <div>
          <h3 className='font-semibold'>タスク3</h3>
          <p className='text-muted-foreground text-sm'>三番目のタスクの説明です。</p>
        </div>
      </div>
    </div>
  ),
};

export const WithCustomStyling: Story = {
  render: args => (
    <div className='w-64 p-4'>
      <div className='space-y-1'>
        <h4 className='font-medium text-sm leading-none'>カスタムスタイル</h4>
        <p className='text-muted-foreground text-sm'>太いセパレーターのサンプルです。</p>
      </div>
      <Separator {...args} className='my-4 h-0.5 bg-red-500' />
      <div className='space-y-1'>
        <h4 className='font-medium text-sm leading-none'>コンテンツ</h4>
        <p className='text-muted-foreground text-sm'>カスタムスタイルのセパレーター下のコンテンツです。</p>
      </div>
    </div>
  ),
};

export const NonDecorative: Story = {
  args: {
    decorative: false,
  },
  render: args => (
    <div className='w-64 p-4'>
      <h4 id='section-heading' className='font-medium text-sm leading-none'>
        アクセシブルなセパレーター
      </h4>
      <p className='mt-1 text-muted-foreground text-sm'>decorative=falseに設定されています。</p>
      <Separator {...args} className='my-4' />
      <div className='space-y-1'>
        <h4 className='font-medium text-sm leading-none'>次のセクション</h4>
        <p className='text-muted-foreground text-sm'>セマンティックに意味のあるセパレーターです。</p>
      </div>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className='flex flex-col gap-6 p-4'>
      <div className='space-y-2'>
        <h3 className='font-medium text-sm'>水平セパレーター</h3>
        <div className='w-96'>
          <div className='space-y-1'>
            <h4 className='font-medium text-sm leading-none'>セクション1</h4>
            <p className='text-muted-foreground text-sm'>標準的な水平セパレーターです。</p>
          </div>
          <Separator className='my-4' />
          <div className='space-y-1'>
            <h4 className='font-medium text-sm leading-none'>セクション2</h4>
            <p className='text-muted-foreground text-sm'>セパレーターで区切られたセクションです。</p>
          </div>
        </div>
      </div>

      <div className='space-y-2'>
        <h3 className='font-medium text-sm'>垂直セパレーター</h3>
        <div className='flex h-5 items-center space-x-4 text-sm'>
          <div>アイテム1</div>
          <Separator orientation='vertical' />
          <div>アイテム2</div>
          <Separator orientation='vertical' />
          <div>アイテム3</div>
        </div>
      </div>

      <div className='space-y-2'>
        <h3 className='font-medium text-sm'>ナビゲーション内</h3>
        <nav className='flex items-center space-x-1 font-medium text-sm'>
          <a href='#' className='text-muted-foreground hover:text-foreground'>
            ホーム
          </a>
          <Separator orientation='vertical' className='h-4' />
          <a href='#' className='text-muted-foreground hover:text-foreground'>
            製品
          </a>
          <Separator orientation='vertical' className='h-4' />
          <a href='#' className='text-foreground'>
            価格
          </a>
        </nav>
      </div>

      <div className='space-y-2'>
        <h3 className='font-medium text-sm'>カスタムスタイル</h3>
        <div className='w-64'>
          <div className='space-y-1'>
            <h4 className='font-medium text-sm leading-none'>太いセパレーター</h4>
            <p className='text-muted-foreground text-sm'>カスタムスタイルの例です。</p>
          </div>
          <Separator className='my-4 h-1 bg-blue-500' />
          <div className='space-y-1'>
            <h4 className='font-medium text-sm leading-none'>点線スタイル</h4>
            <p className='text-muted-foreground text-sm'>点線のセパレーターです。</p>
          </div>
          <Separator className='my-4 h-0 border-gray-400 border-t border-dashed bg-transparent' />
          <div className='space-y-1'>
            <h4 className='font-medium text-sm leading-none'>下のコンテンツ</h4>
            <p className='text-muted-foreground text-sm'>様々なスタイルのセパレーターを確認できます。</p>
          </div>
        </div>
      </div>
    </div>
  ),
};
