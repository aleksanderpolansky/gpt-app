import type { ValueObjectCandidate } from "./activity-capture-types";

export const VALUE_OBJECT_CANDIDATE_PANEL_CREATED =
  "VALUE_OBJECT_CANDIDATE_PANEL_CREATED" as const;

export interface ValueObjectCandidatePanelProps {
  valueObjectCandidates: ValueObjectCandidate[];
}

function formatRelevance(relevance: number): string {
  return `${Math.round(relevance * 100)}%`;
}

export function ValueObjectCandidatePanel({
  valueObjectCandidates,
}: ValueObjectCandidatePanelProps) {
  const hasCandidates = valueObjectCandidates.length > 0;

  return (
    <article
      aria-labelledby="value-object-candidate-title"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Value Object candidates
          </p>

          <h3
            id="value-object-candidate-title"
            className="mt-2 text-lg font-semibold tracking-tight text-slate-950"
          >
            Value Objects-кандидаты
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-600">
            Это только локальные candidates. Они не создают Value Object, не
            меняют дерево смыслов и не записываются в хранилище.
          </p>
        </div>

        <span className="w-fit rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          {valueObjectCandidates.length} candidates
        </span>
      </div>

      {hasCandidates ? (
        <div className="mt-4 grid gap-3">
          {valueObjectCandidates.map((candidate) => (
            <div
              key={candidate.id}
              className="rounded-xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {candidate.label}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {candidate.reason}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {candidate.domain}
                  </span>

                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {candidate.status}
                  </span>

                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    relevance {formatRelevance(candidate.relevance)}
                  </span>
                </div>
              </div>

              <div className="mt-3 rounded-lg bg-white px-3 py-2 text-xs leading-5 text-slate-500">
                candidateId: {candidate.id}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">
            Value Object candidates не найдены
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Локальные rules пока не предложили Value Object. Это не означает,
            что активность не имеет ценности.
          </p>
        </div>
      )}

      <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
        В UI-4 Value Object остаётся только candidate. Создание или изменение
        реального Value Object должно идти отдельным write-gated flow.
      </p>
    </article>
  );
}
