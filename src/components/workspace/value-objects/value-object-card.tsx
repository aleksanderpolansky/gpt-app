import type {
  ValueObjectSignalTone,
  ValueObjectUiNode,
} from "./value-object-types";
import {
  getEnabledValueObjectActions,
  getPrimaryValueObjectAction,
} from "./value-object-action-policy";
import { ValueObjectProgressRing } from "./value-object-progress-ring";
import { ValueObjectStatusBadgeGroup } from "./value-object-status-badge";

export interface ValueObjectCardProps {
  readonly valueObject: ValueObjectUiNode;
  readonly domainLabel: string;
  readonly isSelected?: boolean;
}

const CARD_BASE_CLASSES =
  "group rounded-3xl border bg-white/90 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md";

const SELECTED_CARD_CLASSES = "border-indigo-300 ring-2 ring-indigo-100";

const DEFAULT_CARD_CLASSES = "border-slate-200";

const TITLE_CLASSES = "text-lg font-semibold tracking-tight text-slate-950";

const DESCRIPTION_CLASSES = "text-sm leading-6 text-slate-600";

const SECTION_LABEL_CLASSES =
  "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500";

const CHIP_CLASSES =
  "inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700";

const ACTION_CLASSES =
  "inline-flex items-center justify-center rounded-2xl border px-3 py-2 text-sm font-semibold transition";

const TONE_DOT_CLASS_NAMES: Record<ValueObjectSignalTone, string> = {
  slate: "bg-slate-400",
  indigo: "bg-indigo-500",
  emerald: "bg-emerald-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  cyan: "bg-cyan-500",
};

const TONE_ACTION_CLASS_NAMES: Record<ValueObjectSignalTone, string> = {
  slate: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100",
  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  violet: "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100",
  amber: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
  rose: "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100",
};

const MUTED_ACTION_CLASSES =
  "border-slate-200 bg-white text-slate-500 hover:bg-slate-50";

const getPrimaryTone = (valueObject: ValueObjectUiNode): ValueObjectSignalTone =>
  valueObject.metrics[0]?.tone ?? "slate";

function ValueObjectChipList({
  items,
  emptyLabel,
}: {
  readonly items: readonly string[];
  readonly emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className={CHIP_CLASSES}>
          {item}
        </span>
      ))}
    </div>
  );
}

function ValueObjectActionRow({
  valueObject,
}: {
  readonly valueObject: ValueObjectUiNode;
}) {
  const enabledActions = getEnabledValueObjectActions(valueObject);
  const primaryAction = getPrimaryValueObjectAction(valueObject);

  if (enabledActions.length === 0) {
    return (
      <p className="text-sm leading-6 text-slate-500">
        No enabled actions in this read-only preview.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {enabledActions.map((action) => {
        const isPrimary = primaryAction?.key === action.key;

        return (
          <a
            key={action.key}
            className={[
              ACTION_CLASSES,
              isPrimary
                ? TONE_ACTION_CLASS_NAMES[action.tone]
                : MUTED_ACTION_CLASSES,
            ]
              .filter(Boolean)
              .join(" ")}
            href={action.href ?? `#${valueObject.id}`}
          >
            {action.label}
          </a>
        );
      })}
    </div>
  );
}

export function ValueObjectCard({
  valueObject,
  domainLabel,
  isSelected = false,
}: ValueObjectCardProps) {
  const tone = getPrimaryTone(valueObject);

  return (
    <article
      id={valueObject.id}
      className={[
        CARD_BASE_CLASSES,
        isSelected ? SELECTED_CARD_CLASSES : DEFAULT_CARD_CLASSES,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`Value Object card: ${valueObject.title}`}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={[
                  "h-2.5 w-2.5 rounded-full",
                  TONE_DOT_CLASS_NAMES[tone],
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden="true"
              />
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {domainLabel}
              </span>
              <span className="text-xs font-medium text-slate-400">
                {valueObject.privacyLevel}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className={TITLE_CLASSES}>{valueObject.title}</h3>
              <p className={DESCRIPTION_CLASSES}>{valueObject.description}</p>
            </div>

            <ValueObjectStatusBadgeGroup valueObject={valueObject} />
          </div>

          <ValueObjectProgressRing
            valueObject={valueObject}
            size="md"
            showLabel={false}
          />
        </div>

        <div className="grid gap-4 border-t border-slate-200 pt-4 lg:grid-cols-2">
          <div className="space-y-2">
            <p className={SECTION_LABEL_CLASSES}>Categories</p>
            <ValueObjectChipList
              items={valueObject.categoryLabels}
              emptyLabel="No categories attached."
            />
          </div>

          <div className="space-y-2">
            <p className={SECTION_LABEL_CLASSES}>Source signals</p>
            <ValueObjectChipList
              items={valueObject.sourceLabels}
              emptyLabel="No source labels attached."
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <p className={SECTION_LABEL_CLASSES}>Protocol features</p>
            <div className="space-y-2">
              {valueObject.protocolFeatures.map((feature) => (
                <div
                  key={feature.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {feature.label}
                  </p>
                  <p className="text-sm text-slate-600">{feature.value}</p>
                  {feature.helper ? (
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {feature.helper}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className={SECTION_LABEL_CLASSES}>Review signals</p>
            <div className="space-y-2">
              {valueObject.reviewSignals.map((signal) => (
                <div
                  key={signal.id}
                  className="rounded-2xl border border-slate-200 bg-white p-3"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {signal.label}
                  </p>
                  <p className="text-sm leading-6 text-slate-600">
                    {signal.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 md:flex-row md:items-center md:justify-between">
          <p className="text-xs leading-5 text-slate-500">
            Read-only preview. UI-7 does not create, edit, merge, archive, or
            delete Value Objects.
          </p>

          <ValueObjectActionRow valueObject={valueObject} />
        </div>
      </div>
    </article>
  );
}
