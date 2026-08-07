import { supabase } from "../../../lib/supabase";
import {
  readGiftCertificateProductImageSnapshot,
  readValueObjectPublicImageUrl,
} from "@/lib/value-object-public-image";

type TermsRow = {
  activity_event_id: string;
  value_object_id: string;
  provider_owner_user_id: string;
  provider_manager_actor_id: string;
  provider_actor_id: string;
  provider_organization_id: string | null;
  provider_type: "personal" | "avatar" | "organization";
  delivery_mode: string;
  lifecycle_status: string;
  public_visibility_status: "visible" | "hidden";
  published_at: string | null;
  available_from: string;
  available_until: string;
  regular_price_snapshot: number | string;
  provider_currency: string;
  points_coverage_mode: string;
  points_coverage_percent: number | string | null;
  requested_points_covered_amount: number | string | null;
  provider_currency_covered_amount: number | string;
  money_remainder_provider_currency: number | string;
  points_price: number | string;
  reference_exchange_rate: number | string;
  reference_exchange_rate_source: string;
  reference_exchange_rate_date: string;
  reference_exchange_rate_fetched_at: string;
  reference_exchange_rate_source_url: string;
  reference_exchange_rate_is_fallback: boolean;
  terms_text: string | null;
  public_snapshot_json: unknown;
  recipient_user_id: string | null;
  recipient_actor_id: string | null;
  public_code: string | null;
  qr_token_hash: string | null;
  qr_token_version: string | null;
  order_idempotency_key: string | null;
  points_transaction_id: string | null;
  ordered_at: string | null;
  redeemed_at: string | null;
  expired_at: string | null;
  annulled_at: string | null;
  created_at: string;
  updated_at: string;
};

type ActivityRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  activity_role_code: string;
  schedule_mode_code: string | null;
  scheduled_date: string | null;
  schedule_start_date: string | null;
  schedule_end_date: string | null;
  deadline_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  metadata_json: unknown;
};

type ValueObjectRow = {
  id: string;
  title: string;
  description: string | null;
  object_kind: "product_type" | "service_type";
  status: string;
  metadata_json: unknown;
};

type ActorRow = {
  id: string;
  actor_type: string;
  display_name: string;
  status: string;
};

type OrganizationRow = {
  id: string;
  organization_name: string;
  public_slug: string | null;
  logo_url: string | null;
  country_code: string | null;
  status: string;
  directory_status: string;
  is_public_profile_enabled: boolean;
  is_listed_in_directory: boolean;
};

type OrganizationLocationRow = {
  id: string;
  organization_id: string;
  address_visibility: string;
  label: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  district: string | null;
  street_address: string | null;
  postal_code: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  is_primary: boolean | null;
  created_at: string;
};

type ActorPublicProfileRow = {
  actor_id: string;
  public_slug: string;
  display_name: string;
  image_url: string | null;
  is_public: boolean;
};

type ReputationRow = {
  actor_id: string;
  balance: number | string;
};

type CheckinRow = {
  id: string;
  planned_activity_event_id: string;
  status: string;
  checked_in_at: string;
  actual_activity_event_id: string | null;
};

type ConfirmationRow = {
  id: string;
  planned_activity_event_id: string;
  status: string;
  requested_at: string | null;
  response_deadline_at: string | null;
  buyer_responded_at: string | null;
  auto_confirmed_at: string | null;
  finalized_at: string | null;
  buyer_message: string | null;
};

export type GiftCertificateFlowState =
  | "draft"
  | "available"
  | "active"
  | "checked_in"
  | "awaiting_confirmation"
  | "confirmed_by_buyer"
  | "auto_confirmed"
  | "problem"
  | "redeemed"
  | "expired"
  | "annulled";

export type GiftCertificateCatalogItem = {
  readonly activityEventId: string;
  readonly valueObjectId: string;
  readonly title: string;
  readonly description: string | null;
  readonly objectKind: "product_type" | "service_type";
  readonly providerOwnerUserId: string;
  readonly providerManagerActorId: string;
  readonly providerActorId: string;
  readonly providerOrganizationId: string | null;
  readonly providerType: "personal" | "avatar" | "organization";
  readonly providerDisplayName: string;
  readonly providerPublicHref: string | null;
  readonly providerImageUrl: string | null;
  readonly productImageUrl: string | null;
  readonly providerLocation: {
    readonly label: string | null;
    readonly countryCode: string | null;
    readonly region: string | null;
    readonly city: string | null;
    readonly district: string | null;
    readonly streetAddress: string | null;
    readonly postalCode: string | null;
    readonly latitude: number | null;
    readonly longitude: number | null;
  } | null;
  readonly providerReputation: number;
  readonly recipientUserId: string | null;
  readonly recipientActorId: string | null;
  readonly recipientDisplayName: string | null;
  readonly recipientPublicHref: string | null;
  readonly deliveryMode: string;
  readonly lifecycleStatus: string;
  readonly publicVisibilityStatus: "visible" | "hidden";
  readonly flowState: GiftCertificateFlowState;
  readonly publishedAt: string | null;
  readonly availableFrom: string;
  readonly availableUntil: string;
  readonly regularPrice: number;
  readonly providerCurrency: string;
  readonly pointsCoverageMode: string;
  readonly pointsCoveragePercent: number | null;
  readonly providerCurrencyCoveredAmount: number;
  readonly moneyRemainder: number;
  readonly pointsPrice: number;
  readonly referenceExchangeRate: number;
  readonly referenceExchangeRateSource: string;
  readonly referenceExchangeRateDate: string;
  readonly referenceExchangeRateFetchedAt: string;
  readonly referenceExchangeRateSourceUrl: string;
  readonly referenceExchangeRateIsFallback: boolean;
  readonly termsText: string | null;
  readonly publicCode: string | null;
  readonly qrTokenHash: string | null;
  readonly qrTokenVersion: string | null;
  readonly orderIdempotencyKey: string | null;
  readonly pointsTransactionId: string | null;
  readonly orderedAt: string | null;
  readonly redeemedAt: string | null;
  readonly expiredAt: string | null;
  readonly annulledAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly activity: ActivityRow;
  readonly checkin: CheckinRow | null;
  readonly confirmation: ConfirmationRow | null;
};

const TERMS_SELECT = `
  activity_event_id,
  value_object_id,
  provider_owner_user_id,
  provider_manager_actor_id,
  provider_actor_id,
  provider_organization_id,
  provider_type,
  delivery_mode,
  lifecycle_status,
  public_visibility_status,
  published_at,
  available_from,
  available_until,
  regular_price_snapshot,
  provider_currency,
  points_coverage_mode,
  points_coverage_percent,
  requested_points_covered_amount,
  provider_currency_covered_amount,
  money_remainder_provider_currency,
  points_price,
  reference_exchange_rate,
  reference_exchange_rate_source,
  reference_exchange_rate_date,
  reference_exchange_rate_fetched_at,
  reference_exchange_rate_source_url,
  reference_exchange_rate_is_fallback,
  terms_text,
  public_snapshot_json,
  recipient_user_id,
  recipient_actor_id,
  public_code,
  qr_token_hash,
  qr_token_version,
  order_idempotency_key,
  points_transaction_id,
  ordered_at,
  redeemed_at,
  expired_at,
  annulled_at,
  created_at,
  updated_at
`;

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readSnapshotText(snapshot: unknown, key: string): string | null {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return null;
  }

  const value = (snapshot as Record<string, unknown>)[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toNullableNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeProviderLocation(row: OrganizationLocationRow | null) {
  if (!row) {
    return null;
  }

  const exactAddress = row.address_visibility === "public";

  return {
    label: row.label,
    countryCode: row.country_code,
    region: row.region,
    city: row.city,
    district: row.district,
    streetAddress: exactAddress ? row.street_address : null,
    postalCode: exactAddress ? row.postal_code : null,
    latitude: exactAddress ? toNullableNumber(row.latitude) : null,
    longitude: exactAddress ? toNullableNumber(row.longitude) : null,
  };
}

function resolveFlowState(
  terms: TermsRow,
  checkin: CheckinRow | null,
  confirmation: ConfirmationRow | null,
): GiftCertificateFlowState {
  if (
    confirmation?.status === "disputed" ||
    confirmation?.status === "partial_problem"
  ) {
    return "problem";
  }

  if (confirmation?.status === "confirmed_by_buyer") {
    return "confirmed_by_buyer";
  }

  if (confirmation?.status === "auto_confirmed") {
    return "auto_confirmed";
  }

  if (checkin?.status === "registered" && confirmation?.status === "pending") {
    return "awaiting_confirmation";
  }

  if (checkin?.status === "registered") {
    return "checked_in";
  }

  if (terms.lifecycle_status === "redeemed") {
    return "redeemed";
  }

  if (terms.lifecycle_status === "annulled") {
    return "annulled";
  }

  const today = new Date().toISOString().slice(0, 10);

  if (
    terms.lifecycle_status === "expired" ||
    terms.expired_at ||
    terms.available_until < today
  ) {
    return "expired";
  }

  if (terms.lifecycle_status === "active") {
    return "active";
  }

  if (terms.lifecycle_status === "available") {
    return "available";
  }

  return "draft";
}

async function hydrateTerms(
  termsRows: TermsRow[],
): Promise<GiftCertificateCatalogItem[]> {
  if (termsRows.length === 0) {
    return [];
  }

  const activityIds = [...new Set(termsRows.map((row) => row.activity_event_id))];
  const valueObjectIds = [...new Set(termsRows.map((row) => row.value_object_id))];
  const actorIds = [
    ...new Set(
      termsRows
        .flatMap((row) => [row.provider_actor_id, row.recipient_actor_id])
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const providerActorIds = [
    ...new Set(termsRows.map((row) => row.provider_actor_id)),
  ];
  const organizationIds = [
    ...new Set(
      termsRows
        .map((row) => row.provider_organization_id)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  const [
    { data: activityData, error: activityError },
    { data: valueObjectData, error: valueObjectError },
    { data: actorData, error: actorError },
    { data: publicProfileData, error: publicProfileError },
    { data: reputationData, error: reputationError },
    organizationResult,
    organizationLocationResult,
    { data: checkinData, error: checkinError },
    { data: confirmationData, error: confirmationError },
  ] = await Promise.all([
    supabase
      .from("activity_events")
      .select(
        `
          id,
          title,
          description,
          status,
          activity_role_code,
          schedule_mode_code,
          scheduled_date,
          schedule_start_date,
          schedule_end_date,
          deadline_at,
          started_at,
          ended_at,
          metadata_json
        `,
      )
      .in("id", activityIds)
      .eq("activity_role_code", "planned"),
    supabase
      .from("value_objects")
      .select("id,title,description,object_kind,status,metadata_json")
      .in("id", valueObjectIds)
      .in("object_kind", ["product_type", "service_type"]),
    supabase
      .from("actors")
      .select("id,actor_type,display_name,status")
      .in("id", actorIds)
      .eq("status", "active"),
    supabase
      .from("actor_public_profiles")
      .select("actor_id,public_slug,display_name,image_url,is_public")
      .in("actor_id", actorIds),
    supabase
      .from("actor_reputation_accounts")
      .select("actor_id,balance")
      .in("actor_id", providerActorIds),
    organizationIds.length > 0
      ? supabase
          .from("organizations")
          .select("id,organization_name,public_slug,logo_url,country_code,status,directory_status,is_public_profile_enabled,is_listed_in_directory")
          .in("id", organizationIds)
      : Promise.resolve({ data: [], error: null }),
    organizationIds.length > 0
      ? supabase
          .from("organization_locations")
          .select("id,organization_id,address_visibility,label,country_code,region,city,district,street_address,postal_code,latitude,longitude,is_primary,created_at")
          .in("organization_id", organizationIds)
          .eq("is_active", true)
          .order("is_primary", { ascending: false })
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("activity_fulfillment_checkins")
      .select(
        "id,planned_activity_event_id,status,checked_in_at,actual_activity_event_id",
      )
      .in("planned_activity_event_id", activityIds)
      .eq("status", "registered"),
    supabase
      .from("activity_fulfillment_confirmations")
      .select(
        "id,planned_activity_event_id,status,requested_at,response_deadline_at,buyer_responded_at,auto_confirmed_at,finalized_at,buyer_message",
      )
      .in("planned_activity_event_id", activityIds),
  ]);

  if (activityError) {
    throw new Error(activityError.message);
  }

  if (valueObjectError) {
    throw new Error(valueObjectError.message);
  }

  if (actorError) {
    throw new Error(actorError.message);
  }

  if (publicProfileError) {
    throw new Error(publicProfileError.message);
  }

  if (reputationError) {
    throw new Error(reputationError.message);
  }

  if (organizationResult.error) {
    throw new Error(organizationResult.error.message);
  }

  if (organizationLocationResult.error) {
    throw new Error(organizationLocationResult.error.message);
  }

  if (checkinError) {
    throw new Error(checkinError.message);
  }

  if (confirmationError) {
    throw new Error(confirmationError.message);
  }

  const activitiesById = new Map(
    ((activityData ?? []) as ActivityRow[]).map((row) => [row.id, row]),
  );
  const valueObjectsById = new Map(
    ((valueObjectData ?? []) as ValueObjectRow[]).map((row) => [row.id, row]),
  );
  const actorsById = new Map(
    ((actorData ?? []) as ActorRow[]).map((row) => [row.id, row]),
  );
  const organizationsById = new Map(
    ((organizationResult.data ?? []) as OrganizationRow[]).map((row) => [
      row.id,
      row,
    ]),
  );
  const organizationLocationsById = new Map<string, OrganizationLocationRow>();

  for (const row of (organizationLocationResult.data ?? []) as OrganizationLocationRow[]) {
    if (!organizationLocationsById.has(row.organization_id)) {
      organizationLocationsById.set(row.organization_id, row);
    }
  }
  const publicProfilesByActorId = new Map(
    ((publicProfileData ?? []) as ActorPublicProfileRow[]).map((row) => [
      row.actor_id,
      row,
    ]),
  );
  const reputationByActorId = new Map(
    ((reputationData ?? []) as ReputationRow[]).map((row) => [
      row.actor_id,
      toNumber(row.balance),
    ]),
  );
  const checkinsByActivityId = new Map(
    ((checkinData ?? []) as CheckinRow[]).map((row) => [
      row.planned_activity_event_id,
      row,
    ]),
  );
  const confirmationsByActivityId = new Map(
    ((confirmationData ?? []) as ConfirmationRow[]).map((row) => [
      row.planned_activity_event_id,
      row,
    ]),
  );

  return termsRows.flatMap((terms) => {
    const activity = activitiesById.get(terms.activity_event_id);
    const valueObject = valueObjectsById.get(terms.value_object_id);
    const providerActor = actorsById.get(terms.provider_actor_id);

    if (!activity || !valueObject || !providerActor) {
      return [];
    }

    const organization = terms.provider_organization_id
      ? organizationsById.get(terms.provider_organization_id)
      : null;
    const organizationLocation = terms.provider_organization_id
      ? organizationLocationsById.get(terms.provider_organization_id) ?? null
      : null;
    const recipientActor = terms.recipient_actor_id
      ? actorsById.get(terms.recipient_actor_id)
      : null;
    const providerPublicProfile = publicProfilesByActorId.get(
      terms.provider_actor_id,
    );
    const recipientPublicProfile = terms.recipient_actor_id
      ? publicProfilesByActorId.get(terms.recipient_actor_id)
      : null;
    const checkin = checkinsByActivityId.get(terms.activity_event_id) ?? null;
    const confirmation =
      confirmationsByActivityId.get(terms.activity_event_id) ?? null;
    const title =
      readSnapshotText(terms.public_snapshot_json, "publicTitle") ??
      valueObject.title ??
      activity.title;
    const description =
      readSnapshotText(terms.public_snapshot_json, "publicDescription") ??
      valueObject.description ??
      activity.description;
    const sourceProductImageUrl = readValueObjectPublicImageUrl(
      valueObject.metadata_json,
    );
    const activityImageSnapshot =
      readGiftCertificateProductImageSnapshot(activity.metadata_json);
    const legacyProductImageUrl =
      readSnapshotText(terms.public_snapshot_json, "publicImageUrl") ??
      readSnapshotText(terms.public_snapshot_json, "imageUrl");
    const productImageUrl =
      terms.lifecycle_status === "draft"
        ? sourceProductImageUrl
        : activityImageSnapshot.captured
          ? activityImageSnapshot.imageUrl
          : legacyProductImageUrl ?? sourceProductImageUrl;

    return [
      {
        activityEventId: terms.activity_event_id,
        valueObjectId: terms.value_object_id,
        title,
        description,
        objectKind: valueObject.object_kind,
        providerOwnerUserId: terms.provider_owner_user_id,
        providerManagerActorId: terms.provider_manager_actor_id,
        providerActorId: terms.provider_actor_id,
        providerOrganizationId: terms.provider_organization_id,
        providerType: terms.provider_type,
        providerDisplayName:
          organization?.organization_name ??
          (providerPublicProfile?.is_public
            ? providerPublicProfile.display_name
            : providerActor.display_name),
        providerPublicHref:
          organization?.public_slug &&
          organization.status === "active" &&
          organization.directory_status === "published" &&
          organization.is_public_profile_enabled &&
          organization.is_listed_in_directory
            ? `/directory/${encodeURIComponent(organization.public_slug)}`
            : providerPublicProfile?.is_public
              ? `/people/${encodeURIComponent(providerPublicProfile.public_slug)}`
              : null,
        providerImageUrl:
          organization?.logo_url ?? providerPublicProfile?.image_url ?? null,
        productImageUrl,
        providerLocation: sanitizeProviderLocation(organizationLocation),
        providerReputation: reputationByActorId.get(terms.provider_actor_id) ?? 0,
        recipientUserId: terms.recipient_user_id,
        recipientActorId: terms.recipient_actor_id,
        recipientDisplayName: recipientPublicProfile?.is_public
          ? recipientPublicProfile.display_name
          : recipientActor?.display_name ?? null,
        recipientPublicHref: recipientPublicProfile?.is_public
          ? `/people/${encodeURIComponent(recipientPublicProfile.public_slug)}`
          : null,
        deliveryMode: terms.delivery_mode,
        lifecycleStatus: terms.lifecycle_status,
        publicVisibilityStatus: terms.public_visibility_status,
        flowState: resolveFlowState(terms, checkin, confirmation),
        publishedAt: terms.published_at,
        availableFrom: terms.available_from,
        availableUntil: terms.available_until,
        regularPrice: toNumber(terms.regular_price_snapshot),
        providerCurrency: terms.provider_currency,
        pointsCoverageMode: terms.points_coverage_mode,
        pointsCoveragePercent:
          terms.points_coverage_percent === null
            ? null
            : toNumber(terms.points_coverage_percent),
        providerCurrencyCoveredAmount: toNumber(
          terms.provider_currency_covered_amount,
        ),
        moneyRemainder: toNumber(
          terms.money_remainder_provider_currency,
        ),
        pointsPrice: toNumber(terms.points_price),
        referenceExchangeRate: toNumber(terms.reference_exchange_rate),
        referenceExchangeRateSource:
          terms.reference_exchange_rate_source,
        referenceExchangeRateDate:
          terms.reference_exchange_rate_date,
        referenceExchangeRateFetchedAt:
          terms.reference_exchange_rate_fetched_at,
        referenceExchangeRateSourceUrl:
          terms.reference_exchange_rate_source_url,
        referenceExchangeRateIsFallback:
          terms.reference_exchange_rate_is_fallback,
        termsText: terms.terms_text,
        publicCode: terms.public_code,
        qrTokenHash: terms.qr_token_hash,
        qrTokenVersion: terms.qr_token_version,
        orderIdempotencyKey: terms.order_idempotency_key,
        pointsTransactionId: terms.points_transaction_id,
        orderedAt: terms.ordered_at,
        redeemedAt: terms.redeemed_at,
        expiredAt: terms.expired_at,
        annulledAt: terms.annulled_at,
        createdAt: terms.created_at,
        updatedAt: terms.updated_at,
        activity,
        checkin,
        confirmation,
      },
    ];
  });
}

function sortByNewest(
  items: GiftCertificateCatalogItem[],
): GiftCertificateCatalogItem[] {
  return [...items].sort((left, right) =>
    String(
      right.redeemedAt ??
        right.orderedAt ??
        right.publishedAt ??
        right.updatedAt,
    ).localeCompare(
      String(
        left.redeemedAt ??
          left.orderedAt ??
          left.publishedAt ??
          left.updatedAt,
      ),
    ),
  );
}

export async function listPublicGiftCertificates(): Promise<
  GiftCertificateCatalogItem[]
> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("activity_gift_certificate_terms")
    .select(TERMS_SELECT)
    .in("lifecycle_status", ["available", "redeemed"])
    .eq("public_visibility_status", "visible")
    .not("published_at", "is", null)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(error.message);
  }

  const items = await hydrateTerms((data ?? []) as TermsRow[]);
  const publicItems = items.filter((item) => {
    if (item.activity.status !== "planned") {
      return false;
    }

    if (item.flowState === "available") {
      return item.availableUntil >= today;
    }

    return ["confirmed_by_buyer", "auto_confirmed", "redeemed"].includes(
      item.flowState,
    );
  });

  return publicItems.sort((left, right) => {
    const leftIsAvailable = left.flowState === "available";
    const rightIsAvailable = right.flowState === "available";

    if (leftIsAvailable !== rightIsAvailable) {
      return leftIsAvailable ? -1 : 1;
    }

    if (leftIsAvailable && rightIsAvailable) {
      if (right.providerReputation !== left.providerReputation) {
        return right.providerReputation - left.providerReputation;
      }

      return String(right.publishedAt ?? "").localeCompare(
        String(left.publishedAt ?? ""),
      );
    }

    return String(
      right.confirmation?.finalized_at ??
        right.redeemedAt ??
        right.updatedAt,
    ).localeCompare(
      String(
        left.confirmation?.finalized_at ?? left.redeemedAt ?? left.updatedAt,
      ),
    );
  });
}

export async function listBuyerGiftCertificates(
  recipientUserId: string,
): Promise<GiftCertificateCatalogItem[]> {
  const { data, error } = await supabase
    .from("activity_gift_certificate_terms")
    .select(TERMS_SELECT)
    .eq("recipient_user_id", recipientUserId)
    .not("ordered_at", "is", null)
    .order("ordered_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(error.message);
  }

  return sortByNewest(await hydrateTerms((data ?? []) as TermsRow[]));
}

export async function listProviderGiftCertificates(
  providerOwnerUserId: string,
): Promise<GiftCertificateCatalogItem[]> {
  const { data, error } = await supabase
    .from("activity_gift_certificate_terms")
    .select(TERMS_SELECT)
    .eq("provider_owner_user_id", providerOwnerUserId)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(error.message);
  }

  return sortByNewest(await hydrateTerms((data ?? []) as TermsRow[]));
}

export async function getGiftCertificateCatalogItem(
  activityEventId: string,
): Promise<GiftCertificateCatalogItem | null> {
  const { data, error } = await supabase
    .from("activity_gift_certificate_terms")
    .select(TERMS_SELECT)
    .eq("activity_event_id", activityEventId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const items = await hydrateTerms([data as TermsRow]);
  return items[0] ?? null;
}
