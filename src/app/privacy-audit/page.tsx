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
  return <PrivacyAuditDashboard viewModel={privacyAuditFixture} />;
}
