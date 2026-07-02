import { Suspense } from "react";
import ActivityReviewClient from "./activity-review-client";

export default function CalendarActivityReviewPage() {
  return (
    <Suspense fallback={null}>
      <ActivityReviewClient />
    </Suspense>
  );
}

