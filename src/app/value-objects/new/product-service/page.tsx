import { notFound } from "next/navigation";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../lib/actor-context";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";
import { ProductServiceCreateForm } from "./product-service-create-form";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type ProductServicePageProps = {
  searchParams?: Promise<{
    locale?: string | string[];
  }>;
};

type OrganizationRow = {
  id: string;
  organization_name: string;
  default_currency: string | null;
};

type ProductServiceRow = {
  id: string;
  title: string;
  description: string | null;
  object_kind: "product_type" | "service_type";
  default_price: number | null;
  default_currency: string | null;
  default_duration_minutes: number | null;
  organization_id: string | null;
  status: string;
  created_at: string;
  organizations:
    | {
        id: string;
        organization_name: string | null;
      }
    | {
        id: string;
        organization_name: string | null;
      }[]
    | null;
};

function normalizeLocale(value: string | string[] | undefined): LocaleCode {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (
    normalized === "pl" ||
    normalized === "ru" ||
    normalized === "uk" ||
    normalized === "de" ||
    normalized === "es" ||
    normalized === "cs"
  ) {
    return normalized;
  }

  return "en";
}

export default async function ProductServiceCreatePage({
  searchParams,
}: ProductServicePageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = normalizeLocale(resolvedSearchParams?.locale);
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    notFound();
  }

  let actorContext: Awaited<ReturnType<typeof resolveActiveActorContext>>;

  try {
    actorContext = await resolveActiveActorContext(session.user.sub);
  } catch (error) {
    if (error instanceof ActorContextError) {
      notFound();
    }

    throw error;
  }

  const [
    { data: organizationData, error: organizationError },
    { data: itemData, error: itemError },
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, organization_name, default_currency")
      .eq("owner_actor_id", actorContext.actorId)
      .eq("status", "active")
      .order("organization_name", { ascending: true }),
    supabase
      .from("value_objects")
      .select(
        `
        id,
        title,
        description,
        object_kind,
        default_price,
        default_currency,
        default_duration_minutes,
        organization_id,
        status,
        created_at,
        organizations (
          id,
          organization_name
        )
      `,
      )
      .eq("owner_user_id", actorContext.appUserId)
      .eq("owner_actor_id", actorContext.actorId)
      .in("object_kind", ["product_type", "service_type"])
      .contains("metadata_json", {
        catalog_contract: "pgc2d-products-services-v1",
      })
      .order("created_at", { ascending: false }),
  ]);

  if (organizationError) {
    throw new Error(organizationError.message);
  }

  if (itemError) {
    throw new Error(itemError.message);
  }

  return (
    <ProductServiceCreateForm
      locale={locale}
      activeProfile={{
        actorId: actorContext.actorId,
        displayName: actorContext.profile.displayName,
        profileKind: actorContext.profile.profileKind,
        currency: "EUR",
      }}
      organizations={(organizationData ?? []) as OrganizationRow[]}
      existingItems={(itemData ?? []) as ProductServiceRow[]}
    />
  );
}
