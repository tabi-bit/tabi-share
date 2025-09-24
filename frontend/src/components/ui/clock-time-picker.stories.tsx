import type { Meta, StoryObj } from '@storybook/react';

import { ClockTimePicker } from './clock-time-picker';

const meta: Meta<typeof ClockTimePicker> = {
  title: 'UI/ClockTimePicker',
  component: ClockTimePicker,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
