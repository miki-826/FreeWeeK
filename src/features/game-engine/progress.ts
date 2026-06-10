import type { Rank } from "@/types/game";

export const DAY_LABELS = [
  "月曜日",
  "火曜日",
  "水曜日",
  "木曜日",
  "金曜日",
] as const;

export const DAY_MOODS = [
  "憂鬱な始業",
  "まだ遠い自由",
  "週の中ボス",
  "ラスト前の追い込み",
  "自由前夜",
] as const;

export function daysUntilFreedom(currentDayIndex: number): number {
  return Math.max(0, DAY_LABELS.length - currentDayIndex);
}

export function addFreedomGauge(current: number, gain: number): number {
  return Math.min(100, Math.max(0, current + gain));
}

export function finalRankFromGauge(gauge: number): Rank {
  if (gauge >= 90) return "S";
  if (gauge >= 70) return "A";
  if (gauge >= 50) return "B";
  return "C";
}
