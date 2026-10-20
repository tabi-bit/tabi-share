type LatLng = { latitude: number; longitude: number };

/** 2 点間の直線距離 (km) */
export const distanceKm = (a: LatLng, b: LatLng): number => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

export const formatKm = (km: number): string => `${km.toFixed(1)}km`;
