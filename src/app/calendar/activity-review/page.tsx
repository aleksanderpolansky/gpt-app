import { Suspense } from "react";

import ActivityReviewClient from "./activity-review-client";
import SavedActivityReviewClient from "./saved-activity-review-client";

type CalendarActivityReviewPageProps = {
  searchParams?: Promise<
    Record<string, string | string[] | undefined>
  >;
};

function firstParam(
  value: string | string[] | undefined,
) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CalendarActivityReviewPage({
  searchParams,
}: CalendarActivityReviewPageProps) {
  const resolved = (await searchParams) ?? {};
  const activityEventId = firstParam(
    resolved.activityEventId,
  );

  return (
    <Suspense fallback={null}>
      {activityEventId ? (
        <SavedActivityReviewClient
          activityEventId={activityEventId}
        />
      ) : (
        <ActivityReviewClient />
      )}
    </Suspense>
  );
}
