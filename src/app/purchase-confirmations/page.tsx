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
  return (
    <CommercialDashboardComposer viewModel={buyerConfirmationsCommercialViewModel} />
  );
}

