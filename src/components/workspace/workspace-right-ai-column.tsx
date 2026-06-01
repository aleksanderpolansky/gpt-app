/**
 * UI-3.17 — RightAIColumn 292px shell.
 * UI-3.18 — AI context header + online indicator connected.
 * UI-3.19 — AI messages / insights fixtures connected.
 * UI-3.20 — AI quick commands connected.
 *
 * This component is fixture-only and local to UI-3.
 * It does not call network, database, auth, environment variables or server routes.
 *
 * Result markers:
 * RIGHT_AI_COLUMN_CREATED
 * AI_CONTEXT_HEADER_CREATED
 * AI_MESSAGES_FIXTURED
 * AI_QUICK_COMMANDS_CREATED
 */

import { WorkspaceAiContextHeader } from "./workspace-ai-context-header";
import { WorkspaceAiFeed } from "./workspace-ai-feed";
import { WorkspaceAiQuickCommands } from "./workspace-ai-quick-commands";

import type {
  WorkspaceAiInsight,
  WorkspaceAiMessage,
  WorkspaceContext,
} from "./workspace-types";

export const RIGHT_AI_COLUMN_RESULT = "RIGHT_AI_COLUMN_CREATED" as const;

export const AI_CONTEXT_HEADER_CONNECTED_RESULT =
  "AI_CONTEXT_HEADER_CREATED" as const;

export const AI_MESSAGES_FIXTURED_CONNECTED_RESULT =
  "AI_MESSAGES_FIXTURED" as const;

export const AI_QUICK_COMMANDS_CONNECTED_RESULT =
  "AI_QUICK_COMMANDS_CREATED" as const;

export type WorkspaceRightAiColumnProps = {
  readonly context: WorkspaceContext;
  readonly messages: readonly WorkspaceAiMessage[];
  readonly insights: readonly WorkspaceAiInsight[];
};

function RightAiSectionLabel({ children }: { readonly children: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7c8099]">
      {children}
    </p>
  );
}

export function WorkspaceRightAiColumn({
  context,
  messages,
  insights,
}: WorkspaceRightAiColumnProps) {
  return (
    <aside className="w-[292px] min-w-[292px] max-w-[292px] min-h-0 overflow-y-auto border-l border-black/10 bg-white p-4">
      <RightAiSectionLabel>Right AI column</RightAiSectionLabel>

      <WorkspaceAiContextHeader context={context} />

      <WorkspaceAiFeed messages={messages} insights={insights} />

      <WorkspaceAiQuickCommands />

      <div className="mt-4 rounded-xl border border-black/10 bg-[#eef2ff] p-3">
        <p className="text-xs font-semibold text-[#1a1d2e]">
          AI boundary
        </p>
        <p className="mt-1 text-xs leading-5 text-[#7c8099]">
          The right column is visual in UI-3. Suggestions are local placeholders
          and cannot execute actions without a later explicit gate.
        </p>
      </div>

      <p className="mt-4 text-xs text-[#7c8099]">
        AI_QUICK_COMMANDS_CREATED · width 292px · done 20/32 · left 12
      </p>
    </aside>
  );
}
