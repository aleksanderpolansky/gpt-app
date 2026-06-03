import type {
  ValueObjectDomainGroup,
  ValueObjectSignalTone,
  ValueObjectUiNode,
} from "./value-object-types";
import {
  getEnabledValueObjectActions,
  getPrimaryValueObjectAction,
  VALUE_OBJECT_READ_ONLY_POLICY,
} from "./value-object-action-policy";
import {
  formatValueObjectPercent,
  getValueObjectDomainLabel,
  isValueObjectNeedsReview,
} from "./value-object-normalizer";
import { ValueObjectProgressRingGroup } from "./value-object-progress-ring";
import { ValueObjectStatusBadgeGroup } from "./value-object-status-badge";

export interface ValueObjectDetailPanelProps {
  readonly valueObject?: ValueObjectUiNode;
  readonly domainGroups: readonly ValueObjectDomainGroup[];
  readonly childObjects: readonly ValueObjectUiNode[];
  readonly relatedObjects: readonly ValueObjectUiNode[];
}

const PANEL_CLASSES =
  "rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur";

const EMPTY_PANEL_CLASSES =
  "rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center";

const SECTION_LABEL_CLASSES =
  "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

const TITLE_CLASSES = "text-xl font-semibold tracking-tight text-slate-950";

const BODY_TEXT_CLASSES = "text-sm leading-6 text-slate-600";

const SMALL_MUTED_TEXT_CLASSES = "text-xs leading-5 text-slate-500";

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
  isValueObjectNeedsReview(valueObject)
    ? "amber"
    : valueObject.metrics[0]?.tone ?? "slate";

const getObjectCountLabel = (count: number, singular: string): string =>
  count === 1 ? `1 ${singular}` : `${count} ${singular}s`;

function ValueObjectDetailEmptyState() {
  return (
    <aside className={EMPTY_PANEL_CLASSES} aria-label="Value Object detail empty state">
      <p className="text-sm font-semibold text-slate-900">
        No Value Object is selected.
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Select an item from the list, tree, or cloud preview to inspect its
        read-only detail panel.
      </p>
    </aside>
  );
}

function ValueObjectDetailChipList({
  items,
  emptyLabel,
}: {
  readonly items: readonly string[];
  readonly emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className={BODY_TEXT_CLASSES}>{emptyLabel}</p>;
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

function ValueObjectLinkedObjectList({
  title,
  objects,
  emptyLabel,
  domainGroups,
}: {
  readonly title: string;
  readonly objects: readonly ValueObjectUiNode[];
  readonly emptyLabel: string;
  readonly domainGroups: readonly ValueObjectDomainGroup[];
}) {
  return (
    <div className="space-y-2">
      <p className={SECTION_LABEL_CLASSES}>{title}</p>

      {objects.length === 0 ? (
        <p className={BODY_TEXT_CLASSES}>{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {objects.map((linkedObject) => {
            const tone = getPrimaryTone(linkedObject);
            const domainLabel = getValueObjectDomainLabel(
              domainGroups,
              linkedObject.domain,
            );

            return (
              <a
                key={linkedObject.id}
                className="block rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:bg-slate-100"
                href={`#${linkedObject.id}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      "h-2.5 w-2.5 rounded-full",
                      TONE_DOT_CLASS_NAMES[tone],
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-hidden="true"
                  />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {domainLabel}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {linkedObject.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {formatValueObjectPercent(linkedObject.progressPercent)}
                </p>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ValueObjectDetailActions({
  valueObject,
}: {
  readonly valueObject: ValueObjectUiNode;
}) {
  const enabledActions = getEnabledValueObjectActions(valueObject);
  const primaryAction = getPrimaryValueObjectAction(valueObject);

  if (enabledActions.length === 0) {
    return (
      <p className={BODY_TEXT_CLASSES}>
        No enabled read-only actions are available for this fixture.
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

export function ValueObjectDetailPanel({
  valueObject,
  domainGroups,
  childObjects,
  relatedObjects,
}: ValueObjectDetailPanelProps) {
  if (!valueObject) {
    return <ValueObjectDetailEmptyState />;
  }

  const tone = getPrimaryTone(valueObject);
  const domainLabel = getValueObjectDomainLabel(domainGroups, valueObject.domain);
  const childCountLabel = getObjectCountLabel(childObjects.length, "child");
  const relatedCountLabel = getObjectCountLabel(relatedObjects.length, "related object");

  return (
    <aside
      className={PANEL_CLASSES}
      aria-label={`Value Object detail panel: ${valueObject.title}`}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4">
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
            <span className={SECTION_LABEL_CLASSES}>{domainLabel}</span>
            <span className={CHIP_CLASSES}>{valueObject.privacyLevel}</span>
          </div>

          <div className="space-y-2">
            <h2 className={TITLE_CLASSES}>{valueObject.title}</h2>
            <p className={BODY_TEXT_CLASSES}>{valueObject.description}</p>
          </div>

          <ValueObjectStatusBadgeGroup valueObject={valueObject} />
        </div>

        <ValueObjectProgressRingGroup valueObject={valueObject} />

        <div className="grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className={SECTION_LABEL_CLASSES}>Progress</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">
              {formatValueObjectPercent(valueObject.progressPercent)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className={SECTION_LABEL_CLASSES}>Activity count</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">
              {valueObject.activityCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className={SECTION_LABEL_CLASSES}>Links</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">
              {childCountLabel}
            </p>
            <p className={SMALL_MUTED_TEXT_CLASSES}>{relatedCountLabel}</p>
          </div>
        </div>

        <div className="grid gap-4 border-t border-slate-200 pt-4 lg:grid-cols-2">
          <div className="space-y-2">
            <p className={SECTION_LABEL_CLASSES}>Categories</p>
            <ValueObjectDetailChipList
              items={valueObject.categoryLabels}
              emptyLabel="No categories attached."
            />
          </div>

          <div className="space-y-2">
            <p className={SECTION_LABEL_CLASSES}>Source labels</p>
            <ValueObjectDetailChipList
              items={valueObject.sourceLabels}
              emptyLabel="No source labels attached."
            />
          </div>

          <div className="space-y-2">
            <p className={SECTION_LABEL_CLASSES}>Tags</p>
            <ValueObjectDetailChipList
              items={valueObject.tags}
              emptyLabel="No tags attached."
            />
          </div>

          <div className="space-y-2">
            <p className={SECTION_LABEL_CLASSES}>Notes</p>
            <ValueObjectDetailChipList
              items={valueObject.notes}
              emptyLabel="No notes attached."
            />
          </div>
        </div>

        <div className="grid gap-4 border-t border-slate-200 pt-4 lg:grid-cols-2">
          <ValueObjectLinkedObjectList
            title="Children"
            objects={childObjects}
            emptyLabel="No child objects in this fixture."
            domainGroups={domainGroups}
          />

          <ValueObjectLinkedObjectList
            title="Related objects"
            objects={relatedObjects}
            emptyLabel="No related objects in this fixture."
            domainGroups={domainGroups}
          />
        </div>

        <div className="space-y-3 border-t border-slate-200 pt-4">
          <p className={SECTION_LABEL_CLASSES}>Read-only policy</p>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-950">
              Persistent changes are disabled.
            </p>
            <p className={BODY_TEXT_CLASSES}>
              {VALUE_OBJECT_READ_ONLY_POLICY.lockedReason}
            </p>
          </div>
          <ValueObjectDetailActions valueObject={valueObject} />
        </div>
      </div>
    </aside>
  );
}
