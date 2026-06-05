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
  return (
    <CommercialDashboardComposer viewModel={certificatesCommercialViewModel} />
  );
}

