type Props = {
  value: number;
  rainbow?: boolean;
};

export default function FreedomGauge({ value, rainbow = false }: Props) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-freedom">自由ゲージ</span>
        <span>{value}%</span>
      </div>
      <div className="h-4 w-full pixel-card !p-0 overflow-hidden">
        <div
          className={`h-full transition-all duration-700 ${
            rainbow ? "rainbow-bar" : "bg-freedom"
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
