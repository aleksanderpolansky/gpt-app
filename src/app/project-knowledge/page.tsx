import type { ReactNode } from "react";
import { ProjectKnowledgeSubpageNav } from "./_components/ProjectKnowledgeUi";

import {
  projectKnowledgeApiEndpoints,
  projectKnowledgeBacklog,
  projectKnowledgeComponents,
  projectKnowledgeDecisions,
  projectKnowledgeFileResponsibilities,
  projectKnowledgeGaps,
  projectKnowledgeI18nDictionaries,
  projectKnowledgeImplementationMicrosteps,
  projectKnowledgeInventoryStats,
  projectKnowledgePageRoutes,
  projectKnowledgeProcesses,
  projectKnowledgeSourceDocuments,
  projectKnowledgeTroubleshootingRules,
  projectKnowledgeVersionConflicts,
} from "@/data/project-knowledge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PriorityItem = {
  readonly priority?: string;
};

function countByPriority(items: readonly PriorityItem[], priority: string) {
  return items.filter((item) => String(item.priority ?? "").toUpperCase() === priority).length;
}

function countWriteEndpoints() {
  return projectKnowledgeApiEndpoints.filter(
    (endpoint) => endpoint.likelyWriteOrMutation,
  ).length;
}

function countSupabaseEndpoints() {
  return projectKnowledgeApiEndpoints.filter((endpoint) => endpoint.supabaseUsage).length;
}

function shortText(value: string | undefined, fallback = "-") {
  const text = value?.trim();

  if (!text) {
    return fallback;
  }

  return text.length > 170 ? `${text.slice(0, 167)}...` : text;
}

const primaryRouteNames = new Set([
  "/",
  "/directory",
  "/rewards",
  "/organizations",
  "/organizations/new",
  "/activity-facts",
  "/value-objects",
  "/value-objects/tree",
  "/points",
  "/points/transactions",
  "/admin",
]);

const primaryRoutes = projectKnowledgePageRoutes.filter((route) =>
  primaryRouteNames.has(route.route),
);

const activeDecisions = projectKnowledgeDecisions.filter(
  (decision) => decision.status === "active",
);

const p0Gaps = projectKnowledgeGaps.filter((gap) => gap.priority === "P0").slice(0, 6);

const p0Conflicts = projectKnowledgeVersionConflicts
  .filter((conflict) => conflict.priority === "P0")
  .slice(0, 6);

const mainTroubleshooting = projectKnowledgeTroubleshootingRules.slice(0, 8);

function StatCard({
  label,
  value,
  note,
}: {
  readonly label: string;
  readonly value: string | number;
  readonly note: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold text-slate-950">{value}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{note}</p>
    </article>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-500">
          {id}
        </div>
        <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-slate-950">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function MiniTable({
  headers,
  rows,
}: {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly ReactNode[])[];
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td
                  key={`cell-${rowIndex}-${cellIndex}`}
                  className="max-w-[420px] px-4 py-3 align-top text-slate-700"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProjectKnowledgePage() {
  const writeEndpointCount = countWriteEndpoints();
  const readEndpointCount = projectKnowledgeApiEndpoints.length - writeEndpointCount;

  return (
    <main className="min-h-screen bg-[#f5f6fb] px-4 py-8 text-slate-900">
      <div className="mx-auto grid w-full max-w-[1240px] gap-6">
        <header className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-500">
            Protected internal route
          </div>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="max-w-4xl text-4xl font-bold tracking-[-0.045em] text-slate-950">
                Project Knowledge / AI-NAVIGATOR
              </h1>
              <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600">
                Internal read-only governance shell. Access is restricted by the
                existing platform admin guard. The page imports local fixtures
                only and does not create API calls, database writes, SQL
                execution, model-provider calls, forms or hidden mutations.
              </p>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4 text-sm text-indigo-950">
              <div className="font-bold">Protected by</div>
              <div className="mt-1 font-mono text-[12px]">
                requirePlatformAdmin()
              </div>
              <div className="mt-2 text-[12px] text-indigo-700">
                Baseline: {projectKnowledgeInventoryStats.baselineCommit}
              </div>
            </div>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2">
          {[
            ["overview", "Overview"],
            ["routes", "Routes"],
            ["api", "API"],
            ["processes", "Processes"],
            ["troubleshooting", "Troubleshooting"],
            ["decisions", "Decisions"],
            ["risks", "Risks"],
            ["sources", "Sources"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={`#${href}`}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700"
            >
              {label}
            </a>
          ))}
        </nav>

        <ProjectKnowledgeSubpageNav />

        <section
          id="overview"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <StatCard
            label="Routes"
            value={projectKnowledgeInventoryStats.routeCount}
            note="Application page routes captured from the current source inventory."
          />
          <StatCard
            label="API endpoints"
            value={projectKnowledgeInventoryStats.apiEndpointCount}
            note={`${readEndpointCount} read-like endpoints and ${writeEndpointCount} mutation candidates.`}
          />
          <StatCard
            label="Components"
            value={projectKnowledgeInventoryStats.componentCount}
            note="Frontend component inventory with folder, i18n and integration markers."
          />
          <StatCard
            label="Source docs"
            value={projectKnowledgeInventoryStats.sourceDocumentCount}
            note="Reports, documents and generated source references in the current register."
          />
          <StatCard
            label="SQL refs"
            value={projectKnowledgeInventoryStats.databaseSqlRefCount}
            note="Database diagnostics, migrations and SQL-related inventory references."
          />
          <StatCard
            label="Backend service refs"
            value={countSupabaseEndpoints()}
            note="Endpoint files where the scan detected backend service usage markers."
          />
          <StatCard
            label="Gaps / P0"
            value={`${projectKnowledgeInventoryStats.gapCount} / ${countByPriority(projectKnowledgeGaps, "P0")}`}
            note="Known governance, product and implementation gaps."
          />
          <StatCard
            label="Conflicts / P0"
            value={`${projectKnowledgeInventoryStats.conflictCount} / ${countByPriority(projectKnowledgeVersionConflicts, "P0")}`}
            note="Version conflicts and canonical route/term decisions still tracked."
          />
        </section>

        <Section
          id="routes"
          title="Primary route map"
          description="First protected view of selected route inventory. Full filtering will be added in later dedicated subpages."
        >
          <MiniTable
            headers={["Route", "File", "Surface", "Status", "I18n"]}
            rows={primaryRoutes.map((route) => [
              <code key="route" className="rounded bg-slate-100 px-1.5 py-0.5">
                {route.route}
              </code>,
              <code key="file" className="text-[12px] text-slate-600">
                {route.file}
              </code>,
              route.surface,
              route.status,
              route.usesI18n ? "yes" : "no",
            ])}
          />
        </Section>

        <Section
          id="api"
          title="API and backend overview"
          description="Read/write markers are generated candidates and must be treated as governance hints, not as final security proof."
        >
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <StatCard
              label="Mutation candidates"
              value={writeEndpointCount}
              note="Endpoints with POST/PUT/PATCH/DELETE or write-like markers."
            />
            <StatCard
              label="Backend service usage"
              value={countSupabaseEndpoints()}
              note="Endpoint files where source scan detected backend service usage."
            />
          </div>
          <MiniTable
            headers={["Endpoint", "Methods", "File", "Write?", "Backend service"]}
            rows={projectKnowledgeApiEndpoints.slice(0, 10).map((endpoint) => [
              <code key="endpoint" className="rounded bg-slate-100 px-1.5 py-0.5">
                {endpoint.endpoint}
              </code>,
              endpoint.methods.join(", "),
              <code key="file" className="text-[12px] text-slate-600">
                {endpoint.file}
              </code>,
              endpoint.likelyWriteOrMutation ? "yes" : "no",
              endpoint.supabaseUsage ? "yes" : "no",
            ])}
          />
        </Section>

        <Section
          id="processes"
          title="Process map"
          description="Core process chains with their routes, APIs, files and gate notes."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {projectKnowledgeProcesses.slice(0, 6).map((process) => (
              <article
                key={process.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  {process.id}
                </div>
                <h3 className="mt-2 text-lg font-bold text-slate-950">
                  {process.process}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {process.gateNotes}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {process.primaryRoutes.slice(0, 4).map((route) => (
                    <code
                      key={route}
                      className="rounded-full bg-white px-2.5 py-1 text-[12px] text-indigo-700"
                    >
                      {route}
                    </code>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </Section>

        <Section
          id="troubleshooting"
          title="Troubleshooting starter"
          description="Where to start when something breaks. This is a starting map, not a replacement for runtime reports."
        >
          <MiniTable
            headers={["Issue", "Start here", "Then check", "Gate"]}
            rows={mainTroubleshooting.map((rule) => [
              rule.issue,
              <code key="start" className="text-[12px] text-slate-600">
                {rule.whereToStart}
              </code>,
              rule.thenCheck.slice(0, 3).join("; "),
              rule.gate,
            ])}
          />
        </Section>

        <Section
          id="decisions"
          title="Decision log"
          description="Active decisions that define current work boundaries."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {activeDecisions.map((decision) => (
              <article
                key={decision.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-500">
                  {decision.id} / {decision.date}
                </div>
                <h3 className="mt-2 text-lg font-bold text-slate-950">
                  {decision.decision}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {decision.rationale}
                </p>
              </article>
            ))}
          </div>
        </Section>

        <Section
          id="risks"
          title="Gaps, conflicts and backlog"
          description="Open risk areas carried from Stage 2, Stage 3 and Stage 4 into the current governance layer."
        >
          <div className="grid gap-4 xl:grid-cols-3">
            <div>
              <h3 className="mb-3 text-base font-bold text-slate-950">
                P0 gaps
              </h3>
              <ul className="grid gap-2">
                {p0Gaps.map((gap) => (
                  <li
                    key={gap.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                  >
                    <div className="font-bold text-slate-950">{gap.title}</div>
                    <div className="mt-1 text-slate-600">{shortText(gap.risk)}</div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-base font-bold text-slate-950">
                P0 conflicts
              </h3>
              <ul className="grid gap-2">
                {p0Conflicts.map((conflict) => (
                  <li
                    key={conflict.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                  >
                    <div className="font-bold text-slate-950">
                      {conflict.title}
                    </div>
                    <div className="mt-1 text-slate-600">
                      {shortText(conflict.decision)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-base font-bold text-slate-950">
                Backlog next
              </h3>
              <ul className="grid gap-2">
                {projectKnowledgeBacklog.slice(0, 8).map((item) => (
                  <li
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                  >
                    <div className="font-bold text-slate-950">
                      {item.id}: {item.title}
                    </div>
                    <div className="mt-1 text-slate-600">
                      {item.status} / {item.priority}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        <Section
          id="sources"
          title="Sources and fixture coverage"
          description="Current fixture coverage by source type. Later PKG steps will add dedicated pages for each register."
        >
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="I18n dictionaries"
              value={projectKnowledgeI18nDictionaries.length}
              note="Dictionary and locale coverage inventory."
            />
            <StatCard
              label="File responsibility"
              value={projectKnowledgeFileResponsibilities.length}
              note="Starter map from symptoms and areas to files."
            />
            <StatCard
              label="Microsteps"
              value={projectKnowledgeImplementationMicrosteps.length}
              note="Stage 5 implementation microsteps imported as fixture data."
            />
            <StatCard
              label="Components"
              value={projectKnowledgeComponents.length}
              note="Component registry from the current source inventory."
            />
          </div>
          <MiniTable
            headers={["Source file", "Status", "Group", "Notes"]}
            rows={projectKnowledgeSourceDocuments.slice(0, 8).map((source) => [
              <code key="file" className="text-[12px] text-slate-600">
                {source.file}
              </code>,
              source.status,
              source.sourceGroup ?? "-",
              shortText(source.notes),
            ])}
          />
        </Section>

        <footer className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">
          <strong className="text-slate-950">Security boundary:</strong> this route
          is protected by the platform admin layout guard, has noindex metadata,
          is not added to public navigation, imports local fixtures only and does
          not create project-knowledge API endpoints. The admin guard performs
          only the existing access-check read path; this page does not add write
          operations.
        </footer>
      </div>
    </main>
  );
}
