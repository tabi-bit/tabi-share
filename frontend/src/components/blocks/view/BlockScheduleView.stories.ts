import type { Meta, StoryObj } from '@storybook/react';
import type { Location } from '@/types/location';
import { BlockScheduleView } from './BlockScheduleView';

const meta: Meta<typeof BlockScheduleView> = {
  title: 'Components/Blocks/View/BlockScheduleView',
  component: BlockScheduleView,
  parameters: {},
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleLocation: Location = {
  id: 1,
  googlePlaceId: 'ChIJ31zemfCMGGARRFKma_dGBRM',
  name: '草津温泉 湯畑',
  address: '〒377-1711 群馬県吾妻郡草津町草津',
  latitude: 36.6218,
  longitude: 138.5963,
  websiteUri: 'https://www.kusatsu-onsen.ne.jp/yubatake/',
};

const sampleLocationWithoutWebsite: Location = {
  id: 2,
  googlePlaceId: 'ChIJsample',
  name: '西の河原公園',
  address: '〒377-1711 群馬県吾妻郡草津町草津521-3',
  latitude: 36.6232,
  longitude: 138.5922,
  websiteUri: null,
};

const baseScheduleBlock = {
  id: 1,
  type: 'schedule' as const,
  startTime: new Date(2024, 0, 1, 9, 0),
  endTime: new Date(2024, 0, 1, 11, 30),
  pageId: 1,
  location: null,
};

export const Default: Story = {
  args: {
    block: {
      ...baseScheduleBlock,
      title: '草津温泉入浴',
      detail: '湯畑周辺の温泉施設を巡る。特に西の河原公園の露天風呂がおすすめ。',
    },
  },
};

export const WithoutDetail: Story = {
  args: {
    block: {
      ...baseScheduleBlock,
      title: '昼食',
    },
  },
};

export const LongTitleAndDetail: Story = {
  args: {
    block: {
      ...baseScheduleBlock,
      title: '草津温泉街散策と湯畑見学、お土産購入とカフェタイム',
      detail: '温泉街をゆっくり散策しながら、湯畑の見学と地元の名産品を購入。最後にカフェでひと休み。'.repeat(5),
    },
  },
};

export const WithLocation: Story = {
  args: {
    block: {
      ...baseScheduleBlock,
      title: '草津温泉入浴',
      detail: '湯畑周辺の温泉施設を巡る。',
      location: sampleLocation,
    },
  },
};

export const WithLocationNoWebsite: Story = {
  args: {
    block: {
      ...baseScheduleBlock,
      title: '西の河原公園 散策',
      detail: '温泉街の西にある河原公園を散策。',
      location: sampleLocationWithoutWebsite,
    },
  },
};
