import Link from "next/link";

import { controlledFlowMapPackage } from "@/data/activity-to-value-objects/controlled-flow-map";
import type {
  ControlledFlowMapPackage,
  ControlledFlowStageStatus,
  FlowMapPlacementStatus,
} from "@/types/activity-value-object-flow-map";

function stageStatusLabel(status: ControlledFlowStageStatus): string {
  const labels: Record<ControlledFlowStageStatus, string> = {
    done_preview: "Preview готов",
    current_preview: "Текущий preview",
    future_gate: "Будущий write gate",
    blocked_until_previous_gate: "Заблокировано до предыдущих gate",
  };

  return labels[status];
}

function placementStatusLabel(status: FlowMapPlacementStatus): string {
  const labels: Record<FlowMapPlacementStatus, string> = {
    matched_existing_tree_node: "Найден в дереве",
    candidate_tree_node: "Кандидат в дереве",
    needs_user_confirmation: "Нужно подтверждение",
    deferred_privacy_sensitive: "Отложено из-за privacy",
    not_mapped_yet: "Ещё не сопоставлено",
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

function StageMap({ pkg }: { pkg: ControlledFlowMapPackage }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">1. Карта процесса</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Здесь виден порядок превращения свободного текста в факты и аналитику. Текущий шаг остаётся read-only.
      </p>

      <div className="mt-4 grid gap-3">
        {pkg.stages.map((stage) => (
          <div key={stage.order} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-950">
                    {stage.order}
                  </span>
                  <h3 className="text-base font-semibold text-slate-950">{stage.titleRu}</h3>
                  <StatusPill>{stageStatusLabel(stage.status)}</StatusPill>
                  <StatusPill>no-write: {String(stage.noWriteBoundary)}</StatusPill>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{stage.descriptionRu}</p>
              </div>

              {stage.route ? (
                <Link
                  href={stage.route}
                  className="inline-flex whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Открыть route
                </Link>
              ) : (
                <span className="inline-flex whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-400">
                  route позже
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FactToTreeTable({ pkg }: { pkg: ControlledFlowMapPackage }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">2. Факты → дерево Value Objects</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Эта таблица показывает, куда попадут будущие activity_object_facts после подтверждений и save gate.
      </p>

      <div className="mt-4">
        <TableShell
          headers={[
            "fact",
            "semantic key",
            "fact status",
            "current VO",
            "tree node",
            "parent",
            "measure",
            "placement",
            "next action",
          ]}
        >
          {pkg.factToTreeRows.map((row) => (
            <tr key={row.factLocalId}>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
                {row.factLocalId}
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
                {row.semanticObjectKey}
              </td>
              <td className="px-4 py-3">
                <StatusPill>{row.factStatus}</StatusPill>
              </td>
              <td className="px-4 py-3 text-slate-800">
                <div className="font-semibold text-slate-950">{row.valueObjectTitle ?? "—"}</div>
                <div className="font-mono text-xs text-slate-500">{row.valueObjectId ?? "—"}</div>
              </td>
              <td className="px-4 py-3 text-slate-800">
                <div className="font-semibold text-slate-950">{row.treeNodeTitle ?? "—"}</div>
                <div className="font-mono text-xs text-slate-500">{row.treeNodeId ?? "—"}</div>
              </td>
              <td className="px-4 py-3 text-slate-800">{row.treeParentTitle ?? "—"}</td>
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-950">
                {row.measureLabel}
              </td>
              <td className="px-4 py-3">
                <StatusPill>{placementStatusLabel(row.placementStatus)}</StatusPill>
              </td>
              <td className="min-w-96 px-4 py-3 text-slate-600">{row.nextActionRu}</td>
            </tr>
          ))}
        </TableShell>
      </div>
    </section>
  );
}

function SafetyBlock({ pkg }: { pkg: ControlledFlowMapPackage }) {
  const rows = [
    ["previewOnly", String(pkg.safety.previewOnly)],
    ["dbWriteAllowed", String(pkg.safety.dbWriteAllowed)],
    ["sqlAllowed", String(pkg.safety.sqlAllowed)],
    ["openAiCallAllowed", String(pkg.safety.openAiCallAllowed)],
    ["autoCreateValueObjectsAllowed", String(pkg.safety.autoCreateValueObjectsAllowed)],
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">3. Safety / no-write boundary</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Step 05 только связывает две preview-страницы и фиксирует порядок будущих gate.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="rounded-xl border border-slate-200">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-b-0"
            >
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
    </section>
  );
}

export function ControlledFlowMap({
  pkg = controlledFlowMapPackage,
}: {
  pkg?: ControlledFlowMapPackage;
}) {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            ACTIVITY_TO_VALUE_OBJECTS_CONTROLLED_FLOW · Step 05 / 12
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Controlled Flow Map
          </h1>
          <p className="mt-3 max-w-5xl text-sm leading-6 text-slate-600">
            Эта страница соединяет Activity Facts Preview и Value Objects Tree Preview. Она показывает,
            какие будущие факты уже имеют Value Object, какие должны стать кандидатами, какие требуют
            подтверждения пользователя и где они находятся в дереве.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/activity-capture/facts-preview"
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Activity Facts Preview
            </Link>
            <Link
              href="/value-objects/tree-preview"
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Value Objects Tree Preview
            </Link>
            <Link
              href="/workspace"
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Workspace
            </Link>
          </div>
        </header>

        <StageMap pkg={pkg} />
        <FactToTreeTable pkg={pkg} />
        <SafetyBlock pkg={pkg} />
      </div>
    </main>
  );
}
