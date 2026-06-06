import { ContextualAIColumn, getContextForRoute } from "../../components/workspace/contextual-ai";
import type { Metadata } from "next";

import type { CommercialCoreViewModel } from "../../components/workspace/commercial-core";
import {
  CommercialDashboardComposer,
  commercialCoreFixture,
} from "../../components/workspace/commercial-core";

export const metadata: Metadata = {
  title: "Certificates | Commercial Core",
  description:
    "Read-only commercial certificates route with face value, points spending, money boundary and seller payout preview.",
};

const certificatesCommercialViewModel: CommercialCoreViewModel = {
  ...commercialCoreFixture,
  header: {
    ...commercialCoreFixture.header,
    activeRoute: "certificates",
    accessState: "read-only",
    eyebrow: "Commercial core / Certificates",
    title: "Certificates",
    description:
      "Read-only certificate catalogue with face value, points spending, money boundary and seller payout preview.",
  },
};

export default function CertificatesPage() {
    const certificatesAIContext = getContextForRoute("/certificates");

  return (
    <div className="grid min-h-0 gap-4 xl:grid-cols-3">
      <div className="min-w-0 xl:col-span-2">
        <CommercialDashboardComposer viewModel={certificatesCommercialViewModel} />
      </div>

      <ContextualAIColumn
        context={certificatesAIContext}
        className="hidden xl:flex"
      />
    </div>
  );
}


