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

// biome-ignore lint/style/noDefaultExport: Storybook requires default export for meta
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
