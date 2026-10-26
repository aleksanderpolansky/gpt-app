import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { SystemObservationObjectAdminForm } from "./system-observation-object-admin-form";

type PageProps={ searchParams:Promise<{locale?:string;parentId?:string}> };
export const dynamic="force-dynamic";

export default async function SystemObservationObjectAdminPage({searchParams}:PageProps) {
  const guard=await requirePlatformAdmin();
  if(!guard.ok) return (
    <main className="mx-auto max-w-3xl p-8 text-slate-900">
      <h1 className="text-xl font-semibold">Access restricted / Доступ ограничен</h1>
      <p className="mt-2">{guard.errorMessage}</p>
      <Link href="/admin" className="mt-4 inline-block text-blue-700 underline">Admin hub</Link>
    </main>
  );
  const params=await searchParams;
  return (
    <main className="min-h-screen bg-[#f4f6fb] px-3 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin" className="text-sm text-blue-700 underline">← Admin hub</Link>
        <SystemObservationObjectAdminForm initialLocale={params.locale??"ru"} initialParentId={params.parentId??""}/>
      </div>
    </main>
  );
}
