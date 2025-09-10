import type { Meta, StoryObj } from '@storybook/react';
import { Label } from './label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

const meta: Meta<typeof Tabs> = {
  title: 'UI/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    defaultValue: {
      control: 'text',
      description: 'デフォルトでアクティブなタブのvalue',
    },
    orientation: {
      control: 'radio',
      options: ['horizontal', 'vertical'],
    },
    dir: {
      control: 'radio',
      options: ['ltr', 'rtl'],
    },
    activationMode: {
      control: 'radio',
      options: ['automatic', 'manual'],
    },
  },
  args: {
    defaultValue: 'tab1',
    orientation: 'horizontal',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => (
    <Tabs {...args} className='w-[400px]'>
      <TabsList>
        <TabsTrigger value='tab1'>タブ1</TabsTrigger>
        <TabsTrigger value='tab2'>タブ2</TabsTrigger>
        <TabsTrigger value='tab3'>タブ3</TabsTrigger>
      </TabsList>
      <TabsContent value='tab1'>
        <div className='rounded-md bg-gray-50 p-4'>タブ1のコンテンツです。</div>
      </TabsContent>
      <TabsContent value='tab2'>
        <div className='rounded-md bg-gray-50 p-4'>タブ2のコンテンツです。</div>
      </TabsContent>
      <TabsContent value='tab3'>
        <div className='rounded-md bg-gray-50 p-4'>タブ3のコンテンツです。</div>
      </TabsContent>
    </Tabs>
  ),
};

export const Vertical: Story = {
  args: {
    orientation: 'vertical',
  },
  render: args => (
    <Tabs {...args} className='flex h-[300px] w-[400px] gap-4'>
      <TabsList>
        <TabsTrigger value='tab1'>アカウント</TabsTrigger>
        <TabsTrigger value='tab2'>設定</TabsTrigger>
        <TabsTrigger value='tab3'>プロフィール</TabsTrigger>
      </TabsList>
      <div className='flex-1'>
        <TabsContent value='tab1'>
          <div className='h-full rounded-md bg-gray-50 p-4'>アカウント設定のコンテンツです。</div>
        </TabsContent>
        <TabsContent value='tab2'>
          <div className='h-full rounded-md bg-gray-50 p-4'>システム設定のコンテンツです。</div>
        </TabsContent>
        <TabsContent value='tab3'>
          <div className='h-full rounded-md bg-gray-50 p-4'>プロフィール情報のコンテンツです。</div>
        </TabsContent>
      </div>
    </Tabs>
  ),
};

export const DisabledTab: Story = {
  render: args => (
    <Tabs {...args} className='w-[400px]'>
      <TabsList>
        <TabsTrigger value='tab1'>アクティブ</TabsTrigger>
        <TabsTrigger value='tab2' disabled>
          無効化タブ
        </TabsTrigger>
        <TabsTrigger value='tab3'>タブ3</TabsTrigger>
      </TabsList>
      <TabsContent value='tab1'>
        <div className='rounded-md bg-gray-50 p-4'>アクティブなタブのコンテンツです。</div>
      </TabsContent>
      <TabsContent value='tab2'>
        <div className='rounded-md bg-gray-50 p-4'>無効化されているタブです。</div>
      </TabsContent>
      <TabsContent value='tab3'>
        <div className='rounded-md bg-gray-50 p-4'>タブ3のコンテンツです。</div>
      </TabsContent>
    </Tabs>
  ),
};

export const ManyTabs: Story = {
  render: args => (
    <Tabs {...args} className='w-[600px]'>
      <TabsList>
        <TabsTrigger value='home'>ホーム</TabsTrigger>
        <TabsTrigger value='products'>商品</TabsTrigger>
        <TabsTrigger value='services'>サービス</TabsTrigger>
        <TabsTrigger value='about'>会社情報</TabsTrigger>
        <TabsTrigger value='contact'>お問い合わせ</TabsTrigger>
        <TabsTrigger value='support'>サポート</TabsTrigger>
      </TabsList>
      <TabsContent value='home'>
        <div className='rounded-md bg-gray-50 p-4'>ホームページのコンテンツです。</div>
      </TabsContent>
      <TabsContent value='products'>
        <div className='rounded-md bg-gray-50 p-4'>商品一覧のコンテンツです。</div>
      </TabsContent>
      <TabsContent value='services'>
        <div className='rounded-md bg-gray-50 p-4'>サービス紹介のコンテンツです。</div>
      </TabsContent>
      <TabsContent value='about'>
        <div className='rounded-md bg-gray-50 p-4'>会社情報のコンテンツです。</div>
      </TabsContent>
      <TabsContent value='contact'>
        <div className='rounded-md bg-gray-50 p-4'>お問い合わせフォームです。</div>
      </TabsContent>
      <TabsContent value='support'>
        <div className='rounded-md bg-gray-50 p-4'>サポート情報です。</div>
      </TabsContent>
    </Tabs>
  ),
};

export const CustomContent: Story = {
  render: args => (
    <Tabs {...args} className='w-[500px]'>
      <TabsList>
        <TabsTrigger value='dashboard'>ダッシュボード</TabsTrigger>
        <TabsTrigger value='analytics'>分析</TabsTrigger>
        <TabsTrigger value='settings'>設定</TabsTrigger>
      </TabsList>
      <TabsContent value='dashboard'>
        <div className='space-y-4'>
          <h3 className='font-semibold text-lg'>ダッシュボード</h3>
          <div className='grid grid-cols-2 gap-4'>
            <div className='rounded-lg bg-blue-50 p-4'>
              <h4 className='font-medium text-blue-800'>売上</h4>
              <p className='font-bold text-2xl text-blue-900'>¥1,234,567</p>
            </div>
            <div className='rounded-lg bg-green-50 p-4'>
              <h4 className='font-medium text-green-800'>注文数</h4>
              <p className='font-bold text-2xl text-green-900'>234</p>
            </div>
          </div>
        </div>
      </TabsContent>
      <TabsContent value='analytics'>
        <div className='space-y-4'>
          <h3 className='font-semibold text-lg'>分析データ</h3>
          <div className='rounded-lg bg-gray-50 p-4'>
            <p>グラフやチャートがここに表示されます。</p>
            <div className='mt-2 flex h-32 items-center justify-center rounded bg-gray-200'>📊 データ可視化エリア</div>
          </div>
        </div>
      </TabsContent>
      <TabsContent value='settings'>
        <div className='space-y-4'>
          <h3 className='font-semibold text-lg'>設定</h3>
          <form className='space-y-3'>
            <div>
              <Label htmlFor='site-name'>サイト名</Label>
              <input
                id='site-name'
                type='text'
                className='w-full rounded-md border border-gray-300 px-3 py-2'
                defaultValue='My Site'
              />
            </div>
            <div>
              <Label htmlFor='site-description'>説明</Label>
              <textarea
                id='site-description'
                className='w-full rounded-md border border-gray-300 px-3 py-2'
                rows={3}
                defaultValue='サイトの説明文'
              ></textarea>
            </div>
          </form>
        </div>
      </TabsContent>
    </Tabs>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className='space-y-8'>
      {/* 水平タブ */}
      <div>
        <h3 className='mb-4 font-semibold text-lg'>水平タブ（デフォルト）</h3>
        <Tabs defaultValue='h1' className='w-[400px]'>
          <TabsList>
            <TabsTrigger value='h1'>タブ1</TabsTrigger>
            <TabsTrigger value='h2'>タブ2</TabsTrigger>
            <TabsTrigger value='h3'>タブ3</TabsTrigger>
          </TabsList>
          <TabsContent value='h1'>水平タブ1のコンテンツ</TabsContent>
          <TabsContent value='h2'>水平タブ2のコンテンツ</TabsContent>
          <TabsContent value='h3'>水平タブ3のコンテンツ</TabsContent>
        </Tabs>
      </div>

      {/* 垂直タブ */}
      <div>
        <h3 className='mb-4 font-semibold text-lg'>垂直タブ</h3>
        <Tabs defaultValue='v1' orientation='vertical' className='flex h-[150px] w-[400px] gap-4'>
          <TabsList>
            <TabsTrigger value='v1'>縦タブ1</TabsTrigger>
            <TabsTrigger value='v2'>縦タブ2</TabsTrigger>
            <TabsTrigger value='v3'>縦タブ3</TabsTrigger>
          </TabsList>
          <div className='flex-1'>
            <TabsContent value='v1'>縦タブ1のコンテンツ</TabsContent>
            <TabsContent value='v2'>縦タブ2のコンテンツ</TabsContent>
            <TabsContent value='v3'>縦タブ3のコンテンツ</TabsContent>
          </div>
        </Tabs>
      </div>

      {/* 無効化タブ */}
      <div>
        <h3 className='mb-4 font-semibold text-lg'>無効化タブ</h3>
        <Tabs defaultValue='d1' className='w-[400px]'>
          <TabsList>
            <TabsTrigger value='d1'>有効</TabsTrigger>
            <TabsTrigger value='d2' disabled>
              無効
            </TabsTrigger>
            <TabsTrigger value='d3'>有効</TabsTrigger>
          </TabsList>
          <TabsContent value='d1'>有効なタブのコンテンツ</TabsContent>
          <TabsContent value='d2'>無効化されているタブ</TabsContent>
          <TabsContent value='d3'>有効なタブのコンテンツ</TabsContent>
        </Tabs>
      </div>
    </div>
  ),
};
