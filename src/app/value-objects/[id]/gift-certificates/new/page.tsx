import { notFound } from "next/navigation";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import { auth0 } from "../../../../../../lib/auth0";
import { resolveOfficialEurReferenceRate } from "../../../../../../lib/exchange-rates/official-eur-reference-rate";
import { supabase } from "../../../../../../lib/supabase";
import { getOrganizationCurrency } from "@/lib/commercial/currency";
import { readValueObjectPublicImageUrl } from "@/lib/value-object-public-image";
import { GiftCertificateCreateForm } from "./gift-certificate-create-form";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type GiftCertificateCreatePageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    locale?: string | string[];
  }>;
};

type ValueObjectRow = {
  id: string;
  title: string;
  description: string | null;
  object_kind: "product_type" | "service_type";
  node_role_code: string | null;
  default_price: number | null;
  default_currency: string | null;
  default_duration_minutes: number | null;
  organization_id: string | null;
  status: string;
  metadata_json: unknown;
};

type OrganizationRow = {
  id: string;
  organization_name: string;
  country_code: string | null;
  default_currency: string | null;
  status: string;
  owner_actor_id: string;
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

export default async function GiftCertificateCreatePage({
  params,
  searchParams,
}: GiftCertificateCreatePageProps) {
  const { id } = await params;
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

  const { data: valueObjectData, error: valueObjectError } = await supabase
    .from("value_objects")
    .select(
      `
      id,
      title,
      description,
      object_kind,
      node_role_code,
      default_price,
      default_currency,
      default_duration_minutes,
      organization_id,
      status,
      metadata_json
    `,
    )
    .eq("id", id)
    .eq("owner_user_id", actorContext.appUserId)
    .eq("owner_actor_id", actorContext.actorId)
    .eq("node_role_code", "activity_leaf")
    .in("object_kind", ["product_type", "service_type"])
    .in("status", ["draft", "active"])
    .maybeSingle();

  if (valueObjectError) {
    throw new Error(valueObjectError.message);
  }

  const valueObject = valueObjectData as ValueObjectRow | null;

  if (!valueObject) {
    notFound();
  }

  let providerLabel = actorContext.profile.displayName;
  let providerType: "personal" | "avatar" | "organization" =
    actorContext.profile.profileKind === "avatar" ? "avatar" : "personal";
  let providerCurrency = "EUR";

  if (valueObject.organization_id) {
    const { data: organizationData, error: organizationError } = await supabase
      .from("organizations")
      .select(
        "id, organization_name, country_code, default_currency, status, owner_actor_id",
      )
      .eq("id", valueObject.organization_id)
      .eq("owner_actor_id", actorContext.actorId)
      .eq("status", "active")
      .maybeSingle();

    if (organizationError) {
      throw new Error(organizationError.message);
    }

    const organization = organizationData as OrganizationRow | null;

    if (!organization) {
      notFound();
    }

    providerLabel = organization.organization_name;
    providerType = "organization";
    providerCurrency = getOrganizationCurrency(organization) ?? "";

    if (!providerCurrency) {
      throw new Error(
        "Organization currency does not match the country of its address.",
      );
    }
  }

  const valueObjectCurrency =
    typeof valueObject.default_currency === "string"
      ? valueObject.default_currency.trim().toUpperCase()
      : "";

  if (
    !/^[A-Z]{3}$/.test(providerCurrency) ||
    valueObjectCurrency !== providerCurrency
  ) {
    throw new Error(
      "Product or service currency does not match the provider country.",
    );
  }

  const referenceRate = await resolveOfficialEurReferenceRate(providerCurrency);

  return (
    <GiftCertificateCreateForm
      locale={locale}
      valueObject={{
        id: valueObject.id,
        title: valueObject.title,
        description: valueObject.description,
        objectKind: valueObject.object_kind,
        ordinaryPrice: Number(valueObject.default_price ?? 0),
        currency: providerCurrency,
        ordinaryDurationMinutes: valueObject.default_duration_minutes,
        imageUrl: readValueObjectPublicImageUrl(valueObject.metadata_json),
      }}
      provider={{
        label: providerLabel,
        type: providerType,
      }}
      referenceRate={{
        providerCurrencyPerEuro: referenceRate.providerCurrencyPerEuro,
        referenceDate: referenceRate.referenceDate,
        sourceLabel:
          referenceRate.sourceCode === "EUR_IDENTITY"
            ? "EUR"
            : "European Central Bank",
      }}
    />
  );
}
