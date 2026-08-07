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
  | "participants"
  | "mine"
  | "received"
  | "provided"
  | "archive";

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
  readonly providerType: "personal" | "avatar" | "organization";
  readonly providerHref: string | null;
  readonly providerImageUrl: string | null;
  readonly productImageUrl: string | null;
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
  readonly redeemedAt: string | null;
  readonly href: string;
  readonly shareHref: string;
};

type FilterKey =
  | "all"
  | "hidden"
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
  readonly hiddenOffers: string;
  readonly realizedAt: string;
  readonly realizedDate: string;
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
    participants: "All certificates",
    mine: "My certificates",
    received: "My certificates",
    provided: "Provided certificates",
    archive: "Offer archive",
  },
  subtitles: {
    participants:
      "Available and realized certificates from ARCTor participants.",
    mine:
      "All certificates connected with your account: provided and received.",
    received:
      "Certificates ordered by your account, their check-in and confirmation states.",
    provided:
      "Give gifts — meet new customers and friends.",
    archive:
      "Completed, expired and annulled certificates available to your account.",
  },
  total: "Certificates",
  allOffers: "All offers",
  activeOffers: "Available",
  realizedOffers: "Realized offers",
  hiddenOffers: "Hidden offers",
  realizedAt: "Realized",
  realizedDate: "Realization date",
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
  createCertificate: "Add super offer",
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
  recipientPending: "Recipient not assigned yet",
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
    draft: "Hidden",
    available: "Available to order",
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
    participants: "Все сертификаты",
    mine: "Мои сертификаты",
    received: "Мои сертификаты",
    provided: "Предоставленные сертификаты",
    archive: "Архив предложений",
  },
  subtitles: {
    participants:
      "Доступные и реализованные сертификаты всех участников ARCTor.",
    mine:
      "Все предоставленные и полученные сертификаты вашей учётной записи.",
    received:
      "Сертификаты, заказанные вашей учётной записью, и состояния их исполнения.",
    provided:
      "Делайте подарки — находите новых покупателей и друзей.",
    archive:
      "Завершённые, истёкшие и аннулированные сертификаты вашей учётной записи.",
  },
  total: "Сертификаты",
  allOffers: "Все предложения",
  activeOffers: "Доступные",
  realizedOffers: "Реализованные предложения",
  hiddenOffers: "Скрытые предложения",
  realizedAt: "Реализовано",
  realizedDate: "Дата реализации",
  available: "Доступные",
  active: "Заказаны",
  awaiting: "Ожидают подтверждения",
  completed: "Подтверждены",
  problems: "Требуют разбора",
  products: "Товары",
  services: "Услуги",
  newest: "Сначала новые",
  searchFilters: "Поиск и фильтры",
  findCertificate: "Найти предложение",
  createCertificate: "Добавить суперпредложение",
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
  recipientPending: "Получатель пока не назначен",
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
    draft: "Скрыто",
    available: "Доступен для заказа",
    active: "Заказан",
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
    participants: "Wszystkie certyfikaty",
    mine: "Moje certyfikaty",
    received: "Moje bony",
    provided: "Wydane certyfikaty",
    archive: "Archiwum ofert",
  },
  subtitles: {
    participants:
      "Dostępne i zrealizowane certyfikaty wszystkich uczestników ARCTor.",
    mine:
      "Wszystkie wydane i otrzymane certyfikaty powiązane z Twoim kontem.",
    received:
      "Bony zamówione przez Twoje konto oraz stan ich realizacji.",
    provided:
      "Dawaj prezenty — zdobywaj nowych klientów i przyjaciół.",
    archive:
      "Zrealizowane, wygasłe i anulowane certyfikaty dostępne dla Twojego konta.",
  },
  total: "Bony",
  allOffers: "Wszystkie oferty",
  activeOffers: "Dostępne",
  realizedOffers: "Zrealizowane oferty",
  hiddenOffers: "Ukryte oferty",
  realizedAt: "Zrealizowano",
  realizedDate: "Data realizacji",
  available: "Dostępne",
  active: "Zamówione",
  awaiting: "Oczekują na potwierdzenie",
  completed: "Potwierdzone",
  problems: "Wymagają wyjaśnienia",
  products: "Produkty",
  services: "Usługi",
  newest: "Najnowsze",
  searchFilters: "Wyszukiwanie i filtry",
  findCertificate: "Znajdź ofertę",
  createCertificate: "Dodaj superofertę",
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
  recipientPending: "Odbiorca nie został jeszcze przypisany",
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
    draft: "Ukryta",
    available: "Dostępny do zamówienia",
    active: "Zamówiony",
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
        participants: "Усі сертифікати",
        mine: "Мої сертифікати",
        received: "Мої сертифікати",
        provided: "Надані сертифікати",
        archive: "Архів пропозицій",
      },
      subtitles: {
        participants:
          "Доступні й реалізовані сертифікати всіх учасників ARCTor.",
        mine:
          "Усі надані та отримані сертифікати вашого облікового запису.",
        received:
          "Сертифікати, замовлені вашим обліковим записом, і стани їх виконання.",
        provided:
          "Робіть подарунки — знаходьте нових покупців і друзів.",
        archive:
          "Завершені, прострочені та анульовані сертифікати вашого облікового запису.",
      },
      total: "Сертифікати",
      allOffers: "Усі пропозиції",
      activeOffers: "Доступні",
      realizedOffers: "Реалізовані пропозиції",
      hiddenOffers: "Приховані пропозиції",
      realizedAt: "Реалізовано",
      realizedDate: "Дата реалізації",
      available: "Доступні",
      active: "Замовлені",
      awaiting: "Очікують підтвердження",
      completed: "Підтверджені",
      problems: "Потребують розгляду",
      products: "Товари",
      services: "Послуги",
      newest: "Спочатку нові",
      searchFilters: "Пошук і фільтри",
      findCertificate: "Знайти пропозицію",
      createCertificate: "Додати суперпропозицію",
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
      recipientPending: "Отримувача ще не призначено",
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
        draft: "Приховано",
        available: "Доступний для замовлення",
        active: "Замовлено",
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
        participants: "Alle Gutscheine",
        mine: "Meine Gutscheine",
        received: "Meine Gutscheine",
        provided: "Bereitgestellte Gutscheine",
        archive: "Angebotsarchiv",
      },
      subtitles: {
        participants:
          "Verfügbare und erfüllte Gutscheine aller ARCTor-Teilnehmer.",
        mine:
          "Alle mit Ihrem Konto verbundenen bereitgestellten und erhaltenen Gutscheine.",
        received:
          "Von Ihrem Konto bestellte Gutscheine und der Stand ihrer Erfüllung.",
        provided:
          "Machen Sie Geschenke – gewinnen Sie neue Kunden und Freunde.",
        archive:
          "Erfüllte, abgelaufene und annullierte Gutscheine Ihres Kontos.",
      },
      total: "Gutscheine",
      allOffers: "Alle Angebote",
      activeOffers: "Verfügbar",
      realizedOffers: "Erfüllte Angebote",
      hiddenOffers: "Ausgeblendete Angebote",
      realizedAt: "Erfüllt",
      realizedDate: "Datum der Erfüllung",
      available: "Zur Bestellung verfügbar",
      active: "Bestellt",
      awaiting: "Bestätigung ausstehend",
      completed: "Bestätigt",
      problems: "Prüfung erforderlich",
      products: "Produkte",
      services: "Dienstleistungen",
      newest: "Neueste zuerst",
      searchFilters: "Suche und Filter",
      findCertificate: "Angebot finden",
      createCertificate: "Superangebot hinzufügen",
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
      recipientPending: "Empfänger noch nicht zugewiesen",
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
        draft: "Ausgeblendet",
        available: "Zur Bestellung verfügbar",
        active: "Bestellt",
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
        participants: "Todos los certificados",
        mine: "Mis certificados",
        received: "Mis certificados",
        provided: "Certificados proporcionados",
        archive: "Archivo de ofertas",
      },
      subtitles: {
        participants:
          "Certificados disponibles y realizados por todos los participantes de ARCTor.",
        mine:
          "Todos los certificados proporcionados y recibidos vinculados a tu cuenta.",
        received:
          "Certificados solicitados por tu cuenta y el estado de su cumplimiento.",
        provided:
          "Haz regalos y encuentra nuevos clientes y amigos.",
        archive:
          "Certificados realizados, caducados y anulados disponibles para tu cuenta.",
      },
      total: "Certificados",
      allOffers: "Todas las ofertas",
      activeOffers: "Disponibles",
      realizedOffers: "Ofertas realizadas",
      hiddenOffers: "Ofertas ocultas",
      realizedAt: "Realizada",
      realizedDate: "Fecha de realización",
      available: "Disponibles",
      active: "Solicitadas",
      awaiting: "Esperan confirmación",
      completed: "Confirmadas",
      problems: "Requieren revisión",
      products: "Productos",
      services: "Servicios",
      newest: "Más recientes",
      searchFilters: "Búsqueda y filtros",
      findCertificate: "Buscar oferta",
      createCertificate: "Añadir superoferta",
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
      recipientPending: "Destinatario aún no asignado",
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
        draft: "Oculta",
        available: "Disponible para solicitar",
        active: "Solicitada",
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
        participants: "Všechny certifikáty",
        mine: "Moje certifikáty",
        received: "Moje certifikáty",
        provided: "Poskytnuté certifikáty",
        archive: "Archiv nabídek",
      },
      subtitles: {
        participants:
          "Dostupné a realizované certifikáty všech účastníků ARCTor.",
        mine:
          "Všechny poskytnuté a přijaté certifikáty spojené s vaším účtem.",
        received:
          "Certifikáty objednané vaším účtem a stav jejich splnění.",
        provided:
          "Dávejte dárky — získávejte nové zákazníky a přátele.",
        archive:
          "Realizované, prošlé a anulované certifikáty dostupné pro váš účet.",
      },
      total: "Certifikáty",
      allOffers: "Všechny nabídky",
      activeOffers: "Dostupné",
      realizedOffers: "Realizované nabídky",
      hiddenOffers: "Skryté nabídky",
      realizedAt: "Realizováno",
      realizedDate: "Datum realizace",
      available: "Dostupné",
      active: "Objednané",
      awaiting: "Čekají na potvrzení",
      completed: "Potvrzené",
      problems: "Vyžadují posouzení",
      products: "Produkty",
      services: "Služby",
      newest: "Nejnovější",
      searchFilters: "Vyhledávání a filtry",
      findCertificate: "Najít nabídku",
      createCertificate: "Přidat supernabídku",
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
      recipientPending: "Příjemce zatím nebyl přiřazen",
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
        draft: "Skryto",
        available: "Dostupný k objednání",
        active: "Objednáno",
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

type CertificateScopeCopy = {
  readonly mine: string;
  readonly all: string;
  readonly roleAll: string;
  readonly roleReceived: string;
  readonly roleProvided: string;
  readonly providerTypes: Record<
    CertificateDashboardItem["providerType"],
    string
  >;
};

const CERTIFICATE_SCOPE_COPY: Record<LocaleCode, CertificateScopeCopy> = {
  en: {
    mine: "My certificates",
    all: "All certificates",
    roleAll: "All mine",
    roleReceived: "Received",
    roleProvided: "Provided",
    providerTypes: {
      personal: "Personal profile",
      avatar: "Avatar",
      organization: "Business",
    },
  },
  ru: {
    mine: "Мои сертификаты",
    all: "Все сертификаты",
    roleAll: "Все мои",
    roleReceived: "Полученные",
    roleProvided: "Предоставленные",
    providerTypes: {
      personal: "Личный профиль",
      avatar: "Аватар",
      organization: "Предприятие",
    },
  },
  pl: {
    mine: "Moje certyfikaty",
    all: "Wszystkie certyfikaty",
    roleAll: "Wszystkie moje",
    roleReceived: "Otrzymane",
    roleProvided: "Wydane",
    providerTypes: {
      personal: "Profil osobisty",
      avatar: "Awatar",
      organization: "Firma",
    },
  },
  uk: {
    mine: "Мої сертифікати",
    all: "Усі сертифікати",
    roleAll: "Усі мої",
    roleReceived: "Отримані",
    roleProvided: "Надані",
    providerTypes: {
      personal: "Особистий профіль",
      avatar: "Аватар",
      organization: "Підприємство",
    },
  },
  de: {
    mine: "Meine Gutscheine",
    all: "Alle Gutscheine",
    roleAll: "Alle meine",
    roleReceived: "Erhalten",
    roleProvided: "Bereitgestellt",
    providerTypes: {
      personal: "Persönliches Profil",
      avatar: "Avatar",
      organization: "Unternehmen",
    },
  },
  es: {
    mine: "Mis certificados",
    all: "Todos los certificados",
    roleAll: "Todos los míos",
    roleReceived: "Recibidos",
    roleProvided: "Proporcionados",
    providerTypes: {
      personal: "Perfil personal",
      avatar: "Avatar",
      organization: "Empresa",
    },
  },
  cs: {
    mine: "Moje certifikáty",
    all: "Všechny certifikáty",
    roleAll: "Všechny moje",
    roleReceived: "Přijaté",
    roleProvided: "Poskytnuté",
    providerTypes: {
      personal: "Osobní profil",
      avatar: "Avatar",
      organization: "Podnik",
    },
  },
};

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

function formatDate(
  value: string,
  locale: LocaleCode,
  includeTime = false,
): string {
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(isDateOnly ? `${value}T12:00:00Z` : value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    locale === "en" ? "en-US" : locale,
    includeTime
      ? {
          dateStyle: "medium",
          timeStyle: "short",
        }
      : {
          dateStyle: "medium",
          timeZone: "UTC",
        },
  ).format(date);
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
      <span className="line-clamp-1 text-[12px] font-semibold text-[#1a1d2e]">
        {name}
      </span>
    );
  }

  return (
    <Link
      href={appendLocale(href, locale)}
      className="line-clamp-1 text-[12px] font-semibold text-[#315bd0] hover:underline"
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
  const isRealized = [
    "confirmed_by_buyer",
    "auto_confirmed",
    "redeemed",
  ].includes(item.state);
  const displayedStateLabel =
    mode === "participants" && isRealized
      ? labels.realizedAt
      : labels.states[item.state];
  const displayedDate =
    isRealized
      ? item.finalizedAt ?? item.redeemedAt ?? item.availableUntil
      : item.availableUntil;
  const displayedDateLabel =
    isRealized ? labels.realizedDate : labels.validity;

  return (
    <div className="flex min-h-[190px] items-start gap-3 sm:gap-4">
      <div className="flex w-[92px] shrink-0 flex-col items-start sm:w-[110px]">
        <div className="relative flex h-[104px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#eef2ff] text-[#3b6ef8] sm:h-[120px]">
          {item.productImageUrl ? (
            <img
              src={item.productImageUrl}
              alt={item.title}
              className="h-full w-full object-cover object-center"
            />
          ) : item.objectKind === "service_type" ? (
            <Gift size={30} />
          ) : (
            <Package size={30} />
          )}

          {item.providerImageUrl ? (
            item.providerHref ? (
              <Link
                href={appendLocale(item.providerHref, locale)}
                aria-label={item.providerName}
                className="absolute bottom-2 right-2 h-9 w-9 overflow-hidden rounded-full border-2 border-white bg-white shadow-md"
              >
                <img
                  src={item.providerImageUrl}
                  alt={item.providerName}
                  className="h-full w-full object-cover object-center"
                />
              </Link>
            ) : (
              <div className="absolute bottom-2 right-2 h-9 w-9 overflow-hidden rounded-full border-2 border-white bg-white shadow-md">
                <img
                  src={item.providerImageUrl}
                  alt={item.providerName}
                  className="h-full w-full object-cover object-center"
                />
              </div>
            )
          ) : null}
        </div>

        {item.state !== "draft" ? (
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
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[13px] leading-5 text-[#5a5f7a]">
          {item.description?.trim() || item.title}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className="rounded-lg px-2.5 py-1 text-[11px] font-semibold"
            style={stateTone}
          >
            {displayedStateLabel}
          </span>
        </div>

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
            <div className="text-[10px] text-[#9ca3b8]">
              {CERTIFICATE_SCOPE_COPY[locale].providerTypes[item.providerType]}
            </div>
          </div>

          {mode !== "participants" || isRealized ? (
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
              <div className="line-clamp-1 text-[12px] font-semibold text-[#1a1d2e]">
                {formatNumber(item.providerReputation, locale)}
              </div>
              <div className="text-[10px] text-[#9ca3b8]">{labels.reputation}</div>
            </div>
          )}

          <div className="col-span-2 min-w-0 rounded-lg bg-[#f8fafc] px-2 py-1.5 sm:col-span-1">
            <div className="line-clamp-1 text-[12px] font-semibold text-[#1a1d2e]">
              {formatDate(displayedDate, locale, isRealized)}
            </div>
            <div className="text-[10px] text-[#9ca3b8]">
              {displayedDateLabel}
            </div>
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
  if (filter === "hidden") {
    return items.filter((item) => item.state === "draft");
  }

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

  if (filter === "newest") {
    return [...items].sort((left, right) =>
      String(
        right.finalizedAt ??
          right.redeemedAt ??
          right.orderedAt ??
          right.publishedAt ??
          "",
      ).localeCompare(
        String(
          left.finalizedAt ??
            left.redeemedAt ??
            left.orderedAt ??
            left.publishedAt ??
            "",
        ),
      ),
    );
  }

  return [...items];
}

function getFilterDefinitions(
  mode: CertificateDashboardMode,
  labels: Labels,
): ReadonlyArray<readonly [FilterKey, string]> {
  if (mode === "participants") {
    return [
      ["all", labels.allOffers],
      ["available", labels.activeOffers],
      ["completed", labels.realizedOffers],
      ["product", labels.products],
      ["service", labels.services],
      ["newest", labels.newest],
    ];
  }

  if (mode === "mine") {
    return [
      ["all", labels.total],
      ["available", labels.available],
      ["hidden", labels.hiddenOffers],
      ["active", labels.active],
      ["awaiting", labels.awaiting],
      ["completed", labels.completed],
      ["problem", labels.problems],
      ["newest", labels.newest],
    ];
  }

  if (mode === "received") {
    return [
      ["all", labels.total],
      ["active", labels.active],
      ["awaiting", labels.awaiting],
      ["completed", labels.completed],
      ["problem", labels.problems],
      ["newest", labels.newest],
    ];
  }

  if (mode === "archive") {
    return [
      ["all", labels.total],
      ["product", labels.products],
      ["service", labels.services],
      ["newest", labels.newest],
    ];
  }

  return [
    ["all", labels.allOffers],
    ["available", labels.activeOffers],
    ["hidden", labels.hiddenOffers],
    ["active", labels.active],
    ["awaiting", labels.awaiting],
    ["completed", labels.realizedOffers],
    ["problem", labels.problems],
    ["newest", labels.newest],
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
  const scopeCopy = CERTIFICATE_SCOPE_COPY[locale];
  const isAllScope = mode === "participants";
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [visibleCount, setVisibleCount] = useState(4);
  const filters = getFilterDefinitions(mode, labels);
  const effectiveFilter = filters.some(([key]) => key === activeFilter)
    ? activeFilter
    : "all";

  const filteredItems = useMemo(
    () => filterItems(items, effectiveFilter),
    [effectiveFilter, items],
  );

  useEffect(() => {
    setActiveFilter("all");
    setVisibleCount(4);
  }, [mode]);

  useEffect(() => {
    setVisibleCount(4);
  }, [effectiveFilter, items.length]);

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
  const hiddenCount = items.filter((item) => item.state === "draft").length;
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
  const completionPercent = getPercent(completedCount, items.length);

  const action = {
    href: appendLocale("/offers/new", locale),
    label: labels.createCertificate,
  };

  const rightAction =
    mode === "provided"
      ? {
          href: appendLocale("/offers/new", locale),
          label: labels.createCertificate,
        }
      : mode === "participants"
        ? {
            href: appendLocale("/certificates?scope=mine", locale),
            label: scopeCopy.mine,
          }
        : {
            href: appendLocale("/certificates?scope=all", locale),
            label: scopeCopy.all,
          };

  const breakdownRows: ReadonlyArray<readonly [string, number]> =
    mode === "participants"
      ? [
          [labels.activeOffers, availableCount],
          [labels.realizedOffers, completedCount],
          [labels.products, productsCount],
        ]
      : mode === "mine"
        ? [
            [labels.available, availableCount],
            [labels.active, activeCount],
            [labels.completed, completedCount],
          ]
        : mode === "received"
          ? [
              [labels.active, activeCount],
              [labels.awaiting, awaitingCount],
              [labels.completed, completedCount],
            ]
          : mode === "archive"
          ? [
              [labels.products, productsCount],
              [labels.services, servicesCount],
              [labels.completed, completedCount],
            ]
          : [
              [labels.available, availableCount],
              [labels.active, activeCount],
              [labels.completed, completedCount],
            ];

  const attentionValue =
    mode === "participants"
      ? labels.publicCatalog
      : problemCount > 0
        ? String(problemCount)
        : mode === "received" && awaitingCount > 0
          ? String(awaitingCount)
          : mode === "provided" && awaitingCount > 0
            ? String(awaitingCount)
            : labels.noActions;

  const attentionSub =
    problemCount > 0
      ? labels.problems
      : awaitingCount > 0
        ? labels.awaiting
        : labels.noProblems;

  return (
    <div className="p-5">
      <div className="mb-4 inline-flex rounded-xl border border-[#dfe3f1] bg-white p-1 shadow-sm">
        <Link
          href={appendLocale("/certificates?scope=mine", locale)}
          className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition-all ${
            !isAllScope
              ? "bg-[#3b6ef8] text-white shadow-sm"
              : "text-[#5a5f7a] hover:bg-[#f5f6fb]"
          }`}
        >
          {scopeCopy.mine}
        </Link>
        <Link
          href={appendLocale("/certificates?scope=all", locale)}
          className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition-all ${
            isAllScope
              ? "bg-[#3b6ef8] text-white shadow-sm"
              : "text-[#5a5f7a] hover:bg-[#f5f6fb]"
          }`}
        >
          {scopeCopy.all}
        </Link>
      </div>

      {!isAllScope ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            ["mine", scopeCopy.roleAll, "/certificates?scope=mine"],
            [
              "received",
              scopeCopy.roleReceived,
              "/certificates?scope=mine&role=received",
            ],
            [
              "provided",
              scopeCopy.roleProvided,
              "/certificates?scope=mine&role=provided",
            ],
          ].map(([roleMode, label, href]) => (
            <Link
              key={roleMode}
              href={appendLocale(href, locale)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all ${
                mode === roleMode || (mode === "archive" && roleMode === "mine")
                  ? "bg-[#eef2ff] text-[#315bd0] ring-1 ring-[#c7d2fe]"
                  : "border border-[rgba(0,0,0,0.07)] bg-white text-[#5a5f7a] hover:bg-[#f5f6fb]"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mb-5">
        <h1 className="text-[20px] font-bold leading-tight text-[#1a1d2e]">
          {labels.titles[mode]}
        </h1>
        <p className="mt-0.5 text-[13px] text-[#7c8099]">
          {labels.subtitles[mode]}
        </p>
        <Link
          href={action.href}
          className="mt-3 flex w-fit items-center gap-1.5 rounded-xl border border-[#22c55e]/35 bg-[#ecfdf3] px-4 py-2 text-[13px] font-semibold text-[#16a34a] shadow-sm transition-all hover:bg-[#dcfce7]"
        >
          <Plus size={14} />
          {action.label}
        </Link>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {mode === "provided" ? (
          <>
            <KpiCard
              label={labels.allOffers}
              value={String(items.length)}
              sub={`${labels.activeOffers}: ${availableCount} · ${labels.hiddenOffers}: ${hiddenCount} · ${labels.realizedOffers}: ${completedCount}`}
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
                mode === "participants"
                  ? `${labels.realizedOffers}: ${completedCount} / ${items.length}`
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
        <div className="mb-3 rounded-xl border border-[#fecaca] bg-[#fef2f2] p-4 text-[13px] font-medium text-[#b91c1c]">
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
        <div className="rounded-xl border border-dashed border-[#cbd5e1] bg-white p-5 text-[13px] font-medium text-[#64748b]">
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
          {mode === "provided" ? (
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
                label={mode === "participants" ? labels.products : labels.active}
                count={mode === "participants" ? productsCount : activeCount}
                total={items.length}
                color="#3b6ef8"
              />
              <DirectionCard
                label={mode === "participants" ? labels.services : labels.awaiting}
                count={mode === "participants" ? servicesCount : awaitingCount}
                total={items.length}
                color="#f97316"
              />
              <DirectionCard
                label={mode === "participants" ? labels.available : labels.completed}
                count={mode === "participants" ? availableCount : completedCount}
                total={items.length}
                color="#22c55e"
              />
              <DirectionCard
                label={
                  mode === "participants" ? labels.realizedOffers : labels.problems
                }
                count={mode === "participants" ? completedCount : problemCount}
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
