"use client";

import Link from "next/link";
import {
  Activity,
  Plus,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  UserRound,
  UsersRound,
} from "lucide-react";
import {
  type ElementType,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import { type LocaleCode } from "@/i18n";
import { getPersonalProfileMessages } from "@/i18n/messages/personal-profile";

export type PeopleDirectoryProfile = {
  id: string;
  public_slug: string;
  display_name: string;
  bio: string | null;
  image_url: string | null;
  category_label: string | null;
  profile_kind: "personal" | "avatar";
  published_at: string | null;
  created_at: string;
};

type IconComponent = ElementType;
type PeopleFilterKey = "all" | "personal" | "avatar" | "newest";

const FILTER_KEYS: PeopleFilterKey[] = [
  "all",
  "personal",
  "avatar",
  "newest",
];

type PeopleUiLabels = {
  all: string;
  people: string;
  avatars: string;
  newest: string;
  searchFilters: string;
  findPerson: string;
  createAvatar: string;
  publicProfiles: string;
  availableProfiles: string;
  visibility: string;
  publicOnly: string;
  world: string;
  openProfile: string;
  shown: (shown: number, total: number) => string;
  showMore: (count: number) => string;
  noResults: string;
  analyticsTitle: string;
  articles: string;
  projects: string;
  activity: string;
};

function getUiLabels(locale: LocaleCode): PeopleUiLabels {
  if (locale === "pl") {
    return {
      all: "Wszystkie profile",
      people: "Ludzie",
      avatars: "Awatary",
      newest: "Od najnowszych",
      searchFilters: "Wyszukiwanie i filtry",
      findPerson: "Znajdź osobę",
      createAvatar: "Utwórz awatar",
      publicProfiles: "Profile publiczne",
      availableProfiles: "Dostępne profile",
      visibility: "Widoczność",
      publicOnly: "Tylko profile publiczne",
      world: "Świat",
      openProfile: "Otwórz profil",
      shown: (shown, total) => `Pokazano ${shown} z ${total}`,
      showMore: (count) => `Pokaż jeszcze ${count}`,
      noResults: "Nie znaleziono profili",
      analyticsTitle: "Wyszukiwanie i filtry",
      articles: "Artykuły",
      projects: "Projekty",
      activity: "Aktywność",
    };
  }

  if (locale === "ru") {
    return {
      all: "Все профили",
      people: "Люди",
      avatars: "Аватары",
      newest: "Сначала новые",
      searchFilters: "Поиск и фильтры",
      findPerson: "Найти человека",
      createAvatar: "Создать аватар",
      publicProfiles: "Публичные профили",
      availableProfiles: "Доступные профили",
      visibility: "Видимость",
      publicOnly: "Только публичные профили",
      world: "Мир",
      openProfile: "Открыть профиль",
      shown: (shown, total) => `Показано ${shown} из ${total}`,
      showMore: (count) => `Показать ещё ${count}`,
      noResults: "Профили не найдены",
      analyticsTitle: "Поиск и фильтры",
      articles: "Статьи",
      projects: "Проекты",
      activity: "Активность",
    };
  }

  if (locale === "uk") {
    return {
      all: "Усі профілі",
      people: "Люди",
      avatars: "Аватари",
      newest: "Спочатку нові",
      searchFilters: "Пошук і фільтри",
      findPerson: "Знайти людину",
      createAvatar: "Створити аватар",
      publicProfiles: "Публічні профілі",
      availableProfiles: "Доступні профілі",
      visibility: "Видимість",
      publicOnly: "Лише публічні профілі",
      world: "Світ",
      openProfile: "Відкрити профіль",
      shown: (shown, total) => `Показано ${shown} з ${total}`,
      showMore: (count) => `Показати ще ${count}`,
      noResults: "Профілі не знайдено",
      analyticsTitle: "Пошук і фільтри",
      articles: "Статті",
      projects: "Проєкти",
      activity: "Активність",
    };
  }

  if (locale === "de") {
    return {
      all: "Alle Profile",
      people: "Menschen",
      avatars: "Avatare",
      newest: "Neueste zuerst",
      searchFilters: "Suche und Filter",
      findPerson: "Person finden",
      createAvatar: "Avatar erstellen",
      publicProfiles: "Öffentliche Profile",
      availableProfiles: "Verfügbare Profile",
      visibility: "Sichtbarkeit",
      publicOnly: "Nur öffentliche Profile",
      world: "Welt",
      openProfile: "Profil öffnen",
      shown: (shown, total) => `${shown} von ${total} angezeigt`,
      showMore: (count) => `${count} weitere anzeigen`,
      noResults: "Keine Profile gefunden",
      analyticsTitle: "Suche und Filter",
      articles: "Artikel",
      projects: "Projekte",
      activity: "Aktivität",
    };
  }

  if (locale === "es") {
    return {
      all: "Todos los perfiles",
      people: "Personas",
      avatars: "Avatares",
      newest: "Más recientes",
      searchFilters: "Búsqueda y filtros",
      findPerson: "Encontrar persona",
      createAvatar: "Crear avatar",
      publicProfiles: "Perfiles públicos",
      availableProfiles: "Perfiles disponibles",
      visibility: "Visibilidad",
      publicOnly: "Solo perfiles públicos",
      world: "Mundo",
      openProfile: "Abrir perfil",
      shown: (shown, total) => `Mostrado ${shown} de ${total}`,
      showMore: (count) => `Mostrar ${count} más`,
      noResults: "No se encontraron perfiles",
      analyticsTitle: "Búsqueda y filtros",
      articles: "Artículos",
      projects: "Proyectos",
      activity: "Actividad",
    };
  }

  if (locale === "cs") {
    return {
      all: "Všechny profily",
      people: "Lidé",
      avatars: "Avataři",
      newest: "Nejnovější",
      searchFilters: "Vyhledávání a filtry",
      findPerson: "Najít osobu",
      createAvatar: "Vytvořit avatara",
      publicProfiles: "Veřejné profily",
      availableProfiles: "Dostupné profily",
      visibility: "Viditelnost",
      publicOnly: "Pouze veřejné profily",
      world: "Svět",
      openProfile: "Otevřít profil",
      shown: (shown, total) => `Zobrazeno ${shown} z ${total}`,
      showMore: (count) => `Zobrazit dalších ${count}`,
      noResults: "Nebyly nalezeny žádné profily",
      analyticsTitle: "Vyhledávání a filtry",
      articles: "Články",
      projects: "Projekty",
      activity: "Aktivita",
    };
  }

  return {
    all: "All profiles",
    people: "People",
    avatars: "Avatars",
    newest: "Newest",
    searchFilters: "Search and filters",
    findPerson: "Find person",
    createAvatar: "Create avatar",
    publicProfiles: "Public profiles",
    availableProfiles: "Available profiles",
    visibility: "Visibility",
    publicOnly: "Public profiles only",
    world: "World",
    openProfile: "Open profile",
    shown: (shown, total) => `Shown ${shown} of ${total}`,
    showMore: (count) => `Show ${count} more`,
    noResults: "No profiles found",
    analyticsTitle: "Search and filters",
    articles: "Articles",
    projects: "Projects",
    activity: "Activity",
  };
}

function appendLocale(pathname: string, locale: LocaleCode) {
  const searchParams = new URLSearchParams();

  if (locale) {
    searchParams.set("locale", locale);
  }

  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function getInitials(displayName: string) {
  const words = displayName.trim().split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }

  return (displayName.trim().slice(0, 2) || "P").toUpperCase();
}

function getPercentage(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function KpiCard({
  label,
  value,
  sub,
  accent,
  icon: Icon,
  trend,
  href,
}: {
  readonly label: string;
  readonly value: string;
  readonly sub?: string;
  readonly accent: string;
  readonly icon: IconComponent;
  readonly trend?: string;
  readonly href?: string;
}) {
  const valueNode = (
    <div className="text-[24px] font-bold leading-none text-[#1a1d2e]">
      {value}
    </div>
  );

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
        {href ? (
          <Link
            href={href}
            className="inline-flex w-fit rounded-md transition hover:text-[#3b6ef8]"
          >
            {valueNode}
          </Link>
        ) : (
          valueNode
        )}

        {sub ? <div className="text-[11px] text-[#9ca3b8]">{sub}</div> : null}

        {trend ? (
          <div className="flex items-center gap-1">
            <TrendingUp size={11} className="text-[#22c55e]" />
            <span className="text-[11px] font-semibold text-[#22c55e]">
              {trend}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProfileKindsKpi({
  peopleCount,
  avatarCount,
  labels,
}: {
  readonly peopleCount: number;
  readonly avatarCount: number;
  readonly labels: PeopleUiLabels;
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[#7c8099]">
          {labels.availableProfiles}
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f9731618]">
          <Sparkles size={14} className="text-[#f97316]" />
        </div>
      </div>

      <div>
        <div className="text-[13px] font-semibold text-[#1a1d2e]">
          {labels.publicProfiles}
        </div>
        <div className="mt-2 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold text-[#5a5f7a]">
              {labels.people}
            </span>
            <span className="font-bold text-[#1a1d2e]">{peopleCount}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold text-[#5a5f7a]">
              {labels.avatars}
            </span>
            <span className="font-bold text-[#1a1d2e]">{avatarCount}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold text-[#5a5f7a]">
              {labels.newest}
            </span>
            <span className="font-bold text-[#1a1d2e]">
              {peopleCount + avatarCount}
            </span>
          </div>
        </div>
        <div className="mt-2 text-[11px] text-[#9ca3b8]">
          {labels.availableProfiles}
        </div>
      </div>
    </div>
  );
}

function ProgressKpi({
  labels,
}: {
  readonly labels: PeopleUiLabels;
}) {
  const pct = 100;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[#7c8099]">
          {labels.world}
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
            {labels.publicOnly}
          </div>
          <div className="mt-1.5 flex items-center gap-1">
            <TrendingUp size={11} className="text-[#22c55e]" />
            <span className="text-[11px] font-medium text-[#22c55e]">
              {labels.world}
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
  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="min-w-0 line-clamp-1 pr-2 text-[13px] font-semibold text-[#1a1d2e]">
          {title}
        </h3>
        {detailsHref ? (
          <Link
            href={detailsHref}
            className="text-[11px] text-[#3b6ef8] hover:underline"
          >
            {detailsLabel}
          </Link>
        ) : (
          <span className="text-[11px] text-[#3b6ef8]">
            {detailsLabel}
          </span>
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
}: {
  readonly label: string;
  readonly pct: number;
  readonly color: string;
  readonly sub: string;
}) {
  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-[#1a1d2e]">
          {label}
        </span>
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
          <span className="text-[10px] font-medium text-[#22c55e]">
            +0%
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyProfileSlot() {
  return <div className="h-[140px]" />;
}

function ProfilePreview({
  profile,
  locale,
  labels,
}: {
  readonly profile: PeopleDirectoryProfile;
  readonly locale: LocaleCode;
  readonly labels: PeopleUiLabels;
}) {
  const messages = getPersonalProfileMessages(locale);

  return (
    <div className="flex min-h-[140px] items-center gap-3 sm:h-[140px] sm:gap-4">
      <div className="flex h-[92px] w-[92px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#eef2ff] text-[26px] font-bold text-[#3b6ef8] sm:h-[110px] sm:w-[110px]">
        {profile.image_url ? (
          <img
            src={profile.image_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          getInitials(profile.display_name)
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-[13px] leading-5 text-[#5a5f7a]">
          {profile.bio?.trim() || messages.peopleNoDescription}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-lg bg-[#eef2ff] px-2.5 py-1 text-[11px] font-semibold text-[#3b6ef8]">
            {profile.category_label?.trim() || messages.peopleUncategorized}
          </span>
          <span className="rounded-lg bg-[#f5f6fb] px-2.5 py-1 text-[11px] font-semibold text-[#5a5f7a]">
            {profile.profile_kind === "avatar"
              ? messages.avatar
              : messages.personalProfile}
          </span>
        </div>

        <div className="mt-3 grid min-w-0 grid-cols-3 gap-2 text-center">
          <div className="min-w-0 rounded-lg bg-[#f8fafc] px-2 py-1.5">
            <div className="text-[12px] font-bold text-[#1a1d2e]">0</div>
            <div className="text-[10px] text-[#9ca3b8]">{labels.articles}</div>
          </div>
          <div className="min-w-0 rounded-lg bg-[#f8fafc] px-2 py-1.5">
            <div className="text-[12px] font-bold text-[#1a1d2e]">0</div>
            <div className="text-[10px] text-[#9ca3b8]">{labels.projects}</div>
          </div>
          <div className="min-w-0 rounded-lg bg-[#f8fafc] px-2 py-1.5">
            <div className="text-[12px] font-bold text-[#1a1d2e]">0</div>
            <div className="text-[10px] text-[#9ca3b8]">{labels.activity}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PeopleDirectoryDashboardContent({
  initialLocale,
  profiles,
}: {
  readonly initialLocale: LocaleCode;
  readonly profiles: PeopleDirectoryProfile[];
}) {
  const locale = initialLocale;
  const labels = getUiLabels(locale);
  const messages = getPersonalProfileMessages(locale);
  const [activeFilter, setActiveFilter] =
    useState<PeopleFilterKey>("all");
  const [visibleCount, setVisibleCount] = useState(4);

  const filteredProfiles = useMemo(() => {
    if (activeFilter === "personal") {
      return profiles.filter(
        (profile) => profile.profile_kind === "personal",
      );
    }

    if (activeFilter === "avatar") {
      return profiles.filter(
        (profile) => profile.profile_kind === "avatar",
      );
    }

    return profiles;
  }, [activeFilter, profiles]);

  useEffect(() => {
    setVisibleCount(4);
  }, [activeFilter, profiles.length]);

  const peopleCount = profiles.filter(
    (profile) => profile.profile_kind === "personal",
  ).length;
  const avatarCount = profiles.filter(
    (profile) => profile.profile_kind === "avatar",
  ).length;
  const displayedProfiles = filteredProfiles.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProfiles.length;
  const nextCount = Math.min(
    4,
    Math.max(0, filteredProfiles.length - visibleCount),
  );

  return (
    <div className="p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[20px] font-bold leading-tight text-[#1a1d2e]">
            {messages.peopleTitle}
          </h1>
          <p className="mt-0.5 text-[13px] text-[#7c8099]">
            {messages.peopleIntro}
          </p>
        </div>

        <Link
          href={appendLocale("/profiles/new", locale)}
          className="flex w-fit items-center gap-1 rounded-lg border border-[#22c55e]/30 bg-[#ecfdf3] px-3 py-1.5 text-[12px] font-medium text-[#16a34a] transition-all hover:bg-[#dcfce7]"
        >
          <Plus size={12} />
          {labels.createAvatar}
        </Link>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={labels.publicProfiles}
          value={String(profiles.length)}
          sub={messages.peopleIntro}
          accent="#3b6ef8"
          icon={Star}
          trend={labels.openProfile}
          href={appendLocale("/people", locale)}
        />
        <ProfileKindsKpi
          peopleCount={peopleCount}
          avatarCount={avatarCount}
          labels={labels}
        />
        <KpiCard
          label={labels.visibility}
          value={messages.publicProfile}
          sub={labels.publicOnly}
          accent="#22c55e"
          icon={Activity}
        />
        <ProgressKpi labels={labels} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTER_KEYS.map((filterKey) => {
          const label =
            filterKey === "all"
              ? labels.all
              : filterKey === "personal"
                ? labels.people
                : filterKey === "avatar"
                  ? labels.avatars
                  : labels.newest;

          return (
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
              {label}
            </button>
          );
        })}

        <button
          type="button"
          className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-1.5 text-[12px] font-medium text-[#5a5f7a] transition-all hover:bg-[#f5f6fb]"
        >
          {labels.searchFilters}
        </button>

        <button
          type="button"
          className="ml-auto flex items-center gap-1 rounded-lg border border-[#f97316]/30 bg-[#fff7ed] px-3 py-1.5 text-[12px] font-medium text-[#ea580c] transition-all hover:bg-[#ffedd5]"
        >
          <Plus size={12} />
          {labels.findPerson}
        </button>
      </div>

      {filteredProfiles.length === 0 ? (
        <div className="mb-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
          <AnalyticsCard title={labels.noResults} detailsLabel=" ">
            <EmptyProfileSlot />
          </AnalyticsCard>
        </div>
      ) : (
        <div className="mb-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
          {displayedProfiles.map((profile) => (
            <AnalyticsCard
              key={profile.id}
              title={profile.display_name}
              detailsLabel={labels.openProfile}
              detailsHref={appendLocale(
                `/people/${encodeURIComponent(profile.public_slug)}`,
                locale,
              )}
            >
              <ProfilePreview
                profile={profile}
                locale={locale}
                labels={labels}
              />
            </AnalyticsCard>
          ))}
        </div>
      )}

      {filteredProfiles.length > 0 ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
          <span className="text-[12px] text-[#7c8099]">
            {labels.shown(
              displayedProfiles.length,
              filteredProfiles.length,
            )}
          </span>

          {hasMore ? (
            <button
              type="button"
              onClick={() =>
                setVisibleCount((current) =>
                  Math.min(current + 4, filteredProfiles.length),
                )
              }
              className="rounded-lg border border-[#3b6ef8]/30 bg-white px-3 py-1.5 text-[12px] font-medium text-[#3b6ef8] transition-all hover:bg-[#eef2ff]"
            >
              {labels.showMore(nextCount)}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mb-2">
        <h2 className="mb-3 text-[13px] font-semibold text-[#1a1d2e]">
          {labels.analyticsTitle}
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DirectionCard
            label={labels.people}
            pct={getPercentage(peopleCount, profiles.length)}
            color="#3b6ef8"
            sub={`${peopleCount} ${labels.people}`}
          />
          <DirectionCard
            label={labels.avatars}
            pct={getPercentage(avatarCount, profiles.length)}
            color="#f97316"
            sub={`${avatarCount} ${labels.avatars}`}
          />
          <DirectionCard
            label={labels.publicProfiles}
            pct={profiles.length > 0 ? 100 : 0}
            color="#22c55e"
            sub={`${profiles.length} ${labels.publicProfiles}`}
          />
          <DirectionCard
            label={labels.newest}
            pct={profiles.length > 0 ? 100 : 0}
            color="#8b5cf6"
            sub={`${profiles.length} ${labels.availableProfiles}`}
          />
        </div>
      </div>
    </div>
  );
}
