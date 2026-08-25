import Link from "next/link";
import { notFound } from "next/navigation";
import { type ElementType, type ReactNode } from "react";
import {
  FolderKanban,
  Globe,
  MapPin,
  MessageCircle,
  Newspaper,
  Phone,
  Star,
} from "lucide-react";

import { auth0 } from "../../../../lib/auth0";
import { toMediaDeliveryUrl } from "../../../../lib/media-egress";
import { supabase } from "../../../../lib/supabase";
import ProfileSwitcher, {
  type OwnedProfileSwitchOption,
} from "@/components/profiles/ProfileSwitcher";
import { normalizeLocale } from "@/i18n";
import { getPersonalProfileMessages } from "@/i18n/messages/personal-profile";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type PublicProfileRow = {
  id: string;
  owner_user_id: string;
  actor_id: string;
  profile_kind: "personal" | "avatar";
  public_slug: string;
  display_name: string;
  bio: string | null;
  image_url: string | null;
  category_label: string | null;
  public_phone: string | null;
  website_url: string | null;
  messenger_url: string | null;
  is_public: boolean;
  updated_at: string;
};

type AppUserRow = {
  id: string;
};

function readSearchValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function appendLocale(pathname: string, locale: string) {
  return locale === "en"
    ? pathname
    : `${pathname}?locale=${encodeURIComponent(locale)}`;
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }

  return (name.trim().slice(0, 2) || "U").toUpperCase();
}

function normalizeExternalHref(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function TopCard({
  label,
  accent,
  icon: Icon,
  children,
  footerIconOnly = false,
}: {
  label: string;
  accent: string;
  icon: ElementType;
  children: ReactNode;
  footerIconOnly?: boolean;
}) {
  return (
    <div className="flex h-full min-h-[390px] flex-col overflow-hidden rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      {footerIconOnly ? null : (
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-[#7c8099]">
            {label}
          </span>
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${accent}18` }}
          >
            <Icon size={14} style={{ color: accent }} />
          </span>
        </div>
      )}
      <div className={footerIconOnly ? "flex min-h-0 flex-1 flex-col gap-2" : "mt-3 flex min-h-0 flex-1 flex-col gap-2"}>
        {children}
      </div>
      {footerIconOnly ? (
        <div className="mt-auto flex items-center justify-end pt-3">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${accent}18` }}
            aria-label={label}
          >
            <Icon size={14} style={{ color: accent }} />
          </span>
        </div>
      ) : null}
    </div>
  );
}

function Placeholder({ label, tall = false }: { label: string; tall?: boolean }) {
  return (
    <div className={`flex ${tall ? "min-h-[300px] flex-1" : "h-[140px]"} items-center justify-center rounded-xl bg-[#f8f9fd] text-[12px] text-[#9ca3b8]`}>
      {label}
    </div>
  );
}

function AnalyticsCard({
  title,
  detailsLabel,
  children,
}: {
  title: string;
  detailsLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="min-w-0 line-clamp-1 pr-2 text-[13px] font-semibold text-[#1a1d2e]">
          {title}
        </h3>
        <span className="text-[11px] text-[#3b6ef8]">{detailsLabel}</span>
      </div>
      {children}
    </div>
  );
}

function ActionButton({
  href,
  icon: Icon,
  children,
}: {
  href: string | null;
  icon: ElementType;
  children: ReactNode;
}) {
  const className =
    "flex items-center gap-1 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-1.5 text-[12px] font-medium text-[#5a5f7a] transition-all hover:bg-[#f5f6fb] disabled:cursor-not-allowed disabled:opacity-50";

  return href ? (
    <a href={href} className={className}>
      <Icon size={12} />
      {children}
    </a>
  ) : (
    <button type="button" disabled className={className}>
      <Icon size={12} />
      {children}
    </button>
  );
}

function FutureDirectionCard({ title, label }: { title: string; label: string }) {
  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <div className="mb-3 text-[13px] font-semibold text-[#1a1d2e]">{title}</div>
      <div className="h-1.5 w-full rounded-full bg-[#f0f2f7]" />
      <div className="mt-3 text-[11px] text-[#9ca3b8]">{label}</div>
    </div>
  );
}

async function getCurrentAppUser() {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return null;
  }

  const { data, error } = await supabase
    .from("app_users")
    .select("id")
    .eq("auth0_sub", session.user.sub)
    .maybeSingle();

  return error ? null : (data as AppUserRow | null);
}

export default async function PublicPersonalProfilePage({
  params,
  searchParams,
}: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const locale = normalizeLocale(
    readSearchValue(resolvedSearchParams, "locale") ??
      readSearchValue(resolvedSearchParams, "lang"),
  );
  const messages = getPersonalProfileMessages(locale);

  const [{ data, error }, currentAppUser] = await Promise.all([
    supabase
      .from("actor_public_profiles")
      .select("id, owner_user_id, actor_id, profile_kind, public_slug, display_name, bio, image_url, category_label, public_phone, website_url, messenger_url, is_public, updated_at")
      .eq("public_slug", resolvedParams.slug)
      .limit(1),
    getCurrentAppUser(),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  const profile = ((data ?? [])[0] as PublicProfileRow | undefined) ?? null;
  const isOwner = Boolean(
    profile && currentAppUser && profile.owner_user_id === currentAppUser.id,
  );

  if (!profile || (!profile.is_public && !isOwner)) {
    notFound();
  }

  let ownedProfiles: OwnedProfileSwitchOption[] = [];

  if (isOwner) {
    const { data: ownedData, error: ownedError } = await supabase
      .from("actor_public_profiles")
      .select("id, public_slug, display_name, profile_kind")
      .eq("owner_user_id", profile.owner_user_id)
      .order("profile_kind", { ascending: true })
      .order("created_at", { ascending: true });

    if (ownedError) {
      throw new Error(ownedError.message);
    }

    ownedProfiles = (ownedData ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      publicSlug: String(row.public_slug),
      displayName: String(row.display_name),
      profileKind: row.profile_kind === "avatar" ? "avatar" : "personal",
    }));
  }

  const phoneHref = profile.public_phone
    ? `tel:${profile.public_phone.replace(/[^\d+*#,;]/g, "")}`
    : null;
  const websiteHref = normalizeExternalHref(profile.website_url);
  const messengerHref = normalizeExternalHref(profile.messenger_url);
  const profileTypeLabel =
    profile.profile_kind === "avatar" ? messages.avatar : messages.personalProfile;
  const profileImageUrl = toMediaDeliveryUrl(
    profile.image_url,
    `/api/profiles/${encodeURIComponent(profile.id)}/image`,
    profile.updated_at,
  );

  return (
    <main className="min-h-full bg-[#f5f6fb] text-[#1a1d2e]">
      <div className="p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link
            href={appendLocale("/people", locale)}
            className="w-fit rounded-full border border-[#dfe3f1] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4f6a] transition hover:bg-gray-50"
          >
            {messages.backToPeople}
          </Link>
          {isOwner ? (
            <>
              <Link
                href={appendLocale(`/profiles/${profile.id}/edit`, locale)}
                className="w-fit rounded-full border border-[#dfe3f1] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4f6a] shadow-sm transition hover:bg-gray-50"
              >
                {messages.editMode}
              </Link>
              <ProfileSwitcher
                currentProfileId={profile.id}
                profiles={ownedProfiles}
                locale={locale}
                mode="view"
                label={messages.switchProfile}
                personalLabel={messages.personalProfile}
                avatarLabel={messages.avatar}
              />
            </>
          ) : null}
        </div>

        <div className="mb-5">
          <h1 className="text-[20px] font-bold leading-tight text-[#1a1d2e]">
            {profile.display_name}
          </h1>
          <p className="mt-0.5 text-[13px] text-[#7c8099]">{profileTypeLabel}</p>
        </div>

        <div className="mb-5 grid auto-rows-auto grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <TopCard label={messages.profileImage} accent="#3b6ef8" icon={Star} footerIconOnly>
            <div className="flex h-full min-h-0 flex-col gap-3">
              <div className="flex min-h-0 w-full flex-1 basis-0 items-center justify-center overflow-hidden rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#eef2ff] text-[46px] font-bold text-[#3b6ef8]">
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  getInitials(profile.display_name)
                )}
              </div>
              <div className="min-w-0">
                <div className="line-clamp-2 text-[13px] font-semibold text-[#1a1d2e]">
                  {profile.display_name}
                </div>
                <div className="mt-1 min-h-4 text-[11px] text-[#9ca3b8]">
                  {profile.category_label ?? ""}
                </div>
              </div>
            </div>
          </TopCard>

          <TopCard label={messages.address} accent="#f97316" icon={MapPin}>
            <Placeholder label={messages.comingSoon} tall />
          </TopCard>
          <TopCard label={messages.projects} accent="#22c55e" icon={FolderKanban}>
            <Placeholder label={messages.comingSoon} tall />
          </TopCard>
          <TopCard label={messages.articles} accent="#8b5cf6" icon={Newspaper}>
            <Placeholder label={messages.comingSoon} tall />
          </TopCard>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <ActionButton href={phoneHref} icon={Phone}>
            {profile.public_phone ?? messages.phone}
          </ActionButton>
          <ActionButton href={websiteHref} icon={Globe}>{messages.website}</ActionButton>
          <ActionButton href={messengerHref} icon={MessageCircle}>{messages.messenger}</ActionButton>
          <a href="#profile-description" className="rounded-lg bg-[#3b6ef8] px-3 py-1.5 text-[12px] font-medium text-white shadow-sm transition-all hover:bg-[#2f5fe3]">
            {messages.description}
          </a>
          <a href="#profile-articles" className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-1.5 text-[12px] font-medium text-[#5a5f7a] transition-all hover:bg-[#f5f6fb]">
            {messages.articles}
          </a>
          <a href="#profile-activity" className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-1.5 text-[12px] font-medium text-[#5a5f7a] transition-all hover:bg-[#f5f6fb]">
            {messages.activity}
          </a>
        </div>

        <div className="mb-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
          <AnalyticsCard title={messages.description} detailsLabel={messages.details}>
            <div id="profile-description" className="min-h-[140px] text-[13px] leading-6 text-[#5a5f7a]">
              {profile.bio ? <p className="whitespace-pre-wrap">{profile.bio}</p> : <Placeholder label={messages.comingSoon} />}
            </div>
          </AnalyticsCard>
          <AnalyticsCard title={messages.articles} detailsLabel={messages.details}>
            <div id="profile-articles"><Placeholder label={messages.comingSoon} /></div>
          </AnalyticsCard>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
          <AnalyticsCard title={messages.activity} detailsLabel={messages.details}>
            <div id="profile-activity"><Placeholder label={messages.comingSoon} /></div>
          </AnalyticsCard>
          <AnalyticsCard title={messages.projects} detailsLabel={messages.details}>
            <Placeholder label={messages.comingSoon} />
          </AnalyticsCard>
        </div>

        <div className="mb-2">
          <h2 className="mb-3 text-[13px] font-semibold text-[#1a1d2e]">{messages.publicProfile}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FutureDirectionCard title={messages.articles} label={messages.comingSoon} />
            <FutureDirectionCard title={messages.activity} label={messages.comingSoon} />
            <FutureDirectionCard title={messages.projects} label={messages.comingSoon} />
            <FutureDirectionCard title={messages.categories} label={messages.comingSoon} />
          </div>
        </div>
      </div>
    </main>
  );
}
