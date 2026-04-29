/// <reference types="google.maps" />

import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { useEffect, useState } from 'react';

// @types/google.maps@3.58 時点ではPlaceDetailsCompactElement型が未提供のため、必要なフィールドのみ補完
export type PlaceDetailsCompactElement = HTMLElement & {
  readonly place: google.maps.places.Place | null;
  orientation?: string | null;
  truncationPreferred?: boolean | null;
};

type PlaceDetailsCompactProps = {
  placeId: string;
  orientation?: 'HORIZONTAL' | 'VERTICAL';
  truncationPreferred?: boolean;
  onLoad?: (event: Event) => void;
  onError?: (event: Event) => void;
};

// Web Componentのイベントを購読するヘルパー
const useDomEventListener = (
  target: EventTarget | null,
  name: string | undefined,
  callback: ((event: Event) => void) | undefined
) => {
  useEffect(() => {
    if (!(target && name && callback)) return;
    target.addEventListener(name, callback);
    return () => target.removeEventListener(name, callback);
  }, [target, name, callback]);
};

// Web Componentの書き込み可能プロパティへReactの値をバインド
const usePropBinding = <T extends object, K extends keyof T>(object: T | null, prop: K, value: T[K] | undefined) => {
  useEffect(() => {
    if (!object || value === undefined) return;
    object[prop] = value;
  }, [object, prop, value]);
};

/**
 * Google Places UI Kit の <gmp-place-details-compact> のReactラッパー
 *
 * 公式サンプル参考: https://github.com/visgl/react-google-maps/tree/main/examples/places-ui-kit
 *
 * 課金: Places UI Kit Query ($1/1000, 月10,000件無料)
 * gmp-load イベントで取得した place オブジェクトから id, location などを取得可能
 */
export const PlaceDetailsCompact = ({
  placeId,
  orientation,
  truncationPreferred,
  onLoad,
  onError,
}: PlaceDetailsCompactProps) => {
  const placesLib = useMapsLibrary('places');
  const [element, setElement] = useState<PlaceDetailsCompactElement | null>(null);

  usePropBinding(element, 'orientation', orientation);
  usePropBinding(element, 'truncationPreferred', truncationPreferred);
  useDomEventListener(element, 'gmp-load', onLoad);
  useDomEventListener(element, 'gmp-error', onError);

  if (!(placesLib && placeId)) return null;

  return (
    <gmp-place-details-compact ref={setElement}>
      <gmp-place-details-place-request place={placeId} />
      <gmp-place-content-config>
        {/* 公式Compactサンプル準拠で要素を明示列挙（gmp-place-all-contentより制御しやすい） */}
        <gmp-place-media lightbox-preferred />
        <gmp-place-rating />
        <gmp-place-type />
        <gmp-place-price />
        <gmp-place-accessible-entrance-icon />
        <gmp-place-open-now-status />
        <gmp-place-attribution light-scheme-color='gray' dark-scheme-color='white' />
      </gmp-place-content-config>
    </gmp-place-details-compact>
  );
};
