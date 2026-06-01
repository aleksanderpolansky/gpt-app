/**
 * UI-3.19 — AI messages / insights fixtures.
 *
 * This component is fixture-only and local to UI-3.
 * It does not call network, database, auth, environment variables or server routes.
 *
 * Result marker: AI_MESSAGES_FIXTURED
 */

import type { WorkspaceAiInsight, WorkspaceAiMessage } from "./workspace-types";

export const AI_MESSAGES_FIXTURED_RESULT = "AI_MESSAGES_FIXTURED" as const;

export type WorkspaceAiFeedProps = {
  readonly messages: readonly WorkspaceAiMessage[];
  readonly insights: readonly WorkspaceAiInsight[];
};

function FeedCounter({ label }: { readonly label: string }) {
  return (
    <span className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs font-medium text-[#7c8099]">
      {label}
    </span>
  );
}

function FeedSectionTitle({
  title,
  count,
}: {
  readonly title: string;
  readonly count: number;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c8099]">
        {title}
      </p>
      <FeedCounter label={String(count)} />
    </div>
  );
}

export function WorkspaceAiFeed({ messages, insights }: WorkspaceAiFeedProps) {
  return (
    <div className="mt-4 space-y-4">
      <section>
        <FeedSectionTitle title="AI messages fixtures" count={messages.length} />

        <div className="space-y-3">
          {messages.map((message) => (
            <article
              key={message.id}
              className="rounded-xl border border-black/10 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-[#1a1d2e]">
                  {message.title}
                </p>

                <span className="shrink-0 rounded-full bg-[#f0f2f7] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#7c8099]">
                  fixture
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-[#7c8099]">
                {message.message}
              </p>

              <p className="mt-3 text-[11px] font-medium text-[#3b6ef8]">
                Local preview only · no send · no chat execution
              </p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <FeedSectionTitle title="AI insight fixtures" count={insights.length} />

        <div className="space-y-3">
          {insights.map((insight) => (
            <div key={insight.id} className="rounded-xl bg-[#f0f2f7] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[#1a1d2e]">
                  {insight.label}
                </p>
                <span className="text-[11px] font-semibold uppercase text-[#3b6ef8]">
                  {insight.value}
                </span>
              </div>

              <p className="mt-1 text-xs leading-5 text-[#7c8099]">
                {insight.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-xl border border-black/10 bg-[#eef2ff] p-3">
        <p className="text-xs font-semibold text-[#1a1d2e]">
          Fixture boundary
        </p>
        <p className="mt-1 text-xs leading-5 text-[#7c8099]">
          Messages and insights are static UI-3 fixtures. They do not start a
          model call, send messages, store state or trigger background work.
        </p>
      </div>

      <p className="text-xs text-[#7c8099]">
        AI_MESSAGES_FIXTURED · messages and insights · done 19/32 · left 13
      </p>
    </div>
  );
}
