import type { Metadata } from "next";

import type { CommercialCoreViewModel } from "../../../components/workspace/commercial-core";
import {
  CommercialDashboardComposer,
  commercialCoreFixture,
} from "../../../components/workspace/commercial-core";

export const metadata: Metadata = {
  title: "Seller confirmations | Commercial Core",
  description:
    "Read-only seller confirmation queue route with pending, rejected and confirmed external purchase requests.",
};

const sellerConfirmationsCommercialViewModel: CommercialCoreViewModel = {
  ...commercialCoreFixture,
  header: {
    ...commercialCoreFixture.header,
    activeRoute: "seller-confirmations",
    accessState: "read-only",
    eyebrow: "Commercial core / Seller confirmations",
    title: "Seller confirmations",
    description:
      "Read-only seller queue route for pending, rejected and confirmed external purchase requests with confirm, reject and confirm-later actions disabled.",
  },
};

export default function SellerPurchaseConfirmationsPage() {
  return (
    <CommercialDashboardComposer viewModel={sellerConfirmationsCommercialViewModel} />
  );
}

