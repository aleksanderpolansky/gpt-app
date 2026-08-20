"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import {
  Award,
  CircleHelp,
  Plus,
  Star,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getDashboardMessage,
  getLocaleSearchParam,
  type DashboardMessageKey,
  type LocaleCode,
} from "@/i18n";

import type { DashboardAnalyticsBlock } from "@/lib/dashboard/analytics-contract";
import { useUserSessionClient } from "../auth/user-session-client";
import { DashboardAnalyticsWorkspace } from "./dashboard-analytics-builder";

type IconComponent = ElementType;

type DashboardTranslate = (
  key: DashboardMessageKey,
  params?: Record<string, string | number | boolean | null | undefined>,
) => string;

type DayKey =
  | "dashboard.day.monShort"
  | "dashboard.day.tueShort"
  | "dashboard.day.wedShort"
  | "dashboard.day.thuShort"
  | "dashboard.day.friShort"
  | "dashboard.day.satShort"
  | "dashboard.day.sunShort";

const efficiencyData = [
  { dayKey: "dashboard.day.monShort" as DayKey, value: 68, prev: 58 },
  { dayKey: "dashboard.day.tueShort" as DayKey, value: 75, prev: 62 },
  { dayKey: "dashboard.day.wedShort" as DayKey, value: 72, prev: 70 },
  { dayKey: "dashboard.day.thuShort" as DayKey, value: 82, prev: 65 },
  { dayKey: "dashboard.day.friShort" as DayKey, value: 78, prev: 74 },
  { dayKey: "dashboard.day.satShort" as DayKey, value: 85, prev: 60 },
  { dayKey: "dashboard.day.sunShort" as DayKey, value: 80, prev: 72 },
];

const habitsData = [
  { dayKey: "dashboard.day.monShort" as DayKey, done: 5, total: 7 },
  { dayKey: "dashboard.day.tueShort" as DayKey, done: 6, total: 7 },
  { dayKey: "dashboard.day.wedShort" as DayKey, done: 4, total: 7 },
  { dayKey: "dashboard.day.thuShort" as DayKey, done: 7, total: 7 },
  { dayKey: "dashboard.day.friShort" as DayKey, done: 6, total: 7 },
  { dayKey: "dashboard.day.satShort" as DayKey, done: 5, total: 7 },
  { dayKey: "dashboard.day.sunShort" as DayKey, done: 3, total: 7 },
];

const focusData = [
  { nameKey: "dashboard.focus.work" as DashboardMessageKey, value: 38, color: "#3b6ef8" },
  { nameKey: "dashboard.focus.health" as DashboardMessageKey, value: 22, color: "#22c55e" },
  { nameKey: "dashboard.focus.personal" as DashboardMessageKey, value: 18, color: "#8b5cf6" },
  { nameKey: "dashboard.focus.learning" as DashboardMessageKey, value: 14, color: "#f97316" },
  { nameKey: "dashboard.focus.rest" as DashboardMessageKey, value: 8, color: "#06b6d4" },
];

const radarData = [
  { directionKey: "dashboard.direction.time" as DashboardMessageKey, value: 78, fullMark: 100 },
  { directionKey: "dashboard.direction.money" as DashboardMessageKey, value: 72, fullMark: 100 },
  { directionKey: "dashboard.direction.health" as DashboardMessageKey, value: 75, fullMark: 100 },
  { directionKey: "dashboard.direction.personal" as DashboardMessageKey, value: 79, fullMark: 100 },
  { directionKey: "dashboard.direction.career" as DashboardMessageKey, value: 68, fullMark: 100 },
];

const FILTER_KEYS = [
  "dashboard.filter.all",
  "dashboard.filter.efficiency",
  "dashboard.filter.progress",
  "dashboard.filter.habits",
  "dashboard.filter.finances",
] as const;

type FilterKey = (typeof FILTER_KEYS)[number];

const NUMBER_LOCALE_MAP: Record<LocaleCode, string> = {
  ru: "ru-RU",
  pl: "pl-PL",
  en: "en-US",
  es: "es-ES",
  uk: "uk-UA",
  de: "de-DE",
  cs: "cs-CZ",
};

type PointsWalletResponse = {
  readonly ok?: boolean;
  readonly wallet?: {
    readonly balance?: number | string | null;
    readonly status?: string | null;
  } | null;
  readonly error?: string;
};

type ReputationSummaryResponse = {
  readonly ok?: boolean;
  readonly summary?: {
    readonly totalReputation?: number | string | null;
    readonly accountCount?: number | string | null;
    readonly ledgerEntryCount?: number | string | null;
  } | null;
  readonly error?: string;
};

type AiTokenProjection = {
  readonly tierCode?: string | null;
  readonly displayName?: string | null;
  readonly pricingStatus?: "ready" | "missing_active_price_snapshot" | string;
  readonly approximateInputTokensForBalance?: number | null;
  readonly approximateOutputTokensForBalance?: number | null;
  readonly sourceNote?: string | null;
};

type AiTokenAvailabilityResponse = {
  readonly ok?: boolean;
  readonly projections?: readonly AiTokenProjection[];
  readonly error?: string;
  readonly errorMessage?: string;
};

function useInterfaceLocale(initialLocale: LocaleCode): LocaleCode {
  const [locale, setLocale] = useState<LocaleCode>(initialLocale);

  useEffect(() => {
    function readLocaleFromUrl() {
      if (typeof window === "undefined") {
        return;
      }

      setLocale(getLocaleSearchParam(new URLSearchParams(window.location.search)));
    }

    window.addEventListener("popstate", readLocaleFromUrl);

    return () => {
      window.removeEventListener("popstate", readLocaleFromUrl);
    };
  }, []);

  return locale;
}

function normalizePointsBalance(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}

function formatPointsBalance(value: number | null, locale: LocaleCode): string {
  if (value === null) {
    return "...";
  }

  return new Intl.NumberFormat(NUMBER_LOCALE_MAP[locale], {
    maximumFractionDigits: 0,
  }).format(value);
}

function normalizeTokenProjection(value: unknown): number | null {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.floor(parsed);
}

function formatTokenAmount(
  value: number | null,
  locale: LocaleCode,
  t: DashboardTranslate,
): string {
  if (value === null) {
    return t("dashboard.pendingPrices");
  }

  const formattedValue = new Intl.NumberFormat(NUMBER_LOCALE_MAP[locale], {
    maximumFractionDigits: 0,
  }).format(value);

  return t("dashboard.tokenAmount", { value: formattedValue });
}

function getProjectionTokens(projection: AiTokenProjection): number | null {
  return normalizeTokenProjection(
    projection.approximateOutputTokensForBalance ??
      projection.approximateInputTokensForBalance,
  );
}

function sortAiTokenProjections(
  projections: readonly AiTokenProjection[],
): AiTokenProjection[] {
  const order = ["nano", "standard", "pro"];

  return [...projections].sort((left, right) => {
    const leftIndex = order.indexOf(String(left.tierCode ?? "").toLowerCase());
    const rightIndex = order.indexOf(String(right.tierCode ?? "").toLowerCase());

    return (
      (leftIndex === -1 ? 99 : leftIndex) -
      (rightIndex === -1 ? 99 : rightIndex)
    );
  });
}

function getTierDisplayName(
  projection: AiTokenProjection,
  t: DashboardTranslate,
): string {
  const tierCode = String(projection.tierCode ?? "").toLowerCase();

  if (tierCode === "nano") {
    return "Nano";
  }

  if (tierCode === "standard") {
    return "Standard";
  }

  if (tierCode === "pro") {
    return "Pro";
  }

  return projection.displayName ?? tierCode ?? t("dashboard.model");
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
  helpText,
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
  readonly helpText?: string;
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
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-[#7c8099]">
            {label}
          </span>
          {helpText ? (
            <details className="group relative">
              <summary
                aria-label={helpText}
                className="cursor-pointer list-none rounded-full text-[#9ca3b8] transition hover:text-[#3b6ef8] focus:outline-none focus:ring-2 focus:ring-[#3b6ef8]/30"
              >
                <CircleHelp size={13} />
              </summary>
              <div
                role="note"
                className="absolute left-0 top-5 z-30 w-72 rounded-xl border border-[#dfe3f1] bg-white p-3 text-[11px] font-normal normal-case leading-5 tracking-normal text-[#5a5f7a] shadow-lg sm:left-auto sm:right-0"
              >
                {helpText}
              </div>
            </details>
          ) : null}
        </div>
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

function AiTokenProjectionsKpi({
  projections,
  status,
  errorMessage,
  locale,
  t,
}: {
  readonly projections: readonly AiTokenProjection[];
  readonly status: "loading" | "ready" | "error" | "not_configured";
  readonly errorMessage: string;
  readonly locale: LocaleCode;
  readonly t: DashboardTranslate;
}) {
  const sortedRows = sortAiTokenProjections(projections).filter(
    (projection) =>
      ["nano", "standard", "pro"].includes(
        String(projection.tierCode ?? "").toLowerCase(),
      ),
  );

  const visibleRows =
    sortedRows.length > 0
      ? sortedRows
      : [
          { tierCode: "nano" },
          { tierCode: "standard" },
          { tierCode: "pro" },
        ];

  const subtitle =
    status === "loading"
      ? t("dashboard.loadingLimits")
      : status === "error"
        ? t("dashboard.limitsUnavailable")
        : status === "not_configured"
          ? t("dashboard.modelPricesNotConfigured")
          : t("dashboard.tokenBalanceBasis");

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[#7c8099]">
          {t("dashboard.tokensLabel")}
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f9731618]">
          <Zap size={14} className="text-[#f97316]" />
        </div>
      </div>

      <div>
        <div className="text-[13px] font-semibold text-[#1a1d2e]">
          {t("dashboard.availableApprox")}
        </div>
        <div className="mt-2 flex flex-col gap-1">
          {visibleRows.map((projection) => {
            const tokens = getProjectionTokens(projection);

            return (
              <div
                key={String(projection.tierCode ?? projection.displayName)}
                className="flex items-center justify-between gap-2 text-[11px]"
              >
                <span className="font-semibold text-[#5a5f7a]">
                  {getTierDisplayName(projection, t)}
                </span>
                <span className="text-right font-bold text-[#1a1d2e]">
                  {formatTokenAmount(tokens, locale, t)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-2 text-[11px] text-[#9ca3b8]">{subtitle}</div>

        {errorMessage ? (
          <div className="mt-1 text-[10px] text-[#ef4444]">{errorMessage}</div>
        ) : null}
      </div>
    </div>
  );
}

function ProgressKpi({ t }: { readonly t: DashboardTranslate }) {
  const pct = 76;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[#7c8099]">
          {t("dashboard.progressOverall")}
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8b5cf618]">
          <Target size={14} className="text-[#8b5cf6]" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          aria-label={t("dashboard.progressAria", { value: pct })}
        >
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
          <div className="mt-1 text-[11px] text-[#9ca3b8]">{t("dashboard.allGoals")}</div>
          <div className="mt-1.5 flex items-center gap-1">
            <TrendingUp size={11} className="text-[#22c55e]" />
            <span className="text-[11px] font-medium text-[#22c55e]">
              {t("dashboard.weeklyGrowth")}
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
  children,
}: {
  readonly title: string;
  readonly detailsLabel: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-[#1a1d2e]">{title}</h3>
        <button type="button" className="text-[11px] text-[#3b6ef8] hover:underline">
          {detailsLabel}
        </button>
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
      <div className="mb-3 flex items-center justify-between">
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

export function FigmaDashboardContent({
  initialLocale,
  initialAnalyticsBlocks,
}: {
  readonly initialLocale: LocaleCode;
  readonly initialAnalyticsBlocks: readonly DashboardAnalyticsBlock[] | null;
}) {
  const locale = useInterfaceLocale(initialLocale);
  const t = useMemo<DashboardTranslate>(
    () => (key, params) => getDashboardMessage(key, locale, params),
    [locale],
  );

  const [activeFilter, setActiveFilter] = useState<FilterKey>("dashboard.filter.all");
  const [pointsBalance, setPointsBalance] = useState<number | null>(null);
  const [pointsWalletStatus, setPointsWalletStatus] = useState("loading");
  const [pointsWalletError, setPointsWalletError] = useState("");
  const [reputationBalance, setReputationBalance] = useState<number | null>(null);
  const [reputationStatus, setReputationStatus] = useState("loading");
  const [reputationError, setReputationError] = useState("");
  const [aiTokenProjections, setAiTokenProjections] = useState<
    AiTokenProjection[]
  >([]);
  const [aiTokenStatus, setAiTokenStatus] = useState<
    "loading" | "ready" | "error" | "not_configured"
  >("loading");
  const [aiTokenError, setAiTokenError] = useState("");
  const { displayName, isAuthenticated } = useUserSessionClient();
  const greetingName = isAuthenticated ? displayName : t("dashboard.guest");

  const localizedEfficiencyData = useMemo(
    () =>
      efficiencyData.map((item) => ({
        ...item,
        day: t(item.dayKey),
      })),
    [t],
  );

  const localizedHabitsData = useMemo(
    () =>
      habitsData.map((item) => ({
        ...item,
        day: t(item.dayKey),
      })),
    [t],
  );

  const localizedFocusData = useMemo(
    () =>
      focusData.map((item) => ({
        ...item,
        name: t(item.nameKey),
      })),
    [t],
  );

  const localizedRadarData = useMemo(
    () =>
      radarData.map((item) => ({
        ...item,
        direction: t(item.directionKey),
      })),
    [t],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadPointsWallet() {
      try {
        setPointsWalletError("");
        setPointsWalletStatus("loading");

        const response = await fetch("/api/points/wallet", {
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        });

        const data = (await response.json()) as PointsWalletResponse;

        if (!response.ok || !data.ok) {
          throw new Error(data.error ?? t("dashboard.pointsBalanceLoadError"));
        }

        if (!isMounted) {
          return;
        }

        setPointsBalance(normalizePointsBalance(data.wallet?.balance));
        setPointsWalletStatus(data.wallet?.status ?? "active");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPointsBalance(0);
        setPointsWalletStatus("error");
        setPointsWalletError(
          error instanceof Error ? error.message : t("dashboard.pointsBalanceUnavailable"),
        );
      }
    }

    async function loadReputationSummary() {
      try {
        setReputationError("");
        setReputationStatus("loading");

        const response = await fetch("/api/reputation/summary", {
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        });

        const data = (await response.json()) as ReputationSummaryResponse;

        if (!response.ok || !data.ok) {
          throw new Error(data.error ?? t("dashboard.reputationLoadError"));
        }

        if (!isMounted) {
          return;
        }

        setReputationBalance(
          normalizePointsBalance(data.summary?.totalReputation),
        );
        setReputationStatus("ready");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setReputationBalance(0);
        setReputationStatus("error");
        setReputationError(
          error instanceof Error
            ? error.message
            : t("dashboard.reputationUnavailable"),
        );
      }
    }

    async function loadAiTokenProjections() {
      try {
        setAiTokenError("");
        setAiTokenStatus("loading");

        const response = await fetch("/api/ai-billing/balance", {
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        });

        const data = (await response.json()) as AiTokenAvailabilityResponse;

        if (!response.ok || !data.ok) {
          throw new Error(
            data.errorMessage ??
              data.error ??
              t("dashboard.limitsUnavailable"),
          );
        }

        if (!isMounted) {
          return;
        }

        const projections = data.projections ? [...data.projections] : [];
        setAiTokenProjections(projections);
        setAiTokenStatus(
          projections.some(
            (projection) => projection.pricingStatus === "ready",
          )
            ? "ready"
            : "not_configured",
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setAiTokenProjections([]);
        setAiTokenStatus("error");
        setAiTokenError(
          error instanceof Error ? error.message : t("dashboard.limitsUnavailable"),
        );
      }
    }

    void loadPointsWallet();
    void loadReputationSummary();
    void loadAiTokenProjections();

    return () => {
      isMounted = false;
    };
  }, [t]);

  const pointsValue = formatPointsBalance(pointsBalance, locale);
  const pointsSub = pointsWalletError
    ? t("dashboard.pointsBalanceUnavailable")
    : pointsWalletStatus === "loading"
      ? t("dashboard.loadingBalance")
      : pointsWalletStatus === "not_created"
        ? t("dashboard.walletNotCreated")
        : t("dashboard.currentBalance");
  const pointsTrend = pointsWalletError
    ? t("dashboard.openHistory")
    : t("dashboard.pointsHistory");
  const reputationValue = formatPointsBalance(reputationBalance, locale);
  const reputationSub = reputationError
    ? t("dashboard.reputationUnavailable")
    : reputationStatus === "loading"
      ? t("dashboard.reputationLoading")
      : t("dashboard.reputationCurrent");
  const reputationTrend = reputationError
    ? t("dashboard.openHistory")
    : t("dashboard.reputationHistory");

  return (
    <div className="p-5">
      <div className="mb-5">
        <h1 className="text-[20px] font-bold leading-tight text-[#1a1d2e]">
          {t("dashboard.greetingMorning", { name: greetingName })}
        </h1>
        <p className="mt-0.5 text-[13px] text-[#7c8099]">
          {t("dashboard.greetingSub")}
        </p>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={t("dashboard.points")}
          value={pointsValue}
          sub={pointsSub}
          accent="#3b6ef8"
          icon={Star}
          trend={pointsTrend}
          valueHref={`/points/transactions?locale=${locale}`}
          trendHref={`/points/transactions?locale=${locale}`}
          historyTitle={t("dashboard.pointsHistoryTitle")}
        />
        <KpiCard
          label={t("dashboard.reputation")}
          value={reputationValue}
          sub={reputationSub}
          accent="#22c55e"
          icon={Award}
          trend={reputationTrend}
          valueHref={`/reputation?locale=${locale}`}
          trendHref={`/reputation?locale=${locale}`}
          historyTitle={t("dashboard.reputationHistoryTitle")}
          helpText={t("dashboard.reputationHelp")}
        />
        <AiTokenProjectionsKpi
          projections={aiTokenProjections}
          status={aiTokenStatus}
          errorMessage={aiTokenError}
          locale={locale}
          t={t}
        />
        <ProgressKpi t={t} />
      </div>

      <DashboardAnalyticsWorkspace
        locale={locale}
        initialBlocks={initialAnalyticsBlocks}
      />

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
            {t(filterKey)}
          </button>
        ))}

        <button
          type="button"
          className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-1.5 text-[12px] font-medium text-[#5a5f7a] transition-all hover:bg-[#f5f6fb]"
        >
          {t("dashboard.moreFilters")}
        </button>

        <button
          type="button"
          className="ml-auto flex items-center gap-1 rounded-lg border border-[#3b6ef8]/30 bg-white px-3 py-1.5 text-[12px] font-medium text-[#3b6ef8] transition-all hover:bg-[#eef2ff]"
        >
          <Plus size={12} />
          {t("dashboard.addAnalyticsBlock")}
        </button>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <AnalyticsCard
          title={t("dashboard.efficiencyDynamics")}
          detailsLabel={t("dashboard.details")}
        >
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={localizedEfficiencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: "#9ca3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9ca3b8" }}
                axisLine={false}
                tickLine={false}
                domain={[40, 100]}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 8,
                  border: "1px solid #f0f2f7",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b6ef8"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#3b6ef8" }}
                name={t("dashboard.current")}
              />
              <Line
                type="monotone"
                dataKey="prev"
                stroke="#e5e7ef"
                strokeWidth={2}
                dot={false}
                name={t("dashboard.previous")}
              />
            </LineChart>
          </ResponsiveContainer>
        </AnalyticsCard>

        <AnalyticsCard
          title={t("dashboard.habitsByDay")}
          detailsLabel={t("dashboard.details")}
        >
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={localizedHabitsData} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: "#9ca3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9ca3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 8,
                  border: "1px solid #f0f2f7",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              />
              <Bar dataKey="total" fill="#f0f2f7" radius={[4, 4, 0, 0]} name={t("dashboard.total")} />
              <Bar dataKey="done" fill="#22c55e" radius={[4, 4, 0, 0]} name={t("dashboard.done")} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsCard>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <AnalyticsCard
          title={t("dashboard.focusDistribution")}
          detailsLabel={t("dashboard.details")}
        >
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={130} height={130}>
              <PieChart>
                <Pie
                  data={localizedFocusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={58}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {localizedFocusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 8,
                    border: "1px solid #f0f2f7",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="flex flex-1 flex-col gap-1.5">
              {localizedFocusData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[11px] text-[#5a5f7a]">{item.name}</span>
                  <span className="ml-auto text-[11px] font-semibold text-[#1a1d2e]">
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </AnalyticsCard>

        <AnalyticsCard
          title={t("dashboard.efficiencyByDirection")}
          detailsLabel={t("dashboard.details")}
        >
          <ResponsiveContainer width="100%" height={130}>
            <RadarChart data={localizedRadarData}>
              <PolarGrid stroke="#f0f2f7" />
              <PolarAngleAxis
                dataKey="direction"
                tick={{ fontSize: 10, fill: "#9ca3b8" }}
              />
              <Radar
                dataKey="value"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </AnalyticsCard>
      </div>

      <div className="mb-2">
        <h2 className="mb-3 text-[13px] font-semibold text-[#1a1d2e]">
          {t("dashboard.directions")}
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DirectionCard
            label={t("dashboard.direction.time")}
            pct={78}
            color="#3b6ef8"
            sub={t("dashboard.directionTimeSub")}
            trend="+3%"
          />
          <DirectionCard
            label={t("dashboard.direction.money")}
            pct={72}
            color="#f97316"
            sub={t("dashboard.directionMoneySub")}
            trend="+1.5%"
          />
          <DirectionCard
            label={t("dashboard.direction.health")}
            pct={75}
            color="#22c55e"
            sub={t("dashboard.directionHealthSub")}
            trend="+5%"
          />
          <DirectionCard
            label={t("dashboard.direction.personal")}
            pct={79}
            color="#8b5cf6"
            sub={t("dashboard.directionPersonalSub")}
            trend="+2%"
          />
        </div>
      </div>
    </div>
  );
}
