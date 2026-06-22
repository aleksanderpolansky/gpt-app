"use client";

import Link from "next/link";
import { useEffect, useState, type ElementType, type ReactNode } from "react";
import {
  Activity,
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

import { useUserSessionClient } from "../auth/user-session-client";

type IconComponent = ElementType;

const efficiencyData = [
  { day: "Пн", value: 68, prev: 58 },
  { day: "Вт", value: 75, prev: 62 },
  { day: "Ср", value: 72, prev: 70 },
  { day: "Чт", value: 82, prev: 65 },
  { day: "Пт", value: 78, prev: 74 },
  { day: "Сб", value: 85, prev: 60 },
  { day: "Вс", value: 80, prev: 72 },
];

const habitsData = [
  { day: "Пн", done: 5, total: 7 },
  { day: "Вт", done: 6, total: 7 },
  { day: "Ср", done: 4, total: 7 },
  { day: "Чт", done: 7, total: 7 },
  { day: "Пт", done: 6, total: 7 },
  { day: "Сб", done: 5, total: 7 },
  { day: "Вс", done: 3, total: 7 },
];

const focusData = [
  { name: "Работа", value: 38, color: "#3b6ef8" },
  { name: "Здоровье", value: 22, color: "#22c55e" },
  { name: "Личное", value: 18, color: "#8b5cf6" },
  { name: "Обучение", value: 14, color: "#f97316" },
  { name: "Отдых", value: 8, color: "#06b6d4" },
];

const radarData = [
  { direction: "Время", value: 78, fullMark: 100 },
  { direction: "Деньги", value: 72, fullMark: 100 },
  { direction: "Здоровье", value: 75, fullMark: 100 },
  { direction: "Личное", value: 79, fullMark: 100 },
  { direction: "Карьера", value: 68, fullMark: 100 },
];

const FILTERS = [
  "Все направления",
  "Эффективность",
  "Прогресс",
  "Привычки",
  "Финансы",
];


type PointsWalletResponse = {
  readonly ok?: boolean;
  readonly wallet?: {
    readonly balance?: number | string | null;
    readonly status?: string | null;
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

function normalizePointsBalance(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}

function formatPointsBalance(value: number | null): string {
  if (value === null) {
    return "…";
  }

  return new Intl.NumberFormat("ru-RU", {
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

function formatTokenAmount(value: number | null): string {
  if (value === null) {
    return "ожидаем цены";
  }

  return (
    new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: 0,
    }).format(value) + " токенов"
  );
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

function getTierDisplayName(projection: AiTokenProjection): string {
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

  return projection.displayName ?? tierCode ?? "Модель";
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
}: {
  readonly label: string;
  readonly value: string;
  readonly sub?: string;
  readonly accent: string;
  readonly icon: IconComponent;
  readonly trend?: string;
  readonly valueHref?: string;
  readonly trendHref?: string;
}) {
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

      <div>
        {valueHref ? (
          <Link
            href={valueHref}
            className="block w-fit rounded-md text-[22px] font-bold leading-none text-[#1a1d2e] outline-none transition hover:text-[#3b6ef8] hover:underline focus:ring-4 focus:ring-[#3b6ef8]/15"
            title="Открыть историю начисления и списания пунктов"
          >
            {value}
          </Link>
        ) : (
          <div className="text-[22px] font-bold leading-none text-[#1a1d2e]">
            {value}
          </div>
        )}
        {sub ? <div className="mt-1 text-[11px] text-[#9ca3b8]">{sub}</div> : null}
        {trend ? (
          trendHref ? (
            <Link
              href={trendHref}
              className="mt-1.5 flex w-fit items-center gap-1 text-[#22c55e] underline-offset-2 transition hover:underline"
              title="Открыть историю начисления и списания пунктов"
            >
              <TrendingUp size={11} />
              <span className="text-[11px] font-medium">{trend}</span>
            </Link>
          ) : (
            <div className="mt-1.5 flex items-center gap-1">
              <TrendingUp size={11} className="text-[#22c55e]" />
              <span className="text-[11px] font-medium text-[#22c55e]">
                {trend}
              </span>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}


function AiTokenProjectionsKpi({
  projections,
  status,
  errorMessage,
}: {
  readonly projections: readonly AiTokenProjection[];
  readonly status: "loading" | "ready" | "error" | "not_configured";
  readonly errorMessage: string;
}) {
  const orderedProjections = sortAiTokenProjections(projections);
  const visibleRows =
    orderedProjections.length > 0
      ? orderedProjections
      : [
          { tierCode: "nano", displayName: "Nano" },
          { tierCode: "standard", displayName: "Standard" },
          { tierCode: "pro", displayName: "Pro" },
        ];

  const subtitle =
    status === "loading"
      ? "Загрузка лимитов"
      : status === "error"
        ? "Лимиты временно недоступны"
        : status === "not_configured"
          ? "Цены моделей ещё не заданы"
          : "по текущему пакету";

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[#7c8099]">
          AI-пакет
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f9731618]">
          <Zap size={14} className="text-[#f97316]" />
        </div>
      </div>

      <div>
        <div className="text-[13px] font-semibold text-[#1a1d2e]">
          Доступно примерно:
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
                  {getTierDisplayName(projection)}
                </span>
                <span className="text-right font-bold text-[#1a1d2e]">
                  {formatTokenAmount(tokens)}
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

function ProgressKpi() {
  const pct = 76;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[#7c8099]">
          Общий прогресс
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8b5cf618]">
          <Target size={14} className="text-[#8b5cf6]" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <svg width="64" height="64" viewBox="0 0 64 64" aria-label="Общий прогресс 76%">
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
          <div className="mt-1 text-[11px] text-[#9ca3b8]">По всем целям</div>
          <div className="mt-1.5 flex items-center gap-1">
            <TrendingUp size={11} className="text-[#22c55e]" />
            <span className="text-[11px] font-medium text-[#22c55e]">
              +4% за неделю
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsCard({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-[#1a1d2e]">{title}</h3>
        <button type="button" className="text-[11px] text-[#3b6ef8] hover:underline">
          Подробнее
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

export function FigmaDashboardContent() {
  const [activeFilter, setActiveFilter] = useState("Все направления");
  const [pointsBalance, setPointsBalance] = useState<number | null>(null);
  const [pointsWalletStatus, setPointsWalletStatus] = useState("loading");
  const [pointsWalletError, setPointsWalletError] = useState("");
  const [aiTokenProjections, setAiTokenProjections] = useState<
    AiTokenProjection[]
  >([]);
  const [aiTokenStatus, setAiTokenStatus] = useState<
    "loading" | "ready" | "error" | "not_configured"
  >("loading");
  const [aiTokenError, setAiTokenError] = useState("");
  const { displayName, isAuthenticated } = useUserSessionClient();
  const greetingName = isAuthenticated ? displayName : "гость";

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
          throw new Error(data.error ?? "Не удалось загрузить баланс пунктов.");
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
          error instanceof Error ? error.message : "Баланс пунктов недоступен.",
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
              "Не удалось загрузить AI-лимиты.",
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
          error instanceof Error ? error.message : "AI-лимиты недоступны.",
        );
      }
    }

    void loadPointsWallet();
    void loadAiTokenProjections();

    return () => {
      isMounted = false;
    };
  }, []);

  const pointsValue = formatPointsBalance(pointsBalance);
  const pointsSub = pointsWalletError
    ? "Баланс временно недоступен"
    : pointsWalletStatus === "loading"
      ? "Загрузка баланса"
      : pointsWalletStatus === "not_created"
        ? "Кошелёк ещё не создан"
        : "Текущий баланс";
  const pointsTrend = pointsWalletError
    ? "открыть историю"
    : "история начислений и списаний";

  return (
    <div className="p-5">
      <div className="mb-5">
        <h1 className="text-[20px] font-bold leading-tight text-[#1a1d2e]">
          Доброе утро, {greetingName}! 👋
        </h1>
        <p className="mt-0.5 text-[13px] text-[#7c8099]">
          Отличный день, чтобы стать ещё лучше.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Пункты"
          value={pointsValue}
          sub={pointsSub}
          accent="#3b6ef8"
          icon={Star}
          trend={pointsTrend}
          valueHref="/points/transactions"
          trendHref="/points/transactions"
        />
        <AiTokenProjectionsKpi
          projections={aiTokenProjections}
          status={aiTokenStatus}
          errorMessage={aiTokenError}
        />
        <KpiCard
          label="Подписка"
          value="Premium Pro"
          sub="Активна до 28.06.25"
          accent="#22c55e"
          icon={Activity}
        />
        <ProgressKpi />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all ${
              activeFilter === filter
                ? "bg-[#3b6ef8] text-white shadow-sm"
                : "border border-[rgba(0,0,0,0.08)] bg-white text-[#5a5f7a] hover:bg-[#f5f6fb]"
            }`}
          >
            {filter}
          </button>
        ))}

        <button
          type="button"
          className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-1.5 text-[12px] font-medium text-[#5a5f7a] transition-all hover:bg-[#f5f6fb]"
        >
          + Ещё фильтры
        </button>

        <button
          type="button"
          className="ml-auto flex items-center gap-1 rounded-lg border border-[#3b6ef8]/30 bg-white px-3 py-1.5 text-[12px] font-medium text-[#3b6ef8] transition-all hover:bg-[#eef2ff]"
        >
          <Plus size={12} />
          Добавить аналитический блок
        </button>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <AnalyticsCard title="Динамика эффективности">
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={efficiencyData}>
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
                name="Текущая"
              />
              <Line
                type="monotone"
                dataKey="prev"
                stroke="#e5e7ef"
                strokeWidth={2}
                dot={false}
                name="Прошлая"
              />
            </LineChart>
          </ResponsiveContainer>
        </AnalyticsCard>

        <AnalyticsCard title="Привычки по дням">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={habitsData} barSize={18}>
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
              <Bar dataKey="total" fill="#f0f2f7" radius={[4, 4, 0, 0]} name="Всего" />
              <Bar dataKey="done" fill="#22c55e" radius={[4, 4, 0, 0]} name="Выполнено" />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsCard>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <AnalyticsCard title="Распределение фокуса">
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={130} height={130}>
              <PieChart>
                <Pie
                  data={focusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={58}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {focusData.map((entry) => (
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
              {focusData.map((item) => (
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

        <AnalyticsCard title="Эффективность по направлениям">
          <ResponsiveContainer width="100%" height={130}>
            <RadarChart data={radarData}>
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
          Направления
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DirectionCard label="Время" pct={78} color="#3b6ef8" sub="32 из 40 задач" trend="+3%" />
          <DirectionCard label="Деньги" pct={72} color="#f97316" sub="18 из 25 целей" trend="+1.5%" />
          <DirectionCard label="Здоровье" pct={75} color="#22c55e" sub="6 из 8 привычек" trend="+5%" />
          <DirectionCard label="Личное" pct={79} color="#8b5cf6" sub="Высокий индекс" trend="+2%" />
        </div>
      </div>
    </div>
  );
}

