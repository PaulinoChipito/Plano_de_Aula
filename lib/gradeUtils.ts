import { GradeEntry } from "@/lib/storage";

export function getMacAverage(mac: GradeEntry[]): number {
  if (mac.length === 0) return 0;
  return Math.round((mac.reduce((acc, e) => acc + e.nota, 0) / mac.length) * 10) / 10;
}

export function getNotaFinal(mac: GradeEntry[], npt: number | null): number | null {
  const macAvg = mac.length > 0 ? getMacAverage(mac) : null;
  if (macAvg === null && npt === null) return null;
  return Math.round((((macAvg ?? 0) + (npt ?? 0)) / 2) * 10) / 10;
}
