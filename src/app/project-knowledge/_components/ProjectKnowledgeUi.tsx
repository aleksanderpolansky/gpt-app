import Link from "next/link";
import type { ReactNode } from "react";

export const projectKnowledgeSubpages = [
  {
    href: "/project-knowledge/glossary",
    title: "Glossary",
    description: "Canonical project terms, definitions, aliases and forbidden confusions.",
  },
  {
    href: "/project-knowledge/page-map",
    title: "Page map",
    description: "Application routes, surfaces, statuses, i18n markers and route files.",
  },
  {
    href: "/project-knowledge/file-map",
    title: "File map",
    description: "File responsibilities, components, layers and troubleshooting entry points.",
  },
  {
    href: "/project-knowledge/process-map",
    title: "Process map",
    description: "Core product flows, related routes, API endpoints, files and gate notes.",
  },
  {
    href: "/project-knowledge/api-map",
    title: "API map",
    description: "Endpoint inventory, method hints, mutation markers and auth/session markers.",
  },
  {
    href: "/project-knowledge/troubleshooting",
    title: "Troubleshooting",
    description: "Where to start when a feature breaks and what gate to run next.",
  },
  {
    href: "/project-knowledge/decisions",
    title: "Decision log",
    description: "Active project decisions, superseded assumptions and current work boundaries.",
  },
  {
    href: "/project-knowledge/sources",
    title: "Sources",
    description: "Source document register with active, historical and generated references.",
  },
  {
    href: "/project-knowledge/risks",
    title: "Risks",
    description: "Known gaps, version conflicts and backlog items that still require attention.",
  },
] as const;

export function truncateText(value: string | undefined, fallback = "-", limit = 180) {
  const text = value?.trim();

  if (!text) {
    return fallback;
  }

  return text.length > limit ? `${text.slice(0, Math.max(0, limit - 3))}...` : text;
}

export function Badge({ children }: { readonly children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-semibold text-slate-700">
      {children}
    </span>
  );
}

export function PageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f5f6fb] px-4 py-8 text-slate-900">
      <div className="mx-auto grid w-full max-w-[1240px] gap-6">
        <header className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-500">
            {eyebrow}
          </div>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-[-0.045em] text-slate-950">
            {title}
          </h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600">
            {description}
          </p>
          <div className="mt-6">
            <Link
              href="/project-knowledge"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700"
            >
              Back to Project Knowledge
            </Link>
          </div>
        </header>
        <ProjectKnowledgeSubpageNav compact />
        {children}
      </div>
    </main>
  );
}

export function ProjectKnowledgeSubpageNav({
  compact = false,
}: {
  readonly compact?: boolean;
}) {
  return (
    <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-500">
            Protected subpages
          </div>
          <h2 className="mt-1 text-xl font-bold text-slate-950">
            Project Knowledge registers
          </h2>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          All links stay under the protected Project Knowledge layout and inherit
          the platform admin guard.
        </p>
      </div>
      <div className={compact ? "flex flex-wrap gap-2" : "grid gap-3 md:grid-cols-3"}>
        {projectKnowledgeSubpages.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={
              compact
                ? "rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
                : "rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-300 hover:bg-indigo-50"
            }
          >
            <span className="block font-bold text-slate-950">{item.title}</span>
            {!compact ? (
              <span className="mt-1 block text-sm leading-6 text-slate-600">
                {item.description}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}

export function DataTable({
  headers,
  rows,
}: {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly ReactNode[])[];
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
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
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td
                  key={`cell-${rowIndex}-${cellIndex}`}
                  className="max-w-[460px] px-4 py-3 align-top text-slate-700"
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

export function CardGrid({ children }: { readonly children: ReactNode }) {
  return <section className="grid gap-4 lg:grid-cols-2">{children}</section>;
}

export function InfoCard({
  eyebrow,
  title,
  description,
  children,
}: {
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
  readonly children?: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {eyebrow ? (
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-500">
          {eyebrow}
        </div>
      ) : null}
      <h3 className="mt-1 text-lg font-bold text-slate-950">{title}</h3>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      ) : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </article>
  );
}

export function InlineCode({ children }: { readonly children: ReactNode }) {
  return (
    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[12px] text-slate-700">
      {children}
    </code>
  );
}
