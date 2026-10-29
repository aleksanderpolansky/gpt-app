import type { Metadata } from "next";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import GoldCorpusClient from "./GoldCorpusClient";
export const dynamic = "force-dynamic";
export const metadata:Metadata={title:"ARI-02.3 · Gold corpus · ARCTor",description:"Human relevance annotation for ON search"};
export default async function GoldCorpusPage({searchParams}:{searchParams:Promise<{locale?:string}>}) {
  const guard=await requirePlatformAdmin({allowedRoles:["owner","admin","viewer"]});
  if(!guard.ok) return <main className="mx-auto max-w-3xl p-8">Administrator access required.</main>;
  const {locale}=await searchParams;
  return <main className="mx-auto max-w-6xl space-y-5 px-4 py-8">
    <Link className="text-sm text-blue-600 underline" href={`/admin/ontology-research/diagnostics?locale=${locale==="en"?"en":"ru"}`}>← ARI-02.2 · Диагностика поиска</Link>
    <GoldCorpusClient />
  </main>;
}
