export const ORGANIZATION_CONTACT_CHANNELS_KEY =
  "arctor_contact_channels_v1" as const;

export const ORGANIZATION_CONTACT_CHANNEL_TYPES = [
  "whatsapp",
  "telegram",
  "signal",
  "viber",
  "custom",
] as const;

export type OrganizationContactChannelType =
  (typeof ORGANIZATION_CONTACT_CHANNEL_TYPES)[number];

export type OrganizationContactChannel = {
  type: OrganizationContactChannelType;
  label: string | null;
  value: string;
  isPrimary: boolean;
  isPublic: boolean;
};

export type PublicOrganizationContactChannel = OrganizationContactChannel & {
  href: string;
};

export type ParseOrganizationContactChannelsResult =
  | {
      ok: true;
      channels: OrganizationContactChannel[];
      errorCode: null;
    }
  | {
      ok: false;
      channels: [];
      errorCode:
        | "CONTACT_CHANNELS_INVALID_SHAPE"
        | "CONTACT_CHANNEL_TYPE_INVALID"
        | "CONTACT_CHANNEL_VALUE_INVALID"
        | "CONTACT_CHANNEL_CUSTOM_LABEL_REQUIRED"
        | "CONTACT_CHANNEL_LIMIT_EXCEEDED";
    };

const MAX_CONTACT_CHANNELS = 8;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isContactChannelType(
  value: unknown,
): value is OrganizationContactChannelType {
  return (
    typeof value === "string" &&
    (ORGANIZATION_CONTACT_CHANNEL_TYPES as readonly string[]).includes(value)
  );
}

function normalizeHttpHref(value: string) {
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizePhoneDigits(value: string) {
  return value.replace(/[^\d]/g, "");
}

export function getOrganizationContactChannelHref(
  channel: Pick<OrganizationContactChannel, "type" | "value">,
) {
  const value = channel.value.trim();

  if (!value) {
    return null;
  }

  if (channel.type === "whatsapp") {
    if (/^https?:\/\//i.test(value)) {
      try {
        const parsed = new URL(value);
        const host = parsed.hostname.toLowerCase();
        if (
          host === "wa.me" ||
          host === "www.wa.me" ||
          host === "api.whatsapp.com" ||
          host === "www.whatsapp.com"
        ) {
          return parsed.toString();
        }
        return null;
      } catch {
        return null;
      }
    }

    const digits = normalizePhoneDigits(value);
    return digits.length >= 6 && digits.length <= 15
      ? `https://wa.me/${digits}`
      : null;
  }

  if (channel.type === "telegram") {
    if (/^https?:\/\//i.test(value)) {
      try {
        const parsed = new URL(value);
        const host = parsed.hostname.toLowerCase();
        return host === "t.me" || host === "telegram.me"
          ? parsed.toString()
          : null;
      } catch {
        return null;
      }
    }

    const username = value.replace(/^@/, "");
    return /^[A-Za-z0-9_]{5,32}$/.test(username)
      ? `https://t.me/${username}`
      : null;
  }

  if (channel.type === "signal") {
    if (!/^https?:\/\//i.test(value)) {
      return null;
    }

    try {
      const parsed = new URL(value);
      return parsed.hostname.toLowerCase() === "signal.me"
        ? parsed.toString()
        : null;
    } catch {
      return null;
    }
  }

  if (channel.type === "viber") {
    if (/^viber:\/\//i.test(value)) {
      return value;
    }

    if (/^https?:\/\//i.test(value)) {
      try {
        const parsed = new URL(value);
        const host = parsed.hostname.toLowerCase();
        return host === "invite.viber.com" || host.endsWith(".viber.com")
          ? parsed.toString()
          : null;
      } catch {
        return null;
      }
    }

    const digits = normalizePhoneDigits(value);
    return digits.length >= 6 && digits.length <= 15
      ? `viber://chat?number=%2B${digits}`
      : null;
  }

  return normalizeHttpHref(value);
}

export function parseOrganizationContactChannelsInput(
  value: unknown,
): ParseOrganizationContactChannelsResult {
  if (value === null || value === undefined) {
    return { ok: true, channels: [], errorCode: null };
  }

  if (!Array.isArray(value)) {
    return {
      ok: false,
      channels: [],
      errorCode: "CONTACT_CHANNELS_INVALID_SHAPE",
    };
  }

  if (value.length > MAX_CONTACT_CHANNELS) {
    return {
      ok: false,
      channels: [],
      errorCode: "CONTACT_CHANNEL_LIMIT_EXCEEDED",
    };
  }

  const channels: OrganizationContactChannel[] = [];

  for (const rawChannel of value) {
    if (!isRecord(rawChannel)) {
      return {
        ok: false,
        channels: [],
        errorCode: "CONTACT_CHANNELS_INVALID_SHAPE",
      };
    }

    const type = rawChannel.type;
    if (!isContactChannelType(type)) {
      return {
        ok: false,
        channels: [],
        errorCode: "CONTACT_CHANNEL_TYPE_INVALID",
      };
    }

    const valueText = readTrimmedString(rawChannel.value);
    if (!valueText) {
      continue;
    }

    const labelText = readTrimmedString(rawChannel.label);
    if (type === "custom" && !labelText) {
      return {
        ok: false,
        channels: [],
        errorCode: "CONTACT_CHANNEL_CUSTOM_LABEL_REQUIRED",
      };
    }

    const candidate: OrganizationContactChannel = {
      type,
      label: labelText || null,
      value: valueText,
      isPrimary: rawChannel.isPrimary === true,
      isPublic: rawChannel.isPublic !== false,
    };

    if (!getOrganizationContactChannelHref(candidate)) {
      return {
        ok: false,
        channels: [],
        errorCode: "CONTACT_CHANNEL_VALUE_INVALID",
      };
    }

    channels.push(candidate);
  }

  let primaryAssigned = false;
  const normalizedChannels = channels.map((channel) => {
    if (!channel.isPrimary || primaryAssigned) {
      return { ...channel, isPrimary: false };
    }

    primaryAssigned = true;
    return channel;
  });

  if (!primaryAssigned) {
    const firstPublicIndex = normalizedChannels.findIndex(
      (channel) => channel.isPublic,
    );

    if (firstPublicIndex >= 0) {
      normalizedChannels[firstPublicIndex] = {
        ...normalizedChannels[firstPublicIndex],
        isPrimary: true,
      };
    }
  }

  return {
    ok: true,
    channels: normalizedChannels,
    errorCode: null,
  };
}

export function readOrganizationContactChannels(
  socialLinks: unknown,
): OrganizationContactChannel[] {
  if (!isRecord(socialLinks)) {
    return [];
  }

  const parsed = parseOrganizationContactChannelsInput(
    socialLinks[ORGANIZATION_CONTACT_CHANNELS_KEY],
  );

  return parsed.ok ? parsed.channels : [];
}

export function writeOrganizationContactChannels(
  socialLinks: Record<string, unknown> | null,
  channels: OrganizationContactChannel[],
) {
  const nextSocialLinks: Record<string, unknown> = socialLinks
    ? { ...socialLinks }
    : {};

  if (channels.length === 0) {
    delete nextSocialLinks[ORGANIZATION_CONTACT_CHANNELS_KEY];
    return nextSocialLinks;
  }

  nextSocialLinks[ORGANIZATION_CONTACT_CHANNELS_KEY] = channels.map(
    (channel) => ({
      type: channel.type,
      label: channel.label,
      value: channel.value,
      isPrimary: channel.isPrimary,
      isPublic: channel.isPublic,
    }),
  );

  return nextSocialLinks;
}

export function getPrimaryPublicOrganizationContactChannel(
  socialLinks: unknown,
): PublicOrganizationContactChannel | null {
  const publicChannels = readOrganizationContactChannels(socialLinks)
    .filter((channel) => channel.isPublic)
    .map((channel) => ({
      ...channel,
      href: getOrganizationContactChannelHref(channel),
    }))
    .filter(
      (channel): channel is OrganizationContactChannel & { href: string } =>
        typeof channel.href === "string",
    );

  if (publicChannels.length === 0) {
    return null;
  }

  const primary =
    publicChannels.find((channel) => channel.isPrimary) ?? publicChannels[0];

  return primary;
}
