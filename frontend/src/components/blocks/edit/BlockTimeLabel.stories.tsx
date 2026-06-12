import type { Meta, StoryObj } from '@storybook/react';
import { BlockTimeLabel } from './BlockTimeLabel';

const meta: Meta<typeof BlockTimeLabel> = {
  title: 'Components/Blocks/Edit/BlockTimeLabel',
  component: BlockTimeLabel,
  tags: ['autodocs'],
  // 実際の利用箇所(.schedule-time-wrapper 等)を模した時刻表示用の背景ボックスに収めて表示する。
  decorators: [
    Story => (
      <div className='inline-flex flex-row items-center justify-center rounded bg-teal-50 px-4 py-1 text-18px'>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const StartAndEnd: Story = {
  args: {
    startTime: new Date(2024, 0, 1, 9, 0),
    endTime: new Date(2024, 0, 1, 21, 30),
  },
};

export const StartOnly: Story = {
  args: {
    startTime: new Date(2024, 0, 1, 9, 0),
    endTime: null,
  },
};
