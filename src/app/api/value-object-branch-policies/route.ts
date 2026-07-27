import { NextResponse } from "next/server";

import { supabase } from "../../../../lib/supabase";
import type { ValueObjectBranchPolicyDto } from "@/types/value-object-branch-policy";

export const dynamic = "force-dynamic";

type BranchPolicyRow = {
  branch_type_code: string;
  title_key: string;
  description_key: string;
  display_order: number;
  status: string;
};

export async function GET() {
  const { data, error } = await supabase
    .from("value_object_branch_types")
    .select(
      "branch_type_code, title_key, description_key, display_order, status",
    )
    .eq("status", "active")
    .order("display_order", { ascending: true })
    .order("branch_type_code", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const policies: ValueObjectBranchPolicyDto[] = (
    (data ?? []) as BranchPolicyRow[]
  ).map((row) => ({
    branchTypeCode: row.branch_type_code,
    titleKey: row.title_key,
    descriptionKey: row.description_key,
    displayOrder: row.display_order,
    status: row.status,
  }));

  return NextResponse.json(
    { ok: true, policies },
    { headers: { "Cache-Control": "no-store" } },
  );
}
