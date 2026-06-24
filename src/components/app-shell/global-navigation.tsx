"use client";

import { useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";
import {
  Bell,
  Bookmark,
  ChevronDown,
  ChevronRight,
  Clock,
  Heart,
  HelpCircle,
  Home,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
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
import { WorkspaceSemanticCloudButton } from "../workspace/semantic-cloud/workspace-semantic-cloud-button";
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

type NavigationTranslate = (
  key: NavigationMessageKey,
  params?: MessageParams,
) => string;

export const UI_MINI_FIX_REAL_ORGANIZATIONS_IN_GLOBAL_NAV =
  "UI_MINI_FIX_REAL_ORGANIZATIONS_IN_GLOBAL_NAV" as const;

export const UI_MINI_FIX_SEMANTIC_CLOUD_TOP_SEARCH_IN_GLOBAL_NAV =
  "UI_MINI_FIX_SEMANTIC_CLOUD_TOP_SEARCH_IN_GLOBAL_NAV" as const;

export const UI_PHASE20C_04B_GLOBAL_NAVIGATION_I18N_WIRED =
  "UI_PHASE20C_04B_GLOBAL_NAVIGATION_I18N_WIRED" as const;

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

function SidebarMainItem({
  icon: Icon,
  label,
  active,
  badge,
  href = "#",
}: {
  readonly icon: IconComponent;
  readonly label: string;
  readonly active?: boolean;
  readonly badge?: number;
  readonly href?: string;
}) {
  return (
    <a
      href={href}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-all ${
        active
          ? "bg-[#eef2ff] text-[#3b6ef8]"
          : "text-[#4a4f6a] hover:bg-gray-50 hover:text-[#1a1d2e]"
      }`}
    >
      <Icon size={16} className={active ? "text-[#3b6ef8]" : "text-[#7c8099]"} />
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined ? <Badge count={badge} /> : null}
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
}: {
  readonly label: string;
  readonly depth?: number;
  readonly children?: ReactNode;
  readonly defaultOpen?: boolean;
  readonly href?: string;
  readonly actionHref?: string;
  readonly actionTitle?: string;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const pl = depth === 1 ? "pl-9" : depth === 2 ? "pl-12" : "pl-[60px]";
  const textSize = depth === 1 ? "text-[12px] font-medium" : "text-[11.5px] font-normal";
  const textColor = depth === 1 ? "text-[#5a5f7a]" : "text-[#7c8099]";

  if (children) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`flex w-full items-center gap-1.5 rounded-md py-1.5 pr-3 ${pl} ${textSize} ${textColor} transition-all hover:bg-gray-50 hover:text-[#1a1d2e]`}
        >
          <span className="flex-1 text-left">{label}</span>
          {open ? (
            <ChevronDown size={11} className="text-[#c0c4d4]" />
          ) : (
            <ChevronRight size={11} className="text-[#c0c4d4]" />
          )}
        </button>

        {open ? <div>{children}</div> : null}
      </div>
    );
  }

  return (
    <div className="group flex w-full items-center rounded-md pr-2 transition-all hover:bg-gray-50">
      <a
        href={href}
        className={`flex min-w-0 flex-1 items-center py-1.5 pr-2 ${pl} ${textSize} ${textColor} transition-all group-hover:text-[#1a1d2e]`}
      >
        <span className="flex-1 truncate text-left leading-tight">{label}</span>
      </a>

      {actionHref ? (
        <a
          href={actionHref}
          title={actionTitle ?? `Add: ${label}`}
          aria-label={actionTitle ?? `Add: ${label}`}
          className="mr-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border border-transparent text-[#b0b4c8] transition-all hover:border-[#dfe4ff] hover:bg-[#eef2ff] hover:text-[#3b6ef8]"
        >
          <Plus size={12} strokeWidth={2.4} />
        </a>
      ) : null}
    </div>
  );
}

function getOrganizationInitial(organization: SidebarOrganization) {
  return organization.organization_name.trim().charAt(0).toUpperCase() || "•";
}

function BusinessOrganizationTreeItem({
  organization,
}: {
  readonly organization: SidebarOrganization;
}) {
  const locationLabel = getOrganizationLocationLabel(organization);
  const href = `/organizations/${encodeURIComponent(organization.id)}`;

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

export function GlobalSidebar() {
  const [organizations, setOrganizations] = useState<SidebarOrganization[]>([]);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);
  const [organizationsError, setOrganizationsError] = useState<string | null>(null);
  const t = useNavigationTranslator();

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
    <aside className="hidden w-[240px] flex-shrink-0 flex-col overflow-hidden border-r border-[rgba(0,0,0,0.07)] bg-white lg:flex">
      <div className="flex items-center gap-2.5 border-b border-[rgba(0,0,0,0.06)] px-4 py-4">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#3b6ef8] to-[#6f42f5]">
          <Sparkles size={14} className="text-white" />
        </div>
        <div>
          <div className="text-[15px] font-bold leading-none text-[#1a1d2e]">
            LifeOS
          </div>
          <div className="mt-0.5 text-[10px] leading-none text-[#9ca3b8]">
            {t("navigation.everythingImportantInOnePlace")}
          </div>
        </div>
      </div>

      <nav className="scrollbar-hide flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        <SidebarMainItem icon={LayoutDashboard} label={t("navigation.dashboard")} active href="/" />

        <div className="pb-0.5 pt-1">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#b0b4c8]">
            {t("navigation.catalogAndServices")}
          </p>
        </div>

        <ExpandableSidebarItem icon={ShoppingBag} label={t("navigation.catalog")} defaultOpen>
          <TreeItem
            label={t("navigation.businesses")}
            depth={1}
            href="/directory"
            actionHref="/organizations/new"
            actionTitle={t("navigation.createBusiness")}
          />
          <TreeItem
            label={t("navigation.enterpriseOffers")}
            depth={1}
            href="/offers"
            actionHref="/offers/new"
            actionTitle={t("navigation.createEnterpriseOffer")}
          />
          <TreeItem
            label={t("navigation.giftCertificates")}
            depth={1}
            href="/certificates"
            actionHref="/certificates/new"
            actionTitle={t("navigation.createGiftCertificate")}
          />
          <TreeItem label={t("navigation.events")} depth={1} href="/calendar" />
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
            href="/calendar"
            actionHref="/calendar/new"
            actionTitle={t("navigation.addCalendarEvent")}
          />
          <TreeItem
            label={t("navigation.myValueObjects")}
            depth={1}
            href="/value-objects"
            actionHref="/value-objects/new"
            actionTitle={t("navigation.addPrivateValueObject")}
          />
          <TreeItem
            label={t("navigation.myActivityLog")}
            depth={1}
            href="/activity-today"
            actionHref="/activity-capture"
            actionTitle={t("navigation.addActivity")}
          />
          <TreeItem
            label={t("navigation.activityFactsTable")}
            depth={2}
            href="/activity-facts"
          />
        </ExpandableSidebarItem>

        <ExpandableSidebarItem icon={Wallet} label={t("navigation.money")} defaultOpen>
          <TreeItem label={t("navigation.business")} depth={1} defaultOpen>
            {isLoadingOrganizations ? (
              <TreeItem label={t("navigation.loadingBusinesses")} depth={2} href="/organizations" />
            ) : organizationsError ? (
              <TreeItem label={t("navigation.businessesLoadError")} depth={2} href="/organizations" />
            ) : visibleOrganizations.length > 0 ? (
              <>
                {visibleOrganizations.map((organization) => (
                  <BusinessOrganizationTreeItem
                    key={organization.id}
                    organization={organization}
                  />
                ))}

                {organizations.length > visibleOrganizations.length ? (
                  <TreeItem
                    label={t("navigation.showAllBusinesses", {
                      count: organizations.length,
                    })}
                    depth={2}
                    href="/organizations"
                  />
                ) : null}
              </>
            ) : (
              <TreeItem
                label={t("navigation.noBusinessesCreate")}
                depth={2}
                href="/organizations/new"
              />
            )}
          </TreeItem>
          <TreeItem label={t("navigation.career")} depth={1} href="/next" />
          <TreeItem label={t("navigation.salesManager")} depth={2} href="/next" />
          <TreeItem label={t("navigation.careerOpportunities")} depth={2} defaultOpen>
            <TreeItem label={t("navigation.hardSkills")} depth={3} href="/value-objects" />
            <TreeItem label={t("navigation.germanLanguage")} depth={3} href="/value-objects" />
            <TreeItem label={t("navigation.softSkills")} depth={3} href="/value-objects" />
          </TreeItem>
        </ExpandableSidebarItem>

        <SidebarMainItem icon={Heart} label={t("navigation.health")} href="/analytics" />
        <SidebarMainItem icon={Home} label={t("navigation.personalSpace")} href="/value-objects" />

        <div className="pb-0.5 pt-1">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#b0b4c8]">
            {t("navigation.other")}
          </p>
        </div>

        <SidebarMainItem icon={MessageSquare} label={t("navigation.messages")} badge={3} href="/workspace" />
        <SidebarMainItem icon={Bell} label={t("navigation.notifications")} badge={7} href="/workspace" />
        <SidebarMainItem icon={Settings} label={t("navigation.settings")} href="/privacy-audit" />
        <SidebarMainItem icon={Bookmark} label={t("navigation.favorites")} href="/workspace" />
        <SidebarMainItem icon={HelpCircle} label={t("navigation.help")} href="/project-knowledge" />
      </nav>
    </aside>
  );
}

export function GlobalTopBar() {
  const t = useNavigationTranslator();

  return (
    <header className="flex h-[56px] flex-shrink-0 items-center gap-4 border-b border-[rgba(0,0,0,0.07)] bg-white px-5">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative w-[430px] max-w-[46vw] flex-shrink-0">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0b4c8]"
          />
          <input
            type="text"
            placeholder={t("navigation.platformSearchPlaceholder")}
            className="w-full rounded-lg border border-transparent bg-[#f5f6fb] py-2 pl-9 pr-4 text-[12.5px] text-[#4a4f6a] placeholder-[#b0b4c8] transition-all focus:border-[#3b6ef8] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex-shrink-0">
          <WorkspaceSemanticCloudButton />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <InterfaceLanguageSwitcher />

        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-50"
          title={t("navigation.notifications")}
        >
          <Bell size={16} className="text-[#7c8099]" />
          <span className="absolute right-1 top-1 h-[7px] w-[7px] rounded-full border-2 border-white bg-red-500" />
        </button>

        <UserSessionTopBarControls />
      </div>
    </header>
  );
}
