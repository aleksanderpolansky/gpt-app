import type {
  ValueObjectDomainGroup,
  ValueObjectUiNode,
} from "./value-object-types";
import { getValueObjectDomainLabel } from "./value-object-normalizer";
import { ValueObjectCard } from "./value-object-card";

export interface ValueObjectListProps {
  readonly valueObjects: readonly ValueObjectUiNode[];
  readonly domainGroups: readonly ValueObjectDomainGroup[];
  readonly selectedObjectId?: string;
}

const SECTION_CLASSES =
  "rounded-3xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm";

const HEADER_LABEL_CLASSES =
  "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

const HEADER_TITLE_CLASSES =
  "text-lg font-semibold tracking-tight text-slate-950";

const HEADER_TEXT_CLASSES = "text-sm leading-6 text-slate-600";

const EMPTY_STATE_CLASSES =
  "rounded-3xl border border-dashed border-slate-300 bg-white/80 p-8 text-center";

const getObjectCountLabel = (count: number): string =>
  count === 1 ? "1 object" : `${count} objects`;

function ValueObjectListEmptyState() {
  return (
    <div className={EMPTY_STATE_CLASSES}>
      <p className="text-sm font-semibold text-slate-900">
        No Value Objects match the current filters.
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Reset filters or widen the search to show fixture-based read-only
        Value Objects again.
      </p>
    </div>
  );
}

export function ValueObjectList({
  valueObjects,
  domainGroups,
  selectedObjectId,
}: ValueObjectListProps) {
  const objectCountLabel = getObjectCountLabel(valueObjects.length);

  return (
    <section className={SECTION_CLASSES} aria-label="Value Object list">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <p className={HEADER_LABEL_CLASSES}>List view</p>
            <h2 className={HEADER_TITLE_CLASSES}>Value Object cards</h2>
            <p className={HEADER_TEXT_CLASSES}>
              Read-only list view generated from local UI-7 fixtures and helper
              functions.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-right">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              Showing
            </p>
            <p className="text-lg font-semibold text-slate-950">
              {objectCountLabel}
            </p>
          </div>
        </div>

        {valueObjects.length === 0 ? (
          <ValueObjectListEmptyState />
        ) : (
          <div className="grid gap-4">
            {valueObjects.map((valueObject) => (
              <ValueObjectCard
                key={valueObject.id}
                valueObject={valueObject}
                domainLabel={getValueObjectDomainLabel(
                  domainGroups,
                  valueObject.domain,
                )}
                isSelected={selectedObjectId === valueObject.id}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
