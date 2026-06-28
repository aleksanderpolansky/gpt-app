import {
  getMessage,
  normalizeLocale,
  type LocaleCode,
  type MessageParams,
} from "@/i18n";

import { supabase } from "../../../lib/supabase";
import RequestCertificateButton from "./components/RequestCertificateButton";

export const dynamic = "force-dynamic";

type RelatedOrganizationObject = {
  id: string;
  organization_name: string | null;
  organization_type: string | null;
  country_code: string | null;
  default_currency: string | null;
  status: string | null;
  public_slug: string | null;
  directory_status: string | null;
  is_public_profile_enabled: boolean | null;
  is_listed_in_directory: boolean | null;
};

type RelatedOrganization =
  | RelatedOrganizationObject
  | RelatedOrganizationObject[]
  | null;

type RewardOfferRecord = {
  id: string;
  organization_id: string | null;
  offer_type: string | null;
  title: string | null;
  description: string | null;

  price: number | null;
  regular_price: number | null;
  currency: string | null;

  certificate_payment_mode: string | null;
  certificate_points_covered_amount: number | null;
  certificate_points_price: number | null;
  certificate_money_price: number | null;
  certificate_currency: string | null;
  certificate_terms: string | null;
  certificate_validity_days: number | null;
  cancellation_window_minutes: number | null;
  cooldown_after_cancellation_minutes: number | null;
  requires_seller_confirmation: boolean | null;
  is_transferable: boolean | null;
  is_cancellable: boolean | null;
  points_refund_policy: string | null;

  points_currency_code: string | null;
  reference_currency: string | null;
  reference_value_per_point: number | null;
  reference_exchange_rate: number | null;
  reference_exchange_rate_date: string | null;

  requires_booking: boolean | null;
  booking_mode: string | null;
  default_duration_minutes: number | null;
  quantity_limit: number | null;

  status: string | null;
  created_at: string | null;

  organizations: RelatedOrganization;
};

type RewardOffer = {
  id: string;
  organizationId: string | null;
  organizationName: string | null;
  organizationType: string | null;
  organizationCountryCode: string | null;
  organizationPublicSlug: string | null;
  organizationDirectoryStatus: string | null;
  organizationIsPublicProfileEnabled: boolean | null;
  organizationIsListedInDirectory: boolean | null;

  offerType: string | null;
  title: string | null;
  description: string | null;

  price: number | null;
  regularPrice: number | null;
  currency: string | null;

  certificatePaymentMode: string | null;
  certificatePointsCoveredAmount: number | null;
  certificatePointsPrice: number | null;
  certificateMoneyPrice: number | null;
  certificateCurrency: string | null;
  certificateTerms: string | null;
  certificateValidityDays: number | null;
  cancellationWindowMinutes: number | null;
  cooldownAfterCancellationMinutes: number | null;
  requiresSellerConfirmation: boolean | null;
  isTransferable: boolean | null;
  isCancellable: boolean | null;
  pointsRefundPolicy: string | null;

  pointsCurrencyCode: string | null;
  referenceCurrency: string | null;
  referenceValuePerPoint: number | null;
  referenceExchangeRate: number | null;
  referenceExchangeRateDate: string | null;

  requiresBooking: boolean | null;
  bookingMode: string | null;
  defaultDurationMinutes: number | null;
  quantityLimit: number | null;

  status: string | null;
  createdAt: string | null;
};

type RewardsCatalogPageProps = {
  searchParams?: Promise<{
    q?: string;
    paymentMode?: string;
    locale?: string;
  }>;
};

type RewardsMessageKey =
  | "rewards.afterExpiry"
  | "rewards.allRewards"
  | "rewards.apply"
  | "rewards.booking"
  | "rewards.businessDirectory"
  | "rewards.cancellable"
  | "rewards.cancellationWindow"
  | "rewards.cooldownAfterCancellation"
  | "rewards.coveredByPoints"
  | "rewards.currentPrice"
  | "rewards.days"
  | "rewards.description"
  | "rewards.home"
  | "rewards.important"
  | "rewards.importantText"
  | "rewards.moneyPayment"
  | "rewards.moneyPlusPoints"
  | "rewards.myCertificates"
  | "rewards.myPurchaseConfirmations"
  | "rewards.noDescription"
  | "rewards.noResults"
  | "rewards.notSpecified"
  | "rewards.offers"
  | "rewards.openBusinessProfile"
  | "rewards.paymentMode"
  | "rewards.pointAfterUsageConfirmation"
  | "rewards.pointsOnly"
  | "rewards.reference"
  | "rewards.regularPrice"
  | "rewards.search"
  | "rewards.searchPlaceholder"
  | "rewards.terms"
  | "rewards.title"
  | "rewards.transferable"
  | "rewards.unknownOrganization"
  | "rewards.untitled"
  | "rewards.usageConfirmation"
  | "rewards.validity"
  | "rewards.yes"
  | "rewards.no"
  | "rewards.oneHour"
  | "rewards.hours"
  | "rewards.minutes";

type RewardsTranslate = (
  key: RewardsMessageKey,
  params?: MessageParams,
) => string;

const rewardsMessages: Record<RewardsMessageKey, Record<LocaleCode, string>> = {
  "rewards.title": {
    ru: "Каталог наград и сертификатов",
    pl: "Katalog nagród i certyfikatów",
    en: "Rewards / certificates catalog",
    es: "Catálogo de recompensas y certificados",
    uk: "Каталог винагород і сертифікатів",
    de: "Katalog der Prämien und Zertifikate",
    cs: "Katalog odměn a certifikátů",
  },
  "rewards.description": {
    ru: "Публичный список активных наград и сертификатов, где POINTS используются как полная или частичная оплата.",
    pl: "Publiczna lista aktywnych nagród i certyfikatów, w których POINTS są używane jako pełna lub częściowa płatność.",
    en: "Public list of active rewards and certificates where points are used as full or partial payment.",
    es: "Lista pública de recompensas y certificados activos donde POINTS se usan como pago total o parcial.",
    uk: "Публічний список активних винагород і сертифікатів, де POINTS використовуються як повна або часткова оплата.",
    de: "Öffentliche Liste aktiver Prämien und Zertifikate, bei denen POINTS als vollständige oder teilweise Zahlung verwendet werden.",
    cs: "Veřejný seznam aktivních odměn a certifikátů, kde se POINTS používají jako úplná nebo částečná platba.",
  },
  "rewards.home": { ru: "Главная", pl: "Strona główna", en: "Home", es: "Inicio", uk: "Головна", de: "Startseite", cs: "Domů" },
  "rewards.businessDirectory": { ru: "Каталог предприятий", pl: "Katalog firm", en: "Business directory", es: "Directorio de empresas", uk: "Каталог підприємств", de: "Unternehmensverzeichnis", cs: "Katalog firem" },
  "rewards.offers": { ru: "Предложения", pl: "Oferty", en: "Offers", es: "Ofertas", uk: "Пропозиції", de: "Angebote", cs: "Nabídky" },
  "rewards.myPurchaseConfirmations": { ru: "Мои подтверждения покупок", pl: "Moje potwierdzenia zakupów", en: "My purchase confirmations", es: "Mis confirmaciones de compra", uk: "Мої підтвердження покупок", de: "Meine Kaufbestätigungen", cs: "Moje potvrzení nákupů" },
  "rewards.myCertificates": { ru: "Мои сертификаты", pl: "Moje certyfikaty", en: "My certificates", es: "Mis certificados", uk: "Мої сертифікати", de: "Meine Zertifikate", cs: "Moje certifikáty" },
  "rewards.search": { ru: "Поиск", pl: "Szukaj", en: "Search", es: "Buscar", uk: "Пошук", de: "Suche", cs: "Hledat" },
  "rewards.searchPlaceholder": { ru: "Искать по награде, сертификату, описанию или организации", pl: "Szukaj po nagrodzie, certyfikacie, opisie lub organizacji", en: "Search by reward, certificate, description or organization", es: "Buscar por recompensa, certificado, descripción u organización", uk: "Шукати за винагородою, сертифікатом, описом або організацією", de: "Nach Prämie, Zertifikat, Beschreibung oder Organisation suchen", cs: "Hledat podle odměny, certifikátu, popisu nebo organizace" },
  "rewards.paymentMode": { ru: "Способ оплаты", pl: "Sposób płatności", en: "Payment mode", es: "Modo de pago", uk: "Спосіб оплати", de: "Zahlungsart", cs: "Způsob platby" },
  "rewards.allRewards": { ru: "Все награды", pl: "Wszystkie nagrody", en: "All rewards", es: "Todas las recompensas", uk: "Усі винагороди", de: "Alle Prämien", cs: "Všechny odměny" },
  "rewards.pointsOnly": { ru: "Только POINTS", pl: "Tylko POINTS", en: "Points only", es: "Solo POINTS", uk: "Лише POINTS", de: "Nur POINTS", cs: "Pouze POINTS" },
  "rewards.moneyPlusPoints": { ru: "Деньги + POINTS", pl: "Pieniądze + POINTS", en: "Money + points", es: "Dinero + POINTS", uk: "Гроші + POINTS", de: "Geld + POINTS", cs: "Peníze + POINTS" },
  "rewards.apply": { ru: "Применить", pl: "Zastosuj", en: "Apply", es: "Aplicar", uk: "Застосувати", de: "Anwenden", cs: "Použít" },
  "rewards.noResults": { ru: "Публичные награды или сертификаты не найдены.", pl: "Nie znaleziono publicznych nagród ani certyfikatów.", en: "No public rewards or certificates found.", es: "No se encontraron recompensas ni certificados públicos.", uk: "Публічні винагороди або сертифікати не знайдені.", de: "Keine öffentlichen Prämien oder Zertifikate gefunden.", cs: "Nebyly nalezeny žádné veřejné odměny ani certifikáty." },
  "rewards.untitled": { ru: "Награда без названия", pl: "Nagroda bez tytułu", en: "Untitled reward", es: "Recompensa sin título", uk: "Винагорода без назви", de: "Prämie ohne Titel", cs: "Odměna bez názvu" },
  "rewards.unknownOrganization": { ru: "Неизвестная организация", pl: "Nieznana organizacja", en: "Unknown organization", es: "Organización desconocida", uk: "Невідома організація", de: "Unbekannte Organisation", cs: "Neznámá organizace" },
  "rewards.noDescription": { ru: "Описание не указано.", pl: "Brak opisu.", en: "No description provided.", es: "No se proporcionó descripción.", uk: "Опис не вказано.", de: "Keine Beschreibung vorhanden.", cs: "Popis není uveden." },
  "rewards.currentPrice": { ru: "Текущая цена", pl: "Aktualna cena", en: "Current price", es: "Precio actual", uk: "Поточна ціна", de: "Aktueller Preis", cs: "Aktuální cena" },
  "rewards.regularPrice": { ru: "Обычная цена", pl: "Cena regularna", en: "Regular price", es: "Precio regular", uk: "Звичайна ціна", de: "Regulärer Preis", cs: "Běžná cena" },
  "rewards.pointAfterUsageConfirmation": { ru: "POINT после подтверждения использования", pl: "POINT po potwierdzeniu użycia", en: "POINT after usage confirmation", es: "POINT tras confirmar el uso", uk: "POINT після підтвердження використання", de: "POINT nach Nutzungsbestätigung", cs: "POINT po potvrzení použití" },
  "rewards.moneyPayment": { ru: "Оплата деньгами", pl: "Płatność pieniędzmi", en: "Money payment", es: "Pago con dinero", uk: "Оплата грошима", de: "Geldzahlung", cs: "Platba penězi" },
  "rewards.coveredByPoints": { ru: "Покрывается POINTS", pl: "Pokryte przez POINTS", en: "Covered by points", es: "Cubierto por POINTS", uk: "Покривається POINTS", de: "Durch POINTS gedeckt", cs: "Kryto pomocí POINTS" },
  "rewards.validity": { ru: "Срок действия", pl: "Ważność", en: "Validity", es: "Validez", uk: "Строк дії", de: "Gültigkeit", cs: "Platnost" },
  "rewards.days": { ru: "{count} дн.", pl: "{count} dni", en: "{count} days", es: "{count} días", uk: "{count} дн.", de: "{count} Tage", cs: "{count} dní" },
  "rewards.cancellationWindow": { ru: "Окно отмены", pl: "Okno anulowania", en: "Cancellation window", es: "Ventana de cancelación", uk: "Вікно скасування", de: "Stornierungsfenster", cs: "Okno pro zrušení" },
  "rewards.cooldownAfterCancellation": { ru: "Пауза после отмены", pl: "Przerwa po anulowaniu", en: "Cooldown after cancellation", es: "Pausa tras cancelación", uk: "Пауза після скасування", de: "Sperrzeit nach Stornierung", cs: "Pauza po zrušení" },
  "rewards.afterExpiry": { ru: "После истечения срока зарезервированные {pointsCurrency} будут списаны после окончания действия сертификата.", pl: "Po wygaśnięciu zarezerwowane {pointsCurrency} zostaną pobrane po zakończeniu ważności certyfikatu.", en: "After expiry, reserved {pointsCurrency} will be charged after certificate expiration.", es: "Tras el vencimiento, los {pointsCurrency} reservados se cobrarán después de que expire el certificado.", uk: "Після завершення строку зарезервовані {pointsCurrency} будуть списані після закінчення дії сертифіката.", de: "Nach Ablauf werden reservierte {pointsCurrency} nach Ablauf des Zertifikats belastet.", cs: "Po vypršení budou rezervované {pointsCurrency} strženy po vypršení certifikátu." },
  "rewards.booking": { ru: "Бронирование", pl: "Rezerwacja", en: "Booking", es: "Reserva", uk: "Бронювання", de: "Buchung", cs: "Rezervace" },
  "rewards.usageConfirmation": { ru: "Подтверждение использования", pl: "Potwierdzenie użycia", en: "Usage confirmation", es: "Confirmación de uso", uk: "Підтвердження використання", de: "Nutzungsbestätigung", cs: "Potvrzení použití" },
  "rewards.transferable": { ru: "Можно передать", pl: "Można przekazać", en: "Transferable", es: "Transferible", uk: "Можна передати", de: "Übertragbar", cs: "Přenosné" },
  "rewards.cancellable": { ru: "Можно отменить", pl: "Można anulować", en: "Cancellable", es: "Cancelable", uk: "Можна скасувати", de: "Stornierbar", cs: "Lze zrušit" },
  "rewards.reference": { ru: "Справочно", pl: "Odniesienie", en: "Reference", es: "Referencia", uk: "Довідково", de: "Referenz", cs: "Reference" },
  "rewards.important": { ru: "Важно", pl: "Ważne", en: "Important", es: "Importante", uk: "Важливо", de: "Wichtig", cs: "Důležité" },
  "rewards.importantText": { ru: "Вы можете отменить этот сертификат только в течение окна отмены. Если вы не используете его до конца срока действия, зарезервированные POINTS будут списаны после истечения срока и не вернутся на доступный баланс.", pl: "Możesz anulować ten certyfikat tylko w oknie anulowania. Jeśli nie wykorzystasz go przed końcem ważności, zarezerwowane POINTS zostaną pobrane po wygaśnięciu i nie wrócą do dostępnego salda.", en: "You can cancel this certificate only during the cancellation window. If you do not use it before the validity period ends, reserved POINTS will be charged after expiration and will not return to your available balance.", es: "Puedes cancelar este certificado solo durante la ventana de cancelación. Si no lo usas antes de que termine la validez, los POINTS reservados se cobrarán después del vencimiento y no volverán a tu saldo disponible.", uk: "Ви можете скасувати цей сертифікат лише протягом вікна скасування. Якщо ви не використаєте його до завершення строку дії, зарезервовані POINTS будуть списані після завершення строку й не повернуться на доступний баланс.", de: "Du kannst dieses Zertifikat nur innerhalb des Stornierungsfensters stornieren. Wenn du es vor Ablauf der Gültigkeit nicht nutzt, werden reservierte POINTS nach Ablauf belastet und kehren nicht zum verfügbaren Guthaben zurück.", cs: "Tento certifikát můžeš zrušit pouze během okna pro zrušení. Pokud ho nevyužiješ před koncem platnosti, rezervované POINTS budou po vypršení strženy a nevrátí se do dostupného zůstatku." },
  "rewards.terms": { ru: "Условия", pl: "Warunki", en: "Terms", es: "Condiciones", uk: "Умови", de: "Bedingungen", cs: "Podmínky" },
  "rewards.openBusinessProfile": { ru: "Открыть профиль предприятия", pl: "Otwórz profil firmy", en: "Open business profile", es: "Abrir perfil de empresa", uk: "Відкрити профіль підприємства", de: "Unternehmensprofil öffnen", cs: "Otevřít profil firmy" },
  "rewards.notSpecified": { ru: "Не указано", pl: "Nie podano", en: "Not specified", es: "No especificado", uk: "Не вказано", de: "Nicht angegeben", cs: "Neuvedeno" },
  "rewards.yes": { ru: "Да", pl: "Tak", en: "Yes", es: "Sí", uk: "Так", de: "Ja", cs: "Ano" },
  "rewards.no": { ru: "Нет", pl: "Nie", en: "No", es: "No", uk: "Ні", de: "Nein", cs: "Ne" },
  "rewards.minutes": { ru: "{count} мин.", pl: "{count} min", en: "{count} minutes", es: "{count} min", uk: "{count} хв", de: "{count} Min.", cs: "{count} min" },
  "rewards.oneHour": { ru: "1 час", pl: "1 godzina", en: "1 hour", es: "1 hora", uk: "1 година", de: "1 Stunde", cs: "1 hodina" },
  "rewards.hours": { ru: "{count} ч", pl: "{count} godz.", en: "{count} hours", es: "{count} horas", uk: "{count} год", de: "{count} Stunden", cs: "{count} hodin" },
};

function getRewardsMessage(
  key: RewardsMessageKey,
  locale: LocaleCode,
  params?: MessageParams,
): string {
  return getMessage(rewardsMessages, key, locale, params);
}

function getFirstRelatedItem<T>(value: T | T[] | null | undefined) {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function formatMoney(
  value: number | string | null | undefined,
  currency: string | null | undefined,
  t: RewardsTranslate,
) {
  if (value === null || value === undefined || value === "") {
    return t("rewards.notSpecified");
  }

  return `${value} ${currency || ""}`.trim();
}

function formatMinutes(value: number | null | undefined, t: RewardsTranslate) {
  if (value === null || value === undefined) {
    return t("rewards.notSpecified");
  }

  if (value < 60) {
    return t("rewards.minutes", { count: value });
  }

  if (value === 60) {
    return t("rewards.oneHour");
  }

  if (value % 60 === 0) {
    return t("rewards.hours", { count: value / 60 });
  }

  return t("rewards.minutes", { count: value });
}

function getPaymentModeLabel(
  paymentMode: string | null | undefined,
  t: RewardsTranslate,
) {
  if (paymentMode === "points_only") {
    return t("rewards.pointsOnly");
  }

  if (paymentMode === "mixed") {
    return t("rewards.moneyPlusPoints");
  }

  return paymentMode || t("rewards.notSpecified");
}

function getPaymentModeStyle(paymentMode: string | null | undefined) {
  if (paymentMode === "points_only") {
    return {
      background: "#edf8f0",
      color: "#176b2c",
      border: "1px solid #bfe5c8",
    };
  }

  if (paymentMode === "mixed") {
    return {
      background: "#fff8e6",
      color: "#7a4b00",
      border: "1px solid #f0d28a",
    };
  }

  return {
    background: "#f5f5f5",
    color: "#555555",
    border: "1px solid #dddddd",
  };
}

function getBooleanLabel(value: boolean | null | undefined, t: RewardsTranslate) {
  return value ? t("rewards.yes") : t("rewards.no");
}

function getDirectoryHref(offer: RewardOffer) {
  if (
    offer.organizationPublicSlug &&
    offer.organizationDirectoryStatus === "published" &&
    offer.organizationIsPublicProfileEnabled &&
    offer.organizationIsListedInDirectory
  ) {
    return `/directory/${offer.organizationPublicSlug}`;
  }

  return "/directory";
}

function withLocaleHref(href: string, locale: LocaleCode) {
  const separator = href.includes("?") ? "&" : "?";

  return `${href}${separator}locale=${locale}`;
}

async function getRewardOffers(): Promise<{
  rewardOffers: RewardOffer[];
  errorMessage: string | null;
}> {
  const { data: rewardOffers, error: rewardOffersError } = await supabase
    .from("offers")
    .select(
      `
      id,
      organization_id,
      offer_type,
      title,
      description,

      price,
      regular_price,
      currency,

      certificate_payment_mode,
      certificate_points_covered_amount,
      certificate_points_price,
      certificate_money_price,
      certificate_currency,
      certificate_terms,
      certificate_validity_days,
      cancellation_window_minutes,
      cooldown_after_cancellation_minutes,
      requires_seller_confirmation,
      is_transferable,
      is_cancellable,
      points_refund_policy,

      points_currency_code,
      reference_currency,
      reference_value_per_point,
      reference_exchange_rate,
      reference_exchange_rate_date,

      requires_booking,
      booking_mode,
      default_duration_minutes,
      quantity_limit,

      status,
      created_at,

      organizations (
        id,
        organization_name,
        organization_type,
        country_code,
        default_currency,
        status,
        public_slug,
        directory_status,
        is_public_profile_enabled,
        is_listed_in_directory
      )
    `
    )
    .eq("certificate_available", true)
    .eq("is_public_reward", true)
    .eq("status", "active")
    .in("certificate_payment_mode", ["points_only", "mixed"])
    .gt("certificate_points_covered_amount", 0)
    .gt("certificate_points_price", 0)
    .order("created_at", { ascending: false });

  if (rewardOffersError) {
    return {
      rewardOffers: [],
      errorMessage: rewardOffersError.message,
    };
  }

  const publicRewardOffers = ((rewardOffers as RewardOfferRecord[] | null) ?? [])
    .map((offer) => {
      const organization = getFirstRelatedItem(offer.organizations);

      return {
        id: offer.id,
        organizationId: offer.organization_id,
        organizationName: organization?.organization_name ?? null,
        organizationType: organization?.organization_type ?? null,
        organizationCountryCode: organization?.country_code ?? null,
        organizationPublicSlug: organization?.public_slug ?? null,
        organizationDirectoryStatus: organization?.directory_status ?? null,
        organizationIsPublicProfileEnabled:
          organization?.is_public_profile_enabled ?? null,
        organizationIsListedInDirectory:
          organization?.is_listed_in_directory ?? null,

        offerType: offer.offer_type,
        title: offer.title,
        description: offer.description,

        price: offer.price,
        regularPrice: offer.regular_price,
        currency: offer.currency,

        certificatePaymentMode: offer.certificate_payment_mode,
        certificatePointsCoveredAmount:
          offer.certificate_points_covered_amount,
        certificatePointsPrice: offer.certificate_points_price,
        certificateMoneyPrice: offer.certificate_money_price,
        certificateCurrency: offer.certificate_currency,
        certificateTerms: offer.certificate_terms,
        certificateValidityDays: offer.certificate_validity_days,
        cancellationWindowMinutes: offer.cancellation_window_minutes,
        cooldownAfterCancellationMinutes:
          offer.cooldown_after_cancellation_minutes,
        requiresSellerConfirmation: offer.requires_seller_confirmation,
        isTransferable: offer.is_transferable,
        isCancellable: offer.is_cancellable,
        pointsRefundPolicy: offer.points_refund_policy,

        pointsCurrencyCode: offer.points_currency_code,
        referenceCurrency: offer.reference_currency,
        referenceValuePerPoint: offer.reference_value_per_point,
        referenceExchangeRate: offer.reference_exchange_rate,
        referenceExchangeRateDate: offer.reference_exchange_rate_date,

        requiresBooking: offer.requires_booking,
        bookingMode: offer.booking_mode,
        defaultDurationMinutes: offer.default_duration_minutes,
        quantityLimit: offer.quantity_limit,

        status: offer.status,
        createdAt: offer.created_at,
      };
    });

  return {
    rewardOffers: publicRewardOffers,
    errorMessage: null,
  };
}

export default async function RewardsCatalogPage({
  searchParams,
}: RewardsCatalogPageProps) {
  const resolvedSearchParams = await searchParams;

  const searchText = resolvedSearchParams?.q?.trim() ?? "";
  const paymentModeFilter = resolvedSearchParams?.paymentMode ?? "all";
  const locale = normalizeLocale(resolvedSearchParams?.locale);
  const t: RewardsTranslate = (key, params) =>
    getRewardsMessage(key, locale, params);

  const { rewardOffers, errorMessage } = await getRewardOffers();

  const filteredRewardOffers = rewardOffers.filter((offer) => {
    const normalizedSearchText = searchText.toLowerCase();

    const matchesSearch =
      normalizedSearchText.length === 0 ||
      `${offer.title ?? ""} ${offer.description ?? ""} ${
        offer.organizationName ?? ""
      }`
        .toLowerCase()
        .includes(normalizedSearchText);

    const matchesPaymentMode =
      paymentModeFilter === "all" ||
      offer.certificatePaymentMode === paymentModeFilter;

    return matchesSearch && matchesPaymentMode;
  });

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        color: "#111111",
        padding: "40px 16px",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1180px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            marginBottom: "32px",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: "34px",
              lineHeight: "1.2",
              fontWeight: 700,
              margin: "0 0 12px",
            }}
          >
            {t("rewards.title")}
          </h1>

          <p
            style={{
              maxWidth: "820px",
              margin: "0 auto 20px",
              color: "#555555",
              fontSize: "16px",
              lineHeight: "1.5",
            }}
          >
            {t("rewards.description")}
          </p>

          <nav
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "20px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <a href={withLocaleHref("/", locale)} style={{ color: "#2563eb" }}>
              {t("rewards.home")}
            </a>

            <a href={withLocaleHref("/directory", locale)} style={{ color: "#2563eb" }}>
              {t("rewards.businessDirectory")}
            </a>

            <a href={withLocaleHref("/offers", locale)} style={{ color: "#2563eb" }}>
              {t("rewards.offers")}
            </a>

            <a
              href={withLocaleHref("/my-purchase-confirmations", locale)}
              style={{ color: "#2563eb" }}
            >
              {t("rewards.myPurchaseConfirmations")}
            </a>

            <a
              href={withLocaleHref("/my-certificates", locale)}
              style={{ color: "#2563eb" }}
            >
              {t("rewards.myCertificates")}
            </a>
          </nav>
        </header>

        <form
          method="GET"
          action="/rewards"
          style={{
            border: "1px solid #dddddd",
            borderRadius: "14px",
            padding: "18px",
            background: "#f9fafb",
            marginBottom: "22px",
            display: "grid",
            gridTemplateColumns: "2fr 1fr auto",
            gap: "12px",
            alignItems: "end",
          }}
        >
          <input type="hidden" name="locale" value={locale} />

          <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
            {t("rewards.search")}
            <input
              name="q"
              defaultValue={searchText}
              placeholder={t("rewards.searchPlaceholder")}
              style={{
                border: "1px solid #cccccc",
                borderRadius: "8px",
                padding: "11px 12px",
                fontSize: "15px",
                fontWeight: 400,
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
            {t("rewards.paymentMode")}
            <select
              name="paymentMode"
              defaultValue={paymentModeFilter}
              style={{
                border: "1px solid #cccccc",
                borderRadius: "8px",
                padding: "11px 12px",
                fontSize: "15px",
                fontWeight: 400,
              }}
            >
              <option value="all">{t("rewards.allRewards")}</option>
              <option value="points_only">{t("rewards.pointsOnly")}</option>
              <option value="mixed">{t("rewards.moneyPlusPoints")}</option>
            </select>
          </label>

          <button
            type="submit"
            style={{
              border: "1px solid #dddddd",
              borderRadius: "8px",
              padding: "11px 14px",
              background: "#ffffff",
              color: "#111111",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t("rewards.apply")}
          </button>
        </form>

        {errorMessage ? (
          <section
            style={{
              border: "1px solid #f2b8b5",
              borderRadius: "12px",
              padding: "22px",
              background: "#fff5f5",
              color: "#a40000",
            }}
          >
            {errorMessage}
          </section>
        ) : null}

        {!errorMessage && filteredRewardOffers.length === 0 ? (
          <section
            style={{
              border: "1px solid #facc15",
              borderRadius: "12px",
              padding: "22px",
              background: "#fefce8",
            }}
          >
            {t("rewards.noResults")}
          </section>
        ) : null}

        {!errorMessage && filteredRewardOffers.length > 0 ? (
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "18px",
            }}
          >
            {filteredRewardOffers.map((offer) => {
              const paymentModeStyle = getPaymentModeStyle(
                offer.certificatePaymentMode
              );

              const directoryHref = withLocaleHref(getDirectoryHref(offer), locale);

              return (
                <article
                  key={offer.id}
                  style={{
                    border: "1px solid #dddddd",
                    borderRadius: "16px",
                    padding: "18px",
                    background: "#ffffff",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                    display: "grid",
                    gap: "14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <h2
                        style={{
                          margin: "0 0 8px",
                          fontSize: "22px",
                          lineHeight: "1.25",
                        }}
                      >
                        {offer.title ?? t("rewards.untitled")}
                      </h2>

                      <p style={{ margin: 0, color: "#555555" }}>
                        {offer.organizationName ?? t("rewards.unknownOrganization")}
                      </p>
                    </div>

                    <span
                      style={{
                        display: "inline-block",
                        borderRadius: "999px",
                        padding: "6px 10px",
                        fontSize: "13px",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        ...paymentModeStyle,
                      }}
                    >
                      {getPaymentModeLabel(offer.certificatePaymentMode, t)}
                    </span>
                  </div>

                  <p style={{ margin: 0, color: "#333333", lineHeight: "1.5" }}>
                    {offer.description || t("rewards.noDescription")}
                  </p>

                  <section
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        border: "1px solid #dddddd",
                        borderRadius: "10px",
                        padding: "12px",
                        background: "#f9fafb",
                      }}
                    >
                      <div style={{ color: "#666666", marginBottom: "6px" }}>
                        {t("rewards.currentPrice")}
                      </div>
                      <strong>{formatMoney(offer.price, offer.currency, t)}</strong>
                    </div>

                    <div
                      style={{
                        border: "1px solid #dddddd",
                        borderRadius: "10px",
                        padding: "12px",
                        background: "#f9fafb",
                      }}
                    >
                      <div style={{ color: "#666666", marginBottom: "6px" }}>
                        {t("rewards.regularPrice")}
                      </div>
                      <strong>
                        {formatMoney(offer.regularPrice, offer.currency, t)}
                      </strong>
                    </div>

                    <div
                      style={{
                        border: "1px solid #bfdbfe",
                        borderRadius: "10px",
                        padding: "12px",
                        background: "#eff6ff",
                      }}
                    >
                      <div style={{ color: "#1e3a8a", marginBottom: "6px" }}>
                        {t("rewards.pointAfterUsageConfirmation")}
                      </div>
                      <strong>
                        {formatMoney(
                          offer.certificatePointsPrice ?? 0,
                          offer.pointsCurrencyCode ?? "POINT",
                          t,
                        )}
                      </strong>
                    </div>

                    <div
                      style={{
                        border: "1px solid #dddddd",
                        borderRadius: "10px",
                        padding: "12px",
                        background: "#f9fafb",
                      }}
                    >
                      <div style={{ color: "#666666", marginBottom: "6px" }}>
                        {t("rewards.moneyPayment")}
                      </div>
                      <strong>
                        {formatMoney(
                          offer.certificateMoneyPrice,
                          offer.certificateCurrency ?? offer.currency,
                          t,
                        )}
                      </strong>
                    </div>
                  </section>

                  <section
                    style={{
                      border: "1px solid #bfdbfe",
                      borderRadius: "10px",
                      padding: "12px",
                      background: "#eff6ff",
                      display: "grid",
                      gap: "7px",
                      lineHeight: "1.45",
                    }}
                  >
                    <p style={{ margin: 0 }}>
                      <strong>{t("rewards.coveredByPoints")}:</strong>{" "}
                      {formatMoney(
                        offer.certificatePointsCoveredAmount,
                        offer.certificateCurrency ?? offer.currency,
                        t,
                      )}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>{t("rewards.validity")}:</strong>{" "}
                      {offer.certificateValidityDays === null ||
                      offer.certificateValidityDays === undefined
                        ? t("rewards.notSpecified")
                        : t("rewards.days", {
                            count: offer.certificateValidityDays,
                          })}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>{t("rewards.cancellationWindow")}:</strong>{" "}
                      {formatMinutes(offer.cancellationWindowMinutes, t)}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>{t("rewards.cooldownAfterCancellation")}:</strong>{" "}
                      {formatMinutes(offer.cooldownAfterCancellationMinutes, t)}
                    </p>

                    <p style={{ margin: 0 }}>
                      {t("rewards.afterExpiry", {
                        pointsCurrency: offer.pointsCurrencyCode ?? "POINT",
                      })}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>{t("rewards.booking")}:</strong>{" "}
                      {getBooleanLabel(offer.requiresBooking, t)} /{" "}
                      {offer.bookingMode ?? t("rewards.notSpecified")}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>{t("rewards.usageConfirmation")}:</strong>{" "}
                      {getBooleanLabel(offer.requiresSellerConfirmation, t)}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>{t("rewards.transferable")}:</strong>{" "}
                      {getBooleanLabel(offer.isTransferable, t)} /{" "}
                      <strong>{t("rewards.cancellable")}:</strong>{" "}
                      {getBooleanLabel(offer.isCancellable, t)}
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>{t("rewards.reference")}:</strong> 1{" "}
                      {offer.pointsCurrencyCode ?? "POINT"} ={" "}
                      {offer.referenceValuePerPoint ?? 1}{" "}
                      {offer.referenceCurrency ?? "EUR"}
                    </p>
                  </section>

                  <section
                    style={{
                      border: "1px solid #f0d28a",
                      borderRadius: "10px",
                      padding: "12px",
                      background: "#fff8e6",
                      color: "#7a4b00",
                      lineHeight: "1.45",
                    }}
                  >
                    <strong>{t("rewards.important")}:</strong>{" "}
                    {t("rewards.importantText")}
                  </section>

                  {offer.certificateTerms ? (
                    <section
                      style={{
                        border: "1px solid #dddddd",
                        borderRadius: "10px",
                        padding: "12px",
                        background: "#f9fafb",
                        lineHeight: "1.5",
                      }}
                    >
                      <strong>{t("rewards.terms")}:</strong>
                      <p style={{ margin: "6px 0 0" }}>
                        {offer.certificateTerms}
                      </p>
                    </section>
                  ) : null}

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                      marginTop: "4px",
                      alignItems: "flex-start",
                    }}
                  >
                    <a
                      href={directoryHref}
                      style={{
                        display: "inline-block",
                        border: "1px solid #2563eb",
                        borderRadius: "8px",
                        padding: "10px 12px",
                        color: "#2563eb",
                        background: "#ffffff",
                        textDecoration: "none",
                        fontWeight: 700,
                      }}
                    >
                      {t("rewards.openBusinessProfile")}
                    </a>

                    <RequestCertificateButton
                      offerId={offer.id}
                      pointsPrice={offer.certificatePointsPrice}
                      pointsCurrencyCode={offer.pointsCurrencyCode}
                      moneyPrice={offer.certificateMoneyPrice}
                      currency={offer.certificateCurrency ?? offer.currency}
                      locale={locale}
                    />
                  </div>
                </article>
              );
            })}
          </section>
        ) : null}
      </div>
    </main>
  );
}