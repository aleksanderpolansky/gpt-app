import Link from "next/link";
import { type Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  Gift,
  MapPin,
  Package,
  Star,
  UserRound,
} from "lucide-react";

import {
  ActorContextError,
  resolveActiveActorContext,
  type ResolvedActorContext,
} from "../../../../lib/actor-context";
import { auth0 } from "../../../../lib/auth0";
import OrganizationLocationMapPreview from "@/components/commercial/OrganizationLocationMapPreview";
import { CertificateCommercialPrice } from "@/components/figma-dashboard/certificate-commercial-price";
import {
  CertificateProfileActionLink,
  CertificateProfileBigCard,
  CertificateProfileDirectionCard,
  CertificateProfileNavLink,
  CertificateProfileTopCard,
} from "@/components/figma-dashboard/certificate-profile-shell";
import { CertificateLockedEditButton } from "@/components/figma-dashboard/certificate-locked-edit-button";
import { CertificateShareButton } from "@/components/figma-dashboard/certificate-share-button";
import { type LocaleCode } from "@/i18n";
import { ActivityScheduleDisplay } from "../../value-objects/[id]/activity-schedule-display";
import {
  buildGiftCertificateLocaleHref,
  formatGiftCertificateDate,
  formatGiftCertificateMoney,
  formatGiftCertificatePoints,
  getGiftCertificateDeliveryLabel,
  getGiftCertificateStatusLabel,
  GIFT_CERTIFICATE_CATALOG_COPY,
  normalizeGiftCertificateLocale,
} from "../gift-certificate-copy";
import {
  getGiftCertificateCatalogItem,
  type GiftCertificateCatalogItem,
} from "../gift-certificate-data";
import { CertificateTermsEditor } from "./certificate-terms-editor";
import { GiftCertificateFulfillmentConfirmation } from "./gift-certificate-fulfillment-confirmation";
import { GiftCertificateLocalDateTime } from "./gift-certificate-local-date-time";
import { GiftCertificateQr } from "./gift-certificate-qr";
import { OrderGiftCertificateButton } from "./order-gift-certificate-button";
import { PublishGiftCertificateButton } from "../../gift-certificates/[activityEventId]/publish-gift-certificate-button";

export const dynamic = "force-dynamic";

type CertificatePageProps = {
  readonly params: Promise<{
    readonly activityEventId: string;
  }>;
  readonly searchParams?: Promise<{
    readonly locale?: string | string[];
    readonly mode?: string | string[];
  }>;
};

type OfferPageCopy = {
  readonly back: string;
  readonly editMode: string;
  readonly viewMode: string;
  readonly editorType: string;
  readonly editHint: string;
  readonly editSource: string;
  readonly lockedTerms: string;
  readonly immutableNotice: string;
  readonly offerType: string;
  readonly placed: string;
  readonly offer: string;
  readonly address: string;
  readonly provider: string;
  readonly commercialTerms: string;
  readonly description: string;
  readonly conditions: string;
  readonly schedule: string;
  readonly providerDetails: string;
  readonly details: string;
  readonly publicInformation: string;
  readonly locationMissing: string;
  readonly personal: string;
  readonly avatar: string;
  readonly organization: string;
  readonly reputation: string;
  readonly status: string;
  readonly validity: string;
  readonly points: string;
  readonly money: string;
  readonly flow: string;
  readonly share: string;
  readonly sourceObject: string;
  readonly recipient: string;
};

const OFFER_PAGE_COPY: Record<LocaleCode, OfferPageCopy> = {
  en: {
    back: "← Back to offers",
    editMode: "Edit mode",
    viewMode: "View mode",
    editorType: "Public offer editor",
    editHint: "The public offer uses the same layout in viewing and editing modes.",
    editSource: "Open product or service",
    lockedTerms: "The terms of an ordered or completed offer are fixed.",
    immutableNotice: "This offer has already been ordered or completed. Its terms and public snapshot are fixed. Changes to the source object affect only future offers; create a new offer for new terms.",
    offerType: "ARCTor offer",
    placed: "Published",
    offer: "Offer",
    address: "Address",
    provider: "Provider",
    commercialTerms: "Offer terms",
    description: "Description",
    conditions: "Conditions",
    schedule: "Schedule",
    providerDetails: "Provider details",
    details: "Details",
    publicInformation: "Public information",
    locationMissing: "The provider has not added a public location yet.",
    personal: "Personal profile",
    avatar: "Avatar",
    organization: "Business",
    reputation: "Reputation",
    status: "Status",
    validity: "Validity",
    points: "Points",
    money: "Money part",
    flow: "Offer status",
    share: "Share",
    sourceObject: "Product or service",
    recipient: "Recipient",
  },
  pl: {
    back: "← Wróć do ofert",
    editMode: "Tryb edycji",
    viewMode: "Tryb podglądu",
    editorType: "Edytor publicznej oferty",
    editHint: "Publiczna oferta ma ten sam układ w trybie podglądu i edycji.",
    editSource: "Otwórz produkt lub usługę",
    lockedTerms: "Warunki zamówionej lub zrealizowanej oferty są zablokowane.",
    immutableNotice: "Ta oferta została już zamówiona lub zrealizowana. Jej warunki i publiczny zapis są stałe. Zmiany obiektu źródłowego dotyczą tylko przyszłych ofert; dla nowych warunków utwórz nową ofertę.",
    offerType: "Oferta ARCTor",
    placed: "Opublikowano",
    offer: "Oferta",
    address: "Adres",
    provider: "Dostawca",
    commercialTerms: "Warunki oferty",
    description: "Opis",
    conditions: "Warunki",
    schedule: "Termin",
    providerDetails: "Dane dostawcy",
    details: "Szczegóły",
    publicInformation: "Informacja publiczna",
    locationMissing: "Dostawca nie dodał jeszcze publicznej lokalizacji.",
    personal: "Profil osobisty",
    avatar: "Awatar",
    organization: "Firma",
    reputation: "Reputacja",
    status: "Status",
    validity: "Ważność",
    points: "Punkty",
    money: "Część pieniężna",
    flow: "Stan oferty",
    share: "Udostępnij",
    sourceObject: "Produkt lub usługa",
    recipient: "Odbiorca",
  },
  ru: {
    back: "← Назад к предложениям",
    editMode: "Режим редактирования",
    viewMode: "Режим просмотра",
    editorType: "Редактор публичного предложения",
    editHint: "Публичное предложение редактируется в том же виде, в котором его видят посетители.",
    editSource: "Открыть товар или услугу",
    lockedTerms: "Условия заказанного или реализованного предложения зафиксированы.",
    immutableNotice: "Это предложение уже заказано или реализовано. Его условия и публичный снимок зафиксированы. Изменения исходного объекта повлияют только на будущие предложения; для новых условий создайте новое предложение.",
    offerType: "Предложение ARCTor",
    placed: "Опубликовано",
    offer: "Предложение",
    address: "Адрес",
    provider: "Предоставляющий",
    commercialTerms: "Условия предложения",
    description: "Описание",
    conditions: "Условия",
    schedule: "Сроки и время",
    providerDetails: "Предоставляющий",
    details: "Подробнее",
    publicInformation: "Публичная информация",
    locationMissing: "Публичная геолокация предоставляющего пока не добавлена.",
    personal: "Личный профиль",
    avatar: "Аватар",
    organization: "Предприятие",
    reputation: "Репутация",
    status: "Состояние",
    validity: "Срок действия",
    points: "Пункты",
    money: "Денежная часть",
    flow: "Состояние предложения",
    share: "Поделиться",
    sourceObject: "Товар или услуга",
    recipient: "Получатель",
  },
  uk: {
    back: "← Назад до пропозицій",
    editMode: "Режим редагування",
    viewMode: "Режим перегляду",
    editorType: "Редактор публічної пропозиції",
    editHint: "Публічна пропозиція редагується в тому самому вигляді, який бачать відвідувачі.",
    editSource: "Відкрити товар або послугу",
    lockedTerms: "Умови замовленої або реалізованої пропозиції зафіксовано.",
    immutableNotice: "Цю пропозицію вже замовлено або реалізовано. Її умови та публічний знімок зафіксовано. Зміни вихідного об’єкта впливають лише на майбутні пропозиції; для нових умов створіть нову пропозицію.",
    offerType: "Пропозиція ARCTor",
    placed: "Опубліковано",
    offer: "Пропозиція",
    address: "Адреса",
    provider: "Надавач",
    commercialTerms: "Умови пропозиції",
    description: "Опис",
    conditions: "Умови",
    schedule: "Строки й час",
    providerDetails: "Надавач",
    details: "Докладніше",
    publicInformation: "Публічна інформація",
    locationMissing: "Публічну геолокацію надавача ще не додано.",
    personal: "Особистий профіль",
    avatar: "Аватар",
    organization: "Підприємство",
    reputation: "Репутація",
    status: "Стан",
    validity: "Строк дії",
    points: "Пункти",
    money: "Грошова частина",
    flow: "Стан пропозиції",
    share: "Поділитися",
    sourceObject: "Товар або послуга",
    recipient: "Отримувач",
  },
  de: {
    back: "← Zurück zu den Angeboten",
    editMode: "Bearbeitungsmodus",
    viewMode: "Ansichtsmodus",
    editorType: "Editor für öffentliche Angebote",
    editHint: "Das öffentliche Angebot verwendet im Ansichts- und Bearbeitungsmodus dasselbe Layout.",
    editSource: "Produkt oder Dienstleistung öffnen",
    lockedTerms: "Die Bedingungen eines bestellten oder abgeschlossenen Angebots sind festgeschrieben.",
    immutableNotice: "Dieses Angebot wurde bereits bestellt oder abgeschlossen. Bedingungen und öffentlicher Stand sind festgeschrieben. Änderungen am Quellobjekt gelten nur für künftige Angebote; für neue Bedingungen erstellen Sie ein neues Angebot.",
    offerType: "ARCTor-Angebot",
    placed: "Veröffentlicht",
    offer: "Angebot",
    address: "Adresse",
    provider: "Anbieter",
    commercialTerms: "Angebotsbedingungen",
    description: "Beschreibung",
    conditions: "Bedingungen",
    schedule: "Zeitraum und Termin",
    providerDetails: "Anbieter",
    details: "Details",
    publicInformation: "Öffentliche Information",
    locationMissing: "Der Anbieter hat noch keinen öffentlichen Standort hinzugefügt.",
    personal: "Persönliches Profil",
    avatar: "Avatar",
    organization: "Unternehmen",
    reputation: "Reputation",
    status: "Status",
    validity: "Gültigkeit",
    points: "Punkte",
    money: "Geldanteil",
    flow: "Angebotsstatus",
    share: "Teilen",
    sourceObject: "Produkt oder Dienstleistung",
    recipient: "Empfänger",
  },
  es: {
    back: "← Volver a las ofertas",
    editMode: "Modo de edición",
    viewMode: "Modo de vista",
    editorType: "Editor de oferta pública",
    editHint: "La oferta pública usa el mismo diseño en los modos de vista y edición.",
    editSource: "Abrir producto o servicio",
    lockedTerms: "Las condiciones de una oferta pedida o realizada están fijadas.",
    immutableNotice: "Esta oferta ya fue pedida o realizada. Sus condiciones y su versión pública están fijadas. Los cambios del objeto de origen solo afectan a ofertas futuras; cree una oferta nueva para condiciones nuevas.",
    offerType: "Oferta ARCTor",
    placed: "Publicado",
    offer: "Oferta",
    address: "Dirección",
    provider: "Proveedor",
    commercialTerms: "Condiciones de la oferta",
    description: "Descripción",
    conditions: "Condiciones",
    schedule: "Fechas y horario",
    providerDetails: "Proveedor",
    details: "Detalles",
    publicInformation: "Información pública",
    locationMissing: "El proveedor todavía no ha añadido una ubicación pública.",
    personal: "Perfil personal",
    avatar: "Avatar",
    organization: "Empresa",
    reputation: "Reputación",
    status: "Estado",
    validity: "Validez",
    points: "Puntos",
    money: "Parte monetaria",
    flow: "Estado de la oferta",
    share: "Compartir",
    sourceObject: "Producto o servicio",
    recipient: "Destinatario",
  },
  cs: {
    back: "← Zpět k nabídkám",
    editMode: "Režim úprav",
    viewMode: "Režim zobrazení",
    editorType: "Editor veřejné nabídky",
    editHint: "Veřejná nabídka má v režimu zobrazení i úprav stejné rozvržení.",
    editSource: "Otevřít produkt nebo službu",
    lockedTerms: "Podmínky objednané nebo dokončené nabídky jsou uzamčeny.",
    immutableNotice: "Tato nabídka již byla objednána nebo dokončena. Její podmínky a veřejný snímek jsou pevně dané. Změny zdrojového objektu ovlivní jen budoucí nabídky; pro nové podmínky vytvořte novou nabídku.",
    offerType: "Nabídka ARCTor",
    placed: "Publikováno",
    offer: "Nabídka",
    address: "Adresa",
    provider: "Poskytovatel",
    commercialTerms: "Podmínky nabídky",
    description: "Popis",
    conditions: "Podmínky",
    schedule: "Termín a čas",
    providerDetails: "Poskytovatel",
    details: "Podrobnosti",
    publicInformation: "Veřejná informace",
    locationMissing: "Poskytovatel zatím nepřidal veřejnou polohu.",
    personal: "Osobní profil",
    avatar: "Avatar",
    organization: "Podnik",
    reputation: "Reputace",
    status: "Stav",
    validity: "Platnost",
    points: "Body",
    money: "Peněžní část",
    flow: "Stav nabídky",
    share: "Sdílet",
    sourceObject: "Produkt nebo služba",
    recipient: "Příjemce",
  },
};

function isPubliclyShareableLifecycle(status: string): boolean {
  return ["available", "active", "redeemed", "expired", "annulled"].includes(
    status,
  );
}

export async function generateMetadata({
  params,
  searchParams,
}: CertificatePageProps): Promise<Metadata> {
  const { activityEventId } = await params;
  const resolvedSearchParams = await searchParams;
  const locale = normalizeGiftCertificateLocale(resolvedSearchParams?.locale);
  const certificate = await getGiftCertificateCatalogItem(activityEventId);

  if (
    !certificate ||
    certificate.activity.status !== "planned" ||
    !isPubliclyShareableLifecycle(certificate.lifecycleStatus)
  ) {
    return {
      title: "ARCTor",
      robots: { index: false, follow: false },
    };
  }

  const points = formatGiftCertificatePoints(certificate.pointsPrice, locale);
  const remainder =
    certificate.moneyRemainder > 0
      ? formatGiftCertificateMoney(
          certificate.moneyRemainder,
          certificate.providerCurrency,
          locale,
        )
      : null;
  const description = [
    certificate.providerDisplayName,
    remainder,
    points,
    certificate.description,
  ]
    .filter(Boolean)
    .join(" · ");
  const title = `${certificate.title} — ARCTor`;

  return {
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      title,
      description,
      siteName: "ARCTor",
      images: certificate.productImageUrl
        ? [{ url: certificate.productImageUrl }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: certificate.productImageUrl
        ? [certificate.productImageUrl]
        : undefined,
    },
  };
}

async function resolveOptionalViewer(): Promise<ResolvedActorContext | null> {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return null;
  }

  try {
    return await resolveActiveActorContext(session.user.sub);
  } catch (error) {
    if (error instanceof ActorContextError) {
      return null;
    }

    throw error;
  }
}

function formatProviderLocation(
  location: GiftCertificateCatalogItem["providerLocation"],
): string | null {
  if (!location) return null;

  const parts = [
    location.streetAddress,
    location.postalCode,
    location.city,
    location.district,
    location.region,
    location.countryCode,
  ].filter((value): value is string => Boolean(value?.trim()));

  return parts.length > 0 ? parts.join(", ") : location.label;
}


function buildOfferPageHref(
  pathname: string,
  locale: LocaleCode,
  mode?: "edit",
): string {
  const params = new URLSearchParams();

  if (locale !== "en") {
    params.set("locale", locale);
  }

  if (mode) {
    params.set("mode", mode);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function formatPlacedDate(value: string | null, locale: LocaleCode): string {
  if (!value) return "—";

  const localeTag: Record<LocaleCode, string> = {
    en: "en-US",
    pl: "pl-PL",
    ru: "ru-RU",
    uk: "uk-UA",
    de: "de-DE",
    es: "es-ES",
    cs: "cs-CZ",
  };

  return new Intl.DateTimeFormat(localeTag[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default async function CertificateCatalogDetailPage({
  params,
  searchParams,
}: CertificatePageProps) {
  const { activityEventId } = await params;
  const resolvedSearchParams = await searchParams;
  const locale = normalizeGiftCertificateLocale(resolvedSearchParams?.locale);
  const copy = GIFT_CERTIFICATE_CATALOG_COPY[locale];
  const pageCopy = OFFER_PAGE_COPY[locale];
  const requestedMode = Array.isArray(resolvedSearchParams?.mode)
    ? resolvedSearchParams?.mode[0]
    : resolvedSearchParams?.mode;
  const requestedEditMode = requestedMode === "edit";
  const [certificate, viewer] = await Promise.all([
    getGiftCertificateCatalogItem(activityEventId),
    resolveOptionalViewer(),
  ]);

  if (!certificate) {
    notFound();
  }

  const canEditOfferTerms = ["draft", "available"].includes(
    certificate.lifecycleStatus,
  );
  const editMode = requestedEditMode && canEditOfferTerms;
  const showImmutableNotice = requestedEditMode && !canEditOfferTerms;

  const isAccountProvider = viewer?.appUserId === certificate.providerOwnerUserId;
  const isProviderManager =
    isAccountProvider && viewer?.actorId === certificate.providerManagerActorId;
  const isRecipient =
    viewer?.appUserId === certificate.recipientUserId &&
    viewer?.actorId === certificate.recipientActorId;

  if (requestedEditMode && !isProviderManager) {
    notFound();
  }
  const isPubliclyShareable =
    isPubliclyShareableLifecycle(certificate.lifecycleStatus) &&
    certificate.activity.status === "planned";

  if (!isPubliclyShareable && !isProviderManager && !isRecipient) {
    notFound();
  }

  const providerKindLabel =
    certificate.providerType === "organization"
      ? pageCopy.organization
      : certificate.providerType === "avatar"
        ? pageCopy.avatar
        : pageCopy.personal;
  const providerLocationText = formatProviderLocation(certificate.providerLocation);
  const shareHref = buildGiftCertificateLocaleHref(
    `/certificates/${certificate.activityEventId}`,
    locale,
  );
  const editHref = buildOfferPageHref(
    `/certificates/${certificate.activityEventId}`,
    locale,
    "edit",
  );
  const viewHref = buildOfferPageHref(
    `/certificates/${certificate.activityEventId}`,
    locale,
  );
  const providerHref = certificate.providerPublicHref
    ? buildGiftCertificateLocaleHref(certificate.providerPublicHref, locale)
    : null;

  return (
    <main className="min-h-full bg-[#f5f6fb] text-[#1a1d2e]">
      <div className="p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <CertificateProfileNavLink
            href={buildGiftCertificateLocaleHref("/certificates", locale)}
          >
            {pageCopy.back}
          </CertificateProfileNavLink>

          {isProviderManager ? (
            canEditOfferTerms ? (
              <CertificateProfileNavLink href={editMode ? viewHref : editHref}>
                {editMode ? pageCopy.viewMode : pageCopy.editMode}
              </CertificateProfileNavLink>
            ) : (
              <CertificateLockedEditButton
                label={pageCopy.editMode}
                message={pageCopy.immutableNotice}
              />
            )
          ) : null}
        </div>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[20px] font-bold leading-tight text-[#1a1d2e]">
              {certificate.title}
            </h1>
            <p className="mt-0.5 text-[13px] text-[#7c8099]">
              {editMode ? pageCopy.editorType : pageCopy.offerType}
            </p>
            <p className="mt-1 text-[12px] text-[#9ca3b8]">
              {pageCopy.placed}: {formatPlacedDate(certificate.publishedAt, locale)}
            </p>
            {editMode ? (
              <p className="mt-2 text-[12px] text-[#7c8099]">{pageCopy.editHint}</p>
            ) : null}
          </div>
        </div>

        {showImmutableNotice ? (
          <section className="mb-4 rounded-xl border border-[#fed7aa] bg-[#fff7ed] px-4 py-3 text-[13px] font-medium leading-5 text-[#9a3412]">
            {pageCopy.immutableNotice}
          </section>
        ) : null}

        <section className="mb-5 grid auto-rows-auto grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CertificateProfileTopCard
            label={pageCopy.offer}
            icon={Star}
            accent="#3b6ef8"
          >
            <div className="flex h-full min-h-0 flex-col gap-3">
              <div className="relative mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-2xl border border-[#dfe4ff] bg-[#eef2ff] text-[#3b6ef8]">
                {certificate.productImageUrl ? (
                  <img
                    src={certificate.productImageUrl}
                    alt={certificate.title}
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    {certificate.objectKind === "service_type" ? (
                      <Gift size={46} />
                    ) : (
                      <Package size={46} />
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="line-clamp-2 text-[13px] font-semibold text-[#111827]">
                    {certificate.title}
                  </div>
                  <div className="mt-1 text-[11px] text-[#9ca3b8]">
                    {pageCopy.offerType}
                  </div>
                </div>
                <CertificateShareButton
                  locale={locale}
                  title={certificate.title}
                  description={certificate.description}
                  href={shareHref}
                  providerName={certificate.providerDisplayName}
                  pointsPrice={certificate.pointsPrice}
                  moneyRemainder={certificate.moneyRemainder}
                  currency={certificate.providerCurrency}
                />
              </div>
            </div>
          </CertificateProfileTopCard>

          <CertificateProfileTopCard
            label={pageCopy.address}
            icon={MapPin}
            accent="#f97316"
          >
            <div
              className={
                providerLocationText
                  ? "text-[15px] font-semibold leading-5 text-[#1a1d2e]"
                  : "max-w-[28ch] text-[13px] font-medium leading-5 text-[#5a5f7a]"
              }
            >
              {providerLocationText ?? pageCopy.locationMissing}
            </div>
            <div className="mt-3 flex min-h-0 flex-1">
              <OrganizationLocationMapPreview
                location={certificate.providerLocation}
                organizationName={certificate.providerDisplayName}
                locale={locale}
                className="rounded-xl shadow-sm"
              />
            </div>
          </CertificateProfileTopCard>

          <CertificateProfileTopCard
            label={pageCopy.provider}
            icon={UserRound}
            accent="#8b5cf6"
          >
            <div className="flex h-full min-h-0 flex-col gap-3">
              <div className="mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-2xl bg-[#f5f6fb]">
                {certificate.providerImageUrl ? (
                  <img
                    src={certificate.providerImageUrl}
                    alt={certificate.providerDisplayName}
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[48px] font-bold text-[#8da2ff]">
                    {certificate.providerDisplayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                {providerHref ? (
                  <Link
                    href={providerHref}
                    className="line-clamp-2 text-[13px] font-semibold text-[#315bd0] hover:underline"
                  >
                    {certificate.providerDisplayName}
                  </Link>
                ) : (
                  <div className="line-clamp-2 text-[13px] font-semibold text-[#111827]">
                    {certificate.providerDisplayName}
                  </div>
                )}
                <div className="mt-1 text-[11px] text-[#9ca3b8]">
                  {providerKindLabel}
                </div>
              </div>
            </div>
          </CertificateProfileTopCard>

          <CertificateProfileTopCard
            label={pageCopy.commercialTerms}
            icon={CheckCircle2}
            accent="#22c55e"
          >
            <div className="rounded-xl border border-[#e7eaf2] bg-[#f8fafc] px-3 py-3">
              <CertificateCommercialPrice
                regularPrice={certificate.regularPrice}
                moneyRemainder={certificate.moneyRemainder}
                pointsPrice={certificate.pointsPrice}
                currency={certificate.providerCurrency}
                locale={locale}
              />
            </div>
            <div className="mt-4 rounded-xl bg-[#f5f7ff] px-3 py-2 text-[12px] font-medium text-[#42507a]">
              {pageCopy.status}: {getGiftCertificateStatusLabel(certificate.lifecycleStatus, copy)}
            </div>
            <div className="mt-3 text-[12px] leading-5 text-[#7c8099]">
              {getGiftCertificateDeliveryLabel(certificate.deliveryMode, copy)}
            </div>

            <div className="mt-auto pt-5">
              {certificate.lifecycleStatus === "draft" && isProviderManager ? (
                <PublishGiftCertificateButton
                  activityEventId={certificate.activityEventId}
                  locale={locale}
                />
              ) : certificate.lifecycleStatus === "available" ? (
                viewer && !isAccountProvider ? (
                  <OrderGiftCertificateButton
                    activityEventId={certificate.activityEventId}
                    locale={locale}
                  />
                ) : (
                  <p className="text-[13px] font-semibold text-[#42507a]">
                    {isAccountProvider ? copy.ownCertificate : copy.signInToOrder}
                  </p>
                )
              ) : (
                <div className="text-[13px] font-semibold text-[#42507a]">
                  {getGiftCertificateStatusLabel(certificate.lifecycleStatus, copy)}
                </div>
              )}
            </div>
          </CertificateProfileTopCard>
        </section>

        <section className="mb-4 flex flex-wrap items-center gap-2">
          <CertificateProfileActionLink href="#offer-description" active>
            {pageCopy.description}
          </CertificateProfileActionLink>
          <CertificateProfileActionLink href="#offer-conditions">
            {pageCopy.conditions}
          </CertificateProfileActionLink>
          <CertificateProfileActionLink href="#offer-schedule">
            {pageCopy.schedule}
          </CertificateProfileActionLink>
          {isProviderManager ? (
            <Link
              href={buildGiftCertificateLocaleHref(
                `/value-objects/${certificate.valueObjectId}`,
                locale,
              )}
              className="rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-[12px] font-medium text-[#5a5f7a] transition hover:bg-[#f5f6fb]"
            >
              {pageCopy.editSource}
            </Link>
          ) : null}
          {providerHref ? (
            <Link
              href={providerHref}
              className="rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-[12px] font-medium text-[#5a5f7a] transition hover:bg-[#f5f6fb]"
            >
              {pageCopy.providerDetails}
            </Link>
          ) : null}
        </section>

        <section className="mb-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
          <CertificateProfileBigCard
            id="offer-description"
            title={pageCopy.description}
            detailLabel={pageCopy.details}
          >
            <div className="min-h-[140px] text-[13px] leading-6 text-[#5a5f7a]">
              {certificate.description?.trim() || pageCopy.publicInformation}
            </div>
          </CertificateProfileBigCard>

          <CertificateProfileBigCard
            id="offer-conditions"
            title={pageCopy.conditions}
            detailLabel={pageCopy.details}
          >
            {editMode &&
            ["draft", "available"].includes(certificate.lifecycleStatus) ? (
              <CertificateTermsEditor
                activityEventId={certificate.activityEventId}
                initialTerms={certificate.termsText}
                locale={locale}
              />
            ) : (
              <div className="min-h-[140px] whitespace-pre-wrap text-[13px] leading-6 text-[#5a5f7a]">
                {certificate.termsText?.trim() || copy.noConditions}
                {editMode ? (
                  <p className="mt-4 rounded-lg bg-[#fff7ed] px-3 py-2 text-[12px] font-semibold text-[#9a3412]">
                    {pageCopy.lockedTerms}
                  </p>
                ) : null}
              </div>
            )}
          </CertificateProfileBigCard>

          <CertificateProfileBigCard
            id="offer-schedule"
            title={pageCopy.schedule}
            detailLabel={pageCopy.details}
          >
            <div className="grid min-h-[140px] gap-3 text-[13px] leading-6 text-[#5a5f7a]">
              <div>
                <span className="font-semibold text-[#1a1d2e]">{pageCopy.validity}: </span>
                {formatGiftCertificateDate(certificate.availableFrom, locale)} — {" "}
                {formatGiftCertificateDate(certificate.availableUntil, locale)}
              </div>
              {certificate.objectKind === "service_type" ? (
                <ActivityScheduleDisplay
                  locale={locale}
                  scheduleModeCode={certificate.activity.schedule_mode_code}
                  scheduledDate={certificate.activity.scheduled_date}
                  scheduleStartDate={certificate.activity.schedule_start_date}
                  scheduleEndDate={certificate.activity.schedule_end_date}
                  deadlineAt={certificate.activity.deadline_at}
                  startedAt={certificate.activity.started_at}
                  endedAt={certificate.activity.ended_at}
                />
              ) : null}
            </div>
          </CertificateProfileBigCard>

          <CertificateProfileBigCard
            title={pageCopy.providerDetails}
            detailLabel={pageCopy.details}
          >
            <div className="grid min-h-[140px] gap-3 text-[13px] leading-6 text-[#5a5f7a]">
              <div>
                <span className="font-semibold text-[#1a1d2e]">{pageCopy.provider}: </span>
                {certificate.providerDisplayName}
              </div>
              <div>
                <span className="font-semibold text-[#1a1d2e]">{pageCopy.reputation}: </span>
                {certificate.providerReputation}
              </div>
              {certificate.recipientDisplayName ? (
                <div>
                  <span className="font-semibold text-[#1a1d2e]">{pageCopy.recipient}: </span>
                  {certificate.recipientDisplayName}
                </div>
              ) : null}
            </div>
          </CertificateProfileBigCard>
        </section>

        <section className="mt-5">
          <h2 className="mb-3 text-[13px] font-semibold text-[#111827]">
            {pageCopy.flow}
          </h2>
          <div className="grid items-stretch gap-4 lg:auto-rows-fr lg:grid-cols-4">
            <CertificateProfileDirectionCard
              label={pageCopy.status}
              value={getGiftCertificateStatusLabel(certificate.lifecycleStatus, copy)}
              color="#3b6ef8"
              sub={getGiftCertificateDeliveryLabel(certificate.deliveryMode, copy)}
            />
            <CertificateProfileDirectionCard
              label={pageCopy.points}
              value={formatGiftCertificatePoints(certificate.pointsPrice, locale)}
              color="#f97316"
              sub={pageCopy.commercialTerms}
            />
            <CertificateProfileDirectionCard
              label={pageCopy.money}
              value={formatGiftCertificateMoney(
                certificate.moneyRemainder,
                certificate.providerCurrency,
                locale,
              )}
              color="#22c55e"
              sub={certificate.providerCurrency}
            />
            <CertificateProfileDirectionCard
              label={pageCopy.validity}
              value={formatGiftCertificateDate(certificate.availableUntil, locale)}
              color="#8b5cf6"
              sub={formatGiftCertificateDate(certificate.availableFrom, locale)}
            />
          </div>
        </section>

        {(isProviderManager || isRecipient) &&
        certificate.lifecycleStatus === "active" &&
        certificate.publicCode ? (
          <section className="mt-5 grid gap-3 sm:grid-cols-2">
            <CertificateProfileBigCard title={copy.publicCode}>
              <div className="text-[14px] font-bold text-[#111827]">
                {certificate.publicCode}
              </div>
            </CertificateProfileBigCard>
            <CertificateProfileBigCard title={copy.orderedAt}>
              <div className="text-[14px] font-bold text-[#111827]">
                {certificate.orderedAt ? (
                  <GiftCertificateLocalDateTime
                    value={certificate.orderedAt}
                    locale={locale}
                  />
                ) : (
                  "—"
                )}
              </div>
            </CertificateProfileBigCard>
          </section>
        ) : null}

        {isRecipient &&
        certificate.lifecycleStatus === "active" &&
        certificate.publicCode ? (
          <div className="mt-5">
            <GiftCertificateQr
              activityEventId={certificate.activityEventId}
              publicCode={certificate.publicCode}
              locale={locale}
            />
          </div>
        ) : null}

        {isRecipient &&
        (certificate.lifecycleStatus === "active" ||
          certificate.lifecycleStatus === "redeemed") ? (
          <div className="mt-5">
            <GiftCertificateFulfillmentConfirmation
              activityEventId={certificate.activityEventId}
              locale={locale}
            />
          </div>
        ) : null}

        <section className="mt-5 grid gap-2 rounded-xl border border-[#d9e2ff] bg-[#f4f7ff] p-5 text-[13px] leading-6 text-[#42507a]">
          <p>{copy.pointsBurnNotice}</p>
          <p>{copy.moneyOutsideNotice}</p>
          <p>{copy.noRefundNotice}</p>
        </section>
      </div>
    </main>
  );
}
