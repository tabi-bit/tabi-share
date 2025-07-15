import type { Meta, StoryObj } from '@storybook/react';

import { Skeleton, SkeletonCard } from './index';

const meta: Meta<typeof Skeleton> = {
  title: 'UI/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    className: {
      control: 'text',
    },
  },
  args: {},
};

// biome-ignore lint/style/noDefaultExport: Storybook requires default export for meta
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    className: 'h-4 w-[200px]',
  },
};

export const Small: Story = {
  args: {
    className: 'h-3 w-[150px]',
  },
};

export const Medium: Story = {
  args: {
    className: 'h-5 w-[250px]',
  },
};

export const Large: Story = {
  args: {
    className: 'h-6 w-[300px]',
  },
};

export const Circle: Story = {
  args: {
    className: 'h-12 w-12 rounded-full',
  },
};

export const Square: Story = {
  args: {
    className: 'h-12 w-12',
  },
};

export const Rectangle: Story = {
  args: {
    className: 'h-24 w-48',
  },
};

export const Card: Story = {
  render: () => <SkeletonCard />,
};

export const AllVariants: Story = {
  render: () => (
    <div className='flex flex-col gap-4'>
      <div className='space-y-2'>
        <p className='font-medium text-sm'>サイズバリエーション</p>
        <div className='space-y-2'>
          <Skeleton className='h-3 w-[150px]' />
          <Skeleton className='h-4 w-[200px]' />
          <Skeleton className='h-5 w-[250px]' />
          <Skeleton className='h-6 w-[300px]' />
        </div>
      </div>

      <div className='space-y-2'>
        <p className='font-medium text-sm'>形状バリエーション</p>
        <div className='flex gap-2'>
          <Skeleton className='h-12 w-12 rounded-full' />
          <Skeleton className='h-12 w-12' />
          <Skeleton className='h-12 w-24' />
        </div>
      </div>

      <div className='space-y-2'>
        <p className='font-medium text-sm'>カードコンポーネント</p>
        <SkeletonCard />
      </div>

      <div className='space-y-2'>
        <p className='font-medium text-sm'>カスタムレイアウトの例</p>
        <div className='space-y-2 rounded-lg border p-4'>
          <div className='flex items-center gap-2'>
            <Skeleton className='h-12 w-12 rounded-full' />
            <div className='space-y-1'>
              <Skeleton className='h-4 w-[120px]' />
              <Skeleton className='h-3 w-[80px]' />
            </div>
          </div>
          <div className='space-y-2 pt-2'>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-2/3' />
          </div>
        </div>
      </div>

      <div className='space-y-2'>
        <p className='font-medium text-sm'>リストレイアウトの例</p>
        <div className='space-y-3'>
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`skeleton-item-${
                // biome-ignore lint/suspicious/noArrayIndexKey: sample code, not production
                index
              }`}
              className='flex items-center space-x-4'
            >
              <Skeleton className='h-12 w-12 rounded-full' />
              <div className='space-y-2'>
                <Skeleton className='h-4 w-[250px]' />
                <Skeleton className='h-4 w-[200px]' />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
};
