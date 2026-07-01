"use client";

import Link from "next/link";
import {
  Camera,
  Activity,
  Check,
  Globe,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  RotateCcw,
  Save,
  Star,
  TrendingUp,
} from "lucide-react";
import {
  useRef,
  type ChangeEvent,
  type ElementType,
  type ReactNode,
  useMemo,
  useState,
} from "react";
import { getOrganizationTypeLabel } from "../../../../i18n/messages/system-labels";
import PurchaseConfirmationRequestCard from "@/components/commercial/PurchaseConfirmationRequestCard";
import OrganizationLocationMapPreview from "@/components/commercial/OrganizationLocationMapPreview";




export type OrganizationPublicProfileEditInitialData = {
  locale: string;
  organization: {
    id: string;
    name: string;
    type: string;
    description: string | null;
    shortDescription: string | null;
    publicSlug: string | null;
    publicEmail: string | null;
    publicPhone: string | null;
    websiteUrl: string | null;
    bookingUrl: string | null;
    logoUrl: string | null;
    coverImageUrl: string | null;
    countryCode: string | null;
    defaultCurrency: string | null;
    directoryStatus: string | null;
    verificationStatus: string | null;
    isPublicProfileEnabled: boolean | null;
    isListedInDirectory: boolean | null;
  };
  primaryLocation: {
    id: string;
    label: string | null;
    locationType: string | null;
    addressVisibility: string | null;
    countryCode: string | null;
    region: string | null;
    city: string | null;
    district: string | null;
    streetAddress: string | null;
    postalCode: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  categoryName: string | null;
  publicProfileHref: string | null;
  counts: {
    offersCount: number;
    certificateOffersCount: number;
    pointsCount: number;
  };
};

type EditValues = {

  logoUrl: string;
  organizationName: string;
  organizationType: string;
  description: string;
  shortDescription: string;
  publicPhone: string;
  websiteUrl: string;
  bookingUrl: string;
  publicEmail: string;
  categoryLabel: string;
  countryCode: string;
  city: string;
  district: string;
  streetAddress: string;
  postalCode: string;
  serviceArea: string;
  latitude: string;
  longitude: string;
  addressVisibility: string;
};

type EditLocaleKey = "en" | "pl" | "uk" | "ru" | "de" | "es" | "cs";

type EditMessages = {
  back: string;
  openPublic: string;
  titleBadge: string;
  titleFallback: string;
  typeFallback: string;
  logo: string;
  category: string;
  address: string;
  location: string;
  serviceArea: string;
  publicProfile: string;
  points: string;
  certificatesAndPoints: string;
  phone: string;
  website: string;
  messenger: string;
  description: string;
  viewOffers: string;
  details: string;
  publicOffers: string;
  publicActions: string;
  publicInformation: string;
  flow: string;
  offers: string;
  certificate: string;
  notProvided: string;
  saveChanges: string;
  saved: string;
  saving: string;
  saveError: string;
  unsavedChanges: string;
  editHint: string;
  undo: string;
  fromYou: string;
};

const EDIT_MESSAGES: Record<EditLocaleKey, EditMessages> = {
  en: {
    back: "Back to business page",
    openPublic: "Open public page",
    titleBadge: "Public profile editor",
    titleFallback: "Organization",
    typeFallback: "Private business",
    logo: "Logo",
    category: "Category",
    address: "Address",
    location: "Location",
    serviceArea: "Service area",
    publicProfile: "Public profile",
    points: "POINTS",
    certificatesAndPoints: "Certificates and POINTS",
    phone: "Phone",
    website: "Website",
    messenger: "Messenger",
    description: "Description",
    viewOffers: "View offers",
    details: "Details",
    publicOffers: "Public offers",
    publicActions: "Public actions",
    publicInformation: "Public information",
    flow: "Public profile",
    offers: "Offers",
    certificate: "Certificate",
    notProvided: "Not provided",
    saveChanges: "Save changes",
    saved: "Saved",
    saving: "Saving...",
    saveError: "Could not save changes",
    unsavedChanges: "Unsaved changes",
    editHint: "Edit the public profile directly in the same layout visitors will see.",
    undo: "Undo changes",
    fromYou: "3,500 m from you",
  },
  pl: {
    back: "Wr\u00f3\u0107 do strony firmy",
    openPublic: "Otw\u00f3rz stron\u0119 publiczn\u0105",
    titleBadge: "Edytor profilu publicznego",
    titleFallback: "Firma",
    typeFallback: "Dzia\u0142alno\u015b\u0107 prywatna",
    logo: "Logo",
    category: "Kategoria",
    address: "Adres",
    location: "Lokalizacja",
    serviceArea: "Obszar obs\u0142ugi",
    publicProfile: "Profil publiczny",
    points: "POINTS",
    certificatesAndPoints: "Certyfikaty i POINTS",
    phone: "Telefon",
    website: "Strona",
    messenger: "Komunikator",
    description: "Opis",
    viewOffers: "Zobacz oferty",
    details: "Szczeg\u00f3\u0142y",
    publicOffers: "Publiczne oferty",
    publicActions: "Dzia\u0142ania publiczne",
    publicInformation: "Informacje publiczne",
    flow: "Profil publiczny",
    offers: "Oferty",
    certificate: "Certyfikat",
    notProvided: "Nie podano",
    saveChanges: "Zapisz zmiany",
    saved: "Zapisano",
    saving: "Zapisywanie...",
    saveError: "Nie uda\u0142o si\u0119 zapisa\u0107 zmian",
    unsavedChanges: "Niezapisane zmiany",
    editHint: "Edytujesz profil publiczny bezpo\u015brednio w uk\u0142adzie widocznym dla odwiedzaj\u0105cych.",
    undo: "Cofnij zmiany",
    fromYou: "3 500 m od Ciebie",
  },
  uk: {
    back: "\u041d\u0430\u0437\u0430\u0434 \u0434\u043e \u0441\u0442\u043e\u0440\u0456\u043d\u043a\u0438 \u043f\u0456\u0434\u043f\u0440\u0438\u0454\u043c\u0441\u0442\u0432\u0430",
    openPublic: "\u0412\u0456\u0434\u043a\u0440\u0438\u0442\u0438 \u043f\u0443\u0431\u043b\u0456\u0447\u043d\u0443 \u0441\u0442\u043e\u0440\u0456\u043d\u043a\u0443",
    titleBadge: "\u0420\u0435\u0434\u0430\u043a\u0442\u043e\u0440 \u043f\u0443\u0431\u043b\u0456\u0447\u043d\u043e\u0433\u043e \u043f\u0440\u043e\u0444\u0456\u043b\u044e",
    titleFallback: "\u041f\u0456\u0434\u043f\u0440\u0438\u0454\u043c\u0441\u0442\u0432\u043e",
    typeFallback: "\u041f\u0440\u0438\u0432\u0430\u0442\u043d\u0438\u0439 \u0431\u0456\u0437\u043d\u0435\u0441",
    logo: "\u041b\u043e\u0433\u043e\u0442\u0438\u043f",
    category: "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u044f",
    address: "\u0410\u0434\u0440\u0435\u0441\u0430",
    location: "\u041b\u043e\u043a\u0430\u0446\u0456\u044f",
    serviceArea: "\u0417\u043e\u043d\u0430 \u043e\u0431\u0441\u043b\u0443\u0433\u043e\u0432\u0443\u0432\u0430\u043d\u043d\u044f",
    publicProfile: "\u041f\u0443\u0431\u043b\u0456\u0447\u043d\u0438\u0439 \u043f\u0440\u043e\u0444\u0456\u043b\u044c",
    points: "POINTS",
    certificatesAndPoints: "\u0421\u0435\u0440\u0442\u0438\u0444\u0456\u043a\u0430\u0442\u0438 \u0442\u0430 POINTS",
    phone: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d",
    website: "\u0421\u0430\u0439\u0442",
    messenger: "\u041c\u0435\u0441\u0435\u043d\u0434\u0436\u0435\u0440",
    description: "\u041e\u043f\u0438\u0441",
    viewOffers: "\u041f\u0435\u0440\u0435\u0433\u043b\u044f\u043d\u0443\u0442\u0438 \u043f\u0440\u043e\u043f\u043e\u0437\u0438\u0446\u0456\u0457",
    details: "\u0414\u043e\u043a\u043b\u0430\u0434\u043d\u0456\u0448\u0435",
    publicOffers: "\u041f\u0443\u0431\u043b\u0456\u0447\u043d\u0456 \u043f\u0440\u043e\u043f\u043e\u0437\u0438\u0446\u0456\u0457",
    publicActions: "\u041f\u0443\u0431\u043b\u0456\u0447\u043d\u0456 \u0434\u0456\u0457",
    publicInformation: "\u041f\u0443\u0431\u043b\u0456\u0447\u043d\u0430 \u0456\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0456\u044f",
    flow: "\u041f\u0443\u0431\u043b\u0456\u0447\u043d\u0438\u0439 \u043f\u0440\u043e\u0444\u0456\u043b\u044c",
    offers: "\u041f\u0440\u043e\u043f\u043e\u0437\u0438\u0446\u0456\u0457",
    certificate: "\u0421\u0435\u0440\u0442\u0438\u0444\u0456\u043a\u0430\u0442",
    notProvided: "\u041d\u0435 \u0432\u043a\u0430\u0437\u0430\u043d\u043e",
    saveChanges: "\u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438 \u0437\u043c\u0456\u043d\u0438",
    saved: "\u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043d\u043e",
    saving: "\u0417\u0431\u0435\u0440\u0456\u0433\u0430\u0454\u0442\u044c\u0441\u044f...",
    saveError: "\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u0437\u0431\u0435\u0440\u0435\u0433\u0442\u0438 \u0437\u043c\u0456\u043d\u0438",
    unsavedChanges: "\u041d\u0435\u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043d\u0456 \u0437\u043c\u0456\u043d\u0438",
    editHint: "\u0420\u0435\u0434\u0430\u0433\u0443\u0439\u0442\u0435 \u043f\u0443\u0431\u043b\u0456\u0447\u043d\u0438\u0439 \u043f\u0440\u043e\u0444\u0456\u043b\u044c \u043f\u0440\u044f\u043c\u043e \u0432 \u0442\u043e\u043c\u0443 \u0432\u0438\u0433\u043b\u044f\u0434\u0456, \u044f\u043a\u0438\u0439 \u0431\u0430\u0447\u0430\u0442\u044c \u0432\u0456\u0434\u0432\u0456\u0434\u0443\u0432\u0430\u0447\u0456.",
    undo: "\u0421\u043a\u0430\u0441\u0443\u0432\u0430\u0442\u0438 \u0437\u043c\u0456\u043d\u0438",
    fromYou: "3 500 \u043c \u0432\u0456\u0434 \u0432\u0430\u0441",
  },
  ru: {
    back: "\u041d\u0430\u0437\u0430\u0434 \u043a \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0435 \u043f\u0440\u0435\u0434\u043f\u0440\u0438\u044f\u0442\u0438\u044f",
    openPublic: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u0443\u044e \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0443",
    titleBadge: "\u0420\u0435\u0434\u0430\u043a\u0442\u043e\u0440 \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u043e\u0433\u043e \u043f\u0440\u043e\u0444\u0438\u043b\u044f",
    titleFallback: "\u041f\u0440\u0435\u0434\u043f\u0440\u0438\u044f\u0442\u0438\u0435",
    typeFallback: "\u0427\u0430\u0441\u0442\u043d\u044b\u0439 \u0431\u0438\u0437\u043d\u0435\u0441",
    logo: "\u041b\u043e\u0433\u043e\u0442\u0438\u043f",
    category: "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f",
    address: "\u0410\u0434\u0440\u0435\u0441",
    location: "\u041b\u043e\u043a\u0430\u0446\u0438\u044f",
    serviceArea: "\u0417\u043e\u043d\u0430 \u043e\u0431\u0441\u043b\u0443\u0436\u0438\u0432\u0430\u043d\u0438\u044f",
    publicProfile: "\u041f\u0443\u0431\u043b\u0438\u0447\u043d\u044b\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c",
    points: "POINTS",
    certificatesAndPoints: "\u0421\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u044b \u0438 POINTS",
    phone: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d",
    website: "\u0421\u0430\u0439\u0442",
    messenger: "\u041c\u0435\u0441\u0441\u0435\u043d\u0434\u0436\u0435\u0440",
    description: "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435",
    viewOffers: "\u041f\u043e\u0441\u043c\u043e\u0442\u0440\u0435\u0442\u044c \u043e\u0444\u0444\u0435\u0440\u044b",
    details: "\u041f\u043e\u0434\u0440\u043e\u0431\u043d\u0435\u0435",
    publicOffers: "\u041f\u0443\u0431\u043b\u0438\u0447\u043d\u044b\u0435 \u043e\u0444\u0444\u0435\u0440\u044b",
    publicActions: "\u041f\u0443\u0431\u043b\u0438\u0447\u043d\u044b\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f",
    publicInformation: "\u041f\u0443\u0431\u043b\u0438\u0447\u043d\u0430\u044f \u0438\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0438\u044f",
    flow: "\u041f\u0443\u0431\u043b\u0438\u0447\u043d\u044b\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c",
    offers: "\u041e\u0444\u0444\u0435\u0440\u044b",
    certificate: "\u0421\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442",
    notProvided: "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u043e",
    saveChanges: "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c",
    saved: "\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u043e",
    saving: "\u0421\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u0442\u0441\u044f...",
    saveError: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c",
    unsavedChanges: "\u041d\u0435\u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d\u043d\u044b\u0435 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f",
    editHint: "\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u0443\u0439\u0442\u0435 \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u044b\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c \u043f\u0440\u044f\u043c\u043e \u0432 \u0442\u043e\u043c \u0432\u0438\u0434\u0435, \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u0432\u0438\u0434\u044f\u0442 \u0433\u043e\u0441\u0442\u0438.",
    undo: "\u041e\u0442\u043c\u0435\u043d\u0438\u0442\u044c",
    fromYou: "3 500 \u043c \u043e\u0442 \u0432\u0430\u0441",
  },
  de: {
    back: "Zur Unternehmensseite",
    openPublic: "\u00d6ffentliche Seite \u00f6ffnen",
    titleBadge: "Editor f\u00fcr \u00f6ffentliches Profil",
    titleFallback: "Unternehmen",
    typeFallback: "Privates Unternehmen",
    logo: "Logo",
    category: "Kategorie",
    address: "Adresse",
    location: "Standort",
    serviceArea: "Servicegebiet",
    publicProfile: "\u00d6ffentliches Profil",
    points: "POINTS",
    certificatesAndPoints: "Zertifikate und POINTS",
    phone: "Telefon",
    website: "Web",
    messenger: "Messenger",
    description: "Beschreibung",
    viewOffers: "Angebote ansehen",
    details: "Details",
    publicOffers: "\u00d6ffentliche Angebote",
    publicActions: "\u00d6ffentliche Aktionen",
    publicInformation: "\u00d6ffentliche Informationen",
    flow: "\u00d6ffentliches Profil",
    offers: "Angebote",
    certificate: "Zertifikat",
    notProvided: "Nicht angegeben",
    saveChanges: "Speichern",
    saved: "Gespeichert",
    saving: "Speichern...",
    saveError: "Speichern fehlgeschlagen",
    unsavedChanges: "Ungespeicherte \u00c4nderungen",
    editHint: "Bearbeiten Sie das \u00f6ffentliche Profil direkt im Besucherlayout.",
    undo: "\u00c4nderungen r\u00fcckg\u00e4ngig machen",
    fromYou: "3.500 m von dir",
  },
  es: {
    back: "Volver a la empresa",
    openPublic: "Abrir p\u00e1gina p\u00fablica",
    titleBadge: "Editor del perfil p\u00fablico",
    titleFallback: "Empresa",
    typeFallback: "Negocio privado",
    logo: "Logo",
    category: "Categor\u00eda",
    address: "Direcci\u00f3n",
    location: "Ubicaci\u00f3n",
    serviceArea: "\u00c1rea de servicio",
    publicProfile: "Perfil p\u00fablico",
    points: "POINTS",
    certificatesAndPoints: "Certificados y POINTS",
    phone: "Tel\u00e9fono",
    website: "Web",
    messenger: "Messenger",
    description: "Descripci\u00f3n",
    viewOffers: "Ver ofertas",
    details: "Detalles",
    publicOffers: "Ofertas p\u00fablicas",
    publicActions: "Acciones p\u00fablicas",
    publicInformation: "Informaci\u00f3n p\u00fablica",
    flow: "Perfil p\u00fablico",
    offers: "Ofertas",
    certificate: "Certificado",
    notProvided: "No indicado",
    saveChanges: "Guardar",
    saved: "Guardado",
    saving: "Guardando...",
    saveError: "No se pudo guardar",
    unsavedChanges: "Cambios no guardados",
    editHint: "Edita el perfil p\u00fablico directamente en el dise\u00f1o que ver\u00e1n los visitantes.",
    undo: "Deshacer cambios",
    fromYou: "3.500 m desde ti",
  },
  cs: {
    back: "Zp\u011bt na str\u00e1nku podniku",
    openPublic: "Otev\u0159\u00edt ve\u0159ejnou str\u00e1nku",
    titleBadge: "Editor ve\u0159ejn\u00e9ho profilu",
    titleFallback: "Podnik",
    typeFallback: "Soukrom\u00e9 podnik\u00e1n\u00ed",
    logo: "Logo",
    category: "Kategorie",
    address: "Adresa",
    location: "Lokalita",
    serviceArea: "Oblast slu\u017eeb",
    publicProfile: "Ve\u0159ejn\u00fd profil",
    points: "POINTS",
    certificatesAndPoints: "Certifik\u00e1ty a POINTS",
    phone: "Telefon",
    website: "Web",
    messenger: "Messenger",
    description: "Popis",
    viewOffers: "Zobrazit nab\u00eddky",
    details: "Podrobnosti",
    publicOffers: "Ve\u0159ejn\u00e9 nab\u00eddky",
    publicActions: "Ve\u0159ejn\u00e9 akce",
    publicInformation: "Ve\u0159ejn\u00e9 informace",
    flow: "Ve\u0159ejn\u00fd profil",
    offers: "Nab\u00eddky",
    certificate: "Certifik\u00e1t",
    notProvided: "Neuvedeno",
    saveChanges: "Ulo\u017eit",
    saved: "Ulo\u017eeno",
    saving: "Ukl\u00e1d\u00e1 se...",
    saveError: "Nepoda\u0159ilo se ulo\u017eit",
    unsavedChanges: "Neulo\u017een\u00e9 zm\u011bny",
    editHint: "Upravujte ve\u0159ejn\u00fd profil p\u0159\u00edmo ve vzhledu pro n\u00e1v\u0161t\u011bvn\u00edky.",
    undo: "Vr\u00e1tit zm\u011bny",
    fromYou: "3 500 m od v\u00e1s",
  },
};

const ORGANIZATION_TYPE_OPTIONS = [
  "private_business",
  "company",
  "non_profit",
  "public_institution",
] as const;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeLocale(locale: string): EditLocaleKey {
  if (locale === "pl" || locale === "uk" || locale === "ru" || locale === "de" || locale === "es" || locale === "cs") {
    return locale;
  }

  return "en";
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AR";
}

function text(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function getInitialValues(data: OrganizationPublicProfileEditInitialData): EditValues {
  const location = data.primaryLocation;

  return {
    logoUrl: data.organization.logoUrl ?? "",
    organizationName: data.organization.name,
    organizationType: data.organization.type || "private_business",
    description: text(data.organization.description),
    shortDescription: text(data.organization.shortDescription),
    publicPhone: text(data.organization.publicPhone),
    websiteUrl: text(data.organization.websiteUrl),
    bookingUrl: text(data.organization.bookingUrl),
    publicEmail: text(data.organization.publicEmail),
    categoryLabel: text(data.categoryName),
    countryCode: text(location?.countryCode ?? data.organization.countryCode),
    city: text(location?.city),
    district: text(location?.district),
    streetAddress: text(location?.streetAddress),
    postalCode: text(location?.postalCode),
    serviceArea: text(location?.label),
    latitude: location?.latitude === null || location?.latitude === undefined ? "" : String(location.latitude),
    longitude: location?.longitude === null || location?.longitude === undefined ? "" : String(location.longitude),
    addressVisibility: location?.addressVisibility || "approximate",
  };
}

function getLocationLine(values: EditValues) {
  const parts = [
    values.city,
    values.streetAddress,
    values.countryCode,
  ].filter((part) => part.trim());

  return parts.join(", ");
}

function EditableShell({
  dirty,
  onReset,
  resetLabel,
  children,
}: {
  dirty: boolean;
  onReset: () => void;
  resetLabel: string;
  children: ReactNode;
}) {

  return (
    <div className="relative">
      <div
        className={cx(
          "rounded-xl border border-dashed px-2 py-1 transition",
          dirty
            ? "border-[#fb7185] bg-[#fff1f2]"
            : "border-[#dfe3f1] bg-white/50 hover:border-[#b9c2ff]",
        )}
      >
        {children}
      </div>

      {dirty ? (
        <button
          type="button"
          onClick={onReset}
          aria-label={resetLabel}
          title={resetLabel}
          className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-[#fecdd3] bg-white text-[#e11d48] shadow-sm transition hover:-translate-y-0.5"
        >
          <RotateCcw size={13} />
        </button>
      ) : null}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(event: ChangeEvent<HTMLInputElement>) =>
        onChange(event.target.value)
      }
      placeholder={placeholder}
      className={cx(
        "w-full border-0 bg-transparent p-0 text-inherit outline-none placeholder:text-[#b0b5ca]",
        className,
      )}
    />
  );
}

function TextAreaInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
        onChange(event.target.value)
      }
      placeholder={placeholder}
      rows={4}
      className="w-full resize-none border-0 bg-transparent p-0 text-[13px] leading-6 text-[#4d536f] outline-none placeholder:text-[#b0b5ca]"
    />
  );
}

function TopCard({
  label,
  icon: Icon,
  accent,
  children,
  footerIconOnly = false,
}: {
  label: string;
  icon: ElementType;
  accent: string;
  children: ReactNode;
  footerIconOnly?: boolean;
}) {
  return (
    <div className="relative flex h-full min-h-[390px] flex-col overflow-hidden rounded-2xl border border-[#edf0f7] bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
      {footerIconOnly ? null : (
        <div className="flex items-start justify-between gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6f7494]">
            {label}
          </div>
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{ backgroundColor: `${accent}14`, color: accent }}
          >
            <Icon size={15} />
          </div>
        </div>
      )}

      <div
        className={
          footerIconOnly
            ? "flex min-h-0 flex-1 flex-col gap-3"
            : "mt-5 flex min-h-0 flex-1 flex-col gap-3"
        }
      >
        {children}
      </div>

      {footerIconOnly ? (
        <div className="mt-auto flex items-center justify-end pt-3">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{ backgroundColor: `${accent}14`, color: accent }}
            aria-label={label}
            title={label}
          >
            <Icon size={15} />
          </div>
        </div>
      ) : null}
    </div>
  );
}


function MiniActionButton({
  active,
  disabled,
  icon: Icon,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  icon?: ElementType;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cx(
        "inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-4 text-[14px] font-medium transition",
        active
          ? "border-[#3b6ef8] bg-[#3b6ef8] text-white shadow-[0_4px_12px_rgba(59,110,248,0.25)]"
          : "border-[#e4e7f0] bg-white text-[#4d536f] shadow-sm",
        disabled && "cursor-not-allowed opacity-45",
      )}
    >
      {Icon ? <Icon size={14} /> : null}
      {children}
    </button>
  );
}

function BigCard({
  title,
  detailLabel,
  editable,
  children,
}: {
  title: string;
  detailLabel: string;
  editable?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-[206px] rounded-2xl border border-[#edf0f7] bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="text-[14px] font-bold text-[#111827]">{title}</h3>
        <button type="button" className="text-[14px] font-medium text-[#3b6ef8]">
          {detailLabel}
        </button>
      </div>
      {editable ?? children}
    </div>
  );
}

function PlaceholderPanel({ label }: { label: string }) {
  return (
    <div className="flex min-h-[134px] items-center justify-center rounded-xl bg-[#f8f9fd] text-[13px] text-[#9ca3b8]">
      {label}
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
  label: string;
  pct: number;
  color: string;
  sub: string;
  trend: string;
}) {
  return (
    <div className="rounded-2xl border border-[#edf0f7] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between">
        <div className="text-[14px] font-bold text-[#111827]">{label}</div>
        <div className="text-[15px] font-bold" style={{ color }}>
          {pct}%
        </div>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-[#eef0f6]">
        <div
          className="h-1.5 rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between text-[12px]">
        <span className="text-[#9ca3b8]">{sub}</span>
        <span className="text-[#22c55e]">â†— {trend}</span>
      </div>
    </div>
  );
}

function MapPreview({
  mapsHref,
  actionLabel,
  distanceLabel,
}: {
  mapsHref: string;
  actionLabel: string;
  distanceLabel: string;
}) {
  return (
    <div className="group relative h-full min-h-0 flex-1 basis-0 overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#dbeafe] shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 420 170"
      >
        <defs>
          <linearGradient id="org-edit-map-bg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#dbeafe" />
            <stop offset="54%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#dcfce7" />
          </linearGradient>
          <filter id="org-edit-map-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" floodColor="#2563eb" floodOpacity="0.22" stdDeviation="2" />
          </filter>
        </defs>
        <rect width="420" height="170" fill="url(#org-edit-map-bg)" />
        <path d="M-20 148 C62 119 118 141 196 114 C264 91 331 97 446 64 L446 190 L-20 190 Z" fill="#bbf7d0" opacity="0.72" />
        <path d="M-24 34 C42 20 92 30 145 20 C230 4 281 16 452 -12 L452 25 C319 50 235 41 152 54 C87 64 40 52 -24 72 Z" fill="#bfdbfe" opacity="0.76" />
        <path d="M-18 54 L440 138" stroke="#c7d2fe" strokeWidth="18" opacity="0.78" />
        <path d="M-18 54 L440 138" stroke="#ffffff" strokeWidth="12" opacity="0.96" />
        <path d="M-18 54 L440 138" stroke="#cbd5e1" strokeWidth="1.5" opacity="0.75" />
        <path d="M-22 126 C80 98 147 87 239 62 C309 43 354 23 442 9" stroke="#ffffff" strokeWidth="9" opacity="0.95" />
        <path d="M64 -20 L98 192" stroke="#ffffff" strokeWidth="6" opacity="0.86" />
        <path d="M150 -16 L110 194" stroke="#ffffff" strokeWidth="5" opacity="0.82" />
        <path d="M238 -18 L263 196" stroke="#ffffff" strokeWidth="6" opacity="0.86" />
        <path d="M360 -20 L326 194" stroke="#ffffff" strokeWidth="5" opacity="0.82" />
        <path d="M70 113 C129 91 186 95 227 74 C258 58 281 55 307 52" fill="none" stroke="#f97316" strokeDasharray="6 5" strokeLinecap="round" strokeWidth="4" opacity="0.78" />
        <circle cx="230" cy="84" r="61" fill="#3b82f6" opacity="0.16" />
        <circle cx="230" cy="84" r="43" fill="#3b82f6" opacity="0.2" />
        <circle cx="230" cy="84" r="24" fill="#3b82f6" opacity="0.28" />
        <circle cx="230" cy="84" r="12" fill="#ffffff" filter="url(#org-edit-map-shadow)" />
        <circle cx="230" cy="84" r="6" fill="#2563eb" />
        <text x="20" y="28" fill="#475569" fontSize="11" fontWeight="700" opacity="0.72">Centrum</text>
        <text x="32" y="143" fill="#64748b" fontSize="10" fontWeight="600" opacity="0.72">Tkacka</text>
        <text x="314" y="31" fill="#64748b" fontSize="10" fontWeight="600" opacity="0.66">Odra</text>
      </svg>

      <div className="absolute bottom-3 left-3 rounded-full border border-white/80 bg-white/92 px-3 py-1.5 text-[11px] font-semibold text-[#1a1d2e] shadow-sm backdrop-blur">
        {distanceLabel}
      </div>

      <a
        href={mapsHref}
        target="_blank"
        rel="noreferrer"
        aria-label={actionLabel}
        title={actionLabel}
        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/90 bg-white/95 text-[#2563eb] shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40"
      >
        <Navigation size={16} />
      </a>
    </div>
  );
}

function buildMapsHref(values: EditValues, name: string) {
  const query = [
    values.streetAddress,
    values.city,
    values.countryCode,
    name,
  ].filter((part) => part.trim()).join(" ");

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query || name,
  )}`;
}

export default function OrganizationPublicProfileEditClient({
  initialData,
}: {
  initialData: OrganizationPublicProfileEditInitialData;
}) {
  const locale = normalizeLocale(initialData.locale);
  const messages = EDIT_MESSAGES[locale];
  const initialValues = useMemo(() => getInitialValues(initialData), [initialData]);
  const [savedValues, setSavedValues] = useState<EditValues>(initialValues);
  const [values, setValues] = useState<EditValues>(initialValues);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dirtyKeys = useMemo(
    () =>
      (Object.keys(values) as Array<keyof EditValues>).filter(
        (key) => values[key] !== savedValues[key],
      ),
    [savedValues, values],
  );

  const hasDirtyChanges = dirtyKeys.length > 0;

  function setField(key: keyof EditValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setSaveState("idle");
    setErrorMessage(null);
  }

  function resetField(key: keyof EditValues) {
    setValues((current) => ({ ...current, [key]: savedValues[key] }));
    setSaveState("idle");
    setErrorMessage(null);
  }

  function isDirty(key: keyof EditValues) {
    return values[key] !== savedValues[key];
  }

  async function saveChanges() {
    setSaveState("saving");
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/organizations/${initialData.organization.id}/public-profile`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            logoUrl: values.logoUrl,
            organizationName: values.organizationName,
            organizationType: values.organizationType,
            description: values.description,
            shortDescription: values.shortDescription,
            publicPhone: values.publicPhone,
            websiteUrl: values.websiteUrl,
            bookingUrl: values.bookingUrl,
            publicEmail: values.publicEmail,
            location: {
              countryCode: values.countryCode,
              city: values.city,
              district: values.district,
              streetAddress: values.streetAddress,
              postalCode: values.postalCode,
              latitude: values.latitude,
              longitude: values.longitude,
              addressVisibility: values.addressVisibility,
            },
          }),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            primaryLocation?: {
              country_code?: string | null;
              city?: string | null;
              district?: string | null;
              street_address?: string | null;
              postal_code?: string | null;
              label?: string | null;
              latitude?: number | null;
              longitude?: number | null;
              address_visibility?: string | null;
            } | null;
          }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? messages.saveError);
      }

      const nextValues: EditValues = payload.primaryLocation
        ? {
            ...values,
            countryCode:
              payload.primaryLocation.country_code ?? values.countryCode,
            city: payload.primaryLocation.city ?? values.city,
            district: payload.primaryLocation.district ?? values.district,
            streetAddress:
              payload.primaryLocation.street_address ?? values.streetAddress,
            postalCode:
              payload.primaryLocation.postal_code ?? values.postalCode,
            serviceArea: payload.primaryLocation.label ?? values.serviceArea,
            latitude:
              payload.primaryLocation.latitude === null ||
              payload.primaryLocation.latitude === undefined
                ? values.latitude
                : String(payload.primaryLocation.latitude),
            longitude:
              payload.primaryLocation.longitude === null ||
              payload.primaryLocation.longitude === undefined
                ? values.longitude
                : String(payload.primaryLocation.longitude),
            addressVisibility:
              payload.primaryLocation.address_visibility ??
              values.addressVisibility,
          }
        : values;

      setValues(nextValues);
      setSavedValues(nextValues);
      setSaveState("saved");
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : messages.saveError;
      setErrorMessage(nextMessage);
      setSaveState("error");
    }
  }

  const organizationName =
    values.organizationName.trim() || messages.titleFallback;
  const organizationType =
    values.organizationType.trim() || messages.typeFallback;
  const categoryLabel = values.categoryLabel.trim() || messages.notProvided;
  const locationLine =
    getLocationLine(values) || "Szczecin, ul. Tkacka 11, PL";
  const serviceArea =
    values.serviceArea.trim() || "Centrum Szczecina i najblizsza okolica";
  const mapsHref = buildMapsHref(values, organizationName);


  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  function handleLogoFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      event.currentTarget.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";

      if (!result) {
        return;
      }

      setValues((current) => ({
        ...current,
        logoUrl: result,
      }));
    };

    reader.readAsDataURL(file);
  }

  function handleLogoPickerOpen() {
    logoFileInputRef.current?.click();
  }

  return (
    <main className="min-h-screen bg-[#eef1f7]">
      <div className="mx-auto w-full max-w-[1640px] px-4 py-5 md:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
{initialData.publicProfileHref ? (
              <Link
                href={initialData.publicProfileHref}
                className="inline-flex min-h-[32px] items-center rounded-full border border-[#d7e3ff] bg-white px-4 text-[13px] font-medium text-[#3b6ef8] shadow-sm"
              >
                {messages.openPublic}
              </Link>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            {hasDirtyChanges ? (
              <span className="rounded-full border border-[#fecdd3] bg-[#fff1f2] px-3 py-1 text-[12px] font-semibold text-[#e11d48]">
                {messages.unsavedChanges}
              </span>
            ) : saveState === "saved" ? (
              <span className="rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-1 text-[12px] font-semibold text-[#16a34a]">
                {messages.saved}
              </span>
            ) : null}

            <button
              type="button"
              onClick={() => setValues(savedValues)}
              disabled={!hasDirtyChanges || saveState === "saving"}
              aria-label={messages.undo}
              title={messages.undo}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#dfe3f1] bg-white text-[#7c8099] shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw size={15} />
            </button>

            <button
              type="button"
              onClick={saveChanges}
              disabled={!hasDirtyChanges || saveState === "saving"}
              className="inline-flex min-h-[36px] items-center gap-2 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 text-[13px] font-bold text-[#16a34a] shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saveState === "saving" ? <Activity size={14} /> : <Save size={14} />}
              {saveState === "saving" ? messages.saving : messages.saveChanges}
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div className="mb-4 rounded-2xl border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-[13px] font-semibold text-[#b42318]">
            {errorMessage}
          </div>
        ) : null}

        <section className="mb-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8b91aa]">
            {messages.titleBadge}
          </div>

          <div className="mt-2 max-w-[720px]">
            <EditableShell
              dirty={isDirty("organizationName")}
              onReset={() => resetField("organizationName")}
              resetLabel={messages.undo}
            >
              <TextInput
                value={values.organizationName}
                onChange={(value) => setField("organizationName", value)}
                className="text-[24px] font-bold leading-tight text-[#111827]"
                placeholder={messages.titleFallback}
              />
            </EditableShell>
          </div>

          <div className="mt-1 max-w-[360px]">
            <EditableShell
              dirty={isDirty("organizationType")}
              onReset={() => resetField("organizationType")}
              resetLabel={messages.undo}
            >
              <select
                value={values.organizationType}
                onChange={(event) =>
                  setField("organizationType", event.target.value)
                }
                className="w-full border-0 bg-transparent p-0 text-[14px] text-[#7c8099] outline-none"
              >
                {ORGANIZATION_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {getOrganizationTypeLabel(option, locale)}
                  </option>
                ))}
              </select>
            </EditableShell>
          </div>

          <p className="mt-2 max-w-[720px] text-[13px] text-[#7c8099]">
            {messages.editHint}
          </p>
        </section>

        <section className="grid auto-rows-[390px] items-stretch gap-4 lg:grid-cols-4">
          <TopCard label={messages.logo} icon={Star} accent="#3b6ef8" footerIconOnly
          >
            <div className="flex h-full min-h-0 flex-col gap-3">
              <button
                type="button"
                onClick={handleLogoPickerOpen}
                className="group relative mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-2xl border border-[#dfe4ff] bg-[#eef2ff] text-[#3b6ef8] transition hover:border-[#3b6ef8]/40 hover:shadow-[0_12px_28px_rgba(59,110,248,0.18)] focus:outline-none focus:ring-2 focus:ring-[#3b6ef8]/30"
                aria-label={messages.logo}
                title={messages.logo}
              >
                {values.logoUrl ? (
                  <img
                    src={values.logoUrl}
                    alt={organizationName}
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[46px] font-bold">
                    {getInitials(organizationName)}
                  </div>
                )}
                <span className="pointer-events-none absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/92 text-[#3b6ef8] shadow-[0_8px_20px_rgba(59,110,248,0.22)] transition group-hover:scale-105">
                  <Camera size={18} />
                </span>
              </button>
              <input
                ref={logoFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoFileChange}
              />
              <div className="min-w-0 flex-1">
                <EditableShell
                  dirty={isDirty("organizationName")}
                  onReset={() => resetField("organizationName")}
                  resetLabel={messages.undo}
                >
                  <TextInput
                    value={values.organizationName}
                    onChange={(value) => setField("organizationName", value)}
                    className="text-[14px] font-bold text-[#111827]"
                    placeholder={messages.titleFallback}
                  />
                </EditableShell>
                <div className="mt-2">
                  <EditableShell
                    dirty={isDirty("categoryLabel")}
                    onReset={() => resetField("categoryLabel")}
                    resetLabel={messages.undo}
                  >
                    <TextInput
                      value={values.categoryLabel}
                      onChange={(value) => setField("categoryLabel", value)}
                      className="text-[12px] text-[#9ca3b8]"
                      placeholder={messages.category}
                    />
                  </EditableShell>
                </div>
              </div>
            </div>
          </TopCard>

          <TopCard label={messages.address} icon={MapPin} accent="#f97316">
            <div className="space-y-2">
              <EditableShell
                dirty={isDirty("streetAddress")}
                onReset={() => resetField("streetAddress")}
                resetLabel={messages.undo}
              >
                <TextInput
                  value={values.streetAddress}
                  onChange={(value) => setField("streetAddress", value)}
                  className="text-[18px] font-bold text-[#111827]"
                  placeholder="ul. Tkacka 11"
                />
              </EditableShell>

              <div className="grid grid-cols-2 gap-2">
                <EditableShell
                  dirty={isDirty("city")}
                  onReset={() => resetField("city")}
                  resetLabel={messages.undo}
                >
                  <TextInput
                    value={values.city}
                    onChange={(value) => setField("city", value)}
                    className="text-[13px] text-[#4d536f]"
                    placeholder="Szczecin"
                  />
                </EditableShell>
                <EditableShell
                  dirty={isDirty("countryCode")}
                  onReset={() => resetField("countryCode")}
                  resetLabel={messages.undo}
                >
                  <TextInput
                    value={values.countryCode}
                    onChange={(value) => setField("countryCode", value)}
                    className="text-[13px] text-[#4d536f]"
                    placeholder="PL"
                  />
                </EditableShell>
              </div>

            </div>
                      <div className="flex min-h-0 flex-1 pt-1">
              <OrganizationLocationMapPreview
                location={{
                  streetAddress: values.streetAddress,
                  city: values.city,
                  district: values.district,
                  countryCode: values.countryCode,
                  latitude: values.latitude,
                  longitude: values.longitude,
}}
                organizationName={organizationName}
                locale={locale}
                actionLabel={messages.openPublic}
                distanceLabel={messages.fromYou}
              />
            </div>
          </TopCard>
          <div
            aria-label="reserved-owner-profile-block"
            className="h-full min-h-0 overflow-hidden rounded-2xl border border-[#edf0f7] bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.08)]"
          />
          <PurchaseConfirmationRequestCard
            organizationId={initialData.organization.id}
            organizationDefaultCurrency={initialData.organization.defaultCurrency}
            locale={locale}
          />
        </section>

        <section className="mt-4 flex flex-wrap gap-2">
          <MiniActionButton disabled icon={Phone}>{messages.phone}</MiniActionButton>
          <MiniActionButton disabled icon={Globe}>{messages.website}</MiniActionButton>
          <MiniActionButton disabled icon={MessageCircle}>{messages.messenger}</MiniActionButton>
          <MiniActionButton active>{messages.description}</MiniActionButton>
          <MiniActionButton>{messages.viewOffers}</MiniActionButton>
          <MiniActionButton>{messages.points}</MiniActionButton>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-2">
          <BigCard title={messages.description} detailLabel={messages.details}>
            <EditableShell
              dirty={isDirty("description")}
              onReset={() => resetField("description")}
              resetLabel={messages.undo}
            >
              <TextAreaInput
                value={values.description}
                onChange={(value) => setField("description", value)}
                placeholder={messages.description}
              />
            </EditableShell>
          </BigCard>

          <BigCard title={messages.publicOffers} detailLabel={messages.details}>
            <PlaceholderPanel label={messages.publicInformation} />
          </BigCard>

          <BigCard title={messages.certificatesAndPoints} detailLabel={messages.details}>
            <PlaceholderPanel label={messages.publicInformation} />
          </BigCard>

          <BigCard title={messages.publicActions} detailLabel={messages.details}>
            <PlaceholderPanel label={messages.publicInformation} />
          </BigCard>
        </section>

        <section className="mt-5">
          <h2 className="mb-3 text-[14px] font-bold text-[#111827]">
            {messages.flow}
          </h2>
          <div className="grid items-stretch gap-4 lg:auto-rows-fr lg:grid-cols-4">
            <DirectionCard
              label={messages.offers}
              pct={78}
              color="#3b6ef8"
              sub={`${initialData.counts.offersCount} ${messages.offers}`}
              trend="+3%"
            />
            <DirectionCard
              label={messages.certificate}
              pct={72}
              color="#f97316"
              sub={`${initialData.counts.certificateOffersCount} ${messages.certificate}`}
              trend="+1.5%"
            />
            <DirectionCard
              label={messages.points}
              pct={75}
              color="#22c55e"
              sub={messages.certificatesAndPoints}
              trend="+5%"
            />
            <DirectionCard
              label={messages.category}
              pct={79}
              color="#8b5cf6"
              sub={categoryLabel}
              trend="+2%"
            />
          </div>
        </section>
      </div>
    </main>
  );
}