import type { ReactNode } from "react";

export const SEMANTIC_REVIEW_STATES_CREATED = true as const;

export interface SemanticReviewBaseStateProps {
  title?: string;
  description?: string;
  compact?: boolean;
}

export interface SemanticReviewErrorStateProps extends SemanticReviewBaseStateProps {
  details?: string;
}

const semanticReviewStateSafetyStatements = [
  "State screen is local UI only.",
  "No category, Value Object, Activity Event, state fact, points, commercial record, or ontology record is created.",
  "AI output is a candidate, not truth.",
  "No external concept is converted into an internal category.",
  "No data is fetched or written by this state component.",
] as const;

function StateShell({
  eyebrow,
  title,
  description,
  tone,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  tone: "slate" | "indigo" | "violet" | "emerald" | "amber";
  children?: ReactNode;
}) {
  const toneClasses = {
    slate:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
    indigo:
      "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200",
    violet:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200",
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
    amber:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200",
  } satisfies Record<string, string>;

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className={`rounded-2xl border p-4 ${toneClasses[tone]}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-6 opacity-80">{description}</p>
      </div>

      {children}

      <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        {semanticReviewStateSafetyStatements.map((statement) => (
          <p key={statement}>{statement}</p>
        ))}
      </div>
    </section>
  );
}

function SkeletonLine({ widthClass }: { widthClass: string }) {
  return (
    <div
      aria-hidden="true"
      className={`h-3 rounded-full bg-slate-200 dark:bg-slate-800 ${widthClass}`}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <SkeletonLine widthClass="w-2/5" />
      <SkeletonLine widthClass="w-4/5" />
      <SkeletonLine widthClass="w-3/5" />
      <div className="grid gap-3 md:grid-cols-3">
        <div className="h-16 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />
        <div className="h-16 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />
        <div className="h-16 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />
      </div>
    </div>
  );
}

export function SemanticReviewLoadingState({
  title = "Semantic review is loading",
  description = "The local preview shell is preparing static review cards.",
  compact = false,
}: SemanticReviewBaseStateProps) {
  return (
    <StateShell
      eyebrow="Loading state · local preview"
      title={title}
      description={description}
      tone="indigo"
    >
      <div className={compact ? "space-y-3" : "grid gap-3 lg:grid-cols-2"}>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </StateShell>
  );
}

export function SemanticReviewEmptyState({
  title = "No semantic items need review",
  description = "The queue is empty. Nothing is created, confirmed, merged, rejected, or written.",
}: SemanticReviewBaseStateProps) {
  return (
    <StateShell
      eyebrow="Empty state · fixture-only"
      title={title}
      description={description}
      tone="emerald"
    >
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
        Empty state only explains that there are no visible review candidates. It does not approve AI suggestions and does not create internal categories.
      </div>
    </StateShell>
  );
}

export function SemanticReviewErrorState({
  title = "Semantic review preview is unavailable",
  description = "The local UI can show an error state without retrying automatically or writing data.",
  details = "No runtime request is executed from this component.",
}: SemanticReviewErrorStateProps) {
  return (
    <StateShell
      eyebrow="Error state · no retry action"
      title={title}
      description={description}
      tone="amber"
    >
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
        {details}
      </div>
    </StateShell>
  );
}

export function SemanticReviewNoRightsState({
  title = "No rights to review this item",
  description = "This state is a visual boundary only. It does not check permissions and does not reveal private data.",
}: SemanticReviewBaseStateProps) {
  return (
    <StateShell
      eyebrow="No-rights state · visual boundary"
      title={title}
      description={description}
      tone="violet"
    >
      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm leading-6 text-violet-800 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200">
        Permission handling remains outside UI-6. This component only renders a blocked review state and cannot change access, ownership, records, or policy.
      </div>
    </StateShell>
  );
}

export function SemanticReviewBlockedState({
  title = "Review action is blocked",
  description = "Confirm, reject, merge, and ask-later actions stay disabled or preview-only until a separate feedback gate exists.",
}: SemanticReviewBaseStateProps) {
  return (
    <StateShell
      eyebrow="Blocked state · action gate required"
      title={title}
      description={description}
      tone="slate"
    >
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
            Confirm
          </p>
          <p className="mt-2 text-sm leading-6">Preview only</p>
        </div>

        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
            Merge
          </p>
          <p className="mt-2 text-sm leading-6">Feedback gate required</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
            Reject
          </p>
          <p className="mt-2 text-sm leading-6">Local preview only</p>
        </div>
      </div>
    </StateShell>
  );
}
