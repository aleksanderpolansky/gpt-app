import type {
  ValueObjectDomainGroup,
  ValueObjectSignalTone,
  ValueObjectUiNode,
} from "./value-object-types";
import {
  formatValueObjectPercent,
  getValueObjectDomainLabel,
  isValueObjectNeedsReview,
} from "./value-object-normalizer";

export interface ValueObjectCloudProps {
  readonly valueObjects: readonly ValueObjectUiNode[];
  readonly domainGroups: readonly ValueObjectDomainGroup[];
  readonly selectedObjectId?: string;
}

interface ValueObjectCloudItemProps {
  readonly valueObject: ValueObjectUiNode;
  readonly domainGroups: readonly ValueObjectDomainGroup[];
  readonly selectedObjectId?: string;
}

const SECTION_CLASSES =
  "rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur";

const HEADER_LABEL_CLASSES =
  "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

const HEADER_TITLE_CLASSES =
  "text-lg font-semibold tracking-tight text-slate-950";

const HEADER_TEXT_CLASSES = "text-sm leading-6 text-slate-600";

const CLOUD_WRAP_CLASSES =
  "flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-4";

const CLOUD_ITEM_BASE_CLASSES =
  "group inline-flex items-center gap-2 rounded-full border px-3 py-2 font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md";

const CLOUD_ITEM_SELECTED_CLASSES = "ring-2 ring-indigo-100";

const EMPTY_STATE_CLASSES =
  "rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center";

const SIZE_CLASS_NAMES = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
} as const;

const TONE_ITEM_CLASS_NAMES: Record<ValueObjectSignalTone, string> = {
  slate: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100",
  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  violet: "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100",
  amber: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
  rose: "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100",
};

const TONE_DOT_CLASS_NAMES: Record<ValueObjectSignalTone, string> = {
  slate: "bg-slate-400",
  indigo: "bg-indigo-500",
  emerald: "bg-emerald-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  cyan: "bg-cyan-500",
};

const TONE_META_CLASS_NAMES: Record<ValueObjectSignalTone, string> = {
  slate: "text-slate-500",
  indigo: "text-indigo-600",
  emerald: "text-emerald-600",
  violet: "text-violet-600",
  amber: "text-amber-700",
  rose: "text-rose-600",
  cyan: "text-cyan-600",
};

const getPrimaryTone = (valueObject: ValueObjectUiNode): ValueObjectSignalTone =>
  isValueObjectNeedsReview(valueObject)
    ? "amber"
    : valueObject.metrics[0]?.tone ?? "slate";

const getCloudItemSize = (
  valueObject: ValueObjectUiNode,
): keyof typeof SIZE_CLASS_NAMES => {
  if (valueObject.activityCount >= 20 || valueObject.progressPercent >= 80) {
    return "xl";
  }

  if (valueObject.activityCount >= 12 || valueObject.progressPercent >= 60) {
    return "lg";
  }

  if (valueObject.activityCount >= 5 || valueObject.progressPercent >= 35) {
    return "md";
  }

  return "sm";
};

const getCloudObjectCountLabel = (count: number): string =>
  count === 1 ? "1 cloud item" : `${count} cloud items`;

function ValueObjectCloudEmptyState() {
  return (
    <div className={EMPTY_STATE_CLASSES}>
      <p className="text-sm font-semibold text-slate-900">
        No cloud items are available.
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        The cloud is generated from the same local UI-7 fixtures as the list and
        tree views.
      </p>
    </div>
  );
}

function ValueObjectCloudItem({
  valueObject,
  domainGroups,
  selectedObjectId,
}: ValueObjectCloudItemProps) {
  const tone = getPrimaryTone(valueObject);
  const size = getCloudItemSize(valueObject);
  const domainLabel = getValueObjectDomainLabel(domainGroups, valueObject.domain);
  const isSelected = selectedObjectId === valueObject.id;
  const progressLabel = formatValueObjectPercent(valueObject.progressPercent);

  return (
    <a
      className={[
        CLOUD_ITEM_BASE_CLASSES,
        TONE_ITEM_CLASS_NAMES[tone],
        SIZE_CLASS_NAMES[size],
        isSelected ? CLOUD_ITEM_SELECTED_CLASSES : "",
      ]
        .filter(Boolean)
        .join(" ")}
      href={`#${valueObject.id}`}
      aria-label={`${valueObject.title}, ${domainLabel}, progress ${progressLabel}`}
      title={`${valueObject.title} · ${domainLabel} · ${progressLabel}`}
    >
      <span
        className={[
          "h-2.5 w-2.5 rounded-full",
          TONE_DOT_CLASS_NAMES[tone],
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden="true"
      />
      <span>{valueObject.title}</span>
      <span
        className={[
          "rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold",
          TONE_META_CLASS_NAMES[tone],
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {progressLabel}
      </span>
    </a>
  );
}

export function ValueObjectCloud({
  valueObjects,
  domainGroups,
  selectedObjectId,
}: ValueObjectCloudProps) {
  const cloudObjectCountLabel = getCloudObjectCountLabel(valueObjects.length);

  return (
    <section className={SECTION_CLASSES} aria-label="Value Object cloud">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <p className={HEADER_LABEL_CLASSES}>Cloud view</p>
            <h2 className={HEADER_TITLE_CLASSES}>Value Object cloud</h2>
            <p className={HEADER_TEXT_CLASSES}>
              Visual density preview only. Size and color are UI signals, not a
              productivity diagnosis.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              Cloud size
            </p>
            <p className="text-lg font-semibold text-slate-950">
              {cloudObjectCountLabel}
            </p>
          </div>
        </div>

        {valueObjects.length === 0 ? (
          <ValueObjectCloudEmptyState />
        ) : (
          <div className={CLOUD_WRAP_CLASSES}>
            {valueObjects.map((valueObject) => (
              <ValueObjectCloudItem
                key={valueObject.id}
                valueObject={valueObject}
                domainGroups={domainGroups}
                selectedObjectId={selectedObjectId}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
