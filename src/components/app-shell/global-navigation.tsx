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
  ChevronDown,
  ChevronRight,
  Clock,
  Heart,
  Home,
  LayoutDashboard,
  Menu,
  Plus,
  ShoppingBag,
  Wallet,
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
  if (locale === "en") {
    return pathname;
  }

  return `${pathname}?locale=${encodeURIComponent(locale)}`;
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
}: {
  readonly icon: IconComponent;
  readonly label: string;
  readonly children: ReactNode;
  readonly defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-[#4a4f6a] transition-all hover:bg-gray-50 hover:text-[#1a1d2e]"
      >
        <Icon size={16} className="text-[#7c8099]" />
        <span className="flex-1 text-left">{label}</span>
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
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const pl = depth === 1 ? "pl-9" : depth === 2 ? "pl-12" : "pl-[60px]";
  const textSize = depth === 1 ? "text-[12px] font-medium" : "text-[11.5px] font-normal";
  const textColor = comingSoon ? "text-[#9ca3b8]" : depth === 1 ? "text-[#5a5f7a]" : "text-[#7c8099]";
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
    <div className={`group flex w-full items-center rounded-md pr-2 transition-all ${comingSoon ? "" : "hover:bg-gray-50"}`}>
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
  const [organizations, setOrganizations] = useState<SidebarOrganization[]>([]);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);
  const [organizationsError, setOrganizationsError] = useState<string | null>(null);
  const [isCreatingBusiness, setIsCreatingBusiness] = useState(false);
  const t = useNavigationTranslator();
  const locale = useInterfaceLocale();
  const localeHref = (pathname: string) => buildLocaleAwareHref(pathname, locale);

  async function createBusinessAndOpenEditor() {
    if (isCreatingBusiness) {
      return;
    }

    setIsCreatingBusiness(true);

    try {
      const response = await fetch("/api/organizations/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          organizationName: getDraftOrganizationName(locale),
          organizationType: "private_business",
          locale,
        }),
      });

      const data = (await response.json()) as OrganizationCreateResponse;

      if (!response.ok || !data.ok || !data.organization?.id) {
        throw new Error(data.error ?? t("navigation.businessesLoadError"));
      }

      window.location.href = buildLocaleAwareHref(
        `/organizations/${encodeURIComponent(data.organization.id)}/edit`,
        locale,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error && error.message
          ? error.message
          : t("navigation.businessesLoadError");

      window.alert(errorMessage);
      setIsCreatingBusiness(false);
    }
  }

  function handleCreateBusinessAction(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    void createBusinessAndOpenEditor();
  }

  function handleCreateBusinessLink(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    void createBusinessAndOpenEditor();
  }

  useEffect(() => {
    let isMounted = true;

    async function loadOrganizations() {
      setIsLoadingOrganizations(true);
      setOrganizationsError(null);

      try {
        const response = await fetch("/api/organizations", {
          method: "GET",
          cache: "no-store",
        });

        const data = (await response.json()) as SidebarOrganizationsResponse;

        if (!response.ok || !data.ok) {
          if (isMounted) {
            setOrganizationsError(data.error ?? t("navigation.businessesLoadError"));
          }

          return;
        }

        if (isMounted) {
          setOrganizations(Array.isArray(data.organizations) ? data.organizations : []);
        }
      } catch (error) {
        if (isMounted) {
          setOrganizationsError(
            error instanceof Error ? error.message : t("navigation.businessesLoadError"),
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingOrganizations(false);
        }
      }
    }

    void loadOrganizations();

    return () => {
      isMounted = false;
    };
  }, [t]);

  const visibleOrganizations = useMemo(() => organizations.slice(0, 8), [organizations]);

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

      <nav className="scrollbar-hide flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        <SidebarMainItem icon={LayoutDashboard} label={t("navigation.dashboard")} active href={localeHref("/")} />

        <div className="pb-0.5 pt-1">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#b0b4c8]">
            {t("navigation.catalogAndServices")}
          </p>
        </div>

        <ExpandableSidebarItem icon={ShoppingBag} label={t("navigation.catalog")} defaultOpen>
          <TreeItem
            label={t("navigation.businesses")}
            depth={1}
            href={localeHref("/directory")}
            actionOnClick={handleCreateBusinessAction}
            actionDisabled={isCreatingBusiness}
            actionTitle={t("navigation.createBusiness")}
          />
          <TreeItem
            label={t("navigation.enterpriseOffers")}
            depth={2}
            href={localeHref("/offers")}
            actionHref={localeHref("/offers/new")}
            actionTitle={t("navigation.createEnterpriseOffer")}
            comingSoon comingSoonSuffix={getComingSoonSuffix(locale)}
          />
          <TreeItem
            label={t("navigation.giftCertificates")}
            depth={2}
            href={localeHref("/certificates")}
            actionHref={localeHref("/certificates/new")}
            actionTitle={t("navigation.createGiftCertificate")}
            comingSoon comingSoonSuffix={getComingSoonSuffix(locale)}
          />
          <TreeItem label={t("navigation.events")} depth={2} href={localeHref("/calendar")} comingSoon comingSoonSuffix={getComingSoonSuffix(locale)} />

        </ExpandableSidebarItem>

        <div className="pb-0.5 pt-1">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#b0b4c8]">
            {t("navigation.directions")}
          </p>
        </div>

        <ExpandableSidebarItem icon={Clock} label={t("navigation.time")} defaultOpen>
          <TreeItem
            label={t("navigation.calendar")}
            depth={1}
            href={localeHref("/calendar")}
            actionHref={localeHref("/calendar/add")}
            actionTitle={t("navigation.addCalendarEvent")}
          />
          <TreeItem
            label={t("navigation.myValueObjects")}
            depth={1}
            href={localeHref("/value-objects")}
            actionHref={localeHref("/value-objects/new")}
            actionTitle={t("navigation.addPrivateValueObject")}
            comingSoon comingSoonSuffix={getComingSoonSuffix(locale)}
          />
          <TreeItem
            label={t("navigation.myActivityLog")}
            depth={1}
            href={localeHref("/activity-today")}
            actionHref={localeHref("/activity-capture")}
            actionTitle={t("navigation.addActivity")}
          />
          <TreeItem
            label={t("navigation.activityFactsTable")}
            depth={2}
            href={localeHref("/activity-facts")}
          />
        </ExpandableSidebarItem>

        <ExpandableSidebarItem icon={Wallet} label={t("navigation.money")} defaultOpen>
                    <TreeItem
            label={t("navigation.myPurchases")}
            depth={1}
            href={localeHref("/my-purchase-confirmations")}
          />
          <TreeItem
            label={t("navigation.myPurchaseRequests")}
            depth={2}
            href={localeHref("/my-purchase-confirmations")}
          />
          <TreeItem
            label={t("navigation.myCertificates")}
            depth={2}
            href={localeHref("/my-certificates")}
            comingSoon comingSoonSuffix={getComingSoonSuffix(locale)}
          />
          <TreeItem
            label={t("navigation.purchaseConfirmationsInbox")}
            depth={2}
            href={localeHref("/purchase-confirmations")}
          />
          <TreeItem
            label={t("navigation.sellerCertificates")}
            depth={2}
            href={localeHref("/seller-certificates")}
            comingSoon comingSoonSuffix={getComingSoonSuffix(locale)}
          />
          <TreeItem label={t("navigation.business")} depth={1} defaultOpen>
            {isLoadingOrganizations ? (
              <TreeItem label={t("navigation.loadingBusinesses")} depth={2} href={localeHref("/organizations")} />
            ) : organizationsError ? (
              <TreeItem label={t("navigation.businessesLoadError")} depth={2} href={localeHref("/organizations")} />
            ) : visibleOrganizations.length > 0 ? (
              <>
                {visibleOrganizations.map((organization) => (
                  <BusinessOrganizationTreeItem
                    key={organization.id}
                    organization={organization}
                    locale={locale}
                  />
                ))}

                {organizations.length > visibleOrganizations.length ? (
                  <TreeItem
                    label={t("navigation.showAllBusinesses", {
                      count: organizations.length,
                    })}
                    depth={2}
                    href={localeHref("/organizations")}
                  />
                ) : null}
              </>
            ) : (
              <TreeItem
                label={t("navigation.noBusinessesCreate")}
                depth={2}
                href={localeHref("/organizations/new")}
                onClick={handleCreateBusinessLink}
              />
            )}
          <TreeItem
            label={t("navigation.deletedBusinesses")}
            depth={2}
            href={localeHref("/organizations/deleted")}
          />

          </TreeItem>
          <TreeItem label={t("navigation.career")} depth={1} href={localeHref("/next")} comingSoon comingSoonSuffix={getComingSoonSuffix(locale)} />
          <TreeItem label={t("navigation.salesManager")} depth={2} href={localeHref("/next")} comingSoon comingSoonSuffix={getComingSoonSuffix(locale)} />
          <TreeItem label={t("navigation.careerOpportunities")} depth={2} defaultOpen comingSoon comingSoonSuffix={getComingSoonSuffix(locale)}>
            <TreeItem label={t("navigation.hardSkills")} depth={3} href={localeHref("/value-objects")} comingSoon comingSoonSuffix={getComingSoonSuffix(locale)} />
            <TreeItem label={t("navigation.germanLanguage")} depth={3} href={localeHref("/value-objects")} comingSoon comingSoonSuffix={getComingSoonSuffix(locale)} />
            <TreeItem label={t("navigation.softSkills")} depth={3} href={localeHref("/value-objects")} comingSoon comingSoonSuffix={getComingSoonSuffix(locale)} />
          </TreeItem>
        </ExpandableSidebarItem>

        <SidebarMainItem icon={Heart} label={t("navigation.health")} href={localeHref("/analytics")} comingSoon comingSoonSuffix={getComingSoonSuffix(locale)} />
        <SidebarMainItem icon={Home} label={t("navigation.personalSpace")} href={localeHref("/value-objects")} comingSoon comingSoonSuffix={getComingSoonSuffix(locale)} />

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
