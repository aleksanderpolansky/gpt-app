import { Suspense } from "react";
import AddActivityClient from "./add-activity-client";

export default function CalendarAddPage() {
  return (
    <Suspense fallback={null}>
      <AddActivityClient />
    </Suspense>
  );
}

