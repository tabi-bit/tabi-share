import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { createStore, Provider } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { selectedPageIdAtom, tripAtom, tripModeAtom, tripPagesAtom } from '@/atoms/tripPage';
import type { Page } from '@/types';
import type { Trip } from '@/types/trip';
import { PageSelector } from './PageSelector';

const DEMO_TS = new Date('2026-01-01T00:00:00Z');

const demoTrip: Trip = {
  id: 1,
  title: '北海道旅行',
  urlId: 'trip1',
  startDate: new Date(2026, 4, 24),
  endDate: new Date(2026, 4, 26),
  createdAt: DEMO_TS,
  lastEditedAt: DEMO_TS,
};

const threePages: Page[] = [
  { id: 1, title: '札幌観光', tripId: 1, date: new Date(2026, 4, 24) },
  { id: 2, title: '小樽散策', tripId: 1, date: new Date(2026, 4, 25) },
  { id: 3, title: '函館見学', tripId: 1, date: new Date(2026, 4, 26) },
];

const singlePage: Page[] = [{ id: 1, title: '日帰り温泉ツアー', tripId: 1 }];

const manyPages: Page[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  title: `${i + 1}日目プラン`,
  tripId: 1,
  date: new Date(2026, 4, 24 + i),
}));

const longTitlePages: Page[] = [
  { id: 1, title: '北海道満喫ガッツリ堪能プラン', tripId: 1, date: new Date(2026, 4, 24) },
  { id: 2, title: '小樽運河と寿司めぐりの二日目', tripId: 1, date: new Date(2026, 4, 25) },
];

const mixedDatePages: Page[] = [
  { id: 1, title: '札幌観光', tripId: 1, date: new Date(2026, 4, 24) },
  { id: 2, title: '札幌観光（B案）', tripId: 1, date: new Date(2026, 4, 24) },
  { id: 3, title: '小樽散策', tripId: 1, date: new Date(2026, 4, 25) },
  { id: 4, title: '予備プラン', tripId: 1, date: null },
];

const AtomHydrator = ({
  trip,
  pages,
  selectedPageId,
  mode,
  children,
}: {
  trip: Trip;
  pages: Page[];
  selectedPageId?: Page['id'];
  mode?: 'view' | 'edit';
  children: ReactNode;
}) => {
  useHydrateAtoms([
    [tripAtom, trip],
    [tripPagesAtom, pages],
    [selectedPageIdAtom, selectedPageId ?? pages[0]?.id],
    [tripModeAtom, mode ?? 'view'],
  ]);
  return <>{children}</>;
};

type StoryDecoratorArgs = {
  trip: Trip;
  pages: Page[];
  mode?: 'view' | 'edit';
  selectedPageId?: Page['id'];
};

/**
 * PageSelector 用の共通デコレータ。
 * DesktopPill は `absolute top-full` で親 (position: relative) の下端に配置されるため、
 * ヘッダー相当のダミー枠を用意して pill の見え方を再現する。
 * MobilePill は body へ Portal されるので viewport 下端に表示される。
 */
const withStage = ({ trip, pages, mode, selectedPageId }: StoryDecoratorArgs): Decorator => {
  return function Wrap(Story) {
    const store = createStore();
    return (
      <MemoryRouter>
        <Provider store={store}>
          <AtomHydrator trip={trip} pages={pages} mode={mode} selectedPageId={selectedPageId}>
            {/* Header 相当のダミー枠。DesktopPill はこの枠の下端に浮遊する */}
            <div className='relative bg-teal-50/80 backdrop-blur-sm' style={{ padding: '12px 8px', minHeight: 72 }}>
              <div className='text-center text-14px text-slate-500'>[Header 相当のスペース]</div>
              <Story />
            </div>
            <div style={{ minHeight: 320, background: '#F4F2EC' }} />
          </AtomHydrator>
        </Provider>
      </MemoryRouter>
    );
  };
};

const meta = {
  title: 'Components/PageSelector',
  component: PageSelector,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'ページ選択UI一式（モバイル下部フローティング pill / デスクトップ上部フローティング pill / 編集・追加ダイアログ）。Header の子として配置される。',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PageSelector>;

export default meta;
type Story = StoryObj<typeof PageSelector>;

export const ViewMode: Story = {
  decorators: [withStage({ trip: demoTrip, pages: threePages, mode: 'view' })],
  parameters: {
    docs: {
      description: {
        story: '閲覧モード。pill タップで開く Popover はページ一覧のみ（編集 UI なし）。',
      },
    },
  },
};

export const EditMode: Story = {
  decorators: [withStage({ trip: demoTrip, pages: threePages, mode: 'edit', selectedPageId: 2 })],
  parameters: {
    docs: {
      description: {
        story: '編集モード。Popover 内に各ページの編集ペンと末尾に「＋ ページを追加」が現れる。',
      },
    },
  },
};

export const SinglePage: Story = {
  decorators: [
    withStage({
      trip: { id: 1, title: '日帰り温泉ツアー', urlId: 'trip1', createdAt: DEMO_TS, lastEditedAt: DEMO_TS },
      pages: singlePage,
      mode: 'view',
    }),
  ],
  parameters: {
    docs: {
      description: {
        story: 'ページが 1 つだけのとき pill は表示されない。編集モードでの「+ 追加」導線は別途検討中。',
      },
    },
  },
};

export const ManyPages: Story = {
  decorators: [withStage({ trip: demoTrip, pages: manyPages, mode: 'view', selectedPageId: 3 })],
  parameters: {
    docs: {
      description: {
        story: 'ページ数が 6 以上のとき、モバイル pill はドット→「N/M」番号表記に自動切替。',
      },
    },
  },
};

export const LongPageTitle: Story = {
  decorators: [withStage({ trip: demoTrip, pages: longTitlePages, mode: 'view' })],
  parameters: {
    docs: {
      description: {
        story: '長いタイトルは pill 内で truncate される。Popover 内では全文が確認できる。',
      },
    },
  },
};

export const MixedDatePages: Story = {
  decorators: [withStage({ trip: demoTrip, pages: mixedDatePages, mode: 'edit', selectedPageId: 1 })],
  parameters: {
    docs: {
      description: {
        story:
          'date 重複（同日の A案 / B案 のような複数 Page）と date=null（予備プラン）が混在するケース。並び順: date 昇順 → id 昇順 → null 末尾。',
      },
    },
  },
};

export const NoDates: Story = {
  decorators: [
    withStage({
      trip: { id: 1, title: '日程未定の旅', urlId: 'trip1', createdAt: DEMO_TS, lastEditedAt: DEMO_TS },
      pages: [
        { id: 1, title: 'プラン A', tripId: 1 },
        { id: 2, title: 'プラン B', tripId: 1 },
        { id: 3, title: 'プラン C', tripId: 1 },
      ],
      mode: 'view',
    }),
  ],
  parameters: {
    docs: {
      description: {
        story: '日付が設定されていないページ一覧。pill / Popover ともに日付を省略。',
      },
    },
  },
};
