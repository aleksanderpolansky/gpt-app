import type { Metadata } from "next";
import { getPointsText } from "../../i18n/messages";

const pointsText = (key: Parameters<typeof getPointsText>[0]) => getPointsText(key, "en");

import type { CommercialCoreViewModel } from "../../components/workspace/commercial-core";
import {
  CommercialDashboardComposer,
  commercialCoreFixture,
} from "../../components/workspace/commercial-core";

export const metadata: Metadata = {
  title: pointsText("points.page.metadataTitle"),
  description: pointsText("points.page.metadataDescription"),
};

const pointsCommercialViewModel: CommercialCoreViewModel = {
  ...commercialCoreFixture,
  header: {
    ...commercialCoreFixture.header,
    activeRoute: "points",
    accessState: "read-only",
    eyebrow: pointsText("points.page.eyebrow"),
    title: pointsText("points.page.title"),
    description:
      "Read-only points wallet showing earned after seller confirmation, burned on certificates and not seller money boundaries.",
  },
};

export default function PointsPage() {
  return (
    <div className="min-h-0">
      <div className="min-w-0">
        <CommercialDashboardComposer viewModel={pointsCommercialViewModel} />
      </div>
</div>
  );
}



