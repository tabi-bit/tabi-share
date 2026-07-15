/**
 * pill (Mobile / Desktop) の共通表面スタイル。
 * `bg-white/75 backdrop-blur-md` で Header の teal 色と別レイヤー化し、
 * shadow + `ring-1 ring-white/60` で浮遊感を出す。
 * shadow-lg より Y offset を小さく取り、blur が pill 上端にも回り込むようにして、
 * ヘッダー背景と上端が同化するのを防ぐ。
 */
export const PILL_SURFACE_CLASSES =
  'bg-white/75 shadow-[0_4px_16px_-2px_rgba(0,0,0,0.14)] backdrop-blur-md ring-1 ring-white/60';
