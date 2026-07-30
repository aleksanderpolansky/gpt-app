import { supabase } from "../../../lib/supabase";

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
};

type ValueObjectRow = {
  id: string;
  title: string;
  description: string | null;
  object_kind: "product_type" | "service_type";
  status: string;
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
  status: string;
};

type ReputationRow = {
  actor_id: string;
  balance: number | string;
};

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
  readonly providerReputation: number;
  readonly deliveryMode: string;
  readonly lifecycleStatus: string;
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
  readonly termsText: string | null;
  readonly recipientUserId: string | null;
  readonly recipientActorId: string | null;
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

async function hydrateTerms(
  termsRows: TermsRow[],
): Promise<GiftCertificateCatalogItem[]> {
  if (termsRows.length === 0) {
    return [];
  }

  const activityIds = [...new Set(termsRows.map((row) => row.activity_event_id))];
  const valueObjectIds = [...new Set(termsRows.map((row) => row.value_object_id))];
  const providerActorIds = [...new Set(termsRows.map((row) => row.provider_actor_id))];
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
    { data: reputationData, error: reputationError },
    organizationResult,
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
          ended_at
        `,
      )
      .in("id", activityIds)
      .eq("activity_role_code", "planned"),
    supabase
      .from("value_objects")
      .select("id,title,description,object_kind,status")
      .in("id", valueObjectIds)
      .in("object_kind", ["product_type", "service_type"]),
    supabase
      .from("actors")
      .select("id,actor_type,display_name,status")
      .in("id", providerActorIds)
      .eq("status", "active"),
    supabase
      .from("actor_reputation_accounts")
      .select("actor_id,balance")
      .in("actor_id", providerActorIds),
    organizationIds.length > 0
      ? supabase
          .from("organizations")
          .select("id,organization_name,status")
          .in("id", organizationIds)
      : Promise.resolve({ data: [], error: null }),
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

  if (reputationError) {
    throw new Error(reputationError.message);
  }

  if (organizationResult.error) {
    throw new Error(organizationResult.error.message);
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
  const reputationByActorId = new Map(
    ((reputationData ?? []) as ReputationRow[]).map((row) => [
      row.actor_id,
      toNumber(row.balance),
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
    const title =
      readSnapshotText(terms.public_snapshot_json, "publicTitle") ??
      valueObject.title ??
      activity.title;
    const description =
      readSnapshotText(terms.public_snapshot_json, "publicDescription") ??
      valueObject.description ??
      activity.description;

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
          organization?.organization_name ?? providerActor.display_name,
        providerReputation: reputationByActorId.get(terms.provider_actor_id) ?? 0,
        deliveryMode: terms.delivery_mode,
        lifecycleStatus: terms.lifecycle_status,
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
        termsText: terms.terms_text,
        recipientUserId: terms.recipient_user_id,
        recipientActorId: terms.recipient_actor_id,
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
      },
    ];
  });
}

export async function listAvailableGiftCertificates(): Promise<
  GiftCertificateCatalogItem[]
> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("activity_gift_certificate_terms")
    .select(TERMS_SELECT)
    .eq("lifecycle_status", "available")
    .not("published_at", "is", null)
    .gte("available_until", today)
    .order("published_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  const items = await hydrateTerms((data ?? []) as TermsRow[]);

  return items
    .filter(
      (item) =>
        item.activity.status === "planned" &&
        item.lifecycleStatus === "available",
    )
    .sort((left, right) => {
      if (right.providerReputation !== left.providerReputation) {
        return right.providerReputation - left.providerReputation;
      }

      return String(right.publishedAt ?? "").localeCompare(
        String(left.publishedAt ?? ""),
      );
    });
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
