import { ContextualAIColumn, getContextForRoute } from "../../components/workspace/contextual-ai";
import type { Metadata } from "next";

import type { CommercialCoreViewModel } from "../../components/workspace/commercial-core";
import {
  CommercialDashboardComposer,
  commercialCoreFixture,
} from "../../components/workspace/commercial-core";

export const metadata: Metadata = {
  title: "Points | Commercial Core",
  description:
    "Read-only commercial points route with earned points, certificate burn rules and seller money separation.",
};

const pointsCommercialViewModel: CommercialCoreViewModel = {
  ...commercialCoreFixture,
  header: {
    ...commercialCoreFixture.header,
    activeRoute: "points",
    accessState: "read-only",
    eyebrow: "Commercial core / Points",
    title: "Points",
    description:
      "Read-only points wallet showing earned after seller confirmation, burned on certificates and not seller money boundaries.",
  },
};

export default function PointsPage() {
    const pointsAIContext = getContextForRoute("/points");

  return (
    <div className="grid min-h-0 gap-4 xl:grid-cols-3">
      <div className="min-w-0 xl:col-span-2">
        <CommercialDashboardComposer viewModel={pointsCommercialViewModel} />
      </div>

      <ContextualAIColumn
        context={pointsAIContext}
        className="hidden xl:flex"
      />
    </div>
  );
}


