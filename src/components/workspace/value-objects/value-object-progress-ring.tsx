import type {
  ValueObjectSignalTone,
  ValueObjectUiNode,
} from "./value-object-types";
import {
  clampValueObjectPercent,
  formatValueObjectPercent,
  isValueObjectNeedsReview,
} from "./value-object-normalizer";

export interface ValueObjectProgressRingProps {
  readonly valueObject: ValueObjectUiNode;
  readonly size?: "sm" | "md" | "lg";
  readonly showLabel?: boolean;
}

export interface ValueObjectProgressRingGroupProps {
  readonly valueObject: ValueObjectUiNode;
}

const SIZE_CONFIG = {
  sm: {
    box: "h-14 w-14",
    radius: 20,
    strokeWidth: 5,
    text: "text-xs",
  },
  md: {
    box: "h-20 w-20",
    radius: 30,
    strokeWidth: 6,
    text: "text-sm",
  },
  lg: {
    box: "h-28 w-28",
    radius: 42,
    strokeWidth: 8,
    text: "text-base",
  },
} as const;

const TONE_RING_CLASS_NAMES: Record<ValueObjectSignalTone, string> = {
  slate: "stroke-slate-500",
  indigo: "stroke-indigo-500",
  emerald: "stroke-emerald-500",
  violet: "stroke-violet-500",
  amber: "stroke-amber-500",
  rose: "stroke-rose-500",
  cyan: "stroke-cyan-500",
};

const TONE_TEXT_CLASS_NAMES: Record<ValueObjectSignalTone, string> = {
  slate: "text-slate-700",
  indigo: "text-indigo-700",
  emerald: "text-emerald-700",
  violet: "text-violet-700",
  amber: "text-amber-800",
  rose: "text-rose-700",
  cyan: "text-cyan-700",
};

const getProgressTone = (valueObject: ValueObjectUiNode): ValueObjectSignalTone => {
  if (isValueObjectNeedsReview(valueObject)) {
    return "amber";
  }

  if (valueObject.progressPercent >= 70) {
    return "emerald";
  }

  if (valueObject.progressPercent >= 45) {
    return "indigo";
  }

  return "rose";
};

export function ValueObjectProgressRing({
  valueObject,
  size = "md",
  showLabel = true,
}: ValueObjectProgressRingProps) {
  const config = SIZE_CONFIG[size];
  const percent = clampValueObjectPercent(valueObject.progressPercent);
  const tone = getProgressTone(valueObject);
  const center = 50;
  const circumference = 2 * Math.PI * config.radius;
  const dashOffset = circumference - (percent / 100) * circumference;
  const percentLabel = formatValueObjectPercent(percent);

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className={["relative", config.box].filter(Boolean).join(" ")}>
        <svg
          aria-label={`${valueObject.title} progress ${percentLabel}`}
          className="h-full w-full -rotate-90"
          role="img"
          viewBox="0 0 100 100"
        >
          <circle
            className="stroke-slate-200"
            cx={center}
            cy={center}
            fill="none"
            r={config.radius}
            strokeWidth={config.strokeWidth}
          />
          <circle
            className={[
              "transition-all duration-500",
              TONE_RING_CLASS_NAMES[tone],
            ]
              .filter(Boolean)
              .join(" ")}
            cx={center}
            cy={center}
            fill="none"
            r={config.radius}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            strokeWidth={config.strokeWidth}
          />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={[
              "font-semibold tabular-nums",
              config.text,
              TONE_TEXT_CLASS_NAMES[tone],
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {percentLabel}
          </span>
        </div>
      </div>

      {showLabel ? (
        <span className="max-w-28 text-center text-xs font-medium leading-4 text-slate-600">
          {isValueObjectNeedsReview(valueObject)
            ? "Review signal"
            : "Progress preview"}
        </span>
      ) : null}
    </div>
  );
}

export function ValueObjectProgressRingGroup({
  valueObject,
}: ValueObjectProgressRingGroupProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
      <ValueObjectProgressRing valueObject={valueObject} size="lg" />

      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Progress signal
        </p>
        <p className="text-sm font-semibold text-slate-950">
          {valueObject.title}
        </p>
        <p className="text-sm leading-6 text-slate-600">
          Display-only progress indicator for the Value Object preview layer.
        </p>
      </div>
    </div>
  );
}
