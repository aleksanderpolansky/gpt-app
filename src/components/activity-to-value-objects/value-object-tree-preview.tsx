import Link from "next/link";

import { valueObjectTreePreviewPackage } from "@/data/activity-to-value-objects/value-object-tree-preview";
import type {
  ValueObjectTreePreviewNode,
  ValueObjectTreePreviewPackage,
  ValueObjectTreePreviewNodeWithChildren,
} from "@/types/value-object-tree-preview";
import { buildValueObjectPreviewTree } from "@/types/value-object-tree-preview";

function statusLabel(status: ValueObjectTreePreviewNode["status"]): string {
  const labels: Record<ValueObjectTreePreviewNode["status"], string> = {
    existing_demo: "Существующий demo VO",
    proposed_candidate: "Кандидат на создание",
    future_system_branch: "Будущая ветка",
    deferred_privacy_sensitive: "Отложено из-за privacy",
  };

  return labels[status];
}

function sourceLabel(source: ValueObjectTreePreviewNode["source"]): string {
  const labels: Record<ValueObjectTreePreviewNode["source"], string> = {
    system: "system",
    user: "user",
    organization: "organization",
    activity_candidate: "activity candidate",
    fixture_demo: "fixture demo",
  };

  return labels[source];
}

function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

function NodeCard({
  node,
  depth,
}: {
  node: ValueObjectTreePreviewNodeWithChildren;
  depth: number;
}) {
  return (
    <div className="relative">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-slate-950">{node.titleRu}</h3>
              <StatusPill>{statusLabel(node.status)}</StatusPill>
              <StatusPill>{node.objectKind}</StatusPill>
            </div>

            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              {node.descriptionRu}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <StatusPill>ID: {node.id}</StatusPill>
              <StatusPill>parent: {node.parentId ?? "root"}</StatusPill>
              <StatusPill>source: {sourceLabel(node.source)}</StatusPill>
              <StatusPill>author: {node.authorType}</StatusPill>
              <StatusPill>scope: {node.usageScope}</StatusPill>
              <StatusPill>depth: {depth}</StatusPill>
            </div>

            {node.linkedSemanticKeys.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {node.linkedSemanticKeys.map((key) => (
                  <span
                    key={key}
                    className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-600"
                  >
                    {key}
                  </span>
                ))}
              </div>
            ) : null}

            {node.notes.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm leading-6 text-slate-600">
                {node.notes.map((note) => (
                  <li key={note}>• {note}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
            <div className="text-2xl font-bold text-slate-950">{node.children.length}</div>
            <div className="text-xs text-slate-500">children</div>
          </div>
        </div>
      </div>

      {node.children.length > 0 ? (
        <div className="ml-4 mt-3 space-y-3 border-l border-slate-200 pl-4">
          {node.children.map((child) => (
            <NodeCard key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SummaryCards({ pkg }: { pkg: ValueObjectTreePreviewPackage }) {
  const existingCount = pkg.nodes.filter((node) => node.status === "existing_demo").length;
  const candidateCount = pkg.nodes.filter((node) => node.status === "proposed_candidate").length;
  const futureCount = pkg.nodes.filter((node) => node.status === "future_system_branch").length;
  const deferredCount = pkg.nodes.filter((node) => node.status === "deferred_privacy_sensitive").length;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div className="rounded-2xl bg-slate-50 p-4 text-center">
        <div className="text-2xl font-bold text-slate-950">{pkg.nodes.length}</div>
        <div className="text-xs text-slate-500">all nodes</div>
      </div>
      <div className="rounded-2xl bg-slate-50 p-4 text-center">
        <div className="text-2xl font-bold text-slate-950">{existingCount}</div>
        <div className="text-xs text-slate-500">existing demo</div>
      </div>
      <div className="rounded-2xl bg-slate-50 p-4 text-center">
        <div className="text-2xl font-bold text-slate-950">{candidateCount}</div>
        <div className="text-xs text-slate-500">activity candidates</div>
      </div>
      <div className="rounded-2xl bg-slate-50 p-4 text-center">
        <div className="text-2xl font-bold text-slate-950">{futureCount}</div>
        <div className="text-xs text-slate-500">future branches</div>
      </div>
      <div className="rounded-2xl bg-slate-50 p-4 text-center">
        <div className="text-2xl font-bold text-slate-950">{deferredCount}</div>
        <div className="text-xs text-slate-500">deferred/privacy</div>
      </div>
    </div>
  );
}

function SafetyBlock({ pkg }: { pkg: ValueObjectTreePreviewPackage }) {
  const rows = [
    ["previewOnly", String(pkg.safety.previewOnly)],
    ["dbWriteAllowed", String(pkg.safety.dbWriteAllowed)],
    ["sqlAllowed", String(pkg.safety.sqlAllowed)],
    ["openAiCallAllowed", String(pkg.safety.openAiCallAllowed)],
    ["autoCreateValueObjectsAllowed", String(pkg.safety.autoCreateValueObjectsAllowed)],
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Safety / no-write boundary</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Эта страница показывает дерево, но не создаёт и не изменяет Value Objects.
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

export function ValueObjectTreePreview({
  pkg = valueObjectTreePreviewPackage,
}: {
  pkg?: ValueObjectTreePreviewPackage;
}) {
  const roots = buildValueObjectPreviewTree(pkg.nodes);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                ACTIVITY_TO_VALUE_OBJECTS_CONTROLLED_FLOW · Step 04 / 12
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                Value Objects Tree Preview
              </h1>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
                Read-only дерево показывает будущую структуру Value Objects: организм, семья,
                интеллектуальная деятельность, работа/бизнес, отдых, социальные связи, финансы,
                а также кандидаты, возникшие из активности “играл с ребёнком в футбол 30 минут”.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/activity-capture/facts-preview"
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Открыть Activity Facts Preview
                </Link>
                <Link
                  href="/value-objects"
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Мои Value Objects
                </Link>
              </div>
            </div>

            <div className="lg:min-w-[520px]">
              <SummaryCards pkg={pkg} />
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Tree source-of-truth rule</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            В этом preview дерево построено из fixture. В реальной БД источником истины должен быть
            <span className="font-mono"> value_objects.parent_value_object_id</span>. Дочерние объекты
            не должны храниться отдельным массивом child_ids.
          </p>
        </section>

        <section className="space-y-4">
          {roots.map((root) => (
            <NodeCard key={root.id} node={root} depth={0} />
          ))}
        </section>

        <SafetyBlock pkg={pkg} />
      </div>
    </main>
  );
}
