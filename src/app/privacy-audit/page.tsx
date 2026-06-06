import { ContextualAIColumn, getContextForRoute } from "@/components/workspace/contextual-ai";
import type { Metadata } from "next";

import {
  PrivacyAuditDashboard,
  privacyAuditFixture,
} from "@/components/workspace/privacy-audit";

export const metadata: Metadata = {
  title: "Privacy Audit | AI Navigator",
  description:
    "Fixture-first read-only privacy, audit, and correction history preview for inferred, confirmed, rejected, and corrected meanings.",
};

export default function PrivacyAuditRoute() {
  const privacyAuditAIContext = getContextForRoute("/privacy-audit");

  return (
    <div className="grid min-h-0 gap-4 xl:grid-cols-3">
      <div className="min-w-0 xl:col-span-2">
        <PrivacyAuditDashboard viewModel={privacyAuditFixture} />
      </div>

      <ContextualAIColumn
        context={privacyAuditAIContext}
        className="hidden xl:flex"
      />
    </div>
  );
}

