type Props = {
  remaining: number;
  timeLimit: number;
};

export default function TimerBar({ remaining, timeLimit }: Props) {
  const ratio = Math.max(0, remaining / timeLimit);
  const danger = remaining <= 5;
  const warning = remaining <= 10;

  return (
    <div className={warning ? "animate-shake" : ""}>
      <div className="flex justify-between text-sm mb-1">
        <span>残り時間</span>
        <span className={danger ? "text-danger text-lg" : ""}>
          {remaining} 秒
        </span>
      </div>
      <div className="h-3 w-full pixel-inset overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            danger ? "bg-danger" : warning ? "bg-accent-warm" : "bg-accent"
          }`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
