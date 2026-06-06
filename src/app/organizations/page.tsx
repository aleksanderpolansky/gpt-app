import type { Metadata } from "next";

import type { CommercialCoreViewModel } from "../../components/workspace/commercial-core";
import {
  CommercialDashboardComposer,
  commercialCoreFixture,
} from "../../components/workspace/commercial-core";

export const metadata: Metadata = {
  title: "Organizations | Commercial Core",
  description:
    "Read-only commercial organizations route with roles, country-derived currency and preview counters.",
};

const organizationsCommercialViewModel: CommercialCoreViewModel = {
  ...commercialCoreFixture,
  header: {
    ...commercialCoreFixture.header,
    activeRoute: "organizations",
    accessState: "read-only",
    eyebrow: "Commercial core / Organizations",
    title: "Organizations",
    description:
      "Read-only organization directory with roles, country-derived currency and commercial preview counters.",
  },
};

export default function OrganizationsPage() {
  return (
    <div className="min-h-0">
      <div className="min-w-0">
        <CommercialDashboardComposer viewModel={organizationsCommercialViewModel} />
      </div>
</div>
  );
}



