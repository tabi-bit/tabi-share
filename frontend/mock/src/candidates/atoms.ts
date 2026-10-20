import { atom } from 'jotai';

/** 閲覧画面の地図でタップされたブロック。タイムライン側で強調表示する */
export const highlightedBlockIdAtom = atom<number | null>(null);
