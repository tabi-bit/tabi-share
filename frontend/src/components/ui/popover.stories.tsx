import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from './popover';

const meta: Meta<typeof Popover> = {
  title: 'UI/Popover',
  component: Popover,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='outline'>開く</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>ポップオーバー</PopoverTitle>
          <PopoverDescription>説明文をここに表示します。</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
};

export const WithForm: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='outline'>設定を開く</Button>
      </PopoverTrigger>
      <PopoverContent className='w-80'>
        <div className='space-y-2'>
          <h4 className='font-medium leading-none'>表示設定</h4>
          <p className='text-muted-foreground text-sm'>パネルの表示形式をカスタマイズします。</p>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

export const AlignStart: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='outline'>左寄せ</Button>
      </PopoverTrigger>
      <PopoverContent align='start'>
        <p className='text-sm'>align=&quot;start&quot; で左寄せ表示。</p>
      </PopoverContent>
    </Popover>
  ),
};

export const AlignEnd: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='outline'>右寄せ</Button>
      </PopoverTrigger>
      <PopoverContent align='end'>
        <p className='text-sm'>align=&quot;end&quot; で右寄せ表示。</p>
      </PopoverContent>
    </Popover>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className='flex flex-wrap gap-4'>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant='outline'>Default</Button>
        </PopoverTrigger>
        <PopoverContent>
          <PopoverHeader>
            <PopoverTitle>タイトル</PopoverTitle>
            <PopoverDescription>説明</PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant='outline'>Align start</Button>
        </PopoverTrigger>
        <PopoverContent align='start'>
          <p className='text-sm'>左寄せ</p>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant='outline'>Align end</Button>
        </PopoverTrigger>
        <PopoverContent align='end'>
          <p className='text-sm'>右寄せ</p>
        </PopoverContent>
      </Popover>
    </div>
  ),
};
