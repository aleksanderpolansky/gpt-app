"use client";

import Link from "next/link";
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
  Plus,
  Star,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

import {
  getNavigationMessage,
  getOrganizationsMessage,
  type LocaleCode,
} from "@/i18n";
import { getDirectoryListMessage } from "@/i18n/messages/directory-list";

export const UI_FIX_GREEN_ADD_BUSINESS_BUTTON_FAST_DRAFT =
  "UI_FIX_GREEN_ADD_BUSINESS_BUTTON_FAST_DRAFT" as const;

export const UI_FIX_FAST_BUSINESS_DRAFT_CREATE_FROM_DIRECTORY =
  "UI_FIX_FAST_BUSINESS_DRAFT_CREATE_FROM_DIRECTORY" as const;

type IconComponent = ElementType;

type DirectoryCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

type DirectoryLocation = {
  id: string;
  locationType: string;
  addressVisibility: string;
  label: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  district: string | null;
  streetAddress: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  geoArea:
    | {
        id: string;
        area_type: string;
        name: string;
        slug: string;
        country_code: string | null;
      }
    | null;
};

type DirectoryActionStats = {
  activeOffersCount: number;
  activeCertificatesCount: number;
  hasActiveOffers: boolean;
  hasActiveCertificates: boolean;
  canRegisterPurchase: boolean;
};

type DirectoryOrganization = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  shortDescription: string | null;
  publicSlug: string | null;
  countryCode: string | null;
  defaultCurrency: string | null;
  directoryStatus: string;
  verificationStatus: string;
  publicEmail: string | null;
  publicPhone: string | null;
  websiteUrl: string | null;
  bookingUrl: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  directoryPublishedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  primaryCategory: DirectoryCategory | null;
  primaryLocation: DirectoryLocation | null;
  distanceKm?: number | null;
  stats: {
    profileViewsCount: number;
    offerClicksCount: number;
    certificateClicksCount: number;
    purchaseRegistrationClicksCount: number;
  };
  actionStats?: DirectoryActionStats;
};

type DirectoryApiResponse = {
  ok: boolean;
  organizations?: DirectoryOrganization[];
  count?: number;
  error?: string;
};

type OrganizationDraftCreateResponse = {
  ok: boolean;
  organization?: {
    id: string;
  };
  error?: string;
};

type DirectoryScope = "all" | "mine";

type DirectoryFilterKey =
  | "all"
  | "hasOffers"
  | "hasCertificates"
  | "canRegisterPurchase"
  | "newest";

const FILTER_KEYS: DirectoryFilterKey[] = [
  "all",
  "hasOffers",
  "hasCertificates",
  "canRegisterPurchase",
  "newest",
];

function getActionStats(organization: DirectoryOrganization): DirectoryActionStats {
  return (
    organization.actionStats ?? {
      activeOffersCount: 0,
      activeCertificatesCount: 0,
      hasActiveOffers: false,
      hasActiveCertificates: false,
      canRegisterPurchase: false,
    }
  );
}

function getFilterLabel(filterKey: DirectoryFilterKey, locale: LocaleCode) {
  if (filterKey === "all") {
    return getDirectoryListMessage("directoryList.action.all", locale);
  }

  if (filterKey === "hasOffers") {
    return getDirectoryListMessage("directoryList.action.hasOffers", locale);
  }

  if (filterKey === "hasCertificates") {
    return getDirectoryListMessage("directoryList.action.hasCertificates", locale);
  }

  if (filterKey === "canRegisterPurchase") {
    return "POINTS";
  }

  return getDirectoryListMessage("directoryList.sort.newest", locale);
}

function getShownOfLabel(locale: LocaleCode, shown: number, total: number) {
  if (locale === "ru") {
    return `\u041f\u043e\u043a\u0430\u0437\u0430\u043d\u043e ${shown} \u0438\u0437 ${total}`;
  }

  if (locale === "uk") {
    return `\u041f\u043e\u043a\u0430\u0437\u0430\u043d\u043e ${shown} \u0437 ${total}`;
  }

  if (locale === "pl") {
    return `Pokazano ${shown} z ${total}`;
  }

  if (locale === "es") {
    return `Mostrado ${shown} de ${total}`;
  }

  if (locale === "de") {
    return `${shown} von ${total} angezeigt`;
  }

  if (locale === "cs") {
    return `Zobrazeno ${shown} z ${total}`;
  }

  return `Shown ${shown} of ${total}`;
}

function getShowMoreLabel(locale: LocaleCode, nextCount: number) {
  if (locale === "ru") {
    return `\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0435\u0449\u0451 ${nextCount}`;
  }

  if (locale === "uk") {
    return `\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u0438 \u0449\u0435 ${nextCount}`;
  }

  if (locale === "pl") {
    return `Poka\u017c jeszcze ${nextCount}`;
  }

  if (locale === "es") {
    return `Mostrar ${nextCount} m\u00e1s`;
  }

  if (locale === "de") {
    return `${nextCount} weitere anzeigen`;
  }

  if (locale === "cs") {
    return `Zobrazit dal\u0161\u00ed ${nextCount}`;
  }

  return `Show ${nextCount} more`;
}
function getDirectoryAddBusinessLabel(locale: LocaleCode) {
  if (locale === "ru") {
    return "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043f\u0440\u0435\u0434\u043f\u0440\u0438\u044f\u0442\u0438\u0435";
  }

  if (locale === "uk") {
    return "\u0414\u043e\u0434\u0430\u0442\u0438 \u043f\u0456\u0434\u043f\u0440\u0438\u0454\u043c\u0441\u0442\u0432\u043e";
  }

  if (locale === "pl") {
    return "Dodaj przedsi\u0119biorstwo";
  }

  if (locale === "es") {
    return "A\u00f1adir empresa";
  }

  if (locale === "de") {
    return "Unternehmen hinzuf\u00fcgen";
  }

  if (locale === "cs") {
    return "P\u0159idat podnik";
  }

  return "Add business";
}

function getDirectoryCreatingBusinessLabel(locale: LocaleCode) {
  if (locale === "ru") {
    return "\u0421\u043e\u0437\u0434\u0430\u044e...";
  }

  if (locale === "uk") {
    return "\u0421\u0442\u0432\u043e\u0440\u044e\u044e...";
  }

  if (locale === "pl") {
    return "Tworz\u0119...";
  }

  if (locale === "es") {
    return "Creando...";
  }

  if (locale === "de") {
    return "Wird erstellt...";
  }

  if (locale === "cs") {
    return "Vytv\u00e1\u0159\u00edm...";
  }

  return "Creating...";
}
function getDirectoryFindProviderLabel(locale: LocaleCode) {
  if (locale === "ru") {
    return "\u041d\u0430\u0439\u0442\u0438 \u0438\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044f";
  }

  if (locale === "uk") {
    return "\u0417\u043d\u0430\u0439\u0442\u0438 \u0432\u0438\u043a\u043e\u043d\u0430\u0432\u0446\u044f";
  }

  if (locale === "pl") {
    return "Znajd\u017a wykonawc\u0119";
  }

  if (locale === "es") {
    return "Encontrar proveedor";
  }

  if (locale === "de") {
    return "Anbieter finden";
  }

  if (locale === "cs") {
    return "Naj\u00edt dodavatele";
  }

  return "Find provider";
}
function buildDirectoryProfileHref(
  organization: DirectoryOrganization | null | undefined,
  locale: LocaleCode,
  scope: DirectoryScope = "all",
) {
  const searchParams = new URLSearchParams();

  if (locale) {
    searchParams.set("locale", locale);
  }

  if (scope === "mine") {
    searchParams.set("scope", "mine");
  }

  const queryString = searchParams.toString();
  const suffix = queryString ? `?${queryString}` : "";

  if (!organization?.publicSlug) {
    return `/directory${suffix}`;
  }

  return `/directory/${organization.publicSlug}${suffix}`;
}

function getLocationLabel(location: DirectoryLocation | null, locale: LocaleCode) {
  if (!location) {
    return getDirectoryListMessage("directoryList.location.notSpecified", locale);
  }

  if (location.addressVisibility === "hidden") {
    return getDirectoryListMessage("directoryList.location.hidden", locale);
  }

  const parts = [
    location.city,
    location.district,
    location.addressVisibility === "public" ? location.streetAddress : null,
  ].filter(Boolean);

  if (parts.length === 0) {
    return getDirectoryListMessage("directoryList.location.notSpecified", locale);
  }

  if (location.addressVisibility === "approximate") {
    return getDirectoryListMessage("directoryList.location.approximate", locale, {
      location: parts.join(", "),
    });
  }

  return parts.join(", ");
}

function KpiCard({
  label,
  value,
  sub,
  accent,
  icon: Icon,
  trend,
  valueHref,
  trendHref,
  historyTitle,
}: {
  readonly label: string;
  readonly value: string;
  readonly sub?: string;
  readonly accent: string;
  readonly icon: IconComponent;
  readonly trend?: string;
  readonly valueHref?: string;
  readonly trendHref?: string;
  readonly historyTitle?: string;
}) {
  const valueNode = (
    <div className="text-[24px] font-bold leading-none text-[#1a1d2e]">
      {value}
    </div>
  );

  const trendNode = trend ? (
    <div className="flex items-center gap-1">
      <TrendingUp size={11} className="text-[#22c55e]" />
      <span className="text-[11px] font-semibold text-[#22c55e]">{trend}</span>
    </div>
  ) : null;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[#7c8099]">
          {label}
        </span>
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accent}18` }}
        >
          <Icon size={14} style={{ color: accent }} />
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2">
        {valueHref ? (
          <Link
            href={valueHref}
            title={historyTitle}
            className="inline-flex w-fit rounded-md transition hover:text-[#3b6ef8] focus:outline-none focus:ring-2 focus:ring-[#3b6ef8]/30"
          >
            {valueNode}
          </Link>
        ) : (
          valueNode
        )}

        {sub ? <div className="text-[11px] text-[#9ca3b8]">{sub}</div> : null}

        {trendHref && trendNode ? (
          <Link
            href={trendHref}
            title={historyTitle}
            className="inline-flex w-fit rounded-md transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-[#3b6ef8]/30"
          >
            {trendNode}
          </Link>
        ) : (
          trendNode
        )}
      </div>
    </div>
  );
}

function DirectoryPackageKpi({
  offersCount,
  certificatesCount,
  pointsBusinessesCount,
  locale,
}: {
  readonly offersCount: number;
  readonly certificatesCount: number;
  readonly pointsBusinessesCount: number;
  readonly locale: LocaleCode;
}) {
  const rows = [
    {
      label: getDirectoryListMessage("directoryList.action.hasOffers", locale),
      value: String(offersCount),
    },
    {
      label: getDirectoryListMessage("directoryList.action.hasCertificates", locale),
      value: String(certificatesCount),
    },
    {
      label: "POINTS",
      value: String(pointsBusinessesCount),
    },
  ];

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[#7c8099]">
          {getDirectoryListMessage("directoryList.card.availableActions", locale)}
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f9731618]">
          <Zap size={14} className="text-[#f97316]" />
        </div>
      </div>

      <div>
        <div className="text-[13px] font-semibold text-[#1a1d2e]">
          {getDirectoryListMessage("directoryList.published.title", locale)}
        </div>
        <div className="mt-2 flex flex-col gap-1">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-2 text-[11px]"
            >
              <span className="font-semibold text-[#5a5f7a]">{row.label}</span>
              <span className="text-right font-bold text-[#1a1d2e]">
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-2 text-[11px] text-[#9ca3b8]">
          {getDirectoryListMessage("directoryList.card.availableActions", locale)}
        </div>
      </div>
    </div>
  );
}

function ProgressKpi({
  locale,
}: {
  readonly locale: LocaleCode;
}) {
  const pct = 76;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[#7c8099]">
          POINTS
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8b5cf618]">
          <Target size={14} className="text-[#8b5cf6]" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r={r} fill="none" stroke="#f0f2f7" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="6"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            transform="rotate(-90 32 32)"
          />
          <text
            x="32"
            y="36"
            textAnchor="middle"
            fontSize="13"
            fontWeight="700"
            fill="#1a1d2e"
          >
            {pct}%
          </text>
        </svg>

        <div>
          <div className="text-[22px] font-bold leading-none text-[#1a1d2e]">
            {pct}%
          </div>
          <div className="mt-1 text-[11px] text-[#9ca3b8]">
            {getDirectoryListMessage(
              "directoryList.action.canRegisterPurchase",
              locale,
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-1">
            <TrendingUp size={11} className="text-[#22c55e]" />
            <span className="text-[11px] font-medium text-[#22c55e]">
              +4% this week
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsCard({
  title,
  detailsLabel,
  detailsHref,
  children,
}: {
  readonly title: string;
  readonly detailsLabel: string;
  readonly detailsHref?: string;
  readonly children: ReactNode;
}) {
  const detailsNode = (
    <span className="text-[11px] text-[#3b6ef8] hover:underline">
      {detailsLabel}
    </span>
  );

  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="min-w-0 line-clamp-1 pr-2 text-[13px] font-semibold text-[#1a1d2e]">{title}</h3>
        {detailsHref ? (
          <Link href={detailsHref}>{detailsNode}</Link>
        ) : (
          <button type="button" className="text-[11px] text-[#3b6ef8] hover:underline">
            {detailsLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function DirectionCard({
  label,
  pct,
  color,
  sub,
  trend,
}: {
  readonly label: string;
  readonly pct: number;
  readonly color: string;
  readonly sub: string;
  readonly trend: string;
}) {
  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-[#1a1d2e]">{label}</span>
        <span className="text-[13px] font-bold" style={{ color }}>
          {pct}%
        </span>
      </div>

      <div className="mb-2 h-1.5 w-full rounded-full bg-[#f0f2f7]">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#9ca3b8]">{sub}</span>
        <div className="flex items-center gap-0.5">
          <TrendingUp size={10} className="text-[#22c55e]" />
          <span className="text-[10px] font-medium text-[#22c55e]">{trend}</span>
        </div>
      </div>
    </div>
  );
}

function EmptyBusinessSlot() {
  return <div className="h-[140px]" />;
}

function BusinessPreview({
  organization,
  locale,
}: {
  readonly organization: DirectoryOrganization;
  readonly locale: LocaleCode;
}) {
  const stats = getActionStats(organization);

  return (
    <div className="flex min-h-[140px] items-center gap-3 sm:h-[140px] sm:gap-4">
      <div className="flex h-[92px] w-[92px] sm:h-[110px] sm:w-[110px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#eef2ff] text-[26px] font-bold text-[#3b6ef8]">
        {organization.logoUrl || organization.coverImageUrl ? (
          <img
            src={organization.logoUrl ?? organization.coverImageUrl ?? ""}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          organization.name.slice(0, 2).toUpperCase()
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-[13px] leading-5 text-[#5a5f7a]">
          {organization.shortDescription ??
            organization.description ??
            getDirectoryListMessage("directoryList.card.descriptionMissing", locale)}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-lg bg-[#eef2ff] px-2.5 py-1 text-[11px] font-semibold text-[#3b6ef8]">
            {organization.primaryCategory?.name ??
              getDirectoryListMessage("directoryList.card.categoryMissing", locale)}
          </span>
          <span className="rounded-lg bg-[#f5f6fb] px-2.5 py-1 text-[11px] font-semibold text-[#5a5f7a]">
            {getLocationLabel(organization.primaryLocation, locale)}
          </span>
        </div>

        <div className="mt-3 grid min-w-0 grid-cols-3 gap-2 text-center">
          <div className="min-w-0 rounded-lg bg-[#f8fafc] px-2 py-1.5">
            <div className="text-[12px] font-bold text-[#1a1d2e]">
              {stats.activeOffersCount}
            </div>
            <div className="text-[10px] text-[#9ca3b8]">
              {getDirectoryListMessage("directoryList.action.hasOffers", locale)}
            </div>
          </div>
          <div className="min-w-0 rounded-lg bg-[#f8fafc] px-2 py-1.5">
            <div className="text-[12px] font-bold text-[#1a1d2e]">
              {stats.activeCertificatesCount}
            </div>
            <div className="text-[10px] text-[#9ca3b8]">
              {getDirectoryListMessage("directoryList.action.hasCertificates", locale)}
            </div>
          </div>
          <div className="min-w-0 rounded-lg bg-[#f8fafc] px-2 py-1.5">
            <div className="text-[12px] font-bold text-[#1a1d2e]">
              {stats.canRegisterPurchase ? "1" : "0"}
            </div>
            <div className="text-[10px] text-[#9ca3b8]">POINTS</div>
          </div>
        </div>
      </div>
    </div>
  );
}

async function loadDirectoryOrganizations(
  locale: LocaleCode,
  scope: DirectoryScope,
) {
  const searchParams = new URLSearchParams();

  if (locale) {
    searchParams.set("locale", locale);
  }

  if (scope === "mine") {
    searchParams.set("scope", "mine");
  }

  searchParams.set("limit", "100");

  const response = await fetch(`/api/directory/organizations?${searchParams.toString()}`, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const data = (await response.json()) as DirectoryApiResponse;

  if (!response.ok || !data.ok) {
    throw new Error(data.error ?? "Cannot load directory organizations");
  }

  return data.organizations ?? [];
}

export function DirectoryDashboardContent({
  initialLocale,
  initialScope = "all",
}: {
  readonly initialLocale: LocaleCode;
  readonly initialScope?: DirectoryScope;
}) {
  const locale = initialLocale;
  const scope = initialScope;
  const [activeFilter, setActiveFilter] = useState<DirectoryFilterKey>("all");
  const [visibleCount, setVisibleCount] = useState(4);
  const [organizations, setOrganizations] = useState<DirectoryOrganization[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [isCreatingBusiness, setIsCreatingBusiness] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setStatus("loading");
        setErrorMessage("");

        const loadedOrganizations = await loadDirectoryOrganizations(
          locale,
          scope,
        );

        if (!isMounted) {
          return;
        }

        setOrganizations(loadedOrganizations);
        setStatus("ready");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setOrganizations([]);
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Cannot load directory organizations",
        );
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [locale, scope]);

  async function createBusinessDraftAndOpenEditor() {
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
        credentials: "same-origin",
        body: JSON.stringify({
          organizationType: "private_business",
          locale,
        }),
      });

      const data = (await response.json()) as OrganizationDraftCreateResponse;

      if (!response.ok || !data.ok || !data.organization?.id) {
        throw new Error(data.error ?? "Cannot create business draft");
      }

      const searchParams = new URLSearchParams();

      if (locale) {
        searchParams.set("locale", locale);
      }

      const queryString = searchParams.toString();
      const suffix = queryString ? `?${queryString}` : "";

      window.location.href = `/organizations/${encodeURIComponent(
        data.organization.id,
      )}/edit${suffix}`;
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Cannot create business draft";

      window.alert(message);
      setIsCreatingBusiness(false);
    }
  }

  function handleCreateBusinessDraftClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    void createBusinessDraftAndOpenEditor();
  }

  const filteredOrganizations = useMemo(() => {
    if (activeFilter === "all" || activeFilter === "newest") {
      return organizations;
    }

    return organizations.filter((organization) => {
      const stats = getActionStats(organization);

      if (activeFilter === "hasOffers") {
        return stats.hasActiveOffers || stats.activeOffersCount > 0;
      }

      if (activeFilter === "hasCertificates") {
        return stats.hasActiveCertificates || stats.activeCertificatesCount > 0;
      }

      if (activeFilter === "canRegisterPurchase") {
        return stats.canRegisterPurchase;
      }

      return true;
    });
  }, [activeFilter, organizations]);

  useEffect(() => {
    setVisibleCount(4);
  }, [activeFilter, organizations.length]);

  const totalOffers = organizations.reduce(
    (sum, organization) => sum + getActionStats(organization).activeOffersCount,
    0,
  );
  const totalCertificates = organizations.reduce(
    (sum, organization) =>
      sum + getActionStats(organization).activeCertificatesCount,
    0,
  );
  const pointsBusinesses = organizations.filter(
    (organization) => getActionStats(organization).canRegisterPurchase,
  ).length;

  const displayedOrganizations = filteredOrganizations.slice(0, visibleCount);
  const shownOrganizationsCount = displayedOrganizations.length;
  const hasMoreOrganizations = visibleCount < filteredOrganizations.length;
  const nextOrganizationsCount = Math.min(
    4,
    Math.max(0, filteredOrganizations.length - visibleCount),
  );

  return (
    <div className="p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[20px] font-bold leading-tight text-[#1a1d2e]">
            {scope === "mine"
              ? getNavigationMessage("navigation.myBusinesses", locale)
              : getDirectoryListMessage("directoryList.header.title", locale)}
          </h1>
          <p className="mt-0.5 text-[13px] text-[#7c8099]">
            {scope === "mine"
              ? getOrganizationsMessage("organizations.list.description", locale)
              : getDirectoryListMessage("directoryList.header.subtitle", locale)}
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateBusinessDraftClick}
          disabled={isCreatingBusiness}
          className={`flex w-fit items-center gap-1 rounded-lg border border-[#22c55e]/30 bg-[#ecfdf3] px-3 py-1.5 text-[12px] font-medium text-[#16a34a] transition-all hover:bg-[#dcfce7] ${
            isCreatingBusiness ? "cursor-wait opacity-60" : ""
          }`}
        >
          <Plus size={12} />
          {isCreatingBusiness
            ? getDirectoryCreatingBusinessLabel(locale)
            : getDirectoryAddBusinessLabel(locale)}
        </button>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={getDirectoryListMessage("directoryList.stats.found", locale)}
          value={status === "loading" ? "..." : String(organizations.length)}
          sub={getDirectoryListMessage("directoryList.published.title", locale)}
          accent="#3b6ef8"
          icon={Star}
          trend={getDirectoryListMessage("directoryList.card.openCard", locale)}
          valueHref="/directory"
          trendHref="/directory"
        />
        <DirectoryPackageKpi
          offersCount={totalOffers}
          certificatesCount={totalCertificates}
          pointsBusinessesCount={pointsBusinesses}
          locale={locale}
        />
        <KpiCard
          label={getDirectoryListMessage("directoryList.card.verification", locale)}
          value="Free"
          sub={getDirectoryListMessage("directoryList.published.title", locale)}
          accent="#22c55e"
          icon={Activity}
        />
        <ProgressKpi locale={locale} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTER_KEYS.map((filterKey) => (
          <button
            key={filterKey}
            type="button"
            onClick={() => setActiveFilter(filterKey)}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all ${
              activeFilter === filterKey
                ? "bg-[#3b6ef8] text-white shadow-sm"
                : "border border-[rgba(0,0,0,0.08)] bg-white text-[#5a5f7a] hover:bg-[#f5f6fb]"
            }`}
          >
            {getFilterLabel(filterKey, locale)}
          </button>
        ))}

        <button
          type="button"
          className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-1.5 text-[12px] font-medium text-[#5a5f7a] transition-all hover:bg-[#f5f6fb]"
        >
          {getDirectoryListMessage("directoryList.filters.title", locale)}
        </button>

        <button
          type="button"
          className="ml-auto flex items-center gap-1 rounded-lg border border-[#f97316]/30 bg-[#fff7ed] px-3 py-1.5 text-[12px] font-medium text-[#ea580c] transition-all hover:bg-[#ffedd5]"
        >
          <Plus size={12} />
          {getDirectoryFindProviderLabel(locale)}
        </button>
      </div>

      {status === "error" ? (
        <section className="mb-3 rounded-xl border border-[rgba(239,68,68,0.2)] bg-white p-4 text-[13px] text-[#b91c1c] shadow-sm">
          {errorMessage}
        </section>
      ) : null}

      {filteredOrganizations.length === 0 ? (
        <div className="mb-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
          <AnalyticsCard
            title={getDirectoryListMessage("directoryList.published.noResults", locale)}
            detailsLabel="\u00a0"
          >
            <EmptyBusinessSlot />
          </AnalyticsCard>
        </div>
      ) : (
        <div className="mb-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
          {displayedOrganizations.map((organization) => (
            <AnalyticsCard
              key={organization.id}
              title={organization.name}
              detailsLabel={getDirectoryListMessage(
                "directoryList.card.openCard",
                locale,
              )}
              detailsHref={buildDirectoryProfileHref(
                organization,
                locale,
                scope,
              )}
            >
              <BusinessPreview organization={organization} locale={locale} />
            </AnalyticsCard>
          ))}
        </div>
      )}

      {filteredOrganizations.length > 0 ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
          <span className="text-[12px] text-[#7c8099]">
            {getShownOfLabel(
              locale,
              shownOrganizationsCount,
              filteredOrganizations.length,
            )}
          </span>

          {hasMoreOrganizations ? (
            <button
              type="button"
              onClick={() =>
                setVisibleCount((currentVisibleCount) =>
                  Math.min(
                    currentVisibleCount + 4,
                    filteredOrganizations.length,
                  ),
                )
              }
              className="rounded-lg border border-[#3b6ef8]/30 bg-white px-3 py-1.5 text-[12px] font-medium text-[#3b6ef8] transition-all hover:bg-[#eef2ff]"
            >
              {getShowMoreLabel(locale, nextOrganizationsCount)}
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="mb-2">
        <h2 className="mb-3 text-[13px] font-semibold text-[#1a1d2e]">
          {getDirectoryListMessage("directoryList.filters.title", locale)}
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DirectionCard
            label={getDirectoryListMessage("directoryList.action.hasOffers", locale)}
            pct={78}
            color="#3b6ef8"
            sub={`${totalOffers} ${getDirectoryListMessage(
              "directoryList.action.hasOffers",
              locale,
            )}`}
            trend="+3%"
          />
          <DirectionCard
            label={getDirectoryListMessage("directoryList.action.hasCertificates", locale)}
            pct={72}
            color="#f97316"
            sub={`${totalCertificates} ${getDirectoryListMessage(
              "directoryList.action.hasCertificates",
              locale,
            )}`}
            trend="+1.5%"
          />
          <DirectionCard
            label="POINTS"
            pct={75}
            color="#22c55e"
            sub={`${pointsBusinesses} POINTS`}
            trend="+5%"
          />
          <DirectionCard
            label={getDirectoryListMessage("directoryList.sort.newest", locale)}
            pct={79}
            color="#8b5cf6"
            sub={`${organizations.length} ${getDirectoryListMessage(
              "directoryList.published.title",
              locale,
            )}`}
            trend="+2%"
          />
        </div>
      </div>
    </div>
  );
}
