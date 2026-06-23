import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ValueObjectsDebugProtectedLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    notFound();
  }

  return <>{children}</>;
}
