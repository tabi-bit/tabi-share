/// <reference types="google.maps" />

import {
  AdvancedMarker,
  APIProvider,
  Map as GoogleMap,
  InfoWindow,
  type MapMouseEvent,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { debounce } from 'lodash-es';
import { MapPin, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { PlaceDetailsCompact, type PlaceDetailsCompactElement } from '@/components/google-maps/PlaceDetailsCompact';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { Location, LocationCreate } from '@/types/location';

interface PlaceSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (location: LocationCreate) => void;
  initialLocation?: Location | null;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// 日本の中心付近（デフォルト表示位置）
const DEFAULT_CENTER = { lat: 36.5, lng: 138.0 };
const DEFAULT_ZOOM = 5;
const SELECTED_ZOOM = 15;

/**
 * 場所検索ダイアログの内部コンテンツ
 * APIProviderの内部でGoogle Maps APIを使用する
 */
const PlaceSearchContent = ({
  onConfirm,
  onCancel,
  initialLocation,
}: {
  onConfirm: (location: LocationCreate) => void;
  onCancel: () => void;
  initialLocation?: Location | null;
}) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<LocationCreate | null>(
    initialLocation
      ? {
          googlePlaceId: initialLocation.googlePlaceId,
          name: initialLocation.name,
          address: initialLocation.address,
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
        }
      : null
  );
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(
    initialLocation?.latitude != null && initialLocation?.longitude != null
      ? { lat: initialLocation.latitude, lng: initialLocation.longitude }
      : null
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  // POIクリック時の確認用（Places UI Kit表示 + ユーザー確認後に選択確定）
  const [pendingPoi, setPendingPoi] = useState<{ placeId: string; lat: number; lng: number } | null>(null);
  // UI Kitの gmp-load で取得したPlaceオブジェクト（fetchFields不要でフィールド取得）
  const [poiPlace, setPoiPlace] = useState<google.maps.places.Place | null>(null);
  // POI切り替え時にonCloseで状態が初期化されないようにするフラグ
  const justSwitchedPoiRef = useRef(false);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // モバイル判定（Tailwindのsm:ブレイクポイントに合わせて640px）
  const isMobile = useMediaQuery('(max-width: 640px)');
  const poiInfoOrientation = isMobile ? 'VERTICAL' : 'HORIZONTAL';
  const poiInfoSize = isMobile ? { minWidth: 200, maxWidth: 240 } : { minWidth: 400, maxWidth: 420 };

  // 初期表示位置
  useEffect(() => {
    if (map && initialLocation?.latitude != null && initialLocation?.longitude != null) {
      map.panTo({ lat: initialLocation.latitude, lng: initialLocation.longitude });
      map.setZoom(SELECTED_ZOOM);
    }
  }, [map, initialLocation]);

  // サジェスション外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autocomplete検索（API呼び出しのみ、state更新は呼び出し元で行う）
  const executeSearch = useCallback(
    async (value: string) => {
      if (!placesLib || value.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
      }

      try {
        const request: google.maps.places.AutocompleteRequest = {
          input: value,
          sessionToken: sessionTokenRef.current,
          locationBias: map?.getBounds() ?? undefined,
        };

        const { suggestions: results } = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    },
    [placesLib, map]
  );

  // 500msデバウンスされた検索（連続入力で無駄なAPI呼び出しを防ぐ）
  const debouncedSearch = useMemo(() => debounce(executeSearch, 500), [executeSearch]);

  // アンマウント・依存更新時にpending呼び出しをキャンセル
  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

  // 地図クリック
  // - POIクリック: InfoWindowで確認してから取得（誤タップでの課金を防ぐ）
  // - 空地クリック: 即座にピン配置＋場所名入力欄を表示
  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      const latLng = event.detail.latLng;
      if (!latLng) return;

      const placeId = event.detail.placeId;
      if (placeId) {
        // POI: デフォルトのGoogleインフォカードを抑制して、自前の確認InfoWindowを表示
        event.stop();
        // 既にInfoWindowが開いている状態 → 新POIへ切り替え
        // 直後に発火するonCloseで状態が初期化されないようフラグを立てる
        if (pendingPoi) {
          justSwitchedPoiRef.current = true;
        }
        setPendingPoi({ placeId, lat: latLng.lat, lng: latLng.lng });
        setPoiPlace(null);
        setShowSuggestions(false);
        return;
      }

      // 空地クリック: 既存のpending POIをクリアしてピン配置
      setPendingPoi(null);
      setPoiPlace(null);
      const pos = { lat: latLng.lat, lng: latLng.lng };
      setMarkerPosition(pos);
      setSelectedPlace({
        googlePlaceId: null,
        name: '',
        address: null,
        latitude: latLng.lat,
        longitude: latLng.lng,
      });
      setShowSuggestions(false);
    },
    [pendingPoi]
  );

  // UI Kitのload完了時にPlaceオブジェクトを保存（追加API呼び出しなし）
  const handlePoiLoad = useCallback((event: Event) => {
    const target = event.target as PlaceDetailsCompactElement | null;
    setPoiPlace(target?.place ?? null);
  }, []);

  // POIの「この場所を選択」ボタン押下時
  // UI Kitが内部取得したPlaceオブジェクトのフィールドを利用するため、追加API呼び出しは発生しない
  const handleSelectPendingPoi = useCallback(() => {
    if (!pendingPoi) return;

    const location: LocationCreate = {
      googlePlaceId: poiPlace?.id ?? pendingPoi.placeId,
      name: poiPlace?.displayName ?? '',
      address: poiPlace?.formattedAddress ?? null,
      latitude: poiPlace?.location?.lat() ?? pendingPoi.lat,
      longitude: poiPlace?.location?.lng() ?? pendingPoi.lng,
    };

    setSelectedPlace(location);
    setQuery(location.name);

    if (location.latitude != null && location.longitude != null) {
      setMarkerPosition({ lat: location.latitude, lng: location.longitude });
    }

    setPendingPoi(null);
    setPoiPlace(null);
  }, [pendingPoi, poiPlace]);

  // 場所名の編集
  const handleNameChange = useCallback((value: string) => {
    setSelectedPlace(prev => (prev ? { ...prev, name: value } : prev));
  }, []);

  // サジェスション選択
  const handleSelectSuggestion = useCallback(
    async (suggestion: google.maps.places.AutocompleteSuggestion) => {
      if (!(placesLib && suggestion.placePrediction)) return;

      setShowSuggestions(false);
      setSuggestions([]);

      try {
        const place = suggestion.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location', 'id'],
        });

        const location: LocationCreate = {
          googlePlaceId: place.id ?? null,
          name: place.displayName ?? '',
          address: place.formattedAddress ?? null,
          latitude: place.location?.lat() ?? null,
          longitude: place.location?.lng() ?? null,
        };

        setSelectedPlace(location);
        setQuery(location.name);

        if (location.latitude != null && location.longitude != null) {
          const pos = { lat: location.latitude, lng: location.longitude };
          setMarkerPosition(pos);
          map?.panTo(pos);
          map?.setZoom(SELECTED_ZOOM);
        }

        // セッショントークンをリセット
        sessionTokenRef.current = null;
      } catch {
        toast.error('場所情報の取得に失敗しました');
      }
    },
    [placesLib, map]
  );

  const handleConfirm = () => {
    if (!selectedPlace) return;
    const trimmedName = selectedPlace.name.trim();
    if (!trimmedName) return;
    onConfirm({ ...selectedPlace, name: trimmedName });
  };

  return (
    <>
      <DialogBody className='flex flex-col gap-1'>
        {/* 地図エリア（flex-1 で DialogBody の残り空間を全て吸収）
            DialogContent size='large' が h-[calc(100dvh-余白)] で明示的な高さを持つため、
            flex-1 連鎖が正しく機能する。min-h-0 は flex 子要素のデフォルト min-height:auto を上書きして
            親からの縮小要求に従わせるため（これがないと overflow が発生する）。 */}
        <div className='relative min-h-0 w-full flex-1 overflow-hidden rounded-md border'>
          <GoogleMap
            defaultCenter={DEFAULT_CENTER}
            defaultZoom={DEFAULT_ZOOM}
            mapId='place-search-map'
            gestureHandling='greedy'
            disableDefaultUI
            zoomControl
            onClick={handleMapClick}
          >
            {markerPosition && <AdvancedMarker position={markerPosition} />}
            {pendingPoi && (
              <InfoWindow
                position={{ lat: pendingPoi.lat, lng: pendingPoi.lng }}
                onClose={() => {
                  // POI切り替え（A→B）に伴う自動closeは無視
                  if (justSwitchedPoiRef.current) {
                    justSwitchedPoiRef.current = false;
                    return;
                  }
                  setPendingPoi(null);
                  setPoiPlace(null);
                }}
                headerDisabled
                minWidth={poiInfoSize.minWidth}
                maxWidth={poiInfoSize.maxWidth}
              >
                <PlaceDetailsCompact
                  placeId={pendingPoi.placeId}
                  orientation={poiInfoOrientation}
                  truncationPreferred
                  onLoad={handlePoiLoad}
                />
              </InfoWindow>
            )}
          </GoogleMap>

          {/* 選択ボタンはInfoWindowの外（マップ上にフローティング）に配置する。
                理由1: InfoWindow内に置くとPlaces UI Kit Web Componentのclick処理に吸われて発火しないことがある
                理由2: InfoWindow内が高くなりブラウザ内蔵のスクロールが出てしまうのを防ぐ */}
          {pendingPoi && (
            <div className='-translate-x-1/2 absolute bottom-3 left-1/2 z-10'>
              <Button onClick={handleSelectPendingPoi} className='shadow-lg'>
                この場所を選択
              </Button>
            </div>
          )}

          {/* 検索入力（マップに重ねて表示） */}
          <div className='absolute top-2 right-2 left-2 z-10' ref={suggestionsRef}>
            <div className='relative'>
              <Search className='-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 h-4 w-4 text-muted-foreground' />
              <Input
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  debouncedSearch(e.target.value);
                }}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder='場所を検索...'
                className='bg-background pl-9 shadow-md'
              />
            </div>

            {/* サジェスションリスト */}
            {showSuggestions && (
              <div className='absolute top-full right-0 left-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md'>
                {suggestions.map((suggestion, index) => {
                  const prediction = suggestion.placePrediction;
                  if (!prediction) return null;
                  return (
                    <button
                      key={prediction.placeId ?? index}
                      type='button'
                      className='flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent'
                      onClick={() => handleSelectSuggestion(suggestion)}
                    >
                      <MapPin className='mt-0.5 h-4 w-4 shrink-0 text-muted-foreground' />
                      <div>
                        <div className='font-medium'>{prediction.mainText?.toString()}</div>
                        <div className='text-muted-foreground text-xs'>{prediction.secondaryText?.toString()}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <p className='text-10px text-muted-foreground'>
          地図上の施設をタップするか、空地をタップしてピンを刺すこともできます
        </p>

        {/* 選択された場所の情報 */}
        {selectedPlace && (
          <div className='space-y-2 rounded-md border bg-muted/50 p-2'>
            <div className='space-y-1'>
              <Label htmlFor='place-name' className='text-xs'>
                場所名<span className='text-red-500'>*</span>
              </Label>
              <Input
                id='place-name'
                value={selectedPlace.name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder='例: 草津温泉'
                maxLength={200}
              />
            </div>
            {selectedPlace.address && <div className='text-muted-foreground text-xs'>{selectedPlace.address}</div>}
          </div>
        )}
      </DialogBody>

      <DialogFooter>
        <Button variant='outline' onClick={onCancel}>
          キャンセル
        </Button>
        <Button onClick={handleConfirm} disabled={!selectedPlace?.name.trim()}>
          決定
        </Button>
      </DialogFooter>
    </>
  );
};

/**
 * 場所検索ダイアログ
 *
 * Google Maps JavaScript APIを使用して場所を検索し、
 * 選択した場所の情報を返すダイアログ。
 */
export const PlaceSearchDialog = ({ open, onOpenChange, onConfirm, initialLocation }: PlaceSearchDialogProps) => {
  const handleConfirm = (location: LocationCreate) => {
    onConfirm(location);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size='large'>
        <DialogHeader>
          <DialogTitle>場所を検索</DialogTitle>
        </DialogHeader>
        {open && GOOGLE_MAPS_API_KEY && (
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <PlaceSearchContent onConfirm={handleConfirm} onCancel={handleCancel} initialLocation={initialLocation} />
          </APIProvider>
        )}
        {open && !GOOGLE_MAPS_API_KEY && (
          <DialogBody>
            <div className='p-4 text-center text-muted-foreground text-sm'>Google Maps APIキーが設定されていません</div>
          </DialogBody>
        )}
      </DialogContent>
    </Dialog>
  );
};
