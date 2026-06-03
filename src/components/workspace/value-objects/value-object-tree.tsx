import type {
  ValueObjectDomainGroup,
  ValueObjectSignalTone,
  ValueObjectUiNode,
} from "./value-object-types";
import {
  getValueObjectChildren,
  getValueObjectDomainLabel,
  getValueObjectTreeDepth,
  isValueObjectNeedsReview,
} from "./value-object-normalizer";
import { ValueObjectProgressRing } from "./value-object-progress-ring";
import { ValueObjectStatusBadge } from "./value-object-status-badge";

export interface ValueObjectTreeProps {
  readonly valueObjects: readonly ValueObjectUiNode[];
  readonly domainGroups: readonly ValueObjectDomainGroup[];
  readonly selectedObjectId?: string;
}

interface ValueObjectTreeNodeProps {
  readonly valueObject: ValueObjectUiNode;
  readonly valueObjects: readonly ValueObjectUiNode[];
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

const TREE_NODE_CLASSES =
  "rounded-3xl border bg-slate-50/70 p-3 transition hover:bg-slate-50";

const SELECTED_NODE_CLASSES = "border-indigo-300 ring-2 ring-indigo-100";

const DEFAULT_NODE_CLASSES = "border-slate-200";

const CHILDREN_CONTAINER_CLASSES =
  "ml-4 mt-3 space-y-3 border-l border-slate-200 pl-4";

const CHIP_CLASSES =
  "inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600";

const TONE_DOT_CLASS_NAMES: Record<ValueObjectSignalTone, string> = {
  slate: "bg-slate-400",
  indigo: "bg-indigo-500",
  emerald: "bg-emerald-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  cyan: "bg-cyan-500",
};

const EMPTY_STATE_CLASSES =
  "rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center";

const getPrimaryTone = (valueObject: ValueObjectUiNode): ValueObjectSignalTone =>
  valueObject.metrics[0]?.tone ?? "slate";

const getRootValueObjects = (
  valueObjects: readonly ValueObjectUiNode[],
): readonly ValueObjectUiNode[] =>
  valueObjects.filter((valueObject) => !valueObject.parentId);

const getTreeObjectCountLabel = (count: number): string =>
  count === 1 ? "1 node" : `${count} nodes`;

function ValueObjectTreeEmptyState() {
  return (
    <div className={EMPTY_STATE_CLASSES}>
      <p className="text-sm font-semibold text-slate-900">
        No tree nodes are available.
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        The read-only tree is built from local UI-7 fixtures. Reset filters to
        show the fixture hierarchy again.
      </p>
    </div>
  );
}

function ValueObjectTreeNode({
  valueObject,
  valueObjects,
  domainGroups,
  selectedObjectId,
}: ValueObjectTreeNodeProps) {
  const children = getValueObjectChildren(valueObjects, valueObject.id);
  const depth = getValueObjectTreeDepth(valueObjects, valueObject);
  const tone = getPrimaryTone(valueObject);
  const domainLabel = getValueObjectDomainLabel(domainGroups, valueObject.domain);
  const isSelected = selectedObjectId === valueObject.id;
  const needsReview = isValueObjectNeedsReview(valueObject);

  return (
    <li>
      <details open={depth < 1 || isSelected || needsReview}>
        <summary
          className={[
            TREE_NODE_CLASSES,
            isSelected ? SELECTED_NODE_CLASSES : DEFAULT_NODE_CLASSES,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="flex cursor-pointer flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
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
                <span className={CHIP_CLASSES}>depth {depth}</span>
                <span className={CHIP_CLASSES}>
                  {children.length === 1
                    ? "1 child"
                    : `${children.length} children`}
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-950">
                  {valueObject.title}
                </p>
                <p className="line-clamp-2 text-sm leading-6 text-slate-600">
                  {valueObject.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <ValueObjectStatusBadge
                  valueObject={valueObject}
                  variant="lifecycle"
                  compact
                />
                <ValueObjectStatusBadge
                  valueObject={valueObject}
                  variant="attention"
                  compact
                />
                <ValueObjectStatusBadge
                  valueObject={valueObject}
                  variant="review"
                  compact
                />
              </div>
            </div>

            <ValueObjectProgressRing
              valueObject={valueObject}
              size="sm"
              showLabel={false}
            />
          </div>
        </summary>

        {children.length > 0 ? (
          <ol className={CHILDREN_CONTAINER_CLASSES}>
            {children.map((childObject) => (
              <ValueObjectTreeNode
                key={childObject.id}
                valueObject={childObject}
                valueObjects={valueObjects}
                domainGroups={domainGroups}
                selectedObjectId={selectedObjectId}
              />
            ))}
          </ol>
        ) : null}
      </details>
    </li>
  );
}

export function ValueObjectTree({
  valueObjects,
  domainGroups,
  selectedObjectId,
}: ValueObjectTreeProps) {
  const rootValueObjects = getRootValueObjects(valueObjects);
  const treeObjectCountLabel = getTreeObjectCountLabel(valueObjects.length);

  return (
    <section className={SECTION_CLASSES} aria-label="Value Object tree">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <p className={HEADER_LABEL_CLASSES}>Tree view</p>
            <h2 className={HEADER_TITLE_CLASSES}>Value Object hierarchy</h2>
            <p className={HEADER_TEXT_CLASSES}>
              UI hierarchy preview only. Parent-child grouping here is not final
              ontology truth.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              Tree size
            </p>
            <p className="text-lg font-semibold text-slate-950">
              {treeObjectCountLabel}
            </p>
          </div>
        </div>

        {rootValueObjects.length === 0 ? (
          <ValueObjectTreeEmptyState />
        ) : (
          <ol className="space-y-3">
            {rootValueObjects.map((valueObject) => (
              <ValueObjectTreeNode
                key={valueObject.id}
                valueObject={valueObject}
                valueObjects={valueObjects}
                domainGroups={domainGroups}
                selectedObjectId={selectedObjectId}
              />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
