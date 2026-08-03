"use client";

import Link from "next/link";
import {
  Activity,
  CircleAlert,
  Gift,
  Package,
  Plus,
  Search,
  Star,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ElementType,
  type ReactNode,
} from "react";

import { type LocaleCode } from "@/i18n";

import { CertificateCommercialPrice } from "./certificate-commercial-price";
import { CertificateShareButton } from "./certificate-share-button";

export type CertificateDashboardMode =
  | "catalog"
  | "buyer"
  | "provider";

export type CertificateDashboardState =
  | "draft"
  | "available"
  | "active"
  | "checked_in"
  | "awaiting_confirmation"
  | "confirmed_by_buyer"
  | "auto_confirmed"
  | "problem"
  | "redeemed"
  | "expired"
  | "annulled";

export type CertificateDashboardItem = {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly objectKind: "product_type" | "service_type";
  readonly providerName: string;
  readonly providerHref: string | null;
  readonly recipientName: string | null;
  readonly recipientHref: string | null;
  readonly providerReputation: number;
  readonly state: CertificateDashboardState;
  readonly regularPrice: number;
  readonly pointsPrice: number;
  readonly moneyRemainder: number;
  readonly currency: string;
  readonly availableFrom: string;
  readonly availableUntil: string;
  readonly publicCode: string | null;
  readonly publishedAt: string | null;
  readonly orderedAt: string | null;
  readonly finalizedAt: string | null;
  readonly href: string;
  readonly shareHref: string;
};

type FilterKey =
  | "all"
  | "product"
  | "service"
  | "newest"
  | "available"
  | "active"
  | "awaiting"
  | "completed"
  | "problem";

type Labels = {
  readonly titles: Record<CertificateDashboardMode, string>;
  readonly subtitles: Record<CertificateDashboardMode, string>;
  readonly total: string;
  readonly allOffers: string;
  readonly activeOffers: string;
  readonly realizedOffers: string;
  readonly available: string;
  readonly active: string;
  readonly awaiting: string;
  readonly completed: string;
  readonly problems: string;
  readonly products: string;
  readonly services: string;
  readonly newest: string;
  readonly searchFilters: string;
  readonly findCertificate: string;
  readonly createCertificate: string;
  readonly myCertificates: string;
  readonly catalog: string;
  readonly publicCatalog: string;
  readonly availableActions: string;
  readonly nextAction: string;
  readonly noActions: string;
  readonly noProblems: string;
  readonly completion: string;
  readonly shown: string;
  readonly of: string;
  readonly showMore: string;
  readonly empty: string;
  readonly details: string;
  readonly share: string;
  readonly price: string;
  readonly surcharge: string;
  readonly recipientHidden: string;
  readonly recipientPending: string;
  readonly provider: string;
  readonly buyer: string;
  readonly points: string;
  readonly validity: string;
  readonly code: string;
  readonly reputation: string;
  readonly moneyRemainder: string;
  readonly product: string;
  readonly service: string;
  readonly states: Record<CertificateDashboardState, string>;
  readonly searchSection: string;
};

const EN: Labels = {
  titles: {
    catalog: "Offer catalog",
    buyer: "My certificates",
    provider: "My offers",
  },
  subtitles: {
    catalog:
      "Products, services and private offers available for ARCTor points.",
    buyer:
      "Certificates ordered by your account, their check-in and confirmation states.",
    provider:
      "Give gifts — meet new customers and friends.",
  },
  total: "Certificates",
  allOffers: "All offers",
  activeOffers: "Active offers",
  realizedOffers: "Realized offers",
  available: "Available",
  active: "Ordered",
  awaiting: "Awaiting confirmation",
  completed: "Completed",
  problems: "Needs review",
  products: "Products",
  services: "Services",
  newest: "Newest first",
  searchFilters: "Search and filters",
  findCertificate: "Find offer",
  createCertificate: "Create offer",
  myCertificates: "My certificates",
  catalog: "Offer catalog",
  publicCatalog: "Public catalog",
  availableActions: "Available states",
  nextAction: "Next action",
  noActions: "No action required",
  noProblems: "No problems",
  completion: "Completion",
  shown: "Shown",
  of: "of",
  showMore: "Show more",
  empty: "No offers match the selected filter.",
  details: "Open details",
  share: "Share",
  price: "Price",
  surcharge: "surcharge",
  recipientHidden: "Hidden recipient",
  recipientPending: "Recipient not selected",
  provider: "Provider",
  buyer: "Recipient",
  points: "points",
  validity: "Validity",
  code: "Public code",
  reputation: "Reputation",
  moneyRemainder: "Money remainder",
  product: "Product",
  service: "Service",
  searchSection: "Search and filters",
  states: {
    draft: "Draft",
    available: "Published",
    active: "Ordered and active",
    checked_in: "Arrival registered",
    awaiting_confirmation: "Awaiting buyer confirmation",
    confirmed_by_buyer: "Confirmed by buyer",
    auto_confirmed: "Confirmed automatically",
    problem: "Needs review",
    redeemed: "Used",
    expired: "Expired",
    annulled: "Annulled",
  },
};

const RU: Labels = {
  ...EN,
  titles: {
    catalog: "Каталог предложений",
    buyer: "Мои сертификаты",
    provider: "Мои предложения",
  },
  subtitles: {
    catalog:
      "Товары, услуги и частные предложения, доступные за пункты ARCTor.",
    buyer:
      "Сертификаты, заказанные вашей учётной записью, и состояния их исполнения.",
    provider:
      "Делайте подарки — находите новых покупателей и друзей.",
  },
  total: "Сертификаты",
  allOffers: "Все предложения",
  activeOffers: "Активные предложения",
  realizedOffers: "Реализованные предложения",
  available: "Опубликованы",
  active: "Заказаны",
  awaiting: "Ожидают подтверждения",
  completed: "Подтверждены",
  problems: "Требуют разбора",
  products: "Товары",
  services: "Услуги",
  newest: "Сначала новые",
  searchFilters: "Поиск и фильтры",
  findCertificate: "Найти предложение",
  createCertificate: "Создать предложение",
  myCertificates: "Мои сертификаты",
  catalog: "Каталог предложений",
  publicCatalog: "Все предложения",
  availableActions: "Доступные состояния",
  nextAction: "Следующее действие",
  noActions: "Действий не требуется",
  noProblems: "Проблем нет",
  completion: "Завершённость",
  shown: "Показано",
  of: "из",
  showMore: "Показать ещё",
  empty: "По выбранному фильтру предложений нет.",
  details: "Открыть предложение",
  share: "Поделиться",
  price: "Цена",
  surcharge: "доплата",
  recipientHidden: "Скрытый получатель",
  recipientPending: "Получатель не выбран",
  provider: "Предоставляющий",
  buyer: "Получатель",
  points: "пункты",
  validity: "Срок действия",
  code: "Публичный код",
  reputation: "Репутация",
  moneyRemainder: "Денежный остаток",
  product: "Товар",
  service: "Услуга",
  searchSection: "Поиск и фильтры",
  states: {
    draft: "Черновик",
    available: "Опубликован",
    active: "Заказан и активен",
    checked_in: "Приход зарегистрирован",
    awaiting_confirmation: "Ожидается подтверждение покупателя",
    confirmed_by_buyer: "Подтверждён покупателем",
    auto_confirmed: "Подтверждён автоматически",
    problem: "Требуется разбор",
    redeemed: "Использован",
    expired: "Срок истёк",
    annulled: "Аннулирован",
  },
};

const PL: Labels = {
  ...EN,
  titles: {
    catalog: "Katalog ofert",
    buyer: "Moje bony",
    provider: "Moje oferty",
  },
  subtitles: {
    catalog:
      "Produkty, usługi i oferty prywatne dostępne za punkty ARCTor.",
    buyer:
      "Bony zamówione przez Twoje konto oraz stan ich realizacji.",
    provider:
      "Dawaj prezenty — zdobywaj nowych klientów i przyjaciół.",
  },
  total: "Bony",
  allOffers: "Wszystkie oferty",
  activeOffers: "Aktywne oferty",
  realizedOffers: "Zrealizowane oferty",
  available: "Opublikowane",
  active: "Zamówione",
  awaiting: "Oczekują na potwierdzenie",
  completed: "Potwierdzone",
  problems: "Wymagają wyjaśnienia",
  products: "Produkty",
  services: "Usługi",
  newest: "Najnowsze",
  searchFilters: "Wyszukiwanie i filtry",
  findCertificate: "Znajdź ofertę",
  createCertificate: "Utwórz ofertę",
  myCertificates: "Moje bony",
  catalog: "Katalog ofert",
  publicCatalog: "Wszystkie oferty",
  availableActions: "Dostępne stany",
  nextAction: "Następne działanie",
  noActions: "Brak wymaganych działań",
  noProblems: "Brak problemów",
  completion: "Realizacja",
  shown: "Pokazano",
  of: "z",
  showMore: "Pokaż więcej",
  empty: "Brak ofert dla wybranego filtra.",
  details: "Otwórz ofertę",
  share: "Udostępnij",
  price: "Cena",
  surcharge: "dopłata",
  recipientHidden: "Ukryty odbiorca",
  recipientPending: "Odbiorca nie został wybrany",
  provider: "Dostawca",
  buyer: "Odbiorca",
  points: "punkty",
  validity: "Ważność",
  code: "Kod publiczny",
  reputation: "Reputacja",
  moneyRemainder: "Pozostała kwota",
  product: "Produkt",
  service: "Usługa",
  searchSection: "Wyszukiwanie i filtry",
  states: {
    draft: "Szkic",
    available: "Opublikowany",
    active: "Zamówiony i aktywny",
    checked_in: "Przybycie zarejestrowane",
    awaiting_confirmation: "Oczekuje na potwierdzenie kupującego",
    confirmed_by_buyer: "Potwierdzony przez kupującego",
    auto_confirmed: "Potwierdzony automatycznie",
    problem: "Wymaga wyjaśnienia",
    redeemed: "Wykorzystany",
    expired: "Wygasł",
    annulled: "Anulowany",
  },
};

function getLabels(locale: LocaleCode): Labels {
  if (locale === "ru") return RU;
  if (locale === "pl") return PL;

  if (locale === "uk") {
    return {
      ...RU,
      titles: {
        catalog: "Каталог пропозицій",
        buyer: "Мої сертифікати",
        provider: "Мої пропозиції",
      },
      subtitles: {
        catalog:
          "Товари, послуги та приватні пропозиції, доступні за пункти ARCTor.",
        buyer:
          "Сертифікати, замовлені вашим обліковим записом, і стани їх виконання.",
        provider:
          "Робіть подарунки — знаходьте нових покупців і друзів.",
      },
      total: "Сертифікати",
      allOffers: "Усі пропозиції",
      activeOffers: "Активні пропозиції",
      realizedOffers: "Реалізовані пропозиції",
      available: "Опубліковані",
      active: "Замовлені",
      awaiting: "Очікують підтвердження",
      completed: "Підтверджені",
      problems: "Потребують розгляду",
      products: "Товари",
      services: "Послуги",
      newest: "Спочатку нові",
      searchFilters: "Пошук і фільтри",
      findCertificate: "Знайти пропозицію",
      createCertificate: "Створити пропозицію",
      myCertificates: "Мої сертифікати",
      catalog: "Каталог пропозицій",
      publicCatalog: "Усі пропозиції",
      availableActions: "Доступні стани",
      nextAction: "Наступна дія",
      noActions: "Дій не потрібно",
      noProblems: "Проблем немає",
      completion: "Завершеність",
      shown: "Показано",
      of: "із",
      showMore: "Показати ще",
      empty: "За вибраним фільтром пропозицій немає.",
      details: "Відкрити пропозицію",
      share: "Поділитися",
      price: "Ціна",
      surcharge: "доплата",
      recipientHidden: "Прихований отримувач",
      recipientPending: "Отримувача не вибрано",
      provider: "Надавач",
      buyer: "Отримувач",
      points: "пункти",
      validity: "Строк дії",
      code: "Публічний код",
      reputation: "Репутація",
      moneyRemainder: "Грошовий залишок",
      product: "Товар",
      service: "Послуга",
      searchSection: "Пошук і фільтри",
      states: {
        draft: "Чернетка",
        available: "Опубліковано",
        active: "Замовлено й активно",
        checked_in: "Прибуття зареєстровано",
        awaiting_confirmation: "Очікується підтвердження отримувача",
        confirmed_by_buyer: "Підтверджено отримувачем",
        auto_confirmed: "Підтверджено автоматично",
        problem: "Потребує розгляду",
        redeemed: "Реалізовано",
        expired: "Строк минув",
        annulled: "Анульовано",
      },
    };
  }

  if (locale === "de") {
    return {
      ...EN,
      titles: {
        catalog: "Angebotskatalog",
        buyer: "Meine Gutscheine",
        provider: "Meine Angebote",
      },
      subtitles: {
        catalog:
          "Produkte, Dienstleistungen und private Angebote, die für ARCTor-Punkte verfügbar sind.",
        buyer:
          "Von Ihrem Konto bestellte Gutscheine und der Stand ihrer Erfüllung.",
        provider:
          "Machen Sie Geschenke – gewinnen Sie neue Kunden und Freunde.",
      },
      total: "Gutscheine",
      allOffers: "Alle Angebote",
      activeOffers: "Aktive Angebote",
      realizedOffers: "Erfüllte Angebote",
      available: "Veröffentlicht",
      active: "Bestellt",
      awaiting: "Bestätigung ausstehend",
      completed: "Bestätigt",
      problems: "Prüfung erforderlich",
      products: "Produkte",
      services: "Dienstleistungen",
      newest: "Neueste zuerst",
      searchFilters: "Suche und Filter",
      findCertificate: "Angebot finden",
      createCertificate: "Angebot erstellen",
      myCertificates: "Meine Gutscheine",
      catalog: "Angebotskatalog",
      publicCatalog: "Alle Angebote",
      availableActions: "Verfügbare Zustände",
      nextAction: "Nächste Aktion",
      noActions: "Keine Aktion erforderlich",
      noProblems: "Keine Probleme",
      completion: "Erfüllung",
      shown: "Angezeigt",
      of: "von",
      showMore: "Mehr anzeigen",
      empty: "Für den gewählten Filter gibt es keine Angebote.",
      details: "Angebot öffnen",
      share: "Teilen",
      price: "Preis",
      surcharge: "Zuzahlung",
      recipientHidden: "Verborgener Empfänger",
      recipientPending: "Empfänger nicht ausgewählt",
      provider: "Anbieter",
      buyer: "Empfänger",
      points: "Punkte",
      validity: "Gültigkeit",
      code: "Öffentlicher Code",
      reputation: "Reputation",
      moneyRemainder: "Restbetrag",
      product: "Produkt",
      service: "Dienstleistung",
      searchSection: "Suche und Filter",
      states: {
        draft: "Entwurf",
        available: "Veröffentlicht",
        active: "Bestellt und aktiv",
        checked_in: "Ankunft registriert",
        awaiting_confirmation: "Bestätigung des Empfängers ausstehend",
        confirmed_by_buyer: "Vom Empfänger bestätigt",
        auto_confirmed: "Automatisch bestätigt",
        problem: "Prüfung erforderlich",
        redeemed: "Erfüllt",
        expired: "Abgelaufen",
        annulled: "Annulliert",
      },
    };
  }

  if (locale === "es") {
    return {
      ...EN,
      titles: {
        catalog: "Catálogo de ofertas",
        buyer: "Mis certificados",
        provider: "Mis ofertas",
      },
      subtitles: {
        catalog:
          "Productos, servicios y ofertas privadas disponibles por puntos ARCTor.",
        buyer:
          "Certificados solicitados por tu cuenta y el estado de su cumplimiento.",
        provider:
          "Haz regalos y encuentra nuevos clientes y amigos.",
      },
      total: "Certificados",
      allOffers: "Todas las ofertas",
      activeOffers: "Ofertas activas",
      realizedOffers: "Ofertas realizadas",
      available: "Publicadas",
      active: "Solicitadas",
      awaiting: "Esperan confirmación",
      completed: "Confirmadas",
      problems: "Requieren revisión",
      products: "Productos",
      services: "Servicios",
      newest: "Más recientes",
      searchFilters: "Búsqueda y filtros",
      findCertificate: "Buscar oferta",
      createCertificate: "Crear oferta",
      myCertificates: "Mis certificados",
      catalog: "Catálogo de ofertas",
      publicCatalog: "Todas las ofertas",
      availableActions: "Estados disponibles",
      nextAction: "Siguiente acción",
      noActions: "No se requiere ninguna acción",
      noProblems: "Sin problemas",
      completion: "Realización",
      shown: "Mostradas",
      of: "de",
      showMore: "Mostrar más",
      empty: "No hay ofertas para el filtro seleccionado.",
      details: "Abrir oferta",
      share: "Compartir",
      price: "Precio",
      surcharge: "pago adicional",
      recipientHidden: "Destinatario oculto",
      recipientPending: "Destinatario no seleccionado",
      provider: "Proveedor",
      buyer: "Destinatario",
      points: "puntos",
      validity: "Validez",
      code: "Código público",
      reputation: "Reputación",
      moneyRemainder: "Importe restante",
      product: "Producto",
      service: "Servicio",
      searchSection: "Búsqueda y filtros",
      states: {
        draft: "Borrador",
        available: "Publicada",
        active: "Solicitada y activa",
        checked_in: "Llegada registrada",
        awaiting_confirmation: "Esperando confirmación del destinatario",
        confirmed_by_buyer: "Confirmada por el destinatario",
        auto_confirmed: "Confirmada automáticamente",
        problem: "Requiere revisión",
        redeemed: "Realizada",
        expired: "Caducada",
        annulled: "Anulada",
      },
    };
  }

  if (locale === "cs") {
    return {
      ...EN,
      titles: {
        catalog: "Katalog nabídek",
        buyer: "Moje certifikáty",
        provider: "Moje nabídky",
      },
      subtitles: {
        catalog:
          "Produkty, služby a soukromé nabídky dostupné za body ARCTor.",
        buyer:
          "Certifikáty objednané vaším účtem a stav jejich splnění.",
        provider:
          "Dávejte dárky — získávejte nové zákazníky a přátele.",
      },
      total: "Certifikáty",
      allOffers: "Všechny nabídky",
      activeOffers: "Aktivní nabídky",
      realizedOffers: "Realizované nabídky",
      available: "Publikované",
      active: "Objednané",
      awaiting: "Čekají na potvrzení",
      completed: "Potvrzené",
      problems: "Vyžadují posouzení",
      products: "Produkty",
      services: "Služby",
      newest: "Nejnovější",
      searchFilters: "Vyhledávání a filtry",
      findCertificate: "Najít nabídku",
      createCertificate: "Vytvořit nabídku",
      myCertificates: "Moje certifikáty",
      catalog: "Katalog nabídek",
      publicCatalog: "Všechny nabídky",
      availableActions: "Dostupné stavy",
      nextAction: "Další krok",
      noActions: "Není vyžadována žádná akce",
      noProblems: "Bez problémů",
      completion: "Realizace",
      shown: "Zobrazeno",
      of: "z",
      showMore: "Zobrazit více",
      empty: "Pro zvolený filtr nejsou žádné nabídky.",
      details: "Otevřít nabídku",
      share: "Sdílet",
      price: "Cena",
      surcharge: "doplatek",
      recipientHidden: "Skrytý příjemce",
      recipientPending: "Příjemce nebyl vybrán",
      provider: "Poskytovatel",
      buyer: "Příjemce",
      points: "body",
      validity: "Platnost",
      code: "Veřejný kód",
      reputation: "Reputace",
      moneyRemainder: "Zbývající částka",
      product: "Produkt",
      service: "Služba",
      searchSection: "Vyhledávání a filtry",
      states: {
        draft: "Koncept",
        available: "Publikována",
        active: "Objednána a aktivní",
        checked_in: "Příchod zaregistrován",
        awaiting_confirmation: "Čeká na potvrzení příjemce",
        confirmed_by_buyer: "Potvrzena příjemcem",
        auto_confirmed: "Potvrzena automaticky",
        problem: "Vyžaduje posouzení",
        redeemed: "Realizována",
        expired: "Platnost skončila",
        annulled: "Anulována",
      },
    };
  }

  return EN;
}

function appendLocale(pathname: string, locale: LocaleCode): string {
  return locale === "en"
    ? pathname
    : `${pathname}${pathname.includes("?") ? "&" : "?"}locale=${encodeURIComponent(locale)}`;
}

function formatNumber(value: number, locale: LocaleCode): string {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : locale, {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string, locale: LocaleCode): string {
  const date = new Date(`${value}T12:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

function getPercent(value: number, total: number): number {
  return total <= 0 ? 0 : Math.round((value / total) * 100);
}

function getStateTone(state: CertificateDashboardState): {
  readonly background: string;
  readonly color: string;
} {
  if (
    state === "confirmed_by_buyer" ||
    state === "auto_confirmed" ||
    state === "redeemed"
  ) {
    return { background: "#ecfdf3", color: "#15803d" };
  }

  if (state === "problem" || state === "annulled") {
    return { background: "#fef2f2", color: "#b91c1c" };
  }

  if (state === "expired") {
    return { background: "#fff7ed", color: "#c2410c" };
  }

  if (state === "awaiting_confirmation" || state === "checked_in") {
    return { background: "#fff7ed", color: "#b45309" };
  }

  if (state === "active") {
    return { background: "#eef2ff", color: "#3b6ef8" };
  }

  return { background: "#f5f6fb", color: "#5a5f7a" };
}

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
  readonly sub: string;
  readonly accent: string;
  readonly icon: ElementType;
  readonly trend?: string;
}) {
  return (
    <div className="flex min-h-[145px] flex-col gap-2.5 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
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
      <div className="mt-auto">
        <div className="text-[24px] font-bold leading-tight text-[#1a1d2e]">
          {value}
        </div>
        <div className="mt-2 text-[11px] leading-4 text-[#9ca3b8]">{sub}</div>
        {trend ? (
          <div className="mt-2 flex items-center gap-1">
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

function BreakdownKpi({
  labels,
  rows,
}: {
  readonly labels: Labels;
  readonly rows: ReadonlyArray<readonly [string, number]>;
}) {
  return (
    <div className="flex min-h-[145px] flex-col gap-2.5 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[#7c8099]">
          {labels.availableActions}
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f9731618]">
          <Zap size={14} className="text-[#f97316]" />
        </div>
      </div>
      <div className="mt-auto">
        <div className="text-[13px] font-semibold text-[#1a1d2e]">
          {labels.states.available}
        </div>
        <div className="mt-2 space-y-1">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-2 text-[11px]"
            >
              <span className="font-semibold text-[#5a5f7a]">{label}</span>
              <span className="font-bold text-[#1a1d2e]">{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 text-[11px] text-[#9ca3b8]">
          {labels.availableActions}
        </div>
      </div>
    </div>
  );
}

function ProgressKpi({
  label,
  percent,
  sub,
}: {
  readonly label: string;
  readonly percent: number;
  readonly sub: string;
}) {
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  return (
    <div className="flex min-h-[145px] flex-col gap-2.5 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[#7c8099]">
          {label}
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8b5cf618]">
          <Target size={14} className="text-[#8b5cf6]" />
        </div>
      </div>
      <div className="mt-auto flex items-center gap-3">
        <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r={r} fill="none" stroke="#f0f2f7" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="6"
            strokeDasharray={`${dash} ${circumference - dash}`}
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
            {percent}%
          </text>
        </svg>
        <div>
          <div className="text-[22px] font-bold leading-none text-[#1a1d2e]">
            {percent}%
          </div>
          <div className="mt-1 text-[11px] text-[#9ca3b8]">{sub}</div>
          <div className="mt-1.5 flex items-center gap-1">
            <TrendingUp size={11} className="text-[#22c55e]" />
            <span className="text-[11px] font-medium text-[#22c55e]">
              {label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DirectionCard({
  label,
  count,
  total,
  color,
}: {
  readonly label: string;
  readonly count: number;
  readonly total: number;
  readonly color: string;
}) {
  const percent = getPercent(count, total);

  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-[#1a1d2e]">{label}</span>
        <span className="text-[13px] font-bold" style={{ color }}>
          {percent}%
        </span>
      </div>
      <div className="mb-2 h-1.5 w-full rounded-full bg-[#f0f2f7]">
        <div
          className="h-1.5 rounded-full"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#9ca3b8]">{count}</span>
        <div className="flex items-center gap-0.5">
          <TrendingUp size={10} className="text-[#22c55e]" />
          <span className="text-[10px] font-medium text-[#22c55e]">+0%</span>
        </div>
      </div>
    </div>
  );
}

function AnalyticsCard({
  title,
  detailsLabel,
  href,
  action,
  children,
}: {
  readonly title: string;
  readonly detailsLabel: string;
  readonly href: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="min-w-0 line-clamp-1 pr-2 text-[13px] font-semibold text-[#1a1d2e]">
          {title}
        </h2>
        <div className="flex shrink-0 items-center gap-1">
          {action}
          <Link href={href} className="text-[11px] text-[#3b6ef8] hover:underline">
            {detailsLabel}
          </Link>
        </div>
      </div>
      {children}
    </article>
  );
}

function ParticipantValue({
  name,
  href,
  locale,
}: {
  readonly name: string;
  readonly href: string | null;
  readonly locale: LocaleCode;
}) {
  if (!href) {
    return (
      <span className="line-clamp-1 text-[12px] font-bold text-[#1a1d2e]">
        {name}
      </span>
    );
  }

  return (
    <Link
      href={appendLocale(href, locale)}
      className="line-clamp-1 text-[12px] font-bold text-[#315bd0] hover:underline"
    >
      {name}
    </Link>
  );
}

function CertificatePreview({
  item,
  mode,
  labels,
  locale,
}: {
  readonly item: CertificateDashboardItem;
  readonly mode: CertificateDashboardMode;
  readonly labels: Labels;
  readonly locale: LocaleCode;
}) {
  const stateTone = getStateTone(item.state);
  const recipientName = item.recipientName
    ? item.recipientHref
      ? item.recipientName
      : labels.recipientHidden
    : labels.recipientPending;

  return (
    <div className="flex min-h-[190px] items-start gap-3 sm:gap-4">
      <div className="flex w-[92px] shrink-0 flex-col items-start sm:w-[110px]">
        <div className="flex h-[104px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#eef2ff] text-[#3b6ef8] sm:h-[120px]">
          {item.objectKind === "service_type" ? (
            <Gift size={30} />
          ) : (
            <Package size={30} />
          )}
        </div>

        <div className="mt-1.5 flex w-full justify-start pl-1">
          <CertificateShareButton
            locale={locale}
            title={item.title}
            description={item.description}
            href={item.shareHref}
            providerName={item.providerName}
            pointsPrice={item.pointsPrice}
            moneyRemainder={item.moneyRemainder}
            currency={item.currency}
          />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[13px] leading-5 text-[#5a5f7a]">
          {item.description?.trim() || item.title}
        </p>

        {mode !== "provider" ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className="rounded-lg px-2.5 py-1 text-[11px] font-semibold"
              style={stateTone}
            >
              {labels.states[item.state]}
            </span>
          </div>
        ) : null}

        <div className="mt-3 rounded-xl border border-[#e7eaf2] bg-[#f8fafc] px-3 py-3">
          <CertificateCommercialPrice
            regularPrice={item.regularPrice}
            moneyRemainder={item.moneyRemainder}
            pointsPrice={item.pointsPrice}
            currency={item.currency}
            locale={locale}
            compact
          />
        </div>

        <div className="mt-3 grid min-w-0 grid-cols-2 gap-2 text-center sm:grid-cols-3">
          <div className="min-w-0 rounded-lg bg-[#f8fafc] px-2 py-1.5">
            <ParticipantValue
              name={item.providerName}
              href={item.providerHref}
              locale={locale}
            />
            <div className="text-[10px] text-[#9ca3b8]">{labels.provider}</div>
          </div>

          {mode !== "catalog" ? (
            <div className="min-w-0 rounded-lg bg-[#f8fafc] px-2 py-1.5">
              <ParticipantValue
                name={recipientName}
                href={item.recipientHref}
                locale={locale}
              />
              <div className="text-[10px] text-[#9ca3b8]">{labels.buyer}</div>
            </div>
          ) : (
            <div className="min-w-0 rounded-lg bg-[#f8fafc] px-2 py-1.5">
              <div className="line-clamp-1 text-[12px] font-bold text-[#1a1d2e]">
                {formatNumber(item.providerReputation, locale)}
              </div>
              <div className="text-[10px] text-[#9ca3b8]">{labels.reputation}</div>
            </div>
          )}

          <div className="col-span-2 min-w-0 rounded-lg bg-[#f8fafc] px-2 py-1.5 sm:col-span-1">
            <div className="line-clamp-1 text-[12px] font-bold text-[#1a1d2e]">
              {formatDate(item.availableUntil, locale)}
            </div>
            <div className="text-[10px] text-[#9ca3b8]">{labels.validity}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function filterItems(
  items: readonly CertificateDashboardItem[],
  filter: FilterKey,
): CertificateDashboardItem[] {
  if (filter === "product") {
    return items.filter((item) => item.objectKind === "product_type");
  }

  if (filter === "service") {
    return items.filter((item) => item.objectKind === "service_type");
  }

  if (filter === "available") {
    return items.filter((item) => item.state === "available");
  }

  if (filter === "active") {
    return items.filter((item) =>
      ["active", "checked_in"].includes(item.state),
    );
  }

  if (filter === "awaiting") {
    return items.filter((item) => item.state === "awaiting_confirmation");
  }

  if (filter === "completed") {
    return items.filter((item) =>
      ["confirmed_by_buyer", "auto_confirmed", "redeemed"].includes(item.state),
    );
  }

  if (filter === "problem") {
    return items.filter((item) =>
      ["problem", "expired", "annulled"].includes(item.state),
    );
  }

  return [...items];
}

function getFilterDefinitions(
  mode: CertificateDashboardMode,
  labels: Labels,
): ReadonlyArray<readonly [FilterKey, string]> {
  if (mode === "catalog") {
    return [
      ["all", labels.publicCatalog],
      ["product", labels.products],
      ["service", labels.services],
      ["newest", labels.newest],
    ];
  }

  if (mode === "buyer") {
    return [
      ["all", labels.total],
      ["active", labels.active],
      ["awaiting", labels.awaiting],
      ["completed", labels.completed],
      ["problem", labels.problems],
    ];
  }

  return [
    ["all", labels.allOffers],
    ["available", labels.activeOffers],
    ["active", labels.active],
    ["awaiting", labels.awaiting],
    ["completed", labels.realizedOffers],
    ["problem", labels.problems],
  ];
}

export function CertificatesDashboardContent({
  initialLocale,
  mode,
  items,
  errorMessage,
}: {
  readonly initialLocale: LocaleCode;
  readonly mode: CertificateDashboardMode;
  readonly items: readonly CertificateDashboardItem[];
  readonly errorMessage?: string | null;
}) {
  const locale = initialLocale;
  const labels = getLabels(locale);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [visibleCount, setVisibleCount] = useState(4);

  const filteredItems = useMemo(
    () => filterItems(items, activeFilter),
    [activeFilter, items],
  );

  useEffect(() => {
    setVisibleCount(4);
  }, [activeFilter, items.length]);

  const displayedItems = filteredItems.slice(0, visibleCount);
  const hasMore = visibleCount < filteredItems.length;
  const productsCount = items.filter(
    (item) => item.objectKind === "product_type",
  ).length;
  const servicesCount = items.filter(
    (item) => item.objectKind === "service_type",
  ).length;
  const availableCount = items.filter(
    (item) => item.state === "available",
  ).length;
  const activeCount = items.filter((item) =>
    ["active", "checked_in"].includes(item.state),
  ).length;
  const awaitingCount = items.filter(
    (item) => item.state === "awaiting_confirmation",
  ).length;
  const completedCount = items.filter((item) =>
    ["confirmed_by_buyer", "auto_confirmed", "redeemed"].includes(item.state),
  ).length;
  const problemCount = items.filter((item) =>
    ["problem", "expired", "annulled"].includes(item.state),
  ).length;
  const completionPercent =
    mode === "catalog"
      ? getPercent(items.length, Math.max(items.length, 1))
      : getPercent(completedCount, items.length);

  const action =
    mode === "catalog"
      ? {
          href: appendLocale("/my-certificates", locale),
          label: labels.myCertificates,
        }
      : mode === "buyer"
        ? {
            href: appendLocale("/certificates", locale),
            label: labels.catalog,
          }
        : {
            href: appendLocale("/value-objects", locale),
            label: labels.createCertificate,
          };

  const rightAction =
    mode === "provider"
      ? {
          href: appendLocale("/value-objects", locale),
          label: labels.createCertificate,
        }
      : {
          href: appendLocale("/certificates", locale),
          label: labels.findCertificate,
        };

  const breakdownRows: ReadonlyArray<readonly [string, number]> =
    mode === "catalog"
      ? [
          [labels.products, productsCount],
          [labels.services, servicesCount],
          [labels.available, availableCount],
        ]
      : mode === "buyer"
        ? [
            [labels.active, activeCount],
            [labels.awaiting, awaitingCount],
            [labels.completed, completedCount],
          ]
        : [
            [labels.available, availableCount],
            [labels.active, activeCount],
            [labels.completed, completedCount],
          ];

  const attentionValue =
    mode === "catalog"
      ? labels.publicCatalog
      : problemCount > 0
        ? String(problemCount)
        : mode === "buyer" && awaitingCount > 0
          ? String(awaitingCount)
          : mode === "provider" && awaitingCount > 0
            ? String(awaitingCount)
            : labels.noActions;

  const attentionSub =
    problemCount > 0
      ? labels.problems
      : awaitingCount > 0
        ? labels.awaiting
        : labels.noProblems;

  const filters = getFilterDefinitions(mode, labels);

  return (
    <div className="p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[20px] font-bold leading-tight text-[#1a1d2e]">
            {labels.titles[mode]}
          </h1>
          <p className="mt-0.5 text-[13px] text-[#7c8099]">
            {labels.subtitles[mode]}
          </p>
        </div>
        <Link
          href={action.href}
          className="flex w-fit items-center gap-1 rounded-lg border border-[#22c55e]/30 bg-[#ecfdf3] px-3 py-1.5 text-[12px] font-medium text-[#16a34a] transition-all hover:bg-[#dcfce7]"
        >
          <Plus size={12} />
          {action.label}
        </Link>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {mode === "provider" ? (
          <>
            <KpiCard
              label={labels.allOffers}
              value={String(items.length)}
              sub={`${labels.activeOffers}: ${availableCount} · ${labels.realizedOffers}: ${completedCount}`}
              accent="#3b6ef8"
              icon={Star}
            />
            <KpiCard
              label={labels.activeOffers}
              value={String(availableCount)}
              sub={labels.states.available}
              accent="#22c55e"
              icon={Zap}
            />
            <KpiCard
              label={labels.active}
              value={String(activeCount + awaitingCount)}
              sub={labels.awaiting}
              accent="#f97316"
              icon={Activity}
            />
            <KpiCard
              label={labels.realizedOffers}
              value={String(completedCount)}
              sub={`${completedCount} / ${items.length}`}
              accent="#8b5cf6"
              icon={Target}
            />
          </>
        ) : (
          <>
            <KpiCard
              label={labels.total}
              value={String(items.length)}
              sub={labels.subtitles[mode]}
              accent="#3b6ef8"
              icon={Star}
              trend={labels.details}
            />
            <BreakdownKpi labels={labels} rows={breakdownRows} />
            <KpiCard
              label={labels.nextAction}
              value={attentionValue}
              sub={attentionSub}
              accent={problemCount > 0 ? "#ef4444" : "#22c55e"}
              icon={problemCount > 0 ? CircleAlert : Activity}
            />
            <ProgressKpi
              label={labels.completion}
              percent={completionPercent}
              sub={
                mode === "catalog"
                  ? labels.publicCatalog
                  : `${completedCount} / ${items.length}`
              }
            />
          </>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {filters.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveFilter(key)}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all ${
              activeFilter === key
                ? "bg-[#3b6ef8] text-white shadow-sm"
                : "border border-[rgba(0,0,0,0.07)] bg-white text-[#5a5f7a] hover:bg-[#f5f6fb]"
            }`}
          >
            {label}
          </button>
        ))}

        <button
          type="button"
          className="rounded-lg border border-[rgba(0,0,0,0.07)] bg-white px-3 py-1.5 text-[12px] font-medium text-[#5a5f7a]"
        >
          {labels.searchFilters}
        </button>

        <Link
          href={rightAction.href}
          className="ml-auto flex items-center gap-1 rounded-lg border border-[#f97316]/40 bg-[#fff7ed] px-3 py-1.5 text-[12px] font-medium text-[#ea580c] transition-all hover:bg-[#ffedd5]"
        >
          <Search size={12} />
          {rightAction.label}
        </Link>
      </div>

      {errorMessage ? (
        <div className="mb-3 rounded-xl border border-[#fecaca] bg-[#fef2f2] p-4 text-[13px] font-semibold text-[#b91c1c]">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {displayedItems.map((item) => (
          <AnalyticsCard
            key={item.id}
            title={item.title}
            detailsLabel={labels.details}
            href={item.href}
          >
            <CertificatePreview
              item={item}
              mode={mode}
              labels={labels}
              locale={locale}
            />
          </AnalyticsCard>
        ))}
      </div>

      {!errorMessage && displayedItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#cbd5e1] bg-white p-5 text-[13px] font-semibold text-[#64748b]">
          {labels.empty}
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between rounded-xl border border-[rgba(0,0,0,0.06)] bg-white px-4 py-3 shadow-sm">
        <span className="text-[11px] text-[#7c8099]">
          {labels.shown} {displayedItems.length} {labels.of} {filteredItems.length}
        </span>
        {hasMore ? (
          <button
            type="button"
            onClick={() => setVisibleCount((value) => value + 4)}
            className="rounded-lg bg-[#eef2ff] px-3 py-1.5 text-[11px] font-semibold text-[#3b6ef8]"
          >
            {labels.showMore}
          </button>
        ) : null}
      </div>

      <div className="mt-5">
        <h2 className="mb-3 text-[13px] font-semibold text-[#1a1d2e]">
          {labels.searchSection}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {mode === "provider" ? (
            <>
              <DirectionCard
                label={labels.activeOffers}
                count={availableCount}
                total={items.length}
                color="#3b6ef8"
              />
              <DirectionCard
                label={labels.active}
                count={activeCount}
                total={items.length}
                color="#f97316"
              />
              <DirectionCard
                label={labels.awaiting}
                count={awaitingCount}
                total={items.length}
                color="#22c55e"
              />
              <DirectionCard
                label={labels.realizedOffers}
                count={completedCount}
                total={items.length}
                color="#8b5cf6"
              />
            </>
          ) : (
            <>
              <DirectionCard
                label={mode === "catalog" ? labels.products : labels.active}
                count={mode === "catalog" ? productsCount : activeCount}
                total={items.length}
                color="#3b6ef8"
              />
              <DirectionCard
                label={mode === "catalog" ? labels.services : labels.awaiting}
                count={mode === "catalog" ? servicesCount : awaitingCount}
                total={items.length}
                color="#f97316"
              />
              <DirectionCard
                label={mode === "catalog" ? labels.available : labels.completed}
                count={mode === "catalog" ? availableCount : completedCount}
                total={items.length}
                color="#22c55e"
              />
              <DirectionCard
                label={mode === "catalog" ? labels.newest : labels.problems}
                count={mode === "catalog" ? items.length : problemCount}
                total={items.length}
                color="#8b5cf6"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
