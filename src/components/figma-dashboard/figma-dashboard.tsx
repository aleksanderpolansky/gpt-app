"use client";

import { useState, type ElementType, type ReactNode } from "react";
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

function KpiCard({
  label,
  value,
  sub,
  accent,
  icon: Icon,
  trend,
}: {
  readonly label: string;
  readonly value: string;
  readonly sub?: string;
  readonly accent: string;
  readonly icon: IconComponent;
  readonly trend?: string;
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
        <div className="text-[22px] font-bold leading-none text-[#1a1d2e]">
          {value}
        </div>
        {sub ? <div className="mt-1 text-[11px] text-[#9ca3b8]">{sub}</div> : null}
        {trend ? (
          <div className="mt-1.5 flex items-center gap-1">
            <TrendingUp size={11} className="text-[#22c55e]" />
            <span className="text-[11px] font-medium text-[#22c55e]">
              {trend}
            </span>
          </div>
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
  const { displayName, isAuthenticated } = useUserSessionClient();
  const greetingName = isAuthenticated ? displayName : "гость";

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
          label="Бонусные баллы"
          value="12 450"
          sub="+340 за неделю"
          accent="#3b6ef8"
          icon={Star}
          trend="+2.8% к прошлой"
        />
        <KpiCard
          label="Токены"
          value="3 280"
          sub="186 использовано"
          accent="#f97316"
          icon={Zap}
          trend="+12 сегодня"
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

