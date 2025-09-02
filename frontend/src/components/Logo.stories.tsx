import type { Meta, StoryObj } from '@storybook/react';

import { Logo } from './Logo';

const meta: Meta<typeof Logo> = {
  title: 'Components/Logo',
  component: Logo,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['medium', 'small'],
    },
  },
  args: {
    size: 'medium',
  },
};

// biome-ignore lint/style/noDefaultExport: Storybook requires default export for meta
export default meta;
type Story = StoryObj<typeof meta>;

export const Medium: Story = {
  args: {
    size: 'medium',
  },
};

export const Small: Story = {
  args: {
    size: 'small',
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className='flex flex-col items-center gap-4'>
      <div className='text-center'>
        <p className='mb-2 text-gray-600 text-sm'>Medium Size</p>
        <Logo size='medium' />
      </div>
      <div className='text-center'>
        <p className='mb-2 text-gray-600 text-sm'>Small Size</p>
        <Logo size='small' />
      </div>
    </div>
  ),
};
