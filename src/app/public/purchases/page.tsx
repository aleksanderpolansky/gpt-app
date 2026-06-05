import type { Metadata } from "next";

import type { CommercialCoreViewModel } from "../../../components/workspace/commercial-core";
import {
  CommercialDashboardComposer,
  commercialCoreFixture,
} from "../../../components/workspace/commercial-core";

export const metadata: Metadata = {
  title: "Public purchases | Commercial Core",
  description:
    "Read-only public purchases route with masked buyer names, open seller company names and confirmed external purchase history.",
};

const publicPurchasesCommercialViewModel: CommercialCoreViewModel = {
  ...commercialCoreFixture,
  header: {
    ...commercialCoreFixture.header,
    activeRoute: "public-purchases",
    accessState: "read-only",
    eyebrow: "Commercial core / Public purchases",
    title: "Public purchases",
    description:
      "Read-only public history route with masked buyer names, open seller company names and confirmed external purchase history.",
  },
};

export default function PublicPurchasesPage() {
  return (
    <CommercialDashboardComposer viewModel={publicPurchasesCommercialViewModel} />
  );
}

