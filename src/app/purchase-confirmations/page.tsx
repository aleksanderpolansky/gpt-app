import { ContextualAIColumn, getContextForRoute } from "../../components/workspace/contextual-ai";
import type { Metadata } from "next";

import type { CommercialCoreViewModel } from "../../components/workspace/commercial-core";
import {
  CommercialDashboardComposer,
  commercialCoreFixture,
} from "../../components/workspace/commercial-core";

export const metadata: Metadata = {
  title: "Purchase confirmations | Commercial Core",
  description:
    "Read-only buyer purchase confirmations route for external purchase proof, seller review status and points impact preview.",
};

const buyerConfirmationsCommercialViewModel: CommercialCoreViewModel = {
  ...commercialCoreFixture,
  header: {
    ...commercialCoreFixture.header,
    activeRoute: "buyer-confirmations",
    accessState: "read-only",
    eyebrow: "Commercial core / Buyer confirmations",
    title: "Purchase confirmations",
    description:
      "Read-only buyer confirmation route for external purchase proof, seller review status, disabled submit action and points impact preview.",
  },
};

export default function PurchaseConfirmationsPage() {
    const sellerConfirmationsAIContext = getContextForRoute("/seller-confirmations");

  return (
    <div className="grid min-h-0 gap-4 xl:grid-cols-3">
      <div className="min-w-0 xl:col-span-2">
        <CommercialDashboardComposer viewModel={buyerConfirmationsCommercialViewModel} />
      </div>

      <ContextualAIColumn
        context={sellerConfirmationsAIContext}
        className="hidden xl:flex"
      />
    </div>
  );
}


