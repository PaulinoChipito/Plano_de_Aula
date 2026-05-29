import { GradeEntry } from "@/lib/storage";

export const MAC_PESO = 0.6;
export const NPT_PESO = 0.4;

export function getMacAverage(mac: GradeEntry[]): number {
  if (mac.length === 0) return 0;
  return Math.round((mac.reduce((acc, e) => acc + e.nota, 0) / mac.length) * 10) / 10;
}

export function getNotaFinal(mac: GradeEntry[], npt: number | null): number | null {
  const macAvg = mac.length > 0 ? getMacAverage(mac) : null;
  if (macAvg === null && npt === null) return null;
  if (macAvg !== null && npt !== null) {
    return Math.round((macAvg * MAC_PESO + npt * NPT_PESO) * 10) / 10;
  }
  if (macAvg !== null) return macAvg;
  return npt;
}
