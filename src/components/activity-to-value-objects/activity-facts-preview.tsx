import type {
  ActivityFactPreviewStatus,
  ActivityProcessingPackage,
  ValueObjectMatchStatus,
} from "@/types/activity-to-value-objects";

import { footballWithChildActivityProcessingPreview } from "@/data/activity-to-value-objects/football-with-child-preview";

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatValue(numericValue: number | null, textValue: string | null): string {
  if (numericValue !== null) {
    return String(numericValue);
  }

  if (textValue !== null && textValue.trim().length > 0) {
    return textValue;
  }

  return "—";
}

function matchStatusLabel(status: ValueObjectMatchStatus): string {
  const labels: Record<ValueObjectMatchStatus, string> = {
    matched_existing: "Найден существующий VO",
    missing_candidate: "Нужен кандидат VO",
    ambiguous_candidates: "Есть неоднозначные совпадения",
    not_applicable: "Не применимо",
    deferred: "Отложено",
  };

  return labels[status];
}

function factStatusLabel(status: ActivityFactPreviewStatus): string {
  const labels: Record<ActivityFactPreviewStatus, string> = {
    candidate: "Кандидат",
    needs_value_object: "Нужен Value Object",
    needs_user_confirmation: "Нужно подтверждение",
    ready_for_fact_write: "Готово к future write gate",
    blocked: "Заблокировано",
    accepted: "Принято",
    edited: "Отредактировано",
    rejected: "Отклонено",
    ignored: "Игнорировано",
  };

  return labels[status];
}

function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {children}
    </section>
  );
}

function TableShell({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>
      </table>
    </div>
  );
}

function ActivityRecognitionCard({ pkg }: { pkg: ActivityProcessingPackage }) {
  return (
    <Section
      title="1. Распознавание активности"
      description="Этот блок показывает, что система поняла из свободного текста до любой записи в базу."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Свободный текст
          </div>
          <div className="mt-2 text-base font-medium text-slate-950">
            {pkg.rawInput.text}
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Распознанная активность
          </div>
          <div className="mt-2 text-base font-medium text-slate-950">
            {pkg.recognition.detectedActivityTitle}
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Статус / уверенность
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusPill>{pkg.recognition.status}</StatusPill>
            <StatusPill>{formatPercent(pkg.recognition.confidence)}</StatusPill>
            <StatusPill>{pkg.status}</StatusPill>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Причина
          </div>
          <div className="mt-2 text-sm leading-6 text-slate-700">
            {pkg.recognition.reason}
          </div>
        </div>
      </div>
    </Section>
  );
}

function MeasuresTable({ pkg }: { pkg: ActivityProcessingPackage }) {
  return (
    <Section
      title="2. Извлечённые меры"
      description="Здесь фиксируется количество, длительность, расстояние или другие измеримые параметры активности."
    >
      <TableShell headers={["localId", "type", "value", "unit", "confidence", "evidence"]}>
        {pkg.measures.map((measure) => (
          <tr key={measure.localId}>
            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
              {measure.localId}
            </td>
            <td className="px-4 py-3 text-slate-800">{measure.measureType}</td>
            <td className="px-4 py-3 font-semibold text-slate-950">
              {formatValue(measure.numericValue, measure.textValue)}
            </td>
            <td className="px-4 py-3 text-slate-800">{measure.unit}</td>
            <td className="px-4 py-3 text-slate-800">{formatPercent(measure.confidence)}</td>
            <td className="px-4 py-3 text-slate-600">{measure.evidenceText}</td>
          </tr>
        ))}
      </TableShell>
    </Section>
  );
}

function SemanticCategoriesTable({ pkg }: { pkg: ActivityProcessingPackage }) {
  return (
    <Section
      title="3. Семантические категории"
      description="Одна активность раскладывается на действие, объект, роль, заботу, цель, среду и физиологические смыслы."
    >
      <TableShell headers={["key", "label", "layer", "confidence", "evidence", "reason"]}>
        {pkg.semanticCategories.map((category) => (
          <tr key={category.localId}>
            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
              {category.semanticObjectKey}
            </td>
            <td className="px-4 py-3 font-semibold text-slate-950">{category.labelRu}</td>
            <td className="px-4 py-3 text-slate-800">{category.layer}</td>
            <td className="px-4 py-3 text-slate-800">{formatPercent(category.confidence)}</td>
            <td className="px-4 py-3 text-slate-600">{category.evidenceText}</td>
            <td className="min-w-72 px-4 py-3 text-slate-600">{category.reason}</td>
          </tr>
        ))}
      </TableShell>
    </Section>
  );
}

function ValueObjectMatchesTable({ pkg }: { pkg: ActivityProcessingPackage }) {
  const categoryLabelByLocalId = new Map(
    pkg.semanticCategories.map((category) => [category.localId, category.labelRu]),
  );

  return (
    <Section
      title="4. Сопоставление с Value Objects"
      description="Этот слой показывает, какие категории уже нашли подходящий ценный объект, а какие требуют создания или уточнения."
    >
      <TableShell
        headers={[
          "category",
          "status",
          "value_object_id",
          "value object",
          "parent",
          "confidence",
          "reason",
        ]}
      >
        {pkg.valueObjectMatches.map((match) => (
          <tr key={`${match.semanticCategoryLocalId}-${match.matchStatus}`}>
            <td className="px-4 py-3 font-semibold text-slate-950">
              {categoryLabelByLocalId.get(match.semanticCategoryLocalId) ?? match.semanticCategoryLocalId}
            </td>
            <td className="px-4 py-3">
              <StatusPill>{matchStatusLabel(match.matchStatus)}</StatusPill>
            </td>
            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
              {match.valueObjectId ?? "—"}
            </td>
            <td className="px-4 py-3 text-slate-800">{match.valueObjectTitle ?? "—"}</td>
            <td className="px-4 py-3 text-slate-800">{match.parentValueObjectTitle ?? "—"}</td>
            <td className="px-4 py-3 text-slate-800">{formatPercent(match.confidence)}</td>
            <td className="min-w-80 px-4 py-3 text-slate-600">{match.reason}</td>
          </tr>
        ))}
      </TableShell>
    </Section>
  );
}

function MissingValueObjectsTable({ pkg }: { pkg: ActivityProcessingPackage }) {
  return (
    <Section
      title="5. Недостающие Value Objects"
      description="Эти объекты не создаются автоматически. Они должны быть показаны пользователю как кандидаты на создание."
    >
      <TableShell headers={["semantic key", "proposed title", "parent", "scope", "author", "confirmation", "reason"]}>
        {pkg.missingValueObjectCandidates.map((candidate) => (
          <tr key={candidate.semanticObjectKey}>
            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
              {candidate.semanticObjectKey}
            </td>
            <td className="px-4 py-3 font-semibold text-slate-950">
              {candidate.proposedTitleRu}
            </td>
            <td className="px-4 py-3 text-slate-800">{candidate.proposedParentTitleRu ?? "—"}</td>
            <td className="px-4 py-3 text-slate-800">{candidate.proposedUsageScope}</td>
            <td className="px-4 py-3 text-slate-800">{candidate.proposedAuthorType}</td>
            <td className="px-4 py-3 text-slate-800">
              {candidate.requiresUserConfirmation ? "Да" : "Нет"}
            </td>
            <td className="min-w-80 px-4 py-3 text-slate-600">{candidate.reason}</td>
          </tr>
        ))}
      </TableShell>
    </Section>
  );
}

function FactPreviewTable({ pkg }: { pkg: ActivityProcessingPackage }) {
  return (
    <Section
      title="6. Preview будущих activity_object_facts"
      description="Это ещё не сохранённые строки БД. Таблица показывает, какие факты должны появиться после будущего save gate."
    >
      <TableShell
        headers={[
          "fact localId",
          "semantic key",
          "value_object_id",
          "value object",
          "value",
          "unit",
          "status",
          "confidence",
          "explanation",
        ]}
      >
        {pkg.factPreviews.map((fact) => (
          <tr key={fact.localId}>
            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
              {fact.localId}
            </td>
            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
              {fact.semanticObjectKey}
            </td>
            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
              {fact.valueObjectId ?? "—"}
            </td>
            <td className="px-4 py-3 font-semibold text-slate-950">
              {fact.valueObjectTitle ?? "—"}
            </td>
            <td className="px-4 py-3 font-semibold text-slate-950">
              {formatValue(fact.numericValue, fact.textValue)}
            </td>
            <td className="px-4 py-3 text-slate-800">{fact.unit}</td>
            <td className="px-4 py-3">
              <StatusPill>{factStatusLabel(fact.status)}</StatusPill>
            </td>
            <td className="px-4 py-3 text-slate-800">{formatPercent(fact.confidence)}</td>
            <td className="min-w-96 px-4 py-3 text-slate-600">{fact.explanation}</td>
          </tr>
        ))}
      </TableShell>
    </Section>
  );
}

function SafetyBlock({ pkg }: { pkg: ActivityProcessingPackage }) {
  const safetyRows = [
    ["previewOnly", String(pkg.safety.previewOnly)],
    ["dbWriteAllowed", String(pkg.safety.dbWriteAllowed)],
    ["sqlAllowed", String(pkg.safety.sqlAllowed)],
    ["openAiCallAllowed", String(pkg.safety.openAiCallAllowed)],
    ["medicalDiagnosisAllowed", String(pkg.safety.medicalDiagnosisAllowed)],
  ];

  return (
    <Section
      title="7. Safety / no-write boundary"
      description="Страница должна доказывать, что это только preview, а не скрытая запись в базу."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="rounded-xl border border-slate-200">
          {safetyRows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-b-0">
              <span className="font-mono text-xs text-slate-600">{label}</span>
              <span className="font-semibold text-slate-950">{value}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Notes
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            {pkg.safety.notes.map((note) => (
              <li key={note}>• {note}</li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

export function ActivityFactsPreview({ pkg = footballWithChildActivityProcessingPreview }: { pkg?: ActivityProcessingPackage }) {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                ACTIVITY_TO_VALUE_OBJECTS_CONTROLLED_FLOW · Step 03 / 12
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                Activity Facts Preview
              </h1>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
                Read-only страница показывает, как свободный текст активности превращается в меры,
                семантические категории, совпадения с Value Objects, кандидаты на создание недостающих
                объектов и будущие строки activity_object_facts.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-5 lg:min-w-[520px]">
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-2xl font-bold text-slate-950">{pkg.counters.measureCount}</div>
                <div className="text-xs text-slate-500">measures</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-2xl font-bold text-slate-950">{pkg.counters.semanticCategoryCount}</div>
                <div className="text-xs text-slate-500">categories</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-2xl font-bold text-slate-950">{pkg.counters.matchedValueObjectCount}</div>
                <div className="text-xs text-slate-500">matched VO</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-2xl font-bold text-slate-950">{pkg.counters.missingValueObjectCandidateCount}</div>
                <div className="text-xs text-slate-500">missing VO</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-2xl font-bold text-slate-950">{pkg.counters.factPreviewCount}</div>
                <div className="text-xs text-slate-500">fact previews</div>
              </div>
            </div>
          </div>
        </header>

        <ActivityRecognitionCard pkg={pkg} />
        <MeasuresTable pkg={pkg} />
        <SemanticCategoriesTable pkg={pkg} />
        <ValueObjectMatchesTable pkg={pkg} />
        <MissingValueObjectsTable pkg={pkg} />
        <FactPreviewTable pkg={pkg} />
        <SafetyBlock pkg={pkg} />
      </div>
    </main>
  );
}
