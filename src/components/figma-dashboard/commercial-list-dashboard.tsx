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
  Activity,
  Gift,
  Plus,
  Star,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

import { type LocaleCode } from "@/i18n";

type DashboardMode = "offers" | "certificates";
type IconComponent = ElementType;

type OrganizationRecord = {
  id: string;
  organization_name: string | null;
  organization_type: string | null;
  public_slug?: string | null;
  country_code?: string | null;
  default_currency?: string | null;
  status?: string | null;
};

type OfferRecord = {
  id: string;
  organization_id?: string | null;
  offer_type?: string | null;
  title?: string | null;
  description?: string | null;
  price?: number | null;
  regular_price?: number | null;
  currency?: string | null;
  is_paid?: boolean | null;
  is_free?: boolean | null;
  certificate_available?: boolean | null;
  certificate_payment_mode?: string | null;
  certificate_points_price?: number | null;
  certificate_money_price?: number | null;
  certificate_currency?: string | null;
  certificate_terms?: string | null;
  certificate_validity_days?: number | null;
  requires_seller_confirmation?: boolean | null;
  is_transferable?: boolean | null;
  is_cancellable?: boolean | null;
  points_refund_policy?: string | null;
  max_certificates_total?: number | null;
  requires_booking?: boolean | null;
  booking_mode?: string | null;
  default_duration_minutes?: number | null;
  quantity_limit?: number | null;
  status?: string | null;
  created_at?: string | null;
  organizations?: OrganizationRecord | OrganizationRecord[] | null;
};

type OffersApiResponse = {
  ok?: boolean;
  offers?: OfferRecord[];
  error?: string;
};

type FilterKey =
  | "all"
  | "active"
  | "certificateReady"
  | "paid"
  | "free"
  | "points"
  | "money"
  | "mixed"
  | "transferable"
  | "newest";

type Labels = {
  offersTitle: string;
  offersSubtitle: string;
  certificatesTitle: string;
  certificatesSubtitle: string;
  found: string;
  published: string;
  availableActions: string;
  active: string;
  certificateReady: string;
  paid: string;
  free: string;
  points: string;
  money: string;
  mixed: string;
  transferable: string;
  searchFilters: string;
  openPreview: string;
  createOffer: string;
  createCertificate: string;
  noOffers: string;
  noCertificates: string;
  loading: string;
  error: string;
  price: string;
  validity: string;
  days: string;
  organization: string;
  status: string;
  offer: string;
  certificate: string;
  certificateCatalog: string;
  allOffers: string;
  allCertificates: string;
  newest: string;
  directions: string;
};

const LABELS: Record<LocaleCode, Labels> = {
  ru: {
    offersTitle: "\u041f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u044f",
    offersSubtitle: "\u041e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u043d\u043d\u044b\u0435 \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u044f \u043f\u043e\u043a\u0430\u0437\u0430\u043d\u044b \u0432 \u0442\u043e\u043c \u0436\u0435 \u0444\u043e\u0440\u043c\u0430\u0442\u0435 Dashboard.",
    certificatesTitle: "\u041f\u043e\u0434\u0430\u0440\u043e\u0447\u043d\u044b\u0435 \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u044b",
    certificatesSubtitle: "\u041f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u044f \u0441 \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u0430\u043c\u0438 \u043f\u043e\u043a\u0430\u0437\u0430\u043d\u044b \u0432 \u0442\u043e\u043c \u0436\u0435 \u0444\u043e\u0440\u043c\u0430\u0442\u0435 Dashboard.",
    found: "\u041d\u0430\u0439\u0434\u0435\u043d\u043e",
    published: "\u041e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u043d\u043e",
    availableActions: "\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f",
    active: "\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0435",
    certificateReady: "\u0421 \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u0430\u043c\u0438",
    paid: "\u041f\u043b\u0430\u0442\u043d\u044b\u0435",
    free: "\u0411\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u043e",
    points: "POINTS",
    money: "\u0414\u0435\u043d\u044c\u0433\u0438",
    mixed: "\u0421\u043c\u0435\u0448\u0430\u043d\u043d\u044b\u0435",
    transferable: "\u041f\u0435\u0440\u0435\u0434\u0430\u0432\u0430\u0435\u043c\u044b\u0435",
    searchFilters: "\u041f\u043e\u0438\u0441\u043a \u0438 \u0444\u0438\u043b\u044c\u0442\u0440\u044b",
    openPreview: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c",
    createOffer: "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u0435",
    createCertificate: "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442",
    noOffers: "\u041f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u0439 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442",
    noCertificates: "\u0421\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0432 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442",
    loading: "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...",
    error: "\u041e\u0448\u0438\u0431\u043a\u0430",
    price: "\u0426\u0435\u043d\u0430",
    validity: "\u0421\u0440\u043e\u043a",
    days: "\u0434\u043d.",
    organization: "\u041f\u0440\u0435\u0434\u043f\u0440\u0438\u044f\u0442\u0438\u0435",
    status: "\u0421\u0442\u0430\u0442\u0443\u0441",
    offer: "\u041f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u0435",
    certificate: "\u0421\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442",
    certificateCatalog: "\u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0432",
    allOffers: "\u0412\u0441\u0435 \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u044f",
    allCertificates: "\u0412\u0441\u0435 \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u044b",
    newest: "\u041d\u043e\u0432\u044b\u0435",
    directions: "\u041d\u0430\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u044f",
  },
  pl: {
    offersTitle: "Oferty",
    offersSubtitle: "Opublikowane oferty s\u0105 pokazane w tym samym uk\u0142adzie Dashboard.",
    certificatesTitle: "Bony podarunkowe",
    certificatesSubtitle: "Oferty z certyfikatami s\u0105 pokazane w tym samym uk\u0142adzie Dashboard.",
    found: "Znaleziono",
    published: "Opublikowane",
    availableActions: "Dost\u0119pne dzia\u0142ania",
    active: "Aktywne",
    certificateReady: "Z certyfikatami",
    paid: "P\u0142atne",
    free: "Bezp\u0142atne",
    points: "POINTS",
    money: "Pieni\u0105dze",
    mixed: "Mieszane",
    transferable: "Przenoszalne",
    searchFilters: "Szukaj i filtry",
    openPreview: "Otw\u00f3rz",
    createOffer: "Utw\u00f3rz ofert\u0119",
    createCertificate: "Utw\u00f3rz certyfikat",
    noOffers: "Brak ofert",
    noCertificates: "Brak certyfikat\u00f3w",
    loading: "\u0141adowanie...",
    error: "B\u0142\u0105d",
    price: "Cena",
    validity: "Wa\u017cno\u015b\u0107",
    days: "dni",
    organization: "Firma",
    status: "Status",
    offer: "Oferta",
    certificate: "Certyfikat",
    certificateCatalog: "Katalog certyfikat\u00f3w",
    allOffers: "Wszystkie oferty",
    allCertificates: "Wszystkie certyfikaty",
    newest: "Najnowsze",
    directions: "Kierunki",
  },
  en: {
    offersTitle: "Business offers",
    offersSubtitle: "Published offers are shown in the same dashboard layout.",
    certificatesTitle: "Gift certificates",
    certificatesSubtitle: "Certificate-ready offers are shown in the same dashboard layout.",
    found: "Found",
    published: "Published",
    availableActions: "Available actions",
    active: "Active",
    certificateReady: "Certificate ready",
    paid: "Paid",
    free: "Free",
    points: "POINTS",
    money: "Money",
    mixed: "Mixed",
    transferable: "Transferable",
    searchFilters: "Search and filters",
    openPreview: "Open",
    createOffer: "Create offer",
    createCertificate: "Create certificate",
    noOffers: "No offers yet",
    noCertificates: "No certificates yet",
    loading: "Loading...",
    error: "Error",
    price: "Price",
    validity: "Validity",
    days: "days",
    organization: "Business",
    status: "Status",
    offer: "Offer",
    certificate: "Certificate",
    certificateCatalog: "Certificate catalog",
    allOffers: "All offers",
    allCertificates: "All certificates",
    newest: "Newest first",
    directions: "Directions",
  },
  es: {
    offersTitle: "Ofertas",
    offersSubtitle: "Las ofertas publicadas se muestran con el mismo dise\u00f1o Dashboard.",
    certificatesTitle: "Certificados regalo",
    certificatesSubtitle: "Las ofertas con certificado se muestran con el mismo dise\u00f1o Dashboard.",
    found: "Encontrado",
    published: "Publicado",
    availableActions: "Acciones disponibles",
    active: "Activas",
    certificateReady: "Con certificado",
    paid: "De pago",
    free: "Gratis",
    points: "POINTS",
    money: "Dinero",
    mixed: "Mixto",
    transferable: "Transferible",
    searchFilters: "Buscar y filtros",
    openPreview: "Abrir",
    createOffer: "Crear oferta",
    createCertificate: "Crear certificado",
    noOffers: "A\u00fan no hay ofertas",
    noCertificates: "A\u00fan no hay certificados",
    loading: "Cargando...",
    error: "Error",
    price: "Precio",
    validity: "Validez",
    days: "d\u00edas",
    organization: "Empresa",
    status: "Estado",
    offer: "Oferta",
    certificate: "Certificado",
    certificateCatalog: "Cat\u00e1logo de certificados",
    allOffers: "Todas las ofertas",
    allCertificates: "Todos los certificados",
    newest: "M\u00e1s recientes",
    directions: "Direcciones",
  },
  uk: {
    offersTitle: "\u041f\u0440\u043e\u043f\u043e\u0437\u0438\u0446\u0456\u0457",
    offersSubtitle: "\u041e\u043f\u0443\u0431\u043b\u0456\u043a\u043e\u0432\u0430\u043d\u0456 \u043f\u0440\u043e\u043f\u043e\u0437\u0438\u0446\u0456\u0457 \u043f\u043e\u043a\u0430\u0437\u0430\u043d\u0456 \u0443 \u0444\u043e\u0440\u043c\u0430\u0442\u0456 Dashboard.",
    certificatesTitle: "\u041f\u043e\u0434\u0430\u0440\u0443\u043d\u043a\u043e\u0432\u0456 \u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043a\u0430\u0442\u0438",
    certificatesSubtitle: "\u041f\u0440\u043e\u043f\u043e\u0437\u0438\u0446\u0456\u0457 \u0437 \u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043a\u0430\u0442\u0430\u043c\u0438 \u043f\u043e\u043a\u0430\u0437\u0430\u043d\u0456 \u0443 \u0444\u043e\u0440\u043c\u0430\u0442\u0456 Dashboard.",
    found: "\u0417\u043d\u0430\u0439\u0434\u0435\u043d\u043e",
    published: "\u041e\u043f\u0443\u0431\u043b\u0456\u043a\u043e\u0432\u0430\u043d\u043e",
    availableActions: "\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u0456 \u0434\u0456\u0457",
    active: "\u0410\u043a\u0442\u0438\u0432\u043d\u0456",
    certificateReady: "\u0406\u0437 \u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043a\u0430\u0442\u0430\u043c\u0438",
    paid: "\u041f\u043b\u0430\u0442\u043d\u0456",
    free: "\u0411\u0435\u0437\u043a\u043e\u0448\u0442\u043e\u0432\u043d\u043e",
    points: "POINTS",
    money: "\u0413\u0440\u043e\u0448\u0456",
    mixed: "\u0417\u043c\u0456\u0448\u0430\u043d\u0456",
    transferable: "\u041f\u0435\u0440\u0435\u0434\u0430\u0432\u0430\u043d\u0456",
    searchFilters: "\u041f\u043e\u0448\u0443\u043a \u0456 \u0444\u0456\u043b\u044c\u0442\u0440\u0438",
    openPreview: "\u0412\u0456\u0434\u043a\u0440\u0438\u0442\u0438",
    createOffer: "\u0421\u0442\u0432\u043e\u0440\u0438\u0442\u0438 \u043f\u0440\u043e\u043f\u043e\u0437\u0438\u0446\u0456\u044e",
    createCertificate: "\u0421\u0442\u0432\u043e\u0440\u0438\u0442\u0438 \u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043a\u0430\u0442",
    noOffers: "\u041f\u0440\u043e\u043f\u043e\u0437\u0438\u0446\u0456\u0439 \u043f\u043e\u043a\u0438 \u043d\u0435\u043c\u0430\u0454",
    noCertificates: "\u0421\u0435\u0440\u0442\u0438\u0444\u0456\u043a\u0430\u0442\u0456\u0432 \u043f\u043e\u043a\u0438 \u043d\u0435\u043c\u0430\u0454",
    loading: "\u0417\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u043d\u044f...",
    error: "\u041f\u043e\u043c\u0438\u043b\u043a\u0430",
    price: "\u0426\u0456\u043d\u0430",
    validity: "\u0421\u0442\u0440\u043e\u043a",
    days: "\u0434\u043d.",
    organization: "\u041f\u0456\u0434\u043f\u0440\u0438\u0454\u043c\u0441\u0442\u0432\u043e",
    status: "\u0421\u0442\u0430\u0442\u0443\u0441",
    offer: "\u041f\u0440\u043e\u043f\u043e\u0437\u0438\u0446\u0456\u044f",
    certificate: "\u0421\u0435\u0440\u0442\u0438\u0444\u0456\u043a\u0430\u0442",
    certificateCatalog: "\u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043a\u0430\u0442\u0456\u0432",
    allOffers: "\u0423\u0441\u0456 \u043f\u0440\u043e\u043f\u043e\u0437\u0438\u0446\u0456\u0457",
    allCertificates: "\u0423\u0441\u0456 \u0441\u0435\u0440\u0442\u0438\u0444\u0456\u043a\u0430\u0442\u0438",
    newest: "\u041d\u043e\u0432\u0456",
    directions: "\u041d\u0430\u043f\u0440\u044f\u043c\u0438",
  },
  de: {
    offersTitle: "Angebote",
    offersSubtitle: "Ver\u00f6ffentlichte Angebote werden im gleichen Dashboard-Layout angezeigt.",
    certificatesTitle: "Geschenkgutscheine",
    certificatesSubtitle: "Gutschein-f\u00e4hige Angebote werden im gleichen Dashboard-Layout angezeigt.",
    found: "Gefunden",
    published: "Ver\u00f6ffentlicht",
    availableActions: "Verf\u00fcgbare Aktionen",
    active: "Aktiv",
    certificateReady: "Mit Gutschein",
    paid: "Bezahlt",
    free: "Kostenlos",
    points: "POINTS",
    money: "Geld",
    mixed: "Gemischt",
    transferable: "\u00dcbertragbar",
    searchFilters: "Suche und Filter",
    openPreview: "\u00d6ffnen",
    createOffer: "Angebot erstellen",
    createCertificate: "Gutschein erstellen",
    noOffers: "Noch keine Angebote",
    noCertificates: "Noch keine Gutscheine",
    loading: "Laden...",
    error: "Fehler",
    price: "Preis",
    validity: "G\u00fcltigkeit",
    days: "Tage",
    organization: "Unternehmen",
    status: "Status",
    offer: "Angebot",
    certificate: "Gutschein",
    certificateCatalog: "Gutscheinkatalog",
    allOffers: "Alle Angebote",
    allCertificates: "Alle Gutscheine",
    newest: "Neueste zuerst",
    directions: "Richtungen",
  },
  cs: {
    offersTitle: "Nab\u00eddky",
    offersSubtitle: "Publikovan\u00e9 nab\u00eddky jsou zobrazeny ve stejn\u00e9m Dashboard rozvr\u017een\u00ed.",
    certificatesTitle: "D\u00e1rkov\u00e9 certifik\u00e1ty",
    certificatesSubtitle: "Nab\u00eddky s certifik\u00e1ty jsou zobrazeny ve stejn\u00e9m Dashboard rozvr\u017een\u00ed.",
    found: "Nalezeno",
    published: "Publikov\u00e1no",
    availableActions: "Dostupn\u00e9 akce",
    active: "Aktivn\u00ed",
    certificateReady: "S certifik\u00e1tem",
    paid: "Placen\u00e9",
    free: "Zdarma",
    points: "POINTS",
    money: "Pen\u00edze",
    mixed: "Sm\u00ed\u0161en\u00e9",
    transferable: "P\u0159enosn\u00e9",
    searchFilters: "Hledat a filtry",
    openPreview: "Otev\u0159\u00edt",
    createOffer: "Vytvo\u0159it nab\u00eddku",
    createCertificate: "Vytvo\u0159it certifik\u00e1t",
    noOffers: "Zat\u00edm \u017e\u00e1dn\u00e9 nab\u00eddky",
    noCertificates: "Zat\u00edm \u017e\u00e1dn\u00e9 certifik\u00e1ty",
    loading: "Na\u010d\u00edt\u00e1n\u00ed...",
    error: "Chyba",
    price: "Cena",
    validity: "Platnost",
    days: "dn\u016f",
    organization: "Podnik",
    status: "Stav",
    offer: "Nab\u00eddka",
    certificate: "Certifik\u00e1t",
    certificateCatalog: "Katalog certifik\u00e1t\u016f",
    allOffers: "V\u0161echny nab\u00eddky",
    allCertificates: "V\u0161echny certifik\u00e1ty",
    newest: "Nejnov\u011bj\u0161\u00ed",
    directions: "Sm\u011bry",
  },
};

function getLabels(locale: LocaleCode) {
  return LABELS[locale] ?? LABELS.en;
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

function getCommercialRequestActionLabel(mode: DashboardMode, locale: LocaleCode) {
  if (mode === "certificates") {
    if (locale === "ru") {
      return "\u041d\u0430\u0439\u0442\u0438 \u043f\u043e\u0434\u0430\u0440\u043e\u043a";
    }

    if (locale === "uk") {
      return "\u0417\u043d\u0430\u0439\u0442\u0438 \u043f\u043e\u0434\u0430\u0440\u0443\u043d\u043e\u043a";
    }

    if (locale === "pl") {
      return "Znajd\u017a prezent";
    }

    if (locale === "es") {
      return "Encontrar regalo";
    }

    if (locale === "de") {
      return "Geschenk finden";
    }

    if (locale === "cs") {
      return "Naj\u00edt d\u00e1rek";
    }

    return "Find gift";
  }

  if (locale === "ru") {
    return "\u0417\u0430\u043f\u0440\u043e\u0441\u0438\u0442\u044c \u043e\u0444\u0444\u0435\u0440";
  }

  if (locale === "uk") {
    return "\u0417\u0430\u043f\u0440\u043e\u0441\u0438\u0442\u0438 \u043f\u0440\u043e\u043f\u043e\u0437\u0438\u0446\u0456\u044e";
  }

  if (locale === "pl") {
    return "Zapytaj o ofert\u0119";
  }

  if (locale === "es") {
    return "Solicitar oferta";
  }

  if (locale === "de") {
    return "Angebot anfragen";
  }

  if (locale === "cs") {
    return "Po\u017e\u00e1dat o nab\u00eddku";
  }

  return "Request offer";
}
function getFirstRelatedItem<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getOrganizationName(offer: OfferRecord, labels: Labels) {
  const organization = getFirstRelatedItem(offer.organizations);

  return organization?.organization_name ?? labels.organization;
}

function formatMoney(amount: number | null | undefined, currency: string | null | undefined) {
  if (typeof amount !== "number") {
    return "â€”";
  }

  return `${new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 2,
  }).format(amount)} ${currency ?? ""}`.trim();
}

function formatPoints(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "0";
  }

  return new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 2,
  }).format(value);
}

function getOfferPrice(offer: OfferRecord, labels: Labels) {
  if (offer.is_free) {
    return labels.free;
  }

  return formatMoney(offer.price, offer.currency);
}

function getCertificatePrice(offer: OfferRecord, labels: Labels) {
  if (offer.certificate_payment_mode === "points_only") {
    return `${formatPoints(offer.certificate_points_price)} POINTS`;
  }

  if (offer.certificate_payment_mode === "money_only") {
    return formatMoney(
      offer.certificate_money_price ?? offer.price,
      offer.certificate_currency ?? offer.currency,
    );
  }

  if (offer.certificate_payment_mode === "mixed") {
    return `${formatMoney(
      offer.certificate_money_price ?? offer.price,
      offer.certificate_currency ?? offer.currency,
    )} + ${formatPoints(offer.certificate_points_price)} POINTS`;
  }

  return offer.certificate_available ? labels.certificateReady : "â€”";
}

function getOfferHref(offer: OfferRecord, locale: LocaleCode) {
  return `/offers/${offer.id}?locale=${encodeURIComponent(locale)}`;
}

function getCertificateHref(offer: OfferRecord, locale: LocaleCode) {
  return `/certificates/new?offerId=${encodeURIComponent(offer.id)}&locale=${encodeURIComponent(
    locale,
  )}`;
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
          <Link href={valueHref} className="inline-flex w-fit rounded-md transition hover:text-[#3b6ef8]">
            {valueNode}
          </Link>
        ) : (
          valueNode
        )}

        {sub ? <div className="text-[11px] text-[#9ca3b8]">{sub}</div> : null}

        {trendHref && trendNode ? (
          <Link href={trendHref} className="inline-flex w-fit rounded-md transition hover:opacity-80">
            {trendNode}
          </Link>
        ) : (
          trendNode
        )}
      </div>
    </div>
  );
}

function PackageKpi({
  rows,
  title,
  footer,
}: {
  readonly rows: { label: string; value: string }[];
  readonly title: string;
  readonly footer: string;
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[#7c8099]">
          {title}
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f9731618]">
          <Zap size={14} className="text-[#f97316]" />
        </div>
      </div>

      <div>
        <div className="text-[13px] font-semibold text-[#1a1d2e]">{footer}</div>
        <div className="mt-2 flex flex-col gap-1">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-semibold text-[#5a5f7a]">{row.label}</span>
              <span className="text-right font-bold text-[#1a1d2e]">{row.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 text-[11px] text-[#9ca3b8]">{title}</div>
      </div>
    </div>
  );
}

function ProgressKpi({ sub }: { readonly sub: string }) {
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
          <text x="32" y="36" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1a1d2e">
            {pct}%
          </text>
        </svg>

        <div>
          <div className="text-[22px] font-bold leading-none text-[#1a1d2e]">
            {pct}%
          </div>
          <div className="mt-1 text-[11px] text-[#9ca3b8]">{sub}</div>
          <div className="mt-1.5 flex items-center gap-1">
            <TrendingUp size={11} className="text-[#22c55e]" />
            <span className="text-[11px] font-medium text-[#22c55e]">+4% this week</span>
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
    <span className="whitespace-nowrap text-[11px] text-[#3b6ef8] hover:underline">{detailsLabel}</span>
  );

  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="min-w-0 line-clamp-1 pr-2 text-[13px] font-semibold text-[#1a1d2e]">{title}</h3>
        {detailsHref ? <Link href={detailsHref} className="shrink-0">{detailsNode}</Link> : <span className="shrink-0">{detailsNode}</span>}
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

function EmptySlot() {
  return <div className="h-[140px]" />;
}

function PreviewBlock({
  mode,
  offer,
  locale,
  labels,
}: {
  readonly mode: DashboardMode;
  readonly offer: OfferRecord;
  readonly locale: LocaleCode;
  readonly labels: Labels;
}) {
  const isCertificates = mode === "certificates";
  const primaryPrice = isCertificates ? getCertificatePrice(offer, labels) : getOfferPrice(offer, labels);
  const secondaryValue = isCertificates
    ? offer.certificate_validity_days
      ? `${offer.certificate_validity_days} ${labels.days}`
      : "â€”"
    : offer.default_duration_minutes
      ? `${offer.default_duration_minutes} min`
      : offer.status ?? "â€”";
  const thirdValue = isCertificates
    ? offer.is_transferable
      ? "1"
      : "0"
    : offer.certificate_available
      ? "1"
      : "0";

  return (
    <div className="flex min-h-[140px] items-center gap-3 sm:h-[140px] sm:gap-4">
      <div className="flex h-[92px] w-[92px] sm:h-[110px] sm:w-[110px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#eef2ff] text-[26px] font-bold text-[#3b6ef8]">
        {(offer.title ?? labels.offer).slice(0, 2).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-[13px] leading-5 text-[#5a5f7a]">
          {offer.description ?? getOrganizationName(offer, labels)}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-lg bg-[#eef2ff] px-2.5 py-1 text-[11px] font-semibold text-[#3b6ef8]">
            {getOrganizationName(offer, labels)}
          </span>
          <span className="rounded-lg bg-[#f5f6fb] px-2.5 py-1 text-[11px] font-semibold text-[#5a5f7a]">
            {offer.offer_type ?? labels.offer}
          </span>
        </div>

        <div className="mt-3 grid min-w-0 grid-cols-3 gap-2 text-center">
          <div className="min-w-0 rounded-lg bg-[#f8fafc] px-2 py-1.5">
            <div className="truncate text-[12px] font-bold text-[#1a1d2e]">
              {primaryPrice}
            </div>
            <div className="text-[10px] text-[#9ca3b8]">
              {isCertificates ? labels.certificate : labels.price}
            </div>
          </div>
          <div className="min-w-0 rounded-lg bg-[#f8fafc] px-2 py-1.5">
            <div className="truncate text-[12px] font-bold text-[#1a1d2e]">
              {secondaryValue}
            </div>
            <div className="text-[10px] text-[#9ca3b8]">
              {isCertificates ? labels.validity : labels.status}
            </div>
          </div>
          <div className="min-w-0 rounded-lg bg-[#f8fafc] px-2 py-1.5">
            <div className="truncate text-[12px] font-bold text-[#1a1d2e]">
              {thirdValue}
            </div>
            <div className="text-[10px] text-[#9ca3b8]">
              {isCertificates ? labels.transferable : labels.certificate}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

async function loadOffers() {
  const response = await fetch("/api/offers", {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const data = (await response.json()) as OffersApiResponse;

  if (!response.ok || !data.ok) {
    throw new Error(data.error ?? "Cannot load offers");
  }

  return data.offers ?? [];
}

export function CommercialListDashboardContent({
  mode,
  initialLocale,
}: {
  readonly mode: DashboardMode;
  readonly initialLocale: LocaleCode;
}) {
  const locale = initialLocale;
  const labels = getLabels(locale);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [visibleCount, setVisibleCount] = useState(4);
  const [offers, setOffers] = useState<OfferRecord[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setStatus("loading");
        setErrorMessage("");

        const loadedOffers = await loadOffers();

        if (!isMounted) {
          return;
        }

        setOffers(loadedOffers);
        setStatus("ready");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setOffers([]);
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Cannot load offers");
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const baseItems = useMemo(() => {
    if (mode === "certificates") {
      return offers.filter((offer) => offer.certificate_available);
    }

    return offers;
  }, [mode, offers]);

  const filteredItems = useMemo(() => {
    return baseItems.filter((offer) => {
      if (activeFilter === "all" || activeFilter === "newest") {
        return true;
      }

      if (activeFilter === "active") {
        return offer.status === "active";
      }

      if (activeFilter === "certificateReady") {
        return Boolean(offer.certificate_available);
      }

      if (activeFilter === "paid") {
        return Boolean(offer.is_paid) && !offer.is_free;
      }

      if (activeFilter === "free") {
        return Boolean(offer.is_free);
      }

      if (activeFilter === "points") {
        return offer.certificate_payment_mode === "points_only";
      }

      if (activeFilter === "money") {
        return offer.certificate_payment_mode === "money_only";
      }

      if (activeFilter === "mixed") {
        return offer.certificate_payment_mode === "mixed";
      }

      if (activeFilter === "transferable") {
        return Boolean(offer.is_transferable);
      }

      return true;
    });
  }, [activeFilter, baseItems]);

  useEffect(() => {
    setVisibleCount(4);
  }, [activeFilter, mode, baseItems.length]);

  const activeCount = baseItems.filter((offer) => offer.status === "active").length;
  const certificateReadyCount = offers.filter((offer) => offer.certificate_available).length;
  const paidCount = baseItems.filter((offer) => offer.is_paid && !offer.is_free).length;
  const pointsCount = baseItems.filter(
    (offer) => offer.certificate_payment_mode === "points_only",
  ).length;
  const moneyCount = baseItems.filter(
    (offer) => offer.certificate_payment_mode === "money_only",
  ).length;
  const mixedCount = baseItems.filter(
    (offer) => offer.certificate_payment_mode === "mixed",
  ).length;

  const displayedItems = filteredItems.slice(0, visibleCount);
  const [firstItem, secondItem, thirdItem, fourthItem] = displayedItems.slice(0, 4);
  const additionalItems = displayedItems.slice(4);
  const shownItemsCount = Math.min(visibleCount, filteredItems.length);
  const hasMoreItems = visibleCount < filteredItems.length;
  const nextItemsCount = Math.min(4, Math.max(0, filteredItems.length - visibleCount));
  const isCertificates = mode === "certificates";
  const title = isCertificates ? labels.certificatesTitle : labels.offersTitle;
  const subtitle = isCertificates ? labels.certificatesSubtitle : labels.offersSubtitle;
  const noItemsTitle = isCertificates ? labels.noCertificates : labels.noOffers;
  const createHref = isCertificates ? "/certificates/new" : "/offers/new";
  const createLabel = isCertificates ? labels.createCertificate : labels.createOffer;
  const filterKeys: FilterKey[] = isCertificates
    ? ["all", "points", "money", "mixed", "newest"]
    : ["all", "active", "certificateReady", "paid", "newest"];

  const topRows = isCertificates
    ? [
        { label: labels.points, value: String(pointsCount) },
        { label: labels.money, value: String(moneyCount) },
        { label: labels.mixed, value: String(mixedCount) },
      ]
    : [
        { label: labels.active, value: String(activeCount) },
        { label: labels.certificateReady, value: String(certificateReadyCount) },
        { label: labels.paid, value: String(paidCount) },
      ];

  function getFilterButtonLabel(filterKey: FilterKey) {
    if (filterKey === "all") {
      return isCertificates ? labels.allCertificates : labels.allOffers;
    }

    if (filterKey === "active") {
      return labels.active;
    }

    if (filterKey === "certificateReady") {
      return labels.certificateReady;
    }

    if (filterKey === "paid") {
      return labels.paid;
    }

    if (filterKey === "free") {
      return labels.free;
    }

    if (filterKey === "points") {
      return labels.points;
    }

    if (filterKey === "money") {
      return labels.money;
    }

    if (filterKey === "mixed") {
      return labels.mixed;
    }

    if (filterKey === "transferable") {
      return labels.transferable;
    }

    return labels.newest;
  }

  function renderSlot(offer: OfferRecord | undefined, fallbackIndex: number) {
    const titleText = offer?.title ?? (fallbackIndex === 0 ? noItemsTitle : "\u00a0");
    const href = offer
      ? isCertificates
        ? getCertificateHref(offer, locale)
        : getOfferHref(offer, locale)
      : undefined;

    return (
      <AnalyticsCard
        title={titleText}
        detailsLabel={offer ? labels.openPreview : "\u00a0"}
        detailsHref={href}
      >
        {offer ? (
          <PreviewBlock mode={mode} offer={offer} locale={locale} labels={labels} />
        ) : (
          <EmptySlot />
        )}
      </AnalyticsCard>
    );
  }

  return (
    <div className="p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[20px] font-bold leading-tight text-[#1a1d2e]">{title}</h1>
          <p className="mt-0.5 text-[13px] text-[#7c8099]">{subtitle}</p>
        </div>

        <Link
          href={createHref}
          className="flex w-fit items-center gap-1 rounded-lg border border-[#22c55e]/30 bg-[#ecfdf3] px-3 py-1.5 text-[12px] font-medium text-[#16a34a] transition-all hover:bg-[#dcfce7]"
        >
          <Plus size={12} />
          {createLabel}
        </Link>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={labels.found}
          value={status === "loading" ? "..." : String(baseItems.length)}
          sub={labels.published}
          accent="#3b6ef8"
          icon={isCertificates ? Gift : Star}
          trend={labels.openPreview}
          valueHref={isCertificates ? "/certificates" : "/offers"}
          trendHref={isCertificates ? "/certificates" : "/offers"}
        />
        <PackageKpi rows={topRows} title={labels.availableActions} footer={labels.published} />
        <KpiCard
          label={isCertificates ? labels.certificateCatalog : labels.status}
          value={isCertificates ? String(certificateReadyCount) : String(activeCount)}
          sub={isCertificates ? labels.certificateReady : labels.active}
          accent="#22c55e"
          icon={Activity}
        />
        <ProgressKpi sub={isCertificates ? labels.points : labels.certificateReady} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {filterKeys.map((filterKey) => (
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
            {getFilterButtonLabel(filterKey)}
          </button>
        ))}

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
          {getCommercialRequestActionLabel(mode, locale)}
        </button>
      </div>

      {status === "error" ? (
        <section className="mb-3 rounded-xl border border-[rgba(239,68,68,0.2)] bg-white p-4 text-[13px] text-[#b91c1c] shadow-sm">
          {labels.error}: {errorMessage}
        </section>
      ) : null}

      <div className="mb-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
        {renderSlot(firstItem, 0)}
        {renderSlot(secondItem, 1)}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
        {renderSlot(thirdItem, 2)}
        {renderSlot(fourthItem, 3)}
      </div>

      {additionalItems.length > 0 ? (
        <div className="mb-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
          {additionalItems.map((offer, index) => (
            <div key={offer.id}>{renderSlot(offer, index + 4)}</div>
          ))}
        </div>
      ) : null}

      {filteredItems.length > 4 ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
          <span className="text-[12px] text-[#7c8099]">
            {getShownOfLabel(locale, shownItemsCount, filteredItems.length)}
          </span>

          {hasMoreItems ? (
            <button
              type="button"
              onClick={() =>
                setVisibleCount((currentVisibleCount) =>
                  Math.min(currentVisibleCount + 4, filteredItems.length),
                )
              }
              className="rounded-lg border border-[#3b6ef8]/30 bg-white px-3 py-1.5 text-[12px] font-medium text-[#3b6ef8] transition-all hover:bg-[#eef2ff]"
            >
              {getShowMoreLabel(locale, nextItemsCount)}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mb-2">
        <h2 className="mb-3 text-[13px] font-semibold text-[#1a1d2e]">
          {labels.directions}
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DirectionCard
            label={isCertificates ? labels.points : labels.active}
            pct={78}
            color="#3b6ef8"
            sub={`${isCertificates ? pointsCount : activeCount} ${
              isCertificates ? labels.points : labels.active
            }`}
            trend="+3%"
          />
          <DirectionCard
            label={isCertificates ? labels.money : labels.certificateReady}
            pct={72}
            color="#f97316"
            sub={`${isCertificates ? moneyCount : certificateReadyCount} ${
              isCertificates ? labels.money : labels.certificateReady
            }`}
            trend="+1.5%"
          />
          <DirectionCard
            label={isCertificates ? labels.mixed : labels.paid}
            pct={75}
            color="#22c55e"
            sub={`${isCertificates ? mixedCount : paidCount} ${
              isCertificates ? labels.mixed : labels.paid
            }`}
            trend="+5%"
          />
          <DirectionCard
            label={labels.newest}
            pct={79}
            color="#8b5cf6"
            sub={`${baseItems.length} ${labels.published}`}
            trend="+2%"
          />
        </div>
      </div>
    </div>
  );
}
