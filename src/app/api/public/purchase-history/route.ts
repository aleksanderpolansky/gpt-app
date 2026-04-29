import { NextResponse } from "next/server";
import { supabase } from "../../../../../lib/supabase";

type PublicOrganization = {
  id: string;
  organization_name: string | null;
  organization_type: string | null;
  country_code: string | null;
  default_currency: string | null;
  status: string | null;
};

type PublicAppUser = {
  id: string;
  name: string | null;
  email: string | null;
};

type ConfirmedPurchaseRow = {
  id: string;
  organization_id: string;
  buyer_user_id: string;
  buyer_public_code: string | null;
  points_awarded: number | null;
  status: string;
  confirmed_at: string | null;
  created_at: string;
  organizations?: PublicOrganization | PublicOrganization[] | null;
  app_users?: PublicAppUser | PublicAppUser[] | null;
};

type PurchaseConfirmationEventRow = {
  id: string;
  purchase_confirmation_id: string;
  event_type: string;
  record_hash: string | null;
  created_at: string;
};

function getFirstRelatedItem<T>(value: T | T[] | null | undefined) {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function maskWord(value: string, capitalizeFirstCharacter = false) {
  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return "*";
  }

  const normalizedValue = capitalizeFirstCharacter
    ? `${trimmedValue[0].toUpperCase()}${trimmedValue.slice(1)}`
    : trimmedValue;

  if (normalizedValue.length === 1) {
    return "*";
  }

  if (normalizedValue.length === 2) {
    return `${normalizedValue[0]}*`;
  }

  const firstCharacter = normalizedValue[0];
  const lastCharacter = normalizedValue[normalizedValue.length - 1];
  const hiddenPart = "*".repeat(normalizedValue.length - 2);

  return `${firstCharacter}${hiddenPart}${lastCharacter}`;
}

function maskPublicFullName(value: string | null | undefined) {
  if (!value) {
    return "*";
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return "*";
  }

  const displayPart = trimmedValue.includes("@")
    ? trimmedValue.split("@")[0]
    : trimmedValue;

  const words = displayPart
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0);

  if (words.length === 0) {
    return "*";
  }

  if (words.length === 1) {
    return maskWord(words[0]);
  }

  const firstName = words[0];
  const lastName = words[words.length - 1];

  return `${maskWord(firstName)} ${maskWord(lastName, true)}`;
}

function createShortPublicHash(value: string | null | undefined) {
  if (!value) {
    return "legacy-record";
  }

  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function choosePublicEventHash(
  purchaseConfirmationId: string,
  events: PurchaseConfirmationEventRow[]
) {
  const matchingEvents = events
    .filter((event) => event.purchase_confirmation_id === purchaseConfirmationId)
    .filter(
      (event) =>
        event.event_type === "confirmed" ||
        event.event_type === "corrected_to_confirmed"
    )
    .sort((firstEvent, secondEvent) => {
      return (
        new Date(secondEvent.created_at).getTime() -
        new Date(firstEvent.created_at).getTime()
      );
    });

  return matchingEvents[0]?.record_hash ?? null;
}

export async function GET() {
  const { data: confirmedPurchases, error: confirmedPurchasesError } =
    await supabase
      .from("purchase_confirmations")
      .select(
        `
        id,
        organization_id,
        buyer_user_id,
        buyer_public_code,
        points_awarded,
        status,
        confirmed_at,
        created_at,
        organizations (
          id,
          organization_name,
          organization_type,
          country_code,
          default_currency,
          status
        ),
        app_users!purchase_confirmations_buyer_user_id_fkey (
          id,
          name,
          email
        )
      `
      )
      .eq("status", "confirmed")
      .order("confirmed_at", { ascending: false, nullsFirst: false })
      .limit(100);

  if (confirmedPurchasesError) {
    return NextResponse.json(
      { error: confirmedPurchasesError.message },
      { status: 500 }
    );
  }

  const rows = (confirmedPurchases ?? []) as unknown as ConfirmedPurchaseRow[];
  const purchaseConfirmationIds = rows.map((purchase) => purchase.id);

  let purchaseConfirmationEvents: PurchaseConfirmationEventRow[] = [];

  if (purchaseConfirmationIds.length > 0) {
    const { data: events, error: eventsError } = await supabase
      .from("purchase_confirmation_events")
      .select(
        `
        id,
        purchase_confirmation_id,
        event_type,
        record_hash,
        created_at
      `
      )
      .in("purchase_confirmation_id", purchaseConfirmationIds)
      .in("event_type", ["confirmed", "corrected_to_confirmed"])
      .order("created_at", { ascending: false });

    if (eventsError) {
      return NextResponse.json({ error: eventsError.message }, { status: 500 });
    }

    purchaseConfirmationEvents =
      (events ?? []) as unknown as PurchaseConfirmationEventRow[];
  }

  const publicPurchaseHistory = rows.map((purchase) => {
    const organization = getFirstRelatedItem(purchase.organizations);
    const appUser = getFirstRelatedItem(purchase.app_users);

    const buyerDisplayName = appUser?.name ?? appUser?.email ?? null;
    const eventHash = choosePublicEventHash(
      purchase.id,
      purchaseConfirmationEvents
    );

    return {
      publicCode: purchase.buyer_public_code ?? "—",
      publicHash: createShortPublicHash(eventHash),
      organizationName:
        organization?.organization_name ?? "Unknown organization",
      organizationId: purchase.organization_id,
      buyerMaskedName: maskPublicFullName(buyerDisplayName),
      purchaseDate: purchase.confirmed_at ?? purchase.created_at,
      purchaseLabel: "Покупка выше 10 EUR в эквиваленте местной валюты",
      pointsAwarded: purchase.points_awarded ?? 0,
    };
  });

  return NextResponse.json({
    ok: true,
    publicPurchaseHistory,
  });
}