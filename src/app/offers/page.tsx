import type { Metadata } from "next";

import type { CommercialCoreViewModel } from "../../components/workspace/commercial-core";
import {
  CommercialDashboardComposer,
  commercialCoreFixture,
} from "../../components/workspace/commercial-core";

export const metadata: Metadata = {
  title: "Offers | Commercial Core",
  description:
    "Read-only commercial offers route with offer previews, certificate readiness and disabled action boundaries.",
};

const offersCommercialViewModel: CommercialCoreViewModel = {
  ...commercialCoreFixture,
  header: {
    ...commercialCoreFixture.header,
    activeRoute: "offers",
    accessState: "read-only",
    eyebrow: "Commercial core / Offers",
    title: "Offers",
    description:
      "Read-only offer directory with commercial preview pricing, certificate readiness and future-gated actions.",
  },
};

export default function OffersPage() {
  return (
    <div className="min-h-0">
      <div className="min-w-0">
        <CommercialDashboardComposer viewModel={offersCommercialViewModel} />
      </div>
</div>
  );
}



