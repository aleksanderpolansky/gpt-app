import type {Metadata} from "next";
import Link from "next/link";
import {requirePlatformAdmin} from "@/lib/admin/require-platform-admin";
import {validLocale} from "@/lib/ontology-research/ontologyResearchV1";
import ResearchClient from "./ResearchClient";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"ONTO-AI · ARCTor",description:"Исследование онтологии без записи"};
export default async function OntologyResearchPage({searchParams}:{searchParams:Promise<{locale?:string}>}){
  const guard=await requirePlatformAdmin({allowedRoles:["owner","admin","viewer"]});
  if(!guard.ok)return <section className="mx-auto max-w-3xl p-8"><h1 className="text-xl font-bold">Access denied</h1><p>Administrator access required.</p></section>;
  const rawLocale=(await searchParams).locale;
  const locale=validLocale(rawLocale)?rawLocale:"ru";
  return <main className="mx-auto max-w-6xl space-y-4 px-4 py-8">
    <Link className="text-sm text-blue-600 underline" href={`/admin?locale=${locale}`}>← Admin hub · Семантическая модель</Link>
    <ResearchClient locale={locale} canUseApi={guard.platformAdmin.role!=="viewer"}/>
  </main>;
}
