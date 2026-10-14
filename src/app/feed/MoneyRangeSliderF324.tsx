"use client";

type Props = {
  min: number; max: number; low: number; high: number;
  lowLabel: string; highLabel: string;
  onLow: (value: number) => void;
  onHigh: (value: number) => void;
};

// One visible range track with two accessible independently movable thumbs.
// Exact values remain editable in numeric fields in the parent component.
export default function MoneyRangeSliderF324({
  min, max, low, high, lowLabel, highLabel, onLow, onHigh,
}: Props) {
  const span = Math.max(1, max - min);
  const boundedLow = Math.max(min, Math.min(max, low));
  const boundedHigh = Math.max(min, Math.min(max, high));
  const left = 100 * (boundedLow - min) / span;
  const right = 100 * (boundedHigh - min) / span;
  return (
    <div className="relative h-10" role="group" aria-label={`${lowLabel} / ${highLabel}`}>
      <div className="pointer-events-none absolute inset-x-0 top-[18px] h-1 rounded-full bg-[#d5daeb]" />
      <div className="pointer-events-none absolute top-[18px] h-1 rounded-full bg-[#3b6ef8]"
        style={{ left: `${left}%`, width: `${Math.max(0, right - left)}%` }} />
      <input type="range" min={min} max={max} step="0.01" value={boundedLow}
        aria-label={lowLabel} aria-valuetext={String(boundedLow)}
        onChange={e => onLow(Math.min(Number(e.target.value), boundedHigh))}
        className="f324-money-thumb pointer-events-none absolute inset-x-0 top-0 z-20 h-10 w-full appearance-none bg-transparent" />
      <input type="range" min={min} max={max} step="0.01" value={boundedHigh}
        aria-label={highLabel} aria-valuetext={String(boundedHigh)}
        onChange={e => onHigh(Math.max(Number(e.target.value), boundedLow))}
        className="f324-money-thumb pointer-events-none absolute inset-x-0 top-0 z-10 h-10 w-full appearance-none bg-transparent" />
      <style jsx>{`
        .f324-money-thumb::-webkit-slider-thumb {
          -webkit-appearance:none;appearance:none;pointer-events:auto;
          width:18px;height:18px;border-radius:50%;background:#3b6ef8;
          border:2px solid white;box-shadow:0 0 0 1px #88a8ff;cursor:grab;
        }
        .f324-money-thumb::-moz-range-thumb {
          pointer-events:auto;width:14px;height:14px;border-radius:50%;
          background:#3b6ef8;border:2px solid white;cursor:grab;
        }
      `}</style>
    </div>
  );
}
