import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../lib/actor-context";
import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";
import { ActivityScheduleDisplay } from "../../value-objects/[id]/activity-schedule-display";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type GiftCertificateDetailsPageProps = {
  params: Promise<{
    activityEventId: string;
  }>;
  searchParams?: Promise<{
    locale?: string | string[];
  }>;
};

type GiftCertificateTermsRow = {
  activity_event_id: string;
  value_object_id: string;
  provider_owner_user_id: string;
  provider_manager_actor_id: string;
  provider_actor_id: string;
  provider_organization_id: string | null;
  provider_type: "personal" | "avatar" | "organization";
  delivery_mode: string;
  lifecycle_status: string;
  available_from: string;
  available_until: string;
  regular_price_snapshot: number | string;
  provider_currency: string;
  points_coverage_mode: string;
  points_coverage_percent: number | string | null;
  requested_points_covered_amount: number | string | null;
  provider_currency_covered_amount: number | string;
  money_remainder_provider_currency: number | string;
  points_currency_code: string;
  reference_currency: string;
  reference_value_per_point: number | string;
  reference_exchange_rate: number | string;
  points_price: number | string;
  terms_text: string | null;
  public_snapshot_json: unknown;
  recipient_user_id: string | null;
  recipient_actor_id: string | null;
  public_code: string | null;
  qr_token_hash: string | null;
  ordered_at: string | null;
  redeemed_at: string | null;
  expired_at: string | null;
  annulled_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type ActivityRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  activity_role_code: string;
  schedule_mode_code: string | null;
  scheduled_date: string | null;
  schedule_start_date: string | null;
  schedule_end_date: string | null;
  deadline_at: string | null;
  started_at: string | null;
  ended_at: string | null;
};

type ValueObjectRow = {
  id: string;
  title: string;
  description: string | null;
  object_kind: "product_type" | "service_type";
  status: string;
};

type OrganizationRow = {
  id: string;
  organization_name: string;
  status: string;
};

type Copy = {
  eyebrow: string;
  title: string;
  backToObject: string;
  draftNoticeTitle: string;
  draftNoticeBody: string;
  status: string;
  provider: string;
  providerType: string;
  personal: string;
  avatar: string;
  organization: string;
  productOrService: string;
  product: string;
  service: string;
  provision: string;
  productPickup: string;
  productDelivery: string;
  serviceOffline: string;
  serviceOnline: string;
  validity: string;
  exactSchedule: string;
  ordinaryPrice: string;
  coverage: string;
  pointsPrice: string;
  moneyRemainder: string;
  exchangeRate: string;
  exchangeRateConvention: string;
  conditions: string;
  noConditions: string;
  recipient: string;
  recipientVacant: string;
  publicCode: string;
  publicCodeAfterOrder: string;
  qrProtection: string;
  qrAfterOrder: string;
  pointsNotice: string;
  outsidePaymentNotice: string;
  createdAt: string;
  updatedAt: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    eyebrow: "Gift certificate",
    title: "Certificate details",
    backToObject: "Back to product or service",
    draftNoticeTitle: "This is still a draft",
    draftNoticeBody:
      "The certificate is not public, has no recipient and does not debit POINTS. Publication and ordering will be added in the next controlled steps.",
    status: "Status",
    provider: "Provider",
    providerType: "Provider type",
    personal: "Personal profile",
    avatar: "Avatar",
    organization: "Enterprise",
    productOrService: "Product or service",
    product: "Product",
    service: "Service",
    provision: "How it will be provided",
    productPickup: "Product pickup",
    productDelivery: "Product delivery",
    serviceOffline: "Service offline",
    serviceOnline: "Service online",
    validity: "Validity",
    exactSchedule: "Exact service time",
    ordinaryPrice: "Ordinary price snapshot",
    coverage: "Covered with POINTS",
    pointsPrice: "Certificate price",
    moneyRemainder: "Money remainder",
    exchangeRate: "Reference exchange rate",
    exchangeRateConvention: "provider currency per 1 EUR",
    conditions: "Conditions and comments",
    noConditions: "No conditions were added.",
    recipient: "Recipient",
    recipientVacant: "Not assigned yet",
    publicCode: "Public code",
    publicCodeAfterOrder: "Will be generated after ordering",
    qrProtection: "QR protection",
    qrAfterOrder: "Will be generated after ordering",
    pointsNotice:
      "1 POINT equals 1 EUR. POINTS are not debited while the certificate remains a draft.",
    outsidePaymentNotice:
      "Any money remainder is paid outside ARCTor. ARCTor does not accept or confirm monetary payment.",
    createdAt: "Created",
    updatedAt: "Updated",
  },
  pl: {
    eyebrow: "Bon podarunkowy",
    title: "Szczegóły bonu",
    backToObject: "Wróć do produktu lub usługi",
    draftNoticeTitle: "To nadal jest szkic",
    draftNoticeBody:
      "Bon nie jest publiczny, nie ma odbiorcy i nie obciąża POINTS. Publikowanie i zamawianie zostaną dodane w kolejnych kontrolowanych krokach.",
    status: "Status",
    provider: "Dostawca",
    providerType: "Typ dostawcy",
    personal: "Profil osobisty",
    avatar: "Awatar",
    organization: "Przedsiębiorstwo",
    productOrService: "Produkt lub usługa",
    product: "Produkt",
    service: "Usługa",
    provision: "Sposób realizacji",
    productPickup: "Odbiór produktu",
    productDelivery: "Dostawa produktu",
    serviceOffline: "Usługa stacjonarna",
    serviceOnline: "Usługa online",
    validity: "Okres ważności",
    exactSchedule: "Dokładny termin usługi",
    ordinaryPrice: "Zapisana zwykła cena",
    coverage: "Pokrycie POINTS",
    pointsPrice: "Cena bonu",
    moneyRemainder: "Pozostała kwota pieniężna",
    exchangeRate: "Kurs referencyjny",
    exchangeRateConvention: "waluta dostawcy za 1 EUR",
    conditions: "Warunki i komentarze",
    noConditions: "Nie dodano warunków.",
    recipient: "Odbiorca",
    recipientVacant: "Jeszcze nie przypisano",
    publicCode: "Kod publiczny",
    publicCodeAfterOrder: "Zostanie utworzony po zamówieniu",
    qrProtection: "Ochrona QR",
    qrAfterOrder: "Zostanie utworzona po zamówieniu",
    pointsNotice:
      "1 POINT odpowiada 1 EUR. POINTS nie są pobierane, dopóki bon pozostaje szkicem.",
    outsidePaymentNotice:
      "Pozostała kwota pieniężna jest płacona poza ARCTor. ARCTor nie przyjmuje ani nie potwierdza płatności pieniężnej.",
    createdAt: "Utworzono",
    updatedAt: "Zaktualizowano",
  },
  ru: {
    eyebrow: "Подарочный сертификат",
    title: "Подробнее о сертификате",
    backToObject: "Назад к товару или услуге",
    draftNoticeTitle: "Это пока черновик",
    draftNoticeBody:
      "Сертификат не опубликован, у него нет получателя и POINTS не списываются. Публикация и заказ будут добавлены следующими контролируемыми шагами.",
    status: "Состояние",
    provider: "Предоставляющий",
    providerType: "Вид предоставляющего",
    personal: "Личный профиль",
    avatar: "Аватар",
    organization: "Предприятие",
    productOrService: "Товар или услуга",
    product: "Товар",
    service: "Услуга",
    provision: "Способ предоставления",
    productPickup: "Самовывоз товара",
    productDelivery: "Доставка товара",
    serviceOffline: "Услуга офлайн",
    serviceOnline: "Услуга онлайн",
    validity: "Срок действия",
    exactSchedule: "Точное время услуги",
    ordinaryPrice: "Снимок обычной стоимости",
    coverage: "Покрывается POINTS",
    pointsPrice: "Стоимость сертификата",
    moneyRemainder: "Денежный остаток",
    exchangeRate: "Расчётный курс",
    exchangeRateConvention: "единиц валюты предоставляющего за 1 EUR",
    conditions: "Условия и комментарии",
    noConditions: "Условия не добавлены.",
    recipient: "Получатель",
    recipientVacant: "Пока не назначен",
    publicCode: "Публичный код",
    publicCodeAfterOrder: "Будет создан после заказа",
    qrProtection: "Защита QR-кодом",
    qrAfterOrder: "Будет создана после заказа",
    pointsNotice:
      "1 POINT равен 1 EUR. Пока сертификат остаётся черновиком, POINTS не списываются.",
    outsidePaymentNotice:
      "Денежный остаток оплачивается вне ARCTor. ARCTor не принимает деньги и не подтверждает денежный платёж.",
    createdAt: "Создан",
    updatedAt: "Обновлён",
  },
  uk: {
    eyebrow: "Подарунковий сертифікат",
    title: "Докладніше про сертифікат",
    backToObject: "Назад до товару або послуги",
    draftNoticeTitle: "Це поки що чернетка",
    draftNoticeBody:
      "Сертифікат не опублікований, у нього немає отримувача і POINTS не списуються. Публікацію та замовлення буде додано наступними контрольованими кроками.",
    status: "Стан",
    provider: "Надавач",
    providerType: "Вид надавача",
    personal: "Особистий профіль",
    avatar: "Аватар",
    organization: "Підприємство",
    productOrService: "Товар або послуга",
    product: "Товар",
    service: "Послуга",
    provision: "Спосіб надання",
    productPickup: "Самовивіз товару",
    productDelivery: "Доставка товару",
    serviceOffline: "Послуга офлайн",
    serviceOnline: "Послуга онлайн",
    validity: "Строк дії",
    exactSchedule: "Точний час послуги",
    ordinaryPrice: "Знімок звичайної вартості",
    coverage: "Покривається POINTS",
    pointsPrice: "Вартість сертифіката",
    moneyRemainder: "Грошовий залишок",
    exchangeRate: "Розрахунковий курс",
    exchangeRateConvention: "одиниць валюти надавача за 1 EUR",
    conditions: "Умови та коментарі",
    noConditions: "Умови не додано.",
    recipient: "Отримувач",
    recipientVacant: "Ще не призначений",
    publicCode: "Публічний код",
    publicCodeAfterOrder: "Буде створений після замовлення",
    qrProtection: "Захист QR-кодом",
    qrAfterOrder: "Буде створений після замовлення",
    pointsNotice:
      "1 POINT дорівнює 1 EUR. Поки сертифікат залишається чернеткою, POINTS не списуються.",
    outsidePaymentNotice:
      "Грошовий залишок сплачується поза ARCTor. ARCTor не приймає гроші й не підтверджує грошову оплату.",
    createdAt: "Створено",
    updatedAt: "Оновлено",
  },
  de: {
    eyebrow: "Geschenkgutschein",
    title: "Gutscheindetails",
    backToObject: "Zurück zum Produkt oder zur Dienstleistung",
    draftNoticeTitle: "Dies ist noch ein Entwurf",
    draftNoticeBody:
      "Der Gutschein ist nicht veröffentlicht, hat keinen Empfänger und belastet keine POINTS. Veröffentlichung und Bestellung folgen in den nächsten kontrollierten Schritten.",
    status: "Status",
    provider: "Anbieter",
    providerType: "Anbietertyp",
    personal: "Persönliches Profil",
    avatar: "Avatar",
    organization: "Unternehmen",
    productOrService: "Produkt oder Dienstleistung",
    product: "Produkt",
    service: "Dienstleistung",
    provision: "Art der Bereitstellung",
    productPickup: "Produktabholung",
    productDelivery: "Produktlieferung",
    serviceOffline: "Dienstleistung vor Ort",
    serviceOnline: "Online-Dienstleistung",
    validity: "Gültigkeit",
    exactSchedule: "Genaue Dienstleistungszeit",
    ordinaryPrice: "Gespeicherter Normalpreis",
    coverage: "Mit POINTS gedeckt",
    pointsPrice: "Gutscheinpreis",
    moneyRemainder: "Geldrestbetrag",
    exchangeRate: "Referenzkurs",
    exchangeRateConvention: "Anbieterwährung je 1 EUR",
    conditions: "Bedingungen und Kommentare",
    noConditions: "Keine Bedingungen hinzugefügt.",
    recipient: "Empfänger",
    recipientVacant: "Noch nicht zugewiesen",
    publicCode: "Öffentlicher Code",
    publicCodeAfterOrder: "Wird nach der Bestellung erzeugt",
    qrProtection: "QR-Schutz",
    qrAfterOrder: "Wird nach der Bestellung erzeugt",
    pointsNotice:
      "1 POINT entspricht 1 EUR. Solange der Gutschein ein Entwurf ist, werden keine POINTS abgebucht.",
    outsidePaymentNotice:
      "Ein Geldrestbetrag wird außerhalb von ARCTor bezahlt. ARCTor nimmt keine Geldzahlung an und bestätigt sie nicht.",
    createdAt: "Erstellt",
    updatedAt: "Aktualisiert",
  },
  es: {
    eyebrow: "Certificado de regalo",
    title: "Detalles del certificado",
    backToObject: "Volver al producto o servicio",
    draftNoticeTitle: "Esto todavía es un borrador",
    draftNoticeBody:
      "El certificado no es público, no tiene destinatario y no descuenta POINTS. La publicación y el pedido se añadirán en los siguientes pasos controlados.",
    status: "Estado",
    provider: "Proveedor",
    providerType: "Tipo de proveedor",
    personal: "Perfil personal",
    avatar: "Avatar",
    organization: "Empresa",
    productOrService: "Producto o servicio",
    product: "Producto",
    service: "Servicio",
    provision: "Forma de prestación",
    productPickup: "Recogida del producto",
    productDelivery: "Entrega del producto",
    serviceOffline: "Servicio presencial",
    serviceOnline: "Servicio en línea",
    validity: "Validez",
    exactSchedule: "Hora exacta del servicio",
    ordinaryPrice: "Precio ordinario guardado",
    coverage: "Cubierto con POINTS",
    pointsPrice: "Precio del certificado",
    moneyRemainder: "Resto monetario",
    exchangeRate: "Tipo de cambio de referencia",
    exchangeRateConvention: "moneda del proveedor por 1 EUR",
    conditions: "Condiciones y comentarios",
    noConditions: "No se añadieron condiciones.",
    recipient: "Destinatario",
    recipientVacant: "Todavía no asignado",
    publicCode: "Código público",
    publicCodeAfterOrder: "Se generará después del pedido",
    qrProtection: "Protección QR",
    qrAfterOrder: "Se generará después del pedido",
    pointsNotice:
      "1 POINT equivale a 1 EUR. Los POINTS no se descuentan mientras el certificado siga siendo un borrador.",
    outsidePaymentNotice:
      "El resto monetario se paga fuera de ARCTor. ARCTor no acepta ni confirma pagos monetarios.",
    createdAt: "Creado",
    updatedAt: "Actualizado",
  },
  cs: {
    eyebrow: "Dárkový certifikát",
    title: "Podrobnosti certifikátu",
    backToObject: "Zpět k produktu nebo službě",
    draftNoticeTitle: "Toto je zatím koncept",
    draftNoticeBody:
      "Certifikát není veřejný, nemá příjemce a neodečítá POINTS. Publikování a objednání budou přidány v dalších řízených krocích.",
    status: "Stav",
    provider: "Poskytovatel",
    providerType: "Typ poskytovatele",
    personal: "Osobní profil",
    avatar: "Avatar",
    organization: "Podnik",
    productOrService: "Produkt nebo služba",
    product: "Produkt",
    service: "Služba",
    provision: "Způsob poskytnutí",
    productPickup: "Osobní odběr produktu",
    productDelivery: "Doručení produktu",
    serviceOffline: "Služba osobně",
    serviceOnline: "Služba online",
    validity: "Platnost",
    exactSchedule: "Přesný čas služby",
    ordinaryPrice: "Uložená běžná cena",
    coverage: "Kryto POINTS",
    pointsPrice: "Cena certifikátu",
    moneyRemainder: "Peněžní doplatek",
    exchangeRate: "Referenční kurz",
    exchangeRateConvention: "měna poskytovatele za 1 EUR",
    conditions: "Podmínky a komentáře",
    noConditions: "Nebyly přidány žádné podmínky.",
    recipient: "Příjemce",
    recipientVacant: "Zatím nepřiřazen",
    publicCode: "Veřejný kód",
    publicCodeAfterOrder: "Bude vytvořen po objednání",
    qrProtection: "QR ochrana",
    qrAfterOrder: "Bude vytvořena po objednání",
    pointsNotice:
      "1 POINT odpovídá 1 EUR. Dokud je certifikát konceptem, POINTS se neodečítají.",
    outsidePaymentNotice:
      "Peněžní doplatek se hradí mimo ARCTor. ARCTor peněžní platbu nepřijímá ani nepotvrzuje.",
    createdAt: "Vytvořeno",
    updatedAt: "Aktualizováno",
  },
};

const LOCALE_TAGS: Record<LocaleCode, string> = {
  en: "en-US",
  pl: "pl-PL",
  ru: "ru-RU",
  uk: "uk-UA",
  de: "de-DE",
  es: "es-ES",
  cs: "cs-CZ",
};

const STATUS_LABELS: Record<LocaleCode, Record<string, string>> = {
  en: {
    draft: "Draft",
    available: "Available",
    active: "Ordered and active",
    redeemed: "Redeemed",
    expired: "Expired",
    annulled: "Annulled",
    archived: "Archived",
  },
  pl: {
    draft: "Szkic",
    available: "Dostępny",
    active: "Zamówiony i aktywny",
    redeemed: "Zrealizowany",
    expired: "Wygasły",
    annulled: "Unieważniony",
    archived: "Zarchiwizowany",
  },
  ru: {
    draft: "Черновик",
    available: "Доступен",
    active: "Заказан и активен",
    redeemed: "Использован",
    expired: "Истёк",
    annulled: "Аннулирован",
    archived: "В архиве",
  },
  uk: {
    draft: "Чернетка",
    available: "Доступний",
    active: "Замовлений і активний",
    redeemed: "Використаний",
    expired: "Строк минув",
    annulled: "Анульований",
    archived: "В архіві",
  },
  de: {
    draft: "Entwurf",
    available: "Verfügbar",
    active: "Bestellt und aktiv",
    redeemed: "Eingelöst",
    expired: "Abgelaufen",
    annulled: "Annulliert",
    archived: "Archiviert",
  },
  es: {
    draft: "Borrador",
    available: "Disponible",
    active: "Pedido y activo",
    redeemed: "Canjeado",
    expired: "Caducado",
    annulled: "Anulado",
    archived: "Archivado",
  },
  cs: {
    draft: "Koncept",
    available: "Dostupný",
    active: "Objednaný a aktivní",
    redeemed: "Uplatněný",
    expired: "Platnost skončila",
    annulled: "Anulovaný",
    archived: "Archivovaný",
  },
};

function normalizeLocale(value: string | string[] | undefined): LocaleCode {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (
    normalized === "pl" ||
    normalized === "ru" ||
    normalized === "uk" ||
    normalized === "de" ||
    normalized === "es" ||
    normalized === "cs"
  ) {
    return normalized;
  }

  return "en";
}

function buildLocaleHref(pathname: string, locale: LocaleCode) {
  if (locale === "en") {
    return pathname;
  }

  return `${pathname}?locale=${encodeURIComponent(locale)}`;
}

function toNumber(value: number | string | null | undefined) {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function formatMoney(
  value: number | string | null | undefined,
  currency: string,
  locale: LocaleCode,
) {
  return new Intl.NumberFormat(LOCALE_TAGS[locale], {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatPoints(
  value: number | string | null | undefined,
  locale: LocaleCode,
) {
  return `${new Intl.NumberFormat(LOCALE_TAGS[locale], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value))} POINTS`;
}

function formatDateOnly(value: string, locale: LocaleCode) {
  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(parsed);
}

function formatDateTime(value: string, locale: LocaleCode) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function getSnapshotValue(
  snapshot: Record<string, unknown>,
  key: string,
) {
  const value = snapshot[key];
  return typeof value === "string" ? value : null;
}

function getDeliveryLabel(deliveryMode: string, copy: Copy) {
  if (deliveryMode === "product_pickup") {
    return copy.productPickup;
  }

  if (deliveryMode === "product_delivery") {
    return copy.productDelivery;
  }

  if (deliveryMode === "service_offline") {
    return copy.serviceOffline;
  }

  if (deliveryMode === "service_online") {
    return copy.serviceOnline;
  }

  return deliveryMode;
}

function getProviderTypeLabel(
  providerType: GiftCertificateTermsRow["provider_type"],
  copy: Copy,
) {
  if (providerType === "organization") {
    return copy.organization;
  }

  if (providerType === "avatar") {
    return copy.avatar;
  }

  return copy.personal;
}

function DetailCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-black/[0.07] bg-white p-5 shadow-sm">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
        {label}
      </div>
      <div className="mt-2 text-[15px] font-bold leading-6 text-[#111827]">
        {children}
      </div>
    </div>
  );
}

export default async function GiftCertificateDetailsPage({
  params,
  searchParams,
}: GiftCertificateDetailsPageProps) {
  const { activityEventId } = await params;
  const resolvedSearchParams = await searchParams;
  const locale = normalizeLocale(resolvedSearchParams?.locale);
  const copy = COPY[locale];

  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    notFound();
  }

  let actorContext: Awaited<ReturnType<typeof resolveActiveActorContext>>;

  try {
    actorContext = await resolveActiveActorContext(session.user.sub);
  } catch (error) {
    if (error instanceof ActorContextError) {
      notFound();
    }

    throw error;
  }

  const { data: termsData, error: termsError } = await supabase
    .from("activity_gift_certificate_terms")
    .select(
      `
      activity_event_id,
      value_object_id,
      provider_owner_user_id,
      provider_manager_actor_id,
      provider_actor_id,
      provider_organization_id,
      provider_type,
      delivery_mode,
      lifecycle_status,
      available_from,
      available_until,
      regular_price_snapshot,
      provider_currency,
      points_coverage_mode,
      points_coverage_percent,
      requested_points_covered_amount,
      provider_currency_covered_amount,
      money_remainder_provider_currency,
      points_currency_code,
      reference_currency,
      reference_value_per_point,
      reference_exchange_rate,
      points_price,
      terms_text,
      public_snapshot_json,
      recipient_user_id,
      recipient_actor_id,
      public_code,
      qr_token_hash,
      ordered_at,
      redeemed_at,
      expired_at,
      annulled_at,
      archived_at,
      created_at,
      updated_at
    `,
    )
    .eq("activity_event_id", activityEventId)
    .eq("provider_owner_user_id", actorContext.appUserId)
    .eq("provider_manager_actor_id", actorContext.actorId)
    .maybeSingle();

  if (termsError) {
    throw new Error(termsError.message);
  }

  const terms = termsData as GiftCertificateTermsRow | null;

  if (!terms) {
    notFound();
  }

  const [
    { data: activityData, error: activityError },
    { data: valueObjectData, error: valueObjectError },
  ] = await Promise.all([
    supabase
      .from("activity_events")
      .select(
        `
        id,
        title,
        description,
        status,
        activity_role_code,
        schedule_mode_code,
        scheduled_date,
        schedule_start_date,
        schedule_end_date,
        deadline_at,
        started_at,
        ended_at
      `,
      )
      .eq("id", terms.activity_event_id)
      .eq("user_id", actorContext.appUserId)
      .eq("acting_as_actor_id", actorContext.actorId)
      .eq("activity_role_code", "planned")
      .maybeSingle(),
    supabase
      .from("value_objects")
      .select("id,title,description,object_kind,status")
      .eq("id", terms.value_object_id)
      .eq("owner_user_id", actorContext.appUserId)
      .eq("owner_actor_id", actorContext.actorId)
      .in("object_kind", ["product_type", "service_type"])
      .maybeSingle(),
  ]);

  if (activityError) {
    throw new Error(activityError.message);
  }

  if (valueObjectError) {
    throw new Error(valueObjectError.message);
  }

  const activity = activityData as ActivityRow | null;
  const valueObject = valueObjectData as ValueObjectRow | null;

  if (!activity || !valueObject) {
    notFound();
  }

  let providerLabel = actorContext.profile.displayName;

  if (terms.provider_organization_id) {
    const { data: organizationData, error: organizationError } = await supabase
      .from("organizations")
      .select("id,organization_name,status")
      .eq("id", terms.provider_organization_id)
      .eq("owner_actor_id", actorContext.actorId)
      .eq("status", "active")
      .maybeSingle();

    if (organizationError) {
      throw new Error(organizationError.message);
    }

    const organization = organizationData as OrganizationRow | null;

    if (!organization) {
      notFound();
    }

    providerLabel = organization.organization_name;
  }

  const snapshot =
    terms.public_snapshot_json &&
    typeof terms.public_snapshot_json === "object" &&
    !Array.isArray(terms.public_snapshot_json)
      ? (terms.public_snapshot_json as Record<string, unknown>)
      : {};

  const publicTitle =
    getSnapshotValue(snapshot, "publicTitle") ?? valueObject.title;
  const publicDescription =
    getSnapshotValue(snapshot, "publicDescription") ??
    valueObject.description ??
    activity.description;

  const isService = valueObject.object_kind === "service_type";
  const coverageLabel =
    terms.points_coverage_mode === "percentage"
      ? `${toNumber(terms.points_coverage_percent).toFixed(2)}%`
      : formatMoney(
          terms.requested_points_covered_amount,
          terms.provider_currency,
          locale,
        );

  const statusLabel =
    STATUS_LABELS[locale][terms.lifecycle_status] ??
    terms.lifecycle_status;

  return (
    <main className="min-h-screen bg-[#f4f5fb] px-4 py-8 text-[#111827] sm:px-6 lg:px-10">
      <div className="mx-auto grid w-full max-w-[1180px] gap-5">
        <header className="rounded-[28px] border border-black/[0.06] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#3b6ef8]">
                {copy.eyebrow}
              </div>
              <h1 className="mt-3 text-[30px] font-bold tracking-[-0.03em] text-[#111827]">
                {copy.title}
              </h1>
              <div className="mt-2 text-[22px] font-bold text-[#111827]">
                {publicTitle}
              </div>
              {publicDescription ? (
                <p className="mt-3 max-w-3xl text-[14px] leading-6 text-[#5a5f7a]">
                  {publicDescription}
                </p>
              ) : null}
            </div>

            <Link
              href={buildLocaleHref(
                `/value-objects/${valueObject.id}`,
                locale,
              )}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
            >
              {copy.backToObject}
            </Link>
          </div>
        </header>

        {terms.lifecycle_status === "draft" ? (
          <section className="rounded-[24px] border border-[#f1d393] bg-[#fff9e9] p-5">
            <div className="text-[14px] font-bold text-[#8a5a00]">
              {copy.draftNoticeTitle}
            </div>
            <p className="mt-2 text-[13px] leading-6 text-[#72551d]">
              {copy.draftNoticeBody}
            </p>
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DetailCard label={copy.status}>{statusLabel}</DetailCard>
          <DetailCard label={copy.provider}>{providerLabel}</DetailCard>
          <DetailCard label={copy.providerType}>
            {getProviderTypeLabel(terms.provider_type, copy)}
          </DetailCard>
          <DetailCard label={copy.productOrService}>
            {isService ? copy.service : copy.product}
          </DetailCard>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="grid gap-4">
            <DetailCard label={copy.provision}>
              {getDeliveryLabel(terms.delivery_mode, copy)}
            </DetailCard>

            <DetailCard label={copy.validity}>
              {formatDateOnly(terms.available_from, locale)} —{" "}
              {formatDateOnly(terms.available_until, locale)}
            </DetailCard>

            {isService ? (
              <DetailCard label={copy.exactSchedule}>
                <ActivityScheduleDisplay
                  locale={locale}
                  scheduleModeCode={activity.schedule_mode_code}
                  scheduledDate={activity.scheduled_date}
                  scheduleStartDate={activity.schedule_start_date}
                  scheduleEndDate={activity.schedule_end_date}
                  deadlineAt={activity.deadline_at}
                  startedAt={activity.started_at}
                  endedAt={activity.ended_at}
                />
              </DetailCard>
            ) : null}

            <section className="rounded-[24px] border border-black/[0.07] bg-white p-6 shadow-sm">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7c8099]">
                {copy.conditions}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-[14px] leading-6 text-[#4a4f6a]">
                {terms.terms_text?.trim() || copy.noConditions}
              </p>
            </section>
          </div>

          <div className="grid gap-4">
            <DetailCard label={copy.ordinaryPrice}>
              {formatMoney(
                terms.regular_price_snapshot,
                terms.provider_currency,
                locale,
              )}
            </DetailCard>

            <DetailCard label={copy.coverage}>
              <div>{coverageLabel}</div>
              <div className="mt-1 text-[12px] font-semibold text-[#5a5f7a]">
                {formatMoney(
                  terms.provider_currency_covered_amount,
                  terms.provider_currency,
                  locale,
                )}
              </div>
            </DetailCard>

            <DetailCard label={copy.pointsPrice}>
              {formatPoints(terms.points_price, locale)}
            </DetailCard>

            <DetailCard label={copy.moneyRemainder}>
              {formatMoney(
                terms.money_remainder_provider_currency,
                terms.provider_currency,
                locale,
              )}
            </DetailCard>

            <DetailCard label={copy.exchangeRate}>
              1 EUR ={" "}
              {new Intl.NumberFormat(LOCALE_TAGS[locale], {
                minimumFractionDigits: 2,
                maximumFractionDigits: 8,
              }).format(toNumber(terms.reference_exchange_rate))}{" "}
              {terms.provider_currency}
              <div className="mt-1 text-[12px] font-semibold text-[#5a5f7a]">
                {copy.exchangeRateConvention}
              </div>
            </DetailCard>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DetailCard label={copy.recipient}>
            {terms.recipient_actor_id
              ? terms.recipient_actor_id
              : copy.recipientVacant}
          </DetailCard>

          <DetailCard label={copy.publicCode}>
            {terms.public_code || copy.publicCodeAfterOrder}
          </DetailCard>

          <DetailCard label={copy.qrProtection}>
            {terms.qr_token_hash ? "✓" : copy.qrAfterOrder}
          </DetailCard>

          <DetailCard label={`${copy.createdAt} / ${copy.updatedAt}`}>
            <div>{formatDateTime(terms.created_at, locale)}</div>
            <div className="mt-1 text-[12px] font-semibold text-[#5a5f7a]">
              {formatDateTime(terms.updated_at, locale)}
            </div>
          </DetailCard>
        </section>

        <section className="grid gap-3 rounded-[24px] border border-[#d9e2ff] bg-[#f4f7ff] p-5 text-[13px] leading-6 text-[#42507a]">
          <p>{copy.pointsNotice}</p>
          <p>{copy.outsidePaymentNotice}</p>
        </section>
      </div>
    </main>
  );
}
