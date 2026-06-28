import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Project Knowledge | GPT App",
  description: "Protected internal read-only governance map for GPT App.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default async function ProjectKnowledgeProtectedLayout({
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
