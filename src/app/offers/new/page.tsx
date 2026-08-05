import { notFound } from "next/navigation";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../lib/actor-context";
import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";
import { readValueObjectPublicImageUrl } from "@/lib/value-object-public-image";
import {
  SuperOfferWizard,
  type SuperOfferProvider,
  type SuperOfferValueObject,
} from "./super-offer-wizard";

export const dynamic = "force-dynamic";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type SuperOfferWizardPageProps = {
  readonly searchParams?: Promise<{
    readonly locale?: string | string[];
    readonly mode?: string | string[];
    readonly organizationId?: string | string[];
    readonly valueObjectId?: string | string[];
  }>;
};

type ProfileRow = {
  id: string;
  actor_id: string;
  profile_kind: "personal" | "avatar";
  display_name: string;
  image_url: string | null;
  created_at: string;
};

type ActorRow = {
  id: string;
  status: string;
  actor_type: string;
};

type OrganizationRow = {
  id: string;
  organization_name: string;
  owner_actor_id: string;
  default_currency: string | null;
  logo_url: string | null;
  status: string;
};

type ValueObjectRow = {
  id: string;
  owner_actor_id: string;
  organization_id: string | null;
  title: string;
  description: string | null;
  object_kind: "product_type" | "service_type";
  default_price: number | null;
  default_currency: string | null;
  default_duration_minutes: number | null;
  status: string;
  metadata_json: unknown;
  created_at: string;
};

function normalizeLocale(value: string | string[] | undefined): LocaleCode {
  const normalized = Array.isArray(value) ? value[0] : value;

  return normalized === "pl" ||
    normalized === "ru" ||
    normalized === "uk" ||
    normalized === "de" ||
    normalized === "es" ||
    normalized === "cs"
    ? normalized
    : "en";
}

function firstString(value: string | string[] | undefined): string | null {
  const normalized = Array.isArray(value) ? value[0] : value;
  return typeof normalized === "string" && normalized.trim()
    ? normalized.trim()
    : null;
}

function normalizeCurrency(value: string | null | undefined): string {
  const normalized = value?.trim().toUpperCase() ?? "";
  return /^[A-Z]{3}$/.test(normalized) ? normalized : "EUR";
}

function profileProviderKey(actorId: string) {
  return `profile:${actorId}`;
}

function organizationProviderKey(organizationId: string) {
  return `organization:${organizationId}`;
}

export default async function SuperOfferWizardPage({
  searchParams,
}: SuperOfferWizardPageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = normalizeLocale(resolvedSearchParams?.locale);
  const requestedMode = firstString(resolvedSearchParams?.mode);
  const requestedOrganizationId = firstString(
    resolvedSearchParams?.organizationId,
  );
  const requestedValueObjectId = firstString(
    resolvedSearchParams?.valueObjectId,
  );
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

  const { data: profileData, error: profileError } = await supabase
    .from("actor_public_profiles")
    .select(
      "id, actor_id, profile_kind, display_name, image_url, created_at",
    )
    .eq("owner_user_id", actorContext.appUserId)
    .in("profile_kind", ["personal", "avatar"])
    .order("created_at", { ascending: true });

  if (profileError) {
    throw new Error(profileError.message);
  }

  const profileRows = (profileData ?? []) as ProfileRow[];
  const candidateActorIds = [
    ...new Set(profileRows.map((profile) => profile.actor_id)),
  ];

  const { data: actorData, error: actorError } = candidateActorIds.length
    ? await supabase
        .from("actors")
        .select("id, status, actor_type")
        .in("id", candidateActorIds)
        .eq("status", "active")
    : { data: [], error: null };

  if (actorError) {
    throw new Error(actorError.message);
  }

  const activeActorIds = new Set(
    ((actorData ?? []) as ActorRow[])
      .filter(
        (actor) =>
          actor.actor_type === "person" || actor.actor_type === "avatar",
      )
      .map((actor) => actor.id),
  );
  const profiles = profileRows.filter((profile) =>
    activeActorIds.has(profile.actor_id),
  );
  const actorIds = [...activeActorIds];

  const [organizationResult, valueObjectResult] = await Promise.all([
    actorIds.length
      ? supabase
          .from("organizations")
          .select(
            "id, organization_name, owner_actor_id, default_currency, logo_url, status",
          )
          .in("owner_actor_id", actorIds)
          .eq("status", "active")
          .order("organization_name", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    actorIds.length
      ? supabase
          .from("value_objects")
          .select(
            `
            id,
            owner_actor_id,
            organization_id,
            title,
            description,
            object_kind,
            default_price,
            default_currency,
            default_duration_minutes,
            status,
            metadata_json,
            created_at
          `,
          )
          .eq("owner_user_id", actorContext.appUserId)
          .in("owner_actor_id", actorIds)
          .eq("node_role_code", "activity_leaf")
          .in("object_kind", ["product_type", "service_type"])
          .in("status", ["draft", "active"])
          .contains("metadata_json", {
            catalog_contract: "pgc2d-products-services-v1",
          })
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (organizationResult.error) {
    throw new Error(organizationResult.error.message);
  }

  if (valueObjectResult.error) {
    throw new Error(valueObjectResult.error.message);
  }

  const organizations = (organizationResult.data ?? []) as OrganizationRow[];
  const valueObjects = (valueObjectResult.data ?? []) as ValueObjectRow[];
  const profileByActorId = new Map(
    profiles.map((profile) => [profile.actor_id, profile] as const),
  );

  const providers: SuperOfferProvider[] = [];

  for (const profile of profiles) {
    providers.push({
      key: profileProviderKey(profile.actor_id),
      profileId: profile.id,
      actorId: profile.actor_id,
      organizationId: null,
      kind: profile.profile_kind,
      displayName: profile.display_name,
      imageUrl: profile.image_url,
      currency: "EUR",
    });
  }

  for (const organization of organizations) {
    const ownerProfile = profileByActorId.get(organization.owner_actor_id);

    if (!ownerProfile) {
      continue;
    }

    providers.push({
      key: organizationProviderKey(organization.id),
      profileId: ownerProfile.id,
      actorId: organization.owner_actor_id,
      organizationId: organization.id,
      kind: "organization",
      displayName: organization.organization_name,
      imageUrl: organization.logo_url,
      currency: normalizeCurrency(organization.default_currency),
    });
  }

  const providerByProfileActorId = new Map(
    providers
      .filter((provider) => provider.kind !== "organization")
      .map((provider) => [provider.actorId, provider] as const),
  );
  const providerByOrganizationId = new Map(
    providers
      .filter(
        (provider): provider is SuperOfferProvider & {
          organizationId: string;
        } => Boolean(provider.organizationId),
      )
      .map((provider) => [provider.organizationId, provider] as const),
  );

  const items: SuperOfferValueObject[] = valueObjects.flatMap((item) => {
    const provider = item.organization_id
      ? providerByOrganizationId.get(item.organization_id)
      : providerByProfileActorId.get(item.owner_actor_id);

    if (!provider) {
      return [];
    }

    return [
      {
        id: item.id,
        providerKey: provider.key,
        providerProfileId: provider.profileId,
        providerName: provider.displayName,
        providerKind: provider.kind,
        providerImageUrl: provider.imageUrl,
        title: item.title,
        description: item.description,
        objectKind: item.object_kind,
        ordinaryPrice: Number(item.default_price ?? 0),
        currency: normalizeCurrency(item.default_currency),
        ordinaryDurationMinutes: item.default_duration_minutes,
        status: item.status,
        imageUrl: readValueObjectPublicImageUrl(item.metadata_json),
      },
    ];
  });

  const requestedOrganizationProvider = requestedOrganizationId
    ? providerByOrganizationId.get(requestedOrganizationId)
    : null;
  const activeProfileProvider = providerByProfileActorId.get(
    actorContext.actorId,
  );
  const initialProviderKey =
    requestedOrganizationProvider?.key ??
    activeProfileProvider?.key ??
    providers[0]?.key ??
    "";
  const requestedItemExists = Boolean(
    requestedValueObjectId &&
      items.some((item) => item.id === requestedValueObjectId),
  );
  const initialMode =
    requestedMode === "existing" || requestedItemExists ? "existing" : "new";

  return (
    <SuperOfferWizard
      locale={locale}
      activeProfileId={actorContext.profile.profileId}
      providers={providers}
      items={items}
      initialMode={initialMode}
      initialProviderKey={initialProviderKey}
      initialValueObjectId={requestedItemExists ? requestedValueObjectId : null}
    />
  );
}
