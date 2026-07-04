import { HOME_COORDS } from "./family";

/** Fågelvägen i km mellan huset och en punkt (haversine). */
export function kmFromHome(lat: number, lng: number): number {
  const R = 6371;
  const dLat = ((lat - HOME_COORDS.lat) * Math.PI) / 180;
  const dLng = ((lng - HOME_COORDS.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((HOME_COORDS.lat * Math.PI) / 180) *
      Math.cos((lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type DistanceFilter = {
  key: string;
  label: string;
  match: (km: number) => boolean;
};

export const DISTANCE_FILTERS: DistanceFilter[] = [
  { key: "10", label: "≤ 10 km", match: (km) => km <= 10 },
  { key: "25", label: "≤ 25 km", match: (km) => km <= 25 },
  { key: "50", label: "≤ 50 km", match: (km) => km <= 50 },
  { key: "far", label: "> 50 km", match: (km) => km > 50 },
];
