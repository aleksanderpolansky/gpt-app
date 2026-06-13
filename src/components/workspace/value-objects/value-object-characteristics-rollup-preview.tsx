// GPT-APP / AI-NAVIGATOR
// Value Object Characteristics / Relations / Measures / Rollup preview component
// Runtime status: read-only UI; no DB writes, no SQL execution, no OpenAI calls.

import {
  voRollupActivityEventMeasures,
  voRollupCandidatePackage,
  voRollupFixtureSummary,
  voRollupFixtureValueObjects,
  voRollupImpactRules,
  voRollupObjectCharacteristics,
  voRollupPreview,
  voRollupRelations,
} from "../../../data/value-object-characteristics-rollup-fixtures";
import {
  buildValueObjectTree,
  formatRelationPath,
  summarizeRollupPreview,
} from "../../../lib/value-object-characteristics-rollup-preview";

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function findTitle(valueObjectId: string): string {
  return (
    voRollupFixtureValueObjects.find((valueObject) => valueObject.id === valueObjectId)
      ?.title ?? valueObjectId
  );
}

function TreeNode({
  node,
  level = 0,
}: {
  node: ReturnType<typeof buildValueObjectTree>[number];
  level?: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-950">{node.title}</div>
          <div className="mt-1 text-[11px] text-slate-500">{node.id}</div>
          {node.description ? (
            <div className="mt-2 text-xs leading-5 text-slate-600">{node.description}</div>
          ) : null}
        </div>
        <div className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          L{level}
        </div>
      </div>

      {node.children.length ? (
        <div className="mt-3 space-y-2 border-l border-dashed border-slate-300 pl-3">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ValueObjectCharacteristicsRollupPreview() {
  const tree = buildValueObjectTree(voRollupFixtureValueObjects);
  const summary = summarizeRollupPreview({
    valueObjects: voRollupFixtureValueObjects,
    characteristics: voRollupObjectCharacteristics,
    eventMeasures: voRollupActivityEventMeasures,
    relations: voRollupRelations,
    impactRules: voRollupImpactRules,
    rollupPreview: voRollupPreview,
  });

  return (
    <section className="rounded-[28px] border border-indigo-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-indigo-500">
            Characteristics / Measures / Relations / Rollup Preview
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Модель характеристик ценного объекта
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Read-only preview показывает, как один Value Object может иметь только применимые характеристики,
            а конкретное событие активности хранит свои меры: длительность, повторения, вес пользователя.
            Связи и impact rules поднимают вклад события к мышцам, голени, ноге и телу без копирования события.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
          <div className="font-bold">NO-WRITE GUARD</div>
          <div className="mt-1">DB writes: false</div>
          <div>SQL execution: false</div>
          <div>OpenAI calls: false</div>
          <div>Persisted rollups: false</div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Value Objects</div>
          <div className="mt-2 text-2xl font-bold text-slate-950">{voRollupFixtureSummary.valueObjectsCount}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Characteristics</div>
          <div className="mt-2 text-2xl font-bold text-slate-950">{voRollupFixtureSummary.objectCharacteristicsCount}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Event Measures</div>
          <div className="mt-2 text-2xl font-bold text-slate-950">{voRollupFixtureSummary.eventMeasuresCount}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Relations</div>
          <div className="mt-2 text-2xl font-bold text-slate-950">{voRollupFixtureSummary.relationsCount}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Impact Rules</div>
          <div className="mt-2 text-2xl font-bold text-slate-950">{voRollupFixtureSummary.impactRulesCount}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Rollups</div>
          <div className="mt-2 text-2xl font-bold text-slate-950">{voRollupFixtureSummary.rollupPreviewCount}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-600">
            Candidate package
          </h3>
          <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold text-slate-500">Raw input</div>
            <div className="mt-1 text-sm font-medium text-slate-950">
              {voRollupCandidatePackage.rawInput}
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">Candidate VO</div>
              <div className="mt-2 text-sm font-bold text-slate-950">
                {voRollupCandidatePackage.candidateValueObject.title}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                profile = {voRollupCandidatePackage.candidateValueObject.observationProfile}
              </div>
              <div className="text-xs text-slate-500">
                usage_scope = {voRollupCandidatePackage.candidateValueObject.usageScope}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">Safety</div>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <div>candidate_first = true</div>
                <div>no_db_writes = true</div>
                <div>no_sql_execution = true</div>
                <div>no_openai_call_required = true</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-600">
            Event measures
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {voRollupActivityEventMeasures.map((measure) => (
              <div key={measure.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  {measure.key}
                </div>
                <div className="mt-2 text-xl font-bold text-slate-950">
                  {typeof measure.valueNumber === "number" ? formatNumber(measure.valueNumber) : measure.valueText}
                  {measure.unit ? <span className="ml-1 text-sm text-slate-500">{measure.unit}</span> : null}
                </div>
                <div className="mt-1 text-xs text-slate-500">{measure.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-600">
            Object tree
          </h3>
          <div className="mt-3 space-y-3">
            {tree.map((node) => (
              <TreeNode key={node.id} node={node} />
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-600">
            Relations and rollup preview
          </h3>

          <div className="mt-3 space-y-3">
            {voRollupRelations.map((relation) => (
              <div key={relation.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="text-xs font-bold text-slate-950">
                  {findTitle(relation.fromValueObjectId)}
                  <span className="mx-2 text-indigo-500">→ {relation.relationType} →</span>
                  {findTitle(relation.toValueObjectId)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  weight = {relation.weight ?? "n/a"} · confidence = {relation.confidence ?? "n/a"} · status = {relation.status}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
              Derived rollup targets
            </div>
            <div className="mt-3 space-y-3">
              {summary.targets.map((target) => (
                <div key={target.targetValueObjectId} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="text-sm font-bold text-slate-950">{target.targetTitle}</div>
                  <div className="mt-2 space-y-1">
                    {target.metrics.map((metric, index) => (
                      <div key={`${target.targetValueObjectId}-${metric.metric}-${index}`} className="text-xs text-slate-600">
                        {metric.metric}: raw {formatNumber(metric.rawValue)}
                        {metric.unit ? ` ${metric.unit}` : ""} → weighted {formatNumber(metric.weightedValue)}
                        {metric.unit ? ` ${metric.unit}` : ""}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                    {target.relationPaths.map((path, index) => (
                      <div key={`${target.targetValueObjectId}-path-${index}`} className="text-[11px] text-slate-500">
                        {formatRelationPath(path, voRollupFixtureValueObjects)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ValueObjectCharacteristicsRollupPreview;
