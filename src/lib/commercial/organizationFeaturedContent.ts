export const ORGANIZATION_FEATURED_CONTENT_KEY =
  "arctor_featured_content_v1" as const;

export type OrganizationFeaturedContent = {
  imageUrl: string | null;
  linkUrl: string | null;
};

export type ParseOrganizationFeaturedContentResult =
  | {
      ok: true;
      value: OrganizationFeaturedContent;
      errorCode: null;
    }
  | {
      ok: false;
      value: OrganizationFeaturedContent;
      errorCode:
        | "FEATURED_CONTENT_INVALID_SHAPE"
        | "FEATURED_CONTENT_IMAGE_URL_INVALID"
        | "FEATURED_CONTENT_LINK_URL_INVALID";
    };

const EMPTY_FEATURED_CONTENT: OrganizationFeaturedContent = {
  imageUrl: null,
  linkUrl: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeHttpsUrl(value: string) {
  if (!value) {
    return null;
  }

  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function parseOrganizationFeaturedContentInput(
  value: unknown,
): ParseOrganizationFeaturedContentResult {
  if (value === null || value === undefined) {
    return {
      ok: true,
      value: { ...EMPTY_FEATURED_CONTENT },
      errorCode: null,
    };
  }

  if (!isRecord(value)) {
    return {
      ok: false,
      value: { ...EMPTY_FEATURED_CONTENT },
      errorCode: "FEATURED_CONTENT_INVALID_SHAPE",
    };
  }

  const imageInput = readTrimmedString(value.imageUrl);
  const linkInput = readTrimmedString(value.linkUrl);
  const imageUrl = imageInput ? normalizeHttpsUrl(imageInput) : null;
  const linkUrl = linkInput ? normalizeHttpsUrl(linkInput) : null;

  if (imageInput && !imageUrl) {
    return {
      ok: false,
      value: { ...EMPTY_FEATURED_CONTENT },
      errorCode: "FEATURED_CONTENT_IMAGE_URL_INVALID",
    };
  }

  if (linkInput && !linkUrl) {
    return {
      ok: false,
      value: { ...EMPTY_FEATURED_CONTENT },
      errorCode: "FEATURED_CONTENT_LINK_URL_INVALID",
    };
  }

  return {
    ok: true,
    value: { imageUrl, linkUrl },
    errorCode: null,
  };
}

export function readOrganizationFeaturedContent(
  socialLinks: unknown,
): OrganizationFeaturedContent {
  if (!isRecord(socialLinks)) {
    return { ...EMPTY_FEATURED_CONTENT };
  }

  const parsed = parseOrganizationFeaturedContentInput(
    socialLinks[ORGANIZATION_FEATURED_CONTENT_KEY],
  );

  return parsed.ok ? parsed.value : { ...EMPTY_FEATURED_CONTENT };
}

export function writeOrganizationFeaturedContent(
  socialLinks: Record<string, unknown> | null,
  featuredContent: OrganizationFeaturedContent,
) {
  const nextSocialLinks = socialLinks ? { ...socialLinks } : {};

  if (!featuredContent.imageUrl && !featuredContent.linkUrl) {
    delete nextSocialLinks[ORGANIZATION_FEATURED_CONTENT_KEY];
    return nextSocialLinks;
  }

  nextSocialLinks[ORGANIZATION_FEATURED_CONTENT_KEY] = {
    imageUrl: featuredContent.imageUrl,
    linkUrl: featuredContent.linkUrl,
  };

  return nextSocialLinks;
}
