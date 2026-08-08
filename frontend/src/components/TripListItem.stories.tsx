import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import type { Trip } from '@/types/trip';
import { TripListItem } from './TripListItem';

const trip: Trip = {
  id: 1,
  title: '城崎温泉 二泊三日',
  detail: null,
  peopleNum: null,
  urlId: 'demo-url-id',
  startDate: new Date('2026-03-14'),
  endDate: new Date('2026-03-16'),
  walicaUrl: null,
  createdAt: new Date('2026-01-10'),
  lastEditedAt: new Date('2026-02-01'),
};

const meta = {
  title: 'Components/TripListItem',
  component: TripListItem,
  parameters: { layout: 'padded' },
  decorators: [
    Story => (
      <MemoryRouter>
        <ul className='w-full max-w-2xl bg-teal-50 p-4'>
          <Story />
        </ul>
      </MemoryRouter>
    ),
  ],
  args: {
    trip,
    archived: false,
    leaving: false,
    disabled: false,
    onToggleArchive: () => console.log('toggle archive'),
  },
} satisfies Meta<typeof TripListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Archived: Story = {
  args: { archived: true },
};

export const WithoutDateRange: Story = {
  args: { trip: { ...trip, startDate: null, endDate: null } },
};

export const LongTitle: Story = {
  args: { trip: { ...trip, title: '城崎・下呂・奥飛騨をめぐる年末年始の温泉はしご旅' } },
};

/** オフライン時。アーカイブ操作だけを止め、旅程は開ける */
export const Offline: Story = {
  args: { disabled: true },
};
