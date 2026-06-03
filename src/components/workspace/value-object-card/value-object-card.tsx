import Link from "next/link";

import type { ValueObjectCardModel } from "./value-object-card.types";
import { getStateSignalToneClassName } from "./value-object-card-utils";

type ValueObjectCardProps = {
  valueObject: ValueObjectCardModel;
};

export function ValueObjectCard({ valueObject }: ValueObjectCardProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Link
            href="/value-objects"
            className="text-sm font-medium text-slate-600 hover:text-slate-950"
          >
            Back to Value Objects
          </Link>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
                  {valueObject.subtitle}
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  {valueObject.title}
                </h1>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  {valueObject.description}
                </p>
              </div>

              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-3 lg:min-w-80 lg:grid-cols-1">
                <MetaItem label="Status" value={valueObject.statusLabel} />
                <MetaItem label="Owner" value={valueObject.ownerLabel} />
                <MetaItem label="Visibility" value={valueObject.visibilityLabel} />
                <MetaItem label="Updated" value={valueObject.updatedLabel} />
              </div>
            </div>
          </section>
        </div>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
          <div className="flex flex-col gap-6">
            <CardSection title="Goals" description="Read-only goals connected with this value object.">
              <div className="grid gap-3">
                {valueObject.goals.map((goal) => (
                  <article
                    key={goal.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <h2 className="text-base font-semibold text-slate-950">
                        {goal.title}
                      </h2>
                      <span className="w-fit rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                        {goal.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {goal.description}
                    </p>
                  </article>
                ))}
              </div>
            </CardSection>

            <CardSection title="Insights" description="Fixture-only interpretation hints for this value object.">
              <div className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                    Focus pattern
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    This object is strongest when short language practice is connected with concrete work situations.
                  </p>
                </article>
                <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                    Growth direction
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Keep the next action small, observable, and reversible before connecting it with live analytics.
                  </p>
                </article>
              </div>
            </CardSection>

            <CardSection title="History / Related activities" description="Recent fixture activities related to this object.">
              <div className="grid gap-3">
                {valueObject.history.map((activity) => (
                  <article
                    key={activity.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="text-base font-semibold text-slate-950">
                          {activity.title}
                        </h2>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {activity.timestampLabel}
                        </p>
                      </div>
                      <span className="w-fit rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-800">
                        {activity.impactLabel}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {activity.description}
                    </p>
                  </article>
                ))}
              </div>
            </CardSection>
          </div>

          <aside className="flex flex-col gap-6">
            <CardSection title="Related categories" description="Semantic categories shown as read-only labels.">
              <div className="flex flex-wrap gap-2">
                {valueObject.relatedCategories.map((category) => (
                  <span
                    key={category.id}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700"
                  >
                    {category.label}
                    <span className="ml-2 text-xs text-slate-500">
                      {category.kind}
                    </span>
                  </span>
                ))}
              </div>
            </CardSection>

            <CardSection title="Context AI" description="AI context is fixture-only and does not execute actions.">
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-800">
                  AI context
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  The assistant may use this card as read-only context for later suggestions, but it must not treat these hints as final truth.
                </p>
              </div>
            </CardSection>

            <CardSection title="State signals" description="Signals only. Not diagnosis, truth, or final scoring.">
              <div className="grid gap-3">
                {valueObject.stateSignals.map((signal) => (
                  <article
                    key={signal.id}
                    className={`rounded-2xl border p-4 ${getStateSignalToneClassName(signal.tone)}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-sm font-semibold">{signal.label}</h2>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                        {signal.value}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6">{signal.note}</p>
                  </article>
                ))}
              </div>
            </CardSection>

            <section className="rounded-3xl border border-violet-200 bg-violet-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">
                Candidate next action
              </p>
              <h2 className="mt-2 text-lg font-semibold text-violet-950">
                {valueObject.candidateNextAction.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-violet-900">
                {valueObject.candidateNextAction.description}
              </p>
              <div className="mt-4 rounded-2xl border border-violet-200 bg-white p-4 text-sm leading-6 text-slate-700">
                <p className="font-medium text-slate-950">Reason</p>
                <p className="mt-1">{valueObject.candidateNextAction.reason}</p>
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-violet-700">
                {valueObject.candidateNextAction.safetyLabel}
              </p>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

type CardSectionProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

function CardSection({ title, description, children }: CardSectionProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

type MetaItemProps = {
  label: string;
  value: string;
};

function MetaItem({ label, value }: MetaItemProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-medium text-slate-900">{value}</p>
    </div>
  );
}



