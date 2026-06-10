import { DAY_LABELS, DAY_MOODS } from "@/features/game-engine/progress";
import type { Rank } from "@/types/game";

type Props = {
  currentDayIndex: number;
  ranks: (Rank | null)[];
  weekendUnlocked: boolean;
};

export default function WeekMap({
  currentDayIndex,
  ranks,
  weekendUnlocked,
}: Props) {
  return (
    <div className="space-y-2">
      {DAY_LABELS.map((label, i) => {
        const done = i < currentDayIndex;
        const active = i === currentDayIndex;
        return (
          <div
            key={label}
            className={`pixel-card px-3 py-2 flex items-center justify-between text-sm ${
              active ? "border-accent text-accent" : done ? "opacity-80" : "opacity-50"
            }`}
          >
            <span>
              {done ? "✅" : active ? "▶" : "🔒"} {label}
              <span className="ml-2 text-xs opacity-70">{DAY_MOODS[i]}</span>
            </span>
            <span>
              {done && ranks[i] ? `評価 ${ranks[i]}` : active ? "本日のタスク" : "未解放"}
            </span>
          </div>
        );
      })}
      <div
        className={`pixel-card px-3 py-2 flex items-center justify-between text-sm ${
          weekendUnlocked ? "border-freedom text-freedom" : "opacity-50"
        }`}
      >
        <span>{weekendUnlocked ? "🌈" : "🔒"} 土日</span>
        <span>{weekendUnlocked ? "自由エリア解放！" : "自由エリア"}</span>
      </div>
    </div>
  );
}
