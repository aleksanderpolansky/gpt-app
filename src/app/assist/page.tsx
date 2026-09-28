import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/admin/require-assist-admin";
import FullAssistControl from "./full-assist-control";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ user?: string | string[] }> }) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) notFound();
  const params = await searchParams;
  return <FullAssistControl initialUser={typeof params.user === "string" ? params.user : ""} />;
}
