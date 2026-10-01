import "server-only";

import { supabase } from "../../../lib/supabase";
import type { ChannelBillingPolicy, ChannelRow } from "./contracts";

export const PLATFORM_AI_CHANNEL_BILLING_OWNER_EMAIL =
  "aleksanderpolansky@gmail.com";

export type AiChannelBillingResolution = {
  billingUserId: string;
  billingPolicy: ChannelBillingPolicy;
};

type ChannelCreatorIdentity = {
  user: string;
  admin: boolean;
};

let cachedPlatformOwnerUserId: string | null = null;

async function platformBillingOwnerUserId(): Promise<string> {
  if (cachedPlatformOwnerUserId) {
    return cachedPlatformOwnerUserId;
  }

  const { data, error } = await supabase
    .from("app_users")
    .select("id,email,access_status")
    .eq("email", PLATFORM_AI_CHANNEL_BILLING_OWNER_EMAIL)
    .maybeSingle();

  if (
    error ||
    !data?.id ||
    data.access_status === "blocked"
  ) {
    throw new Error("CHANNEL_PLATFORM_BILLING_OWNER_UNAVAILABLE");
  }

  cachedPlatformOwnerUserId = String(data.id);
  return cachedPlatformOwnerUserId;
}

export async function resolveAiChannelCreationBillingUser(
  who: ChannelCreatorIdentity,
): Promise<AiChannelBillingResolution> {
  if (!who?.user) {
    throw new Error("CHANNEL_BILLING_OWNER_REQUIRED");
  }

  if (!who.admin) {
    return {
      billingUserId: who.user,
      billingPolicy: "creator",
    };
  }

  return {
    billingUserId: await platformBillingOwnerUserId(),
    billingPolicy: "platform_owner",
  };
}

export async function resolveStoredAiChannelBillingUser(
  channel: Pick<
    ChannelRow,
    | "owner_user_id"
    | "billing_user_id"
    | "billing_policy"
  >,
): Promise<AiChannelBillingResolution> {
  const ownerUserId = String(channel.owner_user_id ?? "").trim();
  const billingUserId = String(channel.billing_user_id ?? "").trim();
  const billingPolicy = channel.billing_policy;

  if (!ownerUserId || !billingUserId) {
    throw new Error("CHANNEL_BILLING_OWNER_REQUIRED");
  }

  if (billingPolicy === "creator") {
    if (billingUserId !== ownerUserId) {
      throw new Error("CHANNEL_BILLING_OWNER_INVALID");
    }

    return {
      billingUserId,
      billingPolicy,
    };
  }

  if (billingPolicy === "platform_owner") {
    const platformOwnerUserId = await platformBillingOwnerUserId();

    if (billingUserId !== platformOwnerUserId) {
      throw new Error("CHANNEL_BILLING_OWNER_INVALID");
    }

    return {
      billingUserId,
      billingPolicy,
    };
  }

  throw new Error("CHANNEL_BILLING_OWNER_REQUIRED");
}
