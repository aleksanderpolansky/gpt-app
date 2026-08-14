import type { AiControlLocale } from "@/lib/ai/processingRuleContract";
import { applyActivityQuickCaptureProcessingRules } from "@/lib/ai/processingRuleExecutor";
import { readProcessingControlCatalog } from "@/lib/ai/processingRules.server";
import type { AiLabQuickCaptureRow } from "@/lib/activity/aiLabQuickCapture";

export async function executeActivityQuickCaptureProcessingRules(input: {
  rows: AiLabQuickCaptureRow[];
  locale: AiControlLocale;
}) {
  const catalog = await readProcessingControlCatalog(input.locale);
  const rules = catalog.processingRules.filter((rule) =>
    rule.runtimeTargets.includes("activity_quick_capture"),
  );
  return applyActivityQuickCaptureProcessingRules({ rows: input.rows, rules });
}
