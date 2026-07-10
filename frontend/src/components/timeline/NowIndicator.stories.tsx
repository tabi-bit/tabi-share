import type { Meta, StoryObj } from '@storybook/react';
import { NowIndicator } from './NowIndicator';

const meta: Meta<typeof NowIndicator> = {
  title: 'Components/Timeline/NowIndicator',
  component: NowIndicator,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    Story => (
      <div className='grid w-full grid-cols-[auto_1fr] gap-x-4'>
        <div className='text-neutral-400 text-sm'>[axis]</div>
        <div className='text-neutral-400 text-sm'>[content]</div>
        <div className='col-span-2'>
          <Story />
        </div>
      </div>
    ),
  ],
  argTypes: {
    ratio: {
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** デフォルト: 中央固定 */
export const Default: Story = {
  args: {},
};

/** 比率 0 (上端) */
export const RatioTop: Story = {
  args: {
    ratio: 0,
  },
};

/** 比率 0.5 (中央) */
export const RatioCenter: Story = {
  args: {
    ratio: 0.5,
  },
};

/** 比率 1 (下端) */
export const RatioBottom: Story = {
  args: {
    ratio: 1,
  },
};
