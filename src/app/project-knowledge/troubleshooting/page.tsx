import type { TroubleshootingRule } from "@/types/project-knowledge";
import {
  DataTable,
  InlineCode,
  PageShell,
} from "../_components/ProjectKnowledgeUi";
import { projectKnowledgeTroubleshootingRules } from "@/data/project-knowledge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const rules: readonly TroubleshootingRule[] = projectKnowledgeTroubleshootingRules;

export default function ProjectKnowledgeTroubleshootingPage() {
  const rows = rules.map((rule) => [
    rule.issue,
    <InlineCode key="start">{rule.whereToStart}</InlineCode>,
    rule.thenCheck.join("; "),
    rule.gate,
  ]);

  return (
    <PageShell
      eyebrow="Troubleshooting"
      title="Troubleshooting and gate map"
      description="Symptom-to-file map for future developers, ChatGPT sessions and recovery work."
    >
      <DataTable
        headers={["Issue", "Start here", "Then check", "Gate"]}
        rows={rows}
      />
    </PageShell>
  );
}
