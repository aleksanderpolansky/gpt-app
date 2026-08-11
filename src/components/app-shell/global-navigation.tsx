"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ElementType,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  Activity,
  ArrowLeftRight,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Eye,
  Gift,
  LayoutDashboard,
  Menu,
  Plus,
  UserRoundCog,
  Users,
} from "lucide-react";

import {
  getLocaleSearchParam,
  getNavigationMessage,
  type LocaleCode,
  type MessageParams,
  type NavigationMessageKey,
} from "@/i18n";
import { UserSessionTopBarControls } from "../auth/user-session-client";
import { InterfaceLanguageSwitcher } from "./interface-language-switcher";

type IconComponent = ElementType;

type SidebarOrganizationLocation = {
  country_code?: string | null;
  city?: string | null;
  district?: string | null;
};

type SidebarOrganization = {
  id: string;
  organization_name: string;
  primaryLocation?: SidebarOrganizationLocation | null;
  location?: SidebarOrganizationLocation | null;
  locations?: SidebarOrganizationLocation[];
};

type SidebarOrganizationsResponse = {
  ok?: boolean;
  error?: string;
  organizations?: SidebarOrganization[];
};

type OrganizationCreateResponse = {
  ok?: boolean;
  error?: string;
  organization?: {
    id?: string | null;
  } | null;
};

type SidebarProfile = {
  profileId: string;
  profileKind: "personal" | "avatar";
  displayName: string;
  imageUrl: string | null;
};

type SidebarProfilesResponse = {
  ok?: boolean;
  error?: string;
  errorMessage?: string;
  profiles?: SidebarProfile[];
};

type NavigationTranslate = (
  key: NavigationMessageKey,
  params?: MessageParams,
) => string;

export const UI_MINI_FIX_REAL_ORGANIZATIONS_IN_GLOBAL_NAV =
  "UI_MINI_FIX_REAL_ORGANIZATIONS_IN_GLOBAL_NAV" as const;

export const UI_MINI_FIX_SEMANTIC_CLOUD_TOP_SEARCH_IN_GLOBAL_NAV =
  "UI_MINI_FIX_SEMANTIC_CLOUD_TOP_SEARCH_IN_GLOBAL_NAV" as const;

export const UI_FIX_NAV_PURCHASES_AND_SALES_GROUP =
  "UI_FIX_NAV_PURCHASES_AND_SALES_GROUP" as const;

export const UI_FIX_NAV_MY_PURCHASES_GROUP =
  "UI_FIX_NAV_MY_PURCHASES_GROUP" as const;

export const UI_PHASE20C_04B_GLOBAL_NAVIGATION_I18N_WIRED =
  "UI_PHASE20C_04B_GLOBAL_NAVIGATION_I18N_WIRED" as const;

export const UI_FIX_FAST_BUSINESS_DRAFT_CREATE_FROM_NAV =
  "UI_FIX_FAST_BUSINESS_DRAFT_CREATE_FROM_NAV" as const;

function useInterfaceLocale(): LocaleCode {
  const [locale, setLocale] = useState<LocaleCode>("en");

  useEffect(() => {
    function readLocaleFromUrl() {
      if (typeof window === "undefined") {
        return;
      }

      setLocale(getLocaleSearchParam(new URLSearchParams(window.location.search)));
    }

    readLocaleFromUrl();
    window.addEventListener("popstate", readLocaleFromUrl);

    return () => {
      window.removeEventListener("popstate", readLocaleFromUrl);
    };
  }, []);

  return locale;
}

function useNavigationTranslator(): NavigationTranslate {
  const locale = useInterfaceLocale();

  return useMemo(
    () => (key: NavigationMessageKey, params?: MessageParams) =>
      getNavigationMessage(key, locale, params),
    [locale],
  );
}

function buildLocaleAwareHref(pathname: string, locale: LocaleCode): string {
  const [path, rawQuery = ""] = pathname.split("?", 2);
  const query = new URLSearchParams(rawQuery);

  if (locale !== "en") {
    query.set("locale", locale);
  }

  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
}

type UnifiedCertificateView =
  | "received"
  | "provided"
  | "participants"
  | "archive"
  | null;

function readUnifiedCertificateView(): UnifiedCertificateView {
  if (typeof window === "undefined") return null;

  const pathname = window.location.pathname;
  const search = new URLSearchParams(window.location.search);

  if (pathname === "/my-certificates") return "received";
  if (pathname === "/seller-certificates") return "provided";
  if (pathname === "/gift-certificates") return "participants";
  if (pathname !== "/certificates") return null;

  const view = search.get("view");
  if (view === "received" || view === "provided" || view === "archive") {
    return view;
  }

  return "participants";
}

function useUnifiedCertificateView(): UnifiedCertificateView {
  const [view, setView] = useState<UnifiedCertificateView>(null);

  useEffect(() => {
    const update = () => setView(readUnifiedCertificateView());
    update();
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);

  return view;
}

function getDraftOrganizationName(locale: LocaleCode) {
  switch (locale) {
    case "ru":
      return "\u041d\u043e\u0432\u043e\u0435 \u043f\u0440\u0435\u0434\u043f\u0440\u0438\u044f\u0442\u0438\u0435";
    case "pl":
      return "Nowe przedsi\u0119biorstwo";
    case "es":
      return "Nueva empresa";
    case "uk":
      return "\u041d\u043e\u0432\u0435 \u043f\u0456\u0434\u043f\u0440\u0438\u0454\u043c\u0441\u0442\u0432\u043e";
    case "de":
      return "Neues Unternehmen";
    case "cs":
      return "Nov\u00fd podnik";
    case "en":
    default:
      return "New business";
  }
}

function Badge({
  count,
  color = "red",
}: {
  readonly count: number;
  readonly color?: "red" | "blue";
}) {
  const cls = color === "red" ? "bg-red-500 text-white" : "bg-blue-500 text-white";

  return (
    <span
      className={`ml-auto min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold ${cls}`}
    >
      {count}
    </span>
  );
}

const COMING_SOON_SUFFIX_BY_LOCALE: Record<string, string> = {
  en: " (soon)",
  pl: " (wkrótce)",
  ru: " (скоро)",
  uk: " (незабаром)",
  de: " (bald)",
  es: " (pronto)",
  cs: " (brzy)",
};

function getComingSoonSuffix(locale: string) {
  return COMING_SOON_SUFFIX_BY_LOCALE[locale] ?? COMING_SOON_SUFFIX_BY_LOCALE.en;
}

function getComingSoonLabel(label: string, comingSoon?: boolean, comingSoonSuffix = getComingSoonSuffix("en")) {
  return comingSoon ? `${label}${comingSoonSuffix}` : label;
}

function SidebarMainItem({
  icon: Icon,
  label,
  active,
  badge,
  href = "#",
  comingSoon,
  comingSoonSuffix = getComingSoonSuffix("en"),
}: {
  readonly icon: IconComponent;
  readonly label: string;
  readonly active?: boolean;
  readonly badge?: number;
  readonly href?: string;
  readonly comingSoon?: boolean;
  readonly comingSoonSuffix?: string;
}) {
  const displayLabel = getComingSoonLabel(label, comingSoon, comingSoonSuffix);
  const baseClassName = `flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-all ${
    active
      ? "bg-[#eef2ff] text-[#3b6ef8]"
      : comingSoon
        ? "cursor-default text-[#9ca3b8]"
        : "text-[#4a4f6a] hover:bg-gray-50 hover:text-[#1a1d2e]"
  }`;

  const content = (
    <>
      <Icon size={16} className={active ? "text-[#3b6ef8]" : comingSoon ? "text-[#c0c4d4]" : "text-[#7c8099]"} />
      <span className="min-w-0 flex-1 truncate text-left" title={displayLabel}>
        {displayLabel}
      </span>
      {!comingSoon && badge !== undefined ? <Badge count={badge} /> : null}
    </>
  );

  if (comingSoon) {
    return (
      <div
        aria-disabled="true"
        title={displayLabel}
        className={baseClassName}
      >
        {content}
      </div>
    );
  }

  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      className={baseClassName}
    >
      {content}
    </a>
  );
}

function ExpandableSidebarItem({
  icon: Icon,
  label,
  children,
  defaultOpen,
  active,
}: {
  readonly icon: IconComponent;
  readonly label: string;
  readonly children: ReactNode;
  readonly defaultOpen?: boolean;
  readonly active?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-all ${
          active
            ? "bg-[#eef2ff] text-[#3b6ef8]"
            : "text-[#4a4f6a] hover:bg-gray-50 hover:text-[#1a1d2e]"
        }`}
      >
        <Icon
          size={16}
          className={active ? "text-[#3b6ef8]" : "text-[#7c8099]"}
        />
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        {open ? (
          <ChevronDown size={13} className="text-[#b0b4c8]" />
        ) : (
          <ChevronRight size={13} className="text-[#b0b4c8]" />
        )}
      </button>

      {open ? <div className="mt-0.5">{children}</div> : null}
    </div>
  );
}

function ExpandableSidebarLinkItem({
  icon: Icon,
  label,
  href,
  children,
  defaultOpen,
  active,
  current,
}: {
  readonly icon: IconComponent;
  readonly label: string;
  readonly href: string;
  readonly children: ReactNode;
  readonly defaultOpen?: boolean;
  readonly active?: boolean;
  readonly current?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div>
      <div
        className={`flex w-full items-center rounded-lg text-[13px] font-semibold transition-all ${
          active
            ? "bg-[#eef2ff] text-[#3b6ef8]"
            : "text-[#4a4f6a] hover:bg-gray-50 hover:text-[#1a1d2e]"
        }`}
      >
        <a
          href={href}
          aria-current={current ? "page" : undefined}
          className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2"
        >
          <Icon
            size={16}
            className={active ? "text-[#3b6ef8]" : "text-[#7c8099]"}
          />
          <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        </a>

        <button
          type="button"
          aria-expanded={open}
          aria-label={label}
          onClick={() => setOpen(!open)}
          className="mr-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-[#b0b4c8] transition-colors hover:bg-white/70 hover:text-[#3b6ef8]"
        >
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
      </div>

      {open ? <div className="mt-0.5">{children}</div> : null}
    </div>
  );
}

function SidebarDivider() {
  return (
    <div
      aria-hidden="true"
      className="mx-3 my-2 h-px bg-[rgba(0,0,0,0.06)]"
    />
  );
}

function TreeItem({
  label,
  depth = 1,
  children,
  defaultOpen,
  href = "#",
  actionHref,
  actionTitle,
  actionOnClick,
  actionDisabled,
  onClick,
  comingSoon,
  comingSoonSuffix = getComingSoonSuffix("en"),
  active,
}: {
  readonly label: string;
  readonly depth?: number;
  readonly children?: ReactNode;
  readonly defaultOpen?: boolean;
  readonly href?: string;
  readonly actionHref?: string;
  readonly actionTitle?: string;
  readonly actionOnClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  readonly actionDisabled?: boolean;
  readonly onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  readonly comingSoon?: boolean;
  readonly comingSoonSuffix?: string;
  readonly active?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const pl = depth === 1 ? "pl-9" : depth === 2 ? "pl-12" : "pl-[60px]";
  const textSize = depth === 1 ? "text-[12px] font-medium" : "text-[11.5px] font-normal";
  const textColor = active
    ? "text-[#3b6ef8]"
    : comingSoon
      ? "text-[#9ca3b8]"
      : depth === 1
        ? "text-[#5a5f7a]"
        : "text-[#7c8099]";
  const displayLabel = getComingSoonLabel(label, comingSoon, comingSoonSuffix);

  if (children) {
    return (
      <div>
        <button
          type="button"
          disabled={comingSoon}
          onClick={() => {
            if (!comingSoon) {
              setOpen(!open);
            }
          }}
          title={displayLabel}
          className={`flex w-full items-center gap-1.5 rounded-md py-1.5 pr-3 ${pl} ${textSize} ${textColor} transition-all ${
            comingSoon ? "cursor-default opacity-70" : "hover:bg-gray-50 hover:text-[#1a1d2e]"
          }`}
        >
          <span className="min-w-0 flex-1 truncate text-left leading-tight">
            {displayLabel}
          </span>
          {!comingSoon ? (
            open ? (
              <ChevronDown size={11} className="text-[#c0c4d4]" />
            ) : (
              <ChevronRight size={11} className="text-[#c0c4d4]" />
            )
          ) : null}
        </button>

        {open ? <div>{children}</div> : null}
      </div>
    );
  }

  const linkClassName = `flex min-w-0 flex-1 items-center py-1.5 pr-2 ${pl} ${textSize} ${textColor} transition-all ${
    comingSoon ? "cursor-default opacity-70" : "group-hover:text-[#1a1d2e]"
  }`;

  return (
    <div
      className={`group flex w-full items-center rounded-md pr-2 transition-all ${
        active ? "bg-[#eef2ff]" : comingSoon ? "" : "hover:bg-gray-50"
      }`}
    >
      {comingSoon ? (
        <span
          aria-disabled="true"
          title={displayLabel}
          className={linkClassName}
        >
          <span className="min-w-0 flex-1 truncate text-left leading-tight">
            {displayLabel}
          </span>
        </span>
      ) : (
        <a
          href={href}
          onClick={onClick}
          title={displayLabel}
          aria-current={active ? "page" : undefined}
          className={linkClassName}
        >
          <span className="min-w-0 flex-1 truncate text-left leading-tight">
            {displayLabel}
          </span>
        </a>
      )}

      {!comingSoon && (actionHref || actionOnClick) ? (
        actionOnClick ? (
          <button
            type="button"
            onClick={actionOnClick}
            disabled={actionDisabled}
            title={actionTitle}
            className="ml-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[#9ca3b8] opacity-0 transition-all hover:bg-[#eef2ff] hover:text-[#3b6ef8] disabled:cursor-not-allowed disabled:opacity-30 group-hover:opacity-100"
          >
            <Plus size={13} />
          </button>
        ) : (
          <a
            href={actionHref}
            title={actionTitle}
            className="ml-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[#9ca3b8] opacity-0 transition-all hover:bg-[#eef2ff] hover:text-[#3b6ef8] group-hover:opacity-100"
          >
            <Plus size={13} />
          </a>
        )
      ) : null}
    </div>
  );
}

function getOrganizationInitial(organization: unknown) {
  const record =
    organization && typeof organization === "object"
      ? organization as Record<string, unknown>
      : {};

  const candidate =
    typeof record.name === "string"
      ? record.name
      : typeof record.title === "string"
        ? record.title
        : typeof record.displayName === "string"
          ? record.displayName
          : typeof record.organizationName === "string"
            ? record.organizationName
            : typeof record.slug === "string"
              ? record.slug
              : "";

  const trimmed = candidate.trim();

  return trimmed ? trimmed.charAt(0).toUpperCase() : "•";
}
function BusinessOrganizationTreeItem({
  organization,
  locale,
}: {
  readonly organization: SidebarOrganization;
  readonly locale: LocaleCode;
}) {
  const locationLabel = getOrganizationLocationLabel(organization);
  const href = buildLocaleAwareHref(
    `/organizations/${encodeURIComponent(organization.id)}`,
    locale,
  );

  return (
    <a
      href={href}
      title={organization.organization_name}
      className="group ml-9 flex min-w-0 items-center gap-2 rounded-md py-1.5 pl-2 pr-2 text-[11.5px] font-medium text-[#5a5f7a] transition-all hover:bg-gray-50 hover:text-[#1a1d2e]"
    >
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#eef2ff] text-[10px] font-bold text-[#3b6ef8] ring-1 ring-[#dbe4ff]">
        {getOrganizationInitial(organization)}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate leading-tight">
          {organization.organization_name}
        </span>
        {locationLabel ? (
          <span className="mt-0.5 block truncate text-[10px] font-normal leading-tight text-[#9ca3b8]">
            {locationLabel}
          </span>
        ) : null}
      </span>
    </a>
  );
}

export const UI_MINI_FIX_BUSINESS_NAV_DETAIL_LINKS =
  "UI_MINI_FIX_BUSINESS_NAV_DETAIL_LINKS" as const;

function getProfileInitials(displayName: string) {
  const words = displayName
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0] ?? "P"}${words[1][0] ?? ""}`.toUpperCase();
  }

  return (displayName.trim().slice(0, 2) || "P").toUpperCase();
}

function ProfileNavigationTreeItem({
  profile,
  locale,
}: {
  readonly profile: SidebarProfile;
  readonly locale: LocaleCode;
}) {
  const href = buildLocaleAwareHref(
    `/profiles/${encodeURIComponent(profile.profileId)}/edit`,
    locale,
  );

  return (
    <a
      href={href}
      title={profile.displayName}
      className="group ml-9 flex min-w-0 items-center gap-2 rounded-md py-1.5 pl-2 pr-2 text-[11.5px] font-normal text-[#7c8099] transition-all hover:bg-gray-50 hover:text-[#1a1d2e]"
    >
      {profile.imageUrl ? (
        <img
          src={profile.imageUrl}
          alt=""
          className="h-5 w-5 flex-shrink-0 rounded-full object-cover ring-1 ring-[#dbe4ff]"
        />
      ) : (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#eef2ff] px-1 text-[9px] font-bold text-[#3b6ef8] ring-1 ring-[#dbe4ff]">
          {getProfileInitials(profile.displayName)}
        </span>
      )}

      <span className="min-w-0 flex-1 truncate leading-tight">
        {profile.displayName}
      </span>

      <span className="min-w-[20px] text-right text-[9.5px] font-semibold tracking-[0.02em] text-[#9ca3b8]">
        {getProfileInitials(profile.displayName)}
      </span>
    </a>
  );
}

function getOrganizationLocationLabel(organization: SidebarOrganization) {
  const location =
    organization.primaryLocation ??
    organization.location ??
    organization.locations?.[0] ??
    null;

  if (!location) {
    return null;
  }

  const parts = [location.country_code, location.city, location.district].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : null;
}

export function GlobalSidebar({
  className = "hidden w-[240px] flex-shrink-0 flex-col overflow-hidden border-r border-[rgba(0,0,0,0.07)] bg-white lg:flex",
}: {
  readonly className?: string;
}) {
  const [profiles, setProfiles] = useState<SidebarProfile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [currentPathname, setCurrentPathname] = useState("");
  const [currentSearch, setCurrentSearch] = useState("");

  const t = useNavigationTranslator();
  const locale = useInterfaceLocale();
  const certificateView = useUnifiedCertificateView();
  const localeHref = (pathname: string) => buildLocaleAwareHref(pathname, locale);

  useEffect(() => {
    const readLocation = () => {
      if (typeof window === "undefined") return;
      setCurrentPathname(window.location.pathname);
      setCurrentSearch(window.location.search);
    };

    readLocation();
    window.addEventListener("popstate", readLocation);
    return () => window.removeEventListener("popstate", readLocation);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadProfiles() {
      setIsLoadingProfiles(true);
      setProfilesError(null);

      try {
        const response = await fetch("/api/actor-context", {
          method: "GET",
          cache: "no-store",
        });
        const data = (await response.json()) as SidebarProfilesResponse;

        if (!response.ok || !data.ok) {
          if (isMounted) {
            setProfilesError(
              data.errorMessage ??
                data.error ??
                t("navigation.profilesLoadError"),
            );
          }
          return;
        }

        if (isMounted) {
          setProfiles(Array.isArray(data.profiles) ? data.profiles : []);
        }
      } catch (error) {
        if (isMounted) {
          setProfilesError(
            error instanceof Error
              ? error.message
              : t("navigation.profilesLoadError"),
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingProfiles(false);
        }
      }
    }

    void loadProfiles();

    return () => {
      isMounted = false;
    };
  }, [t]);

  const certificateSearch = useMemo(
    () => new URLSearchParams(currentSearch),
    [currentSearch],
  );
  const certificateScope = certificateSearch.get("scope");

  const isDashboardActive = currentPathname === "/";
  const isUserAiProcessingActive =
    currentPathname === "/settings/ai-processing";
  const isSystemAiInstructionsActive =
    currentPathname === "/admin/ai-instructions";
  const isDashboardSectionActive =
    isDashboardActive ||
    isUserAiProcessingActive ||
    isSystemAiInstructionsActive;
  const isCalendarActive = currentPathname.startsWith("/calendar");
  const isObservationObjectsActive = currentPathname.startsWith("/value-objects");
  const isActivityJournalActive =
    currentPathname === "/activity-today" ||
    currentPathname === "/activity-log";
  const isFactsActive = currentPathname.startsWith("/activity-facts");

  const isPurchasesActive = currentPathname === "/my-purchase-confirmations";
  const isReceivedCertificatesActive = certificateView === "received";
  const isSalesActive = currentPathname === "/purchase-confirmations";
  const isProvidedCertificatesActive = certificateView === "provided";
  const isPurchasesAndSalesActive =
    isPurchasesActive ||
    isReceivedCertificatesActive ||
    isSalesActive ||
    isProvidedCertificatesActive;

  const isBusinessCatalogActive = currentPathname === "/directory";
  const isMyBusinessesActive = currentPathname.startsWith("/organizations");
  const isBusinessesActive = isBusinessCatalogActive || isMyBusinessesActive;

  const isAllOffersActive =
    currentPathname === "/certificates" &&
    (certificateScope === "all" ||
      (certificateScope === null && certificateView === "participants"));
  const isMyOffersActive =
    currentPathname === "/certificates" && certificateScope === "mine";
  const isOffersActive = isAllOffersActive || isMyOffersActive;

  const isPeopleActive =
    currentPathname === "/people" || currentPathname.startsWith("/people/");
  const isProfilesActive =
    currentPathname === "/profiles/new" ||
    currentPathname.startsWith("/profiles/");

  return (
    <aside className={className}>
      <div className="flex items-center gap-2.5 border-b border-[rgba(0,0,0,0.06)] px-4 py-4">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f7f4ff]">
          <img
            src="/brand/arctor-logo.png"
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
        <div>
          <div
            className="text-[15px] font-bold leading-none text-[#1a1d2e]"
            aria-label="ARCTor.app"
          >
            <span aria-hidden="true">A</span>
            <span
              aria-hidden="true"
              className="text-transparent"
              style={{ WebkitTextStroke: "0.9px #6f42f5" }}
            >
              R
            </span>
            <span aria-hidden="true">CTor.app</span>
          </div>
          <div className="mt-0.5 text-[10px] leading-none text-[#9ca3b8]">
            {t("navigation.everythingImportantInOnePlace")}
          </div>
        </div>
      </div>

      <nav
        aria-label="ARCTor"
        className="scrollbar-hide flex-1 space-y-0.5 overflow-y-auto px-2 py-3"
      >
        <ExpandableSidebarLinkItem
          icon={LayoutDashboard}
          label={t("navigation.dashboard")}
          href={localeHref("/")}
          active={isDashboardSectionActive}
          current={isDashboardActive}
          defaultOpen
        >
          <TreeItem
            label={t("navigation.myAiInstructions")}
            depth={1}
            href={localeHref("/settings/ai-processing")}
            active={isUserAiProcessingActive}
          />
          <TreeItem
            label={t("navigation.systemAiInstructions")}
            depth={1}
            href={localeHref("/admin/ai-instructions")}
            active={isSystemAiInstructionsActive}
          />
        </ExpandableSidebarLinkItem>

        <SidebarDivider />

        <SidebarMainItem
          icon={CalendarDays}
          label={t("navigation.calendar")}
          active={isCalendarActive}
          href={localeHref("/calendar")}
        />
        <SidebarMainItem
          icon={Eye}
          label={t("navigation.observationObjects")}
          active={isObservationObjectsActive}
          href={localeHref("/value-objects")}
        />
        <SidebarMainItem
          icon={Activity}
          label={t("navigation.activityJournal")}
          active={isActivityJournalActive}
          href={localeHref("/activity-today")}
        />
        <SidebarMainItem
          icon={ClipboardList}
          label={t("navigation.facts")}
          active={isFactsActive}
          href={localeHref("/activity-facts")}
        />

        <SidebarDivider />

        <ExpandableSidebarItem
          icon={ArrowLeftRight}
          label={t("navigation.purchasesAndSales")}
          active={isPurchasesAndSalesActive}
          defaultOpen
        >
          <TreeItem
            label={t("navigation.purchases")}
            depth={1}
            href={localeHref("/my-purchase-confirmations")}
            active={isPurchasesActive}
          />
          <TreeItem
            label={t("navigation.myCertificates")}
            depth={1}
            href={localeHref("/certificates?view=received")}
            active={isReceivedCertificatesActive}
          />
          <TreeItem
            label={t("navigation.sales")}
            depth={1}
            href={localeHref("/purchase-confirmations")}
            active={isSalesActive}
          />
          <TreeItem
            label={t("navigation.sellerCertificates")}
            depth={1}
            href={localeHref("/certificates?view=provided")}
            active={isProvidedCertificatesActive}
          />
        </ExpandableSidebarItem>

        <ExpandableSidebarLinkItem
          icon={Building2}
          label={t("navigation.businesses")}
          href={localeHref("/directory")}
          active={isBusinessesActive}
          current={isBusinessCatalogActive}
          defaultOpen
        >
          <TreeItem
            label={t("navigation.myBusinesses")}
            depth={1}
            href={localeHref("/organizations")}
            active={isMyBusinessesActive}
          />
        </ExpandableSidebarLinkItem>

        <ExpandableSidebarLinkItem
          icon={Gift}
          label={t("navigation.offers")}
          href={localeHref("/certificates?scope=all")}
          active={isOffersActive}
          current={isAllOffersActive}
          defaultOpen
        >
          <TreeItem
            label={t("navigation.myOffers")}
            depth={1}
            href={localeHref("/certificates?scope=mine")}
            active={isMyOffersActive}
          />
        </ExpandableSidebarLinkItem>

        <SidebarDivider />

        <SidebarMainItem
          icon={Users}
          label={t("navigation.peopleAndAvatars")}
          active={isPeopleActive}
          href={localeHref("/people")}
        />

        <ExpandableSidebarItem
          icon={UserRoundCog}
          label={t("navigation.myProfiles")}
          active={isProfilesActive}
          defaultOpen
        >
          {isLoadingProfiles ? (
            <div className="py-1.5 pl-9 pr-3 text-[11px] text-[#9ca3b8]">
              {t("navigation.loadingProfiles")}
            </div>
          ) : profilesError ? (
            <div
              className="py-1.5 pl-9 pr-3 text-[11px] text-[#ef4444]"
              title={profilesError}
            >
              {t("navigation.profilesLoadError")}
            </div>
          ) : (
            profiles.map((profile) => (
              <ProfileNavigationTreeItem
                key={profile.profileId}
                profile={profile}
                locale={locale}
              />
            ))
          )}

          <TreeItem
            label={t("navigation.createAvatar")}
            depth={1}
            href={localeHref("/profiles/new")}
            active={currentPathname === "/profiles/new"}
          />
        </ExpandableSidebarItem>
      </nav>
    </aside>
  );
}

export function GlobalTopBar({
  onOpenMobileNavigation,
}: {
  readonly onOpenMobileNavigation?: () => void;
}) {
  const locale = useInterfaceLocale();
  const t = useNavigationTranslator();
  const homeHref = buildLocaleAwareHref("/", locale);
  const betaNoticeHref = buildLocaleAwareHref("/beta-notice", locale);

  return (
    <header className="flex h-[60px] flex-shrink-0 items-center border-b border-[rgba(0,0,0,0.07)] bg-white px-3 sm:px-5">
      <button
        type="button"
        onClick={onOpenMobileNavigation}
        aria-label="Open navigation"
        className="mr-2 flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(0,0,0,0.07)] bg-white text-[#3b6ef8] shadow-sm transition-colors hover:bg-[#f5f6fb] lg:hidden"
      >
        <Menu size={18} />
      </button>

      <a
        href={homeHref}
        aria-label="ARCTor.app"
        className="mr-2 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl transition-colors hover:bg-[#f5f6fb] sm:mr-3"
      >
        <img
          src="/brand/arctor-logo.png"
          alt=""
          className="h-9 w-9 flex-shrink-0 rounded-xl object-contain"
        />

      </a>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <InterfaceLanguageSwitcher />

        <a
          href={betaNoticeHref}
          aria-label={t("navigation.betaNotice")}
          title={t("navigation.betaNotice")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-[17px] font-black leading-none text-white shadow-sm transition-colors hover:bg-red-700"
        >
          !
        </a>

        <UserSessionTopBarControls />
      </div>
    </header>
  );
}
