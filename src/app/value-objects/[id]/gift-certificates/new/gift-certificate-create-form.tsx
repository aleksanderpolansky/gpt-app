"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { formatLocalizedPoints } from "@/components/figma-dashboard/certificate-value-format";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";
type ProductServiceKind = "product_type" | "service_type";
type DeliveryMode =
  | "product_pickup"
  | "product_delivery"
  | "service_offline"
  | "service_online";
type CoverageMode = "percentage" | "provider_currency_amount";

type GiftCertificateCreateFormProps = {
  locale: LocaleCode;
  valueObject: {
    id: string;
    title: string;
    description: string | null;
    objectKind: ProductServiceKind;
    ordinaryPrice: number;
    currency: string;
    ordinaryDurationMinutes: number | null;
  };
  provider: {
    label: string;
    type: "personal" | "avatar" | "organization";
  };
};

type CreateResponse = {
  ok?: boolean;
  error?: string;
  errorCode?: string | null;
  activityEventId?: string;
  redirectUrl?: string;
};

type Copy = {
  eyebrow: string;
  title: string;
  intro: string;
  back: string;
  provider: string;
  item: string;
  product: string;
  service: string;
  ordinaryPrice: string;
  ordinaryDuration: string;
  deliveryMode: string;
  productPickup: string;
  productDelivery: string;
  serviceOffline: string;
  serviceOnline: string;
  availableFrom: string;
  availableUntil: string;
  validityHint: string;
  coverageMode: string;
  percentage: string;
  amount: string;
  coverageValue: string;
  exchangeRate: string;
  exchangeRateHint: string;
  serviceStart: string;
  serviceEnd: string;
  exactSlotHint: string;
  terms: string;
  termsHint: string;
  preview: string;
  points: string;
  covered: string;
  remainder: string;
  externalPayment: string;
  create: string;
  creating: string;
  errorPrefix: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    eyebrow: "Gift certificate",
    title: "Create a gift-certificate draft",
    intro:
      "The certificate is a planned activity linked to this product or service. This step creates only a draft; it does not publish the certificate, debit points or create a QR code.",
    back: "Back to product or service",
    provider: "Provider",
    item: "Product or service",
    product: "Product",
    service: "Service",
    ordinaryPrice: "Ordinary price",
    ordinaryDuration: "Ordinary duration",
    deliveryMode: "How it will be provided",
    productPickup: "Product pickup",
    productDelivery: "Product delivery",
    serviceOffline: "Service offline",
    serviceOnline: "Service online",
    availableFrom: "Valid from",
    availableUntil: "Valid until",
    validityHint: "The author sets both dates. The period may not exceed 31 days.",
    coverageMode: "Points coverage",
    percentage: "Percentage of the ordinary price",
    amount: "Amount in provider currency",
    coverageValue: "Coverage value",
    exchangeRate: "Provider-currency units per 1 €",
    exchangeRateHint:
      "Required because ARCTor points use the euro as the reference currency. 1 point = 1 €.",
    serviceStart: "Service starts",
    serviceEnd: "Service ends",
    exactSlotHint:
      "A service certificate represents one exact slot chosen by the author.",
    terms: "Conditions and comments",
    termsHint: "Optional public conditions for this certificate.",
    preview: "Calculation preview",
    points: "Points price",
    covered: "Covered in provider currency",
    remainder: "Money remainder",
    externalPayment:
      "Any money remainder is paid outside ARCTor. ARCTor does not accept or confirm monetary payment.",
    create: "Create draft",
    creating: "Creating…",
    errorPrefix: "Could not create:",
  },
  pl: {
    eyebrow: "Bon podarunkowy",
    title: "Utwórz szkic bonu podarunkowego",
    intro:
      "Bon jest planowaną aktywnością powiązaną z tym produktem lub usługą. Ten krok tworzy tylko szkic; nie publikuje bonu, nie pobiera punktów i nie tworzy kodu QR.",
    back: "Wróć do produktu lub usługi",
    provider: "Dostawca",
    item: "Produkt lub usługa",
    product: "Produkt",
    service: "Usługa",
    ordinaryPrice: "Zwykła cena",
    ordinaryDuration: "Zwykły czas",
    deliveryMode: "Sposób przekazania",
    productPickup: "Odbiór produktu",
    productDelivery: "Dostawa produktu",
    serviceOffline: "Usługa stacjonarna",
    serviceOnline: "Usługa online",
    availableFrom: "Ważny od",
    availableUntil: "Ważny do",
    validityHint:
      "Autor ustala obie daty. Okres nie może przekraczać 31 dni.",
    coverageMode: "Pokrycie punktami",
    percentage: "Procent zwykłej ceny",
    amount: "Kwota w walucie dostawcy",
    coverageValue: "Wartość pokrycia",
    exchangeRate: "Jednostki waluty dostawcy za 1 €",
    exchangeRateHint:
      "Wymagane, ponieważ walutą odniesienia punktów ARCTor jest euro. 1 punkt = 1 €.",
    serviceStart: "Początek usługi",
    serviceEnd: "Koniec usługi",
    exactSlotHint:
      "Bon na usługę oznacza jeden dokładny termin wybrany przez autora.",
    terms: "Warunki i komentarze",
    termsHint: "Opcjonalne publiczne warunki tego bonu.",
    preview: "Podgląd obliczenia",
    points: "Cena w punktach",
    covered: "Pokryte w walucie dostawcy",
    remainder: "Pozostała kwota pieniężna",
    externalPayment:
      "Pozostała kwota pieniężna jest płacona poza ARCTor. ARCTor nie przyjmuje ani nie potwierdza płatności pieniężnej.",
    create: "Utwórz szkic",
    creating: "Tworzenie…",
    errorPrefix: "Nie udało się utworzyć:",
  },
  ru: {
    eyebrow: "Подарочный сертификат",
    title: "Создать черновик подарочного сертификата",
    intro:
      "Сертификат является плановой активностью, связанной с этим товаром или услугой. На этом шаге создаётся только черновик: он не публикуется, пункты не списываются и QR-код не создаётся.",
    back: "Назад к товару или услуге",
    provider: "Предоставляющий",
    item: "Товар или услуга",
    product: "Товар",
    service: "Услуга",
    ordinaryPrice: "Обычная стоимость",
    ordinaryDuration: "Обычная продолжительность",
    deliveryMode: "Способ предоставления",
    productPickup: "Самовывоз товара",
    productDelivery: "Доставка товара",
    serviceOffline: "Услуга офлайн",
    serviceOnline: "Услуга онлайн",
    availableFrom: "Действует с",
    availableUntil: "Действует до",
    validityHint:
      "Автор устанавливает обе даты. Продолжительность периода не может превышать 31 день.",
    coverageMode: "Покрытие пунктами",
    percentage: "Процент обычной стоимости",
    amount: "Сумма в валюте предоставляющего",
    coverageValue: "Размер покрытия",
    exchangeRate: "Единиц валюты предоставляющего за 1 €",
    exchangeRateHint:
      "Обязательно, поскольку расчётная валюта пунктов ARCTor — евро. 1 пункт = 1 €.",
    serviceStart: "Начало услуги",
    serviceEnd: "Окончание услуги",
    exactSlotHint:
      "Сертификат на услугу представляет один точный временной интервал, выбранный автором.",
    terms: "Условия и комментарии",
    termsHint: "Необязательные публичные условия этого сертификата.",
    preview: "Предварительный расчёт",
    points: "Стоимость в пунктах",
    covered: "Покрыто в валюте предоставляющего",
    remainder: "Денежный остаток",
    externalPayment:
      "Денежный остаток оплачивается вне ARCTor. ARCTor не принимает деньги и не подтверждает денежный платёж.",
    create: "Создать черновик",
    creating: "Создаётся…",
    errorPrefix: "Не удалось создать:",
  },
  uk: {
    eyebrow: "Подарунковий сертифікат",
    title: "Створити чернетку подарункового сертифіката",
    intro:
      "Сертифікат є запланованою активністю, пов’язаною з цим товаром або послугою. На цьому кроці створюється лише чернетка: вона не публікується, пункти не списуються і QR-код не створюється.",
    back: "Назад до товару або послуги",
    provider: "Надавач",
    item: "Товар або послуга",
    product: "Товар",
    service: "Послуга",
    ordinaryPrice: "Звичайна вартість",
    ordinaryDuration: "Звичайна тривалість",
    deliveryMode: "Спосіб надання",
    productPickup: "Самовивіз товару",
    productDelivery: "Доставка товару",
    serviceOffline: "Послуга офлайн",
    serviceOnline: "Послуга онлайн",
    availableFrom: "Діє з",
    availableUntil: "Діє до",
    validityHint:
      "Автор встановлює обидві дати. Тривалість періоду не може перевищувати 31 день.",
    coverageMode: "Покриття пунктами",
    percentage: "Відсоток звичайної вартості",
    amount: "Сума у валюті надавача",
    coverageValue: "Розмір покриття",
    exchangeRate: "Одиниць валюти надавача за 1 €",
    exchangeRateHint:
      "Обов’язково, оскільки розрахункова валюта пунктів ARCTor — євро. 1 пункт = 1 €.",
    serviceStart: "Початок послуги",
    serviceEnd: "Закінчення послуги",
    exactSlotHint:
      "Сертифікат на послугу означає один точний часовий інтервал, вибраний автором.",
    terms: "Умови та коментарі",
    termsHint: "Необов’язкові публічні умови цього сертифіката.",
    preview: "Попередній розрахунок",
    points: "Вартість у пунктах",
    covered: "Покрито у валюті надавача",
    remainder: "Грошовий залишок",
    externalPayment:
      "Грошовий залишок сплачується поза ARCTor. ARCTor не приймає гроші й не підтверджує грошову оплату.",
    create: "Створити чернетку",
    creating: "Створення…",
    errorPrefix: "Не вдалося створити:",
  },
  de: {
    eyebrow: "Geschenkgutschein",
    title: "Geschenkgutschein-Entwurf erstellen",
    intro:
      "Der Gutschein ist eine geplante Aktivität, die mit diesem Produkt oder dieser Dienstleistung verknüpft ist. Dieser Schritt erstellt nur einen Entwurf; er veröffentlicht nichts, zieht keine Punkte ab und erstellt keinen QR-Code.",
    back: "Zurück zum Produkt oder zur Dienstleistung",
    provider: "Anbieter",
    item: "Produkt oder Dienstleistung",
    product: "Produkt",
    service: "Dienstleistung",
    ordinaryPrice: "Regulärer Preis",
    ordinaryDuration: "Übliche Dauer",
    deliveryMode: "Art der Bereitstellung",
    productPickup: "Produktabholung",
    productDelivery: "Produktlieferung",
    serviceOffline: "Dienstleistung vor Ort",
    serviceOnline: "Online-Dienstleistung",
    availableFrom: "Gültig ab",
    availableUntil: "Gültig bis",
    validityHint:
      "Der Autor legt beide Daten fest. Der Zeitraum darf 31 Tage nicht überschreiten.",
    coverageMode: "Punkte-Abdeckung",
    percentage: "Prozent des regulären Preises",
    amount: "Betrag in Anbieterwährung",
    coverageValue: "Abdeckungswert",
    exchangeRate: "Einheiten der Anbieterwährung je 1 €",
    exchangeRateHint:
      "Erforderlich, weil der Euro die Referenzwährung für ARCTor-Punkte ist. 1 Punkt = 1 €.",
    serviceStart: "Beginn der Dienstleistung",
    serviceEnd: "Ende der Dienstleistung",
    exactSlotHint:
      "Ein Dienstleistungsgutschein steht für einen genauen, vom Autor gewählten Termin.",
    terms: "Bedingungen und Kommentare",
    termsHint: "Optionale öffentliche Bedingungen dieses Gutscheins.",
    preview: "Berechnungsvorschau",
    points: "Preis in Punkten",
    covered: "In Anbieterwährung abgedeckt",
    remainder: "Geldrestbetrag",
    externalPayment:
      "Ein Geldrestbetrag wird außerhalb von ARCTor bezahlt. ARCTor nimmt keine Geldzahlung an und bestätigt sie nicht.",
    create: "Entwurf erstellen",
    creating: "Wird erstellt…",
    errorPrefix: "Erstellung fehlgeschlagen:",
  },
  es: {
    eyebrow: "Certificado de regalo",
    title: "Crear borrador de certificado de regalo",
    intro:
      "El certificado es una actividad planificada vinculada a este producto o servicio. Este paso solo crea un borrador; no lo publica, no descuenta puntos ni crea un código QR.",
    back: "Volver al producto o servicio",
    provider: "Proveedor",
    item: "Producto o servicio",
    product: "Producto",
    service: "Servicio",
    ordinaryPrice: "Precio habitual",
    ordinaryDuration: "Duración habitual",
    deliveryMode: "Forma de prestación",
    productPickup: "Recogida del producto",
    productDelivery: "Entrega del producto",
    serviceOffline: "Servicio presencial",
    serviceOnline: "Servicio online",
    availableFrom: "Válido desde",
    availableUntil: "Válido hasta",
    validityHint:
      "El autor fija ambas fechas. El período no puede superar 31 días.",
    coverageMode: "Cobertura con puntos",
    percentage: "Porcentaje del precio habitual",
    amount: "Importe en la moneda del proveedor",
    coverageValue: "Valor cubierto",
    exchangeRate: "Unidades de moneda del proveedor por 1 €",
    exchangeRateHint:
      "Obligatorio porque la moneda de referencia de los puntos ARCTor es el euro. 1 punto = 1 €.",
    serviceStart: "Inicio del servicio",
    serviceEnd: "Fin del servicio",
    exactSlotHint:
      "Un certificado de servicio representa un intervalo exacto elegido por el autor.",
    terms: "Condiciones y comentarios",
    termsHint: "Condiciones públicas opcionales de este certificado.",
    preview: "Vista previa del cálculo",
    points: "Precio en puntos",
    covered: "Cubierto en moneda del proveedor",
    remainder: "Resto monetario",
    externalPayment:
      "El resto monetario se paga fuera de ARCTor. ARCTor no acepta ni confirma el pago monetario.",
    create: "Crear borrador",
    creating: "Creando…",
    errorPrefix: "No se pudo crear:",
  },
  cs: {
    eyebrow: "Dárkový certifikát",
    title: "Vytvořit koncept dárkového certifikátu",
    intro:
      "Certifikát je plánovaná aktivita propojená s tímto produktem nebo službou. Tento krok vytvoří pouze koncept; nic nezveřejní, neodečte body ani nevytvoří QR kód.",
    back: "Zpět k produktu nebo službě",
    provider: "Poskytovatel",
    item: "Produkt nebo služba",
    product: "Produkt",
    service: "Služba",
    ordinaryPrice: "Obvyklá cena",
    ordinaryDuration: "Obvyklá délka",
    deliveryMode: "Způsob poskytnutí",
    productPickup: "Vyzvednutí produktu",
    productDelivery: "Doručení produktu",
    serviceOffline: "Služba osobně",
    serviceOnline: "Služba online",
    availableFrom: "Platí od",
    availableUntil: "Platí do",
    validityHint:
      "Autor stanoví obě data. Období nesmí překročit 31 dní.",
    coverageMode: "Pokrytí body",
    percentage: "Procento obvyklé ceny",
    amount: "Částka v měně poskytovatele",
    coverageValue: "Hodnota pokrytí",
    exchangeRate: "Jednotek měny poskytovatele za 1 €",
    exchangeRateHint:
      "Povinné, protože referenční měnou bodů ARCTor je euro. 1 bod = 1 €.",
    serviceStart: "Začátek služby",
    serviceEnd: "Konec služby",
    exactSlotHint:
      "Certifikát služby představuje jeden přesný časový interval zvolený autorem.",
    terms: "Podmínky a komentáře",
    termsHint: "Volitelné veřejné podmínky tohoto certifikátu.",
    preview: "Náhled výpočtu",
    points: "Cena v bodech",
    covered: "Pokryto v měně poskytovatele",
    remainder: "Peněžní zbytek",
    externalPayment:
      "Peněžní zbytek se platí mimo ARCTor. ARCTor nepřijímá ani nepotvrzuje peněžní platbu.",
    create: "Vytvořit koncept",
    creating: "Vytváření…",
    errorPrefix: "Nepodařilo se vytvořit:",
  },
};

function buildLocaleHref(pathname: string, locale: LocaleCode) {
  return locale === "en"
    ? pathname
    : `${pathname}?locale=${encodeURIComponent(locale)}`;
}

function makeIdempotencyKey() {
  if (
    typeof globalThis.crypto !== "undefined" &&
    "randomUUID" in globalThis.crypto
  ) {
    return `gift-certificate:${globalThis.crypto.randomUUID()}`;
  }

  return `gift-certificate:${Date.now()}:${Math.random()
    .toString(36)
    .slice(2)}`;
}

function parseNumber(value: string) {
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateDateDifferenceDays(from: string, until: string) {
  if (!from || !until) {
    return null;
  }

  const fromDate = new Date(`${from}T00:00:00Z`);
  const untilDate = new Date(`${until}T00:00:00Z`);

  if (
    Number.isNaN(fromDate.getTime()) ||
    Number.isNaN(untilDate.getTime())
  ) {
    return null;
  }

  return Math.round(
    (untilDate.getTime() - fromDate.getTime()) / 86_400_000,
  );
}

export function GiftCertificateCreateForm({
  locale,
  valueObject,
  provider,
}: GiftCertificateCreateFormProps) {
  const router = useRouter();
  const copy = COPY[locale];
  const isService = valueObject.objectKind === "service_type";
  const deliveryOptions = isService
    ? ([
        ["service_offline", copy.serviceOffline],
        ["service_online", copy.serviceOnline],
      ] as const)
    : ([
        ["product_pickup", copy.productPickup],
        ["product_delivery", copy.productDelivery],
      ] as const);

  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(
    deliveryOptions[0][0],
  );
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [coverageMode, setCoverageMode] =
    useState<CoverageMode>("percentage");
  const [coverageValue, setCoverageValue] = useState("100");
  const [exchangeRate, setExchangeRate] = useState(
    valueObject.currency === "EUR" ? "1" : "",
  );
  const [serviceStart, setServiceStart] = useState("");
  const [serviceEnd, setServiceEnd] = useState("");
  const [termsText, setTermsText] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(
    makeIdempotencyKey,
  );
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const calculation = useMemo(() => {
    const ordinaryPrice = roundMoney(valueObject.ordinaryPrice);
    const rawCoverage = parseNumber(coverageValue);
    const rawRate =
      valueObject.currency === "EUR" ? 1 : parseNumber(exchangeRate);

    let coveredProviderAmount = Number.NaN;

    if (coverageMode === "percentage") {
      coveredProviderAmount = roundMoney(
        ordinaryPrice * rawCoverage / 100,
      );
    } else {
      coveredProviderAmount = roundMoney(rawCoverage);
    }

    const remainder = roundMoney(
      ordinaryPrice - coveredProviderAmount,
    );
    const pointsPrice = roundMoney(
      coveredProviderAmount / rawRate,
    );

    return {
      ordinaryPrice,
      coveredProviderAmount,
      remainder,
      pointsPrice,
      valid:
        Number.isFinite(ordinaryPrice) &&
        ordinaryPrice >= 0 &&
        Number.isFinite(rawCoverage) &&
        (coverageMode === "percentage"
          ? rawCoverage >= 0 && rawCoverage <= 100
          : rawCoverage >= 0 && rawCoverage <= ordinaryPrice) &&
        Number.isFinite(rawRate) &&
        rawRate > 0 &&
        coveredProviderAmount >= 0 &&
        coveredProviderAmount <= ordinaryPrice &&
        remainder >= 0 &&
        pointsPrice >= 0,
    };
  }, [
    coverageMode,
    coverageValue,
    exchangeRate,
    valueObject.currency,
    valueObject.ordinaryPrice,
  ]);

  async function submit() {
    setErrorMessage("");

    const validityDays = calculateDateDifferenceDays(
      availableFrom,
      availableUntil,
    );

    if (
      validityDays === null ||
      validityDays < 0 ||
      validityDays > 31
    ) {
      setErrorMessage(`${copy.errorPrefix} ${copy.validityHint}`);
      return;
    }

    if (!calculation.valid) {
      setErrorMessage(`${copy.errorPrefix} ${copy.coverageValue}.`);
      return;
    }

    let startedAt: string | null = null;
    let endedAt: string | null = null;

    if (isService) {
      const startDate = new Date(serviceStart);
      const endDate = new Date(serviceEnd);

      if (
        !serviceStart ||
        !serviceEnd ||
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime()) ||
        endDate.getTime() <= startDate.getTime()
      ) {
        setErrorMessage(`${copy.errorPrefix} ${copy.exactSlotHint}`);
        return;
      }

      startedAt = startDate.toISOString();
      endedAt = endDate.toISOString();
    }

    setPending(true);

    try {
      const response = await fetch(
        `/api/value-objects/${valueObject.id}/gift-certificates/draft`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            idempotencyKey,
            deliveryMode,
            availableFrom,
            availableUntil,
            pointsCoverageMode: coverageMode,
            pointsCoveragePercent:
              coverageMode === "percentage"
                ? parseNumber(coverageValue)
                : null,
            pointsCoveredAmount:
              coverageMode === "provider_currency_amount"
                ? parseNumber(coverageValue)
                : null,
            referenceExchangeRate:
              valueObject.currency === "EUR"
                ? null
                : parseNumber(exchangeRate),
            termsText: termsText.trim() || null,
            startedAt,
            endedAt,
            locale,
          }),
        },
      );

      const data = (await response.json()) as CreateResponse;

      if (!response.ok || !data.ok || !data.redirectUrl) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setIdempotencyKey(makeIdempotencyKey());
      router.push(data.redirectUrl);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        `${copy.errorPrefix} ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-full bg-[#f0f2f7] px-4 py-8 text-[#1a1d2e]">
      <div className="mx-auto grid w-full max-w-[1180px] gap-5">
        <header className="rounded-[26px] border border-black/[0.07] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#3b6ef8]">
            {copy.eyebrow}
          </div>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-[800px]">
              <h1 className="text-[30px] font-bold tracking-[-0.03em] text-[#111827]">
                {copy.title}
              </h1>
              <p className="mt-3 text-[14px] leading-6 text-[#5a5f7a]">
                {copy.intro}
              </p>
            </div>
            <Link
              href={buildLocaleHref(
                `/value-objects/${valueObject.id}`,
                locale,
              )}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
            >
              {copy.back}
            </Link>
          </div>
        </header>

        {errorMessage ? (
          <section className="rounded-[18px] border border-[#ffd5d5] bg-[#fff7f7] p-5 text-[14px] font-semibold text-[#b42318]">
            {errorMessage}
          </section>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[24px] border border-black/[0.07] bg-white p-6 shadow-sm">
            <div className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#e7eaf2] bg-[#f8fafc] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7c8099]">
                    {copy.provider}
                  </div>
                  <div className="mt-2 text-[14px] font-bold text-[#111827]">
                    {provider.label}
                  </div>
                </div>
                <div className="rounded-2xl border border-[#e7eaf2] bg-[#f8fafc] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7c8099]">
                    {copy.item}
                  </div>
                  <div className="mt-2 text-[14px] font-bold text-[#111827]">
                    {valueObject.title}
                  </div>
                  <div className="mt-1 text-[12px] text-[#7c8099]">
                    {isService ? copy.service : copy.product}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#e7eaf2] bg-white p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7c8099]">
                    {copy.ordinaryPrice}
                  </div>
                  <div className="mt-2 font-mono text-[18px] font-bold text-[#111827]">
                    {valueObject.ordinaryPrice.toFixed(2)}{" "}
                    {valueObject.currency}
                  </div>
                </div>
                <div className="rounded-2xl border border-[#e7eaf2] bg-white p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7c8099]">
                    {copy.ordinaryDuration}
                  </div>
                  <div className="mt-2 font-mono text-[18px] font-bold text-[#111827]">
                    {isService && valueObject.ordinaryDurationMinutes
                      ? `${valueObject.ordinaryDurationMinutes} min`
                      : "—"}
                  </div>
                </div>
              </div>

              <fieldset className="grid gap-3">
                <legend className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                  {copy.deliveryMode}
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {deliveryOptions.map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setDeliveryMode(mode)}
                      className={
                        deliveryMode === mode
                          ? "rounded-2xl border border-[#3b6ef8] bg-[#eef2ff] p-4 text-left text-[14px] font-bold text-[#315bd0]"
                          : "rounded-2xl border border-[#e4e7f0] bg-white p-4 text-left text-[14px] font-bold text-[#4a4f6a]"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                    {copy.availableFrom}
                  </span>
                  <input
                    type="date"
                    value={availableFrom}
                    onChange={(event) =>
                      setAvailableFrom(event.target.value)
                    }
                    className="min-h-12 rounded-xl border border-[#dfe3f1] bg-white px-4 text-[14px] text-[#1a1d2e]"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                    {copy.availableUntil}
                  </span>
                  <input
                    type="date"
                    value={availableUntil}
                    onChange={(event) =>
                      setAvailableUntil(event.target.value)
                    }
                    className="min-h-12 rounded-xl border border-[#dfe3f1] bg-white px-4 text-[14px] text-[#1a1d2e]"
                  />
                </label>
              </div>
              <p className="-mt-2 text-[12px] leading-5 text-[#7c8099]">
                {copy.validityHint}
              </p>

              {isService ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                        {copy.serviceStart}
                      </span>
                      <input
                        type="datetime-local"
                        value={serviceStart}
                        onChange={(event) =>
                          setServiceStart(event.target.value)
                        }
                        className="min-h-12 rounded-xl border border-[#dfe3f1] bg-white px-4 text-[14px] text-[#1a1d2e]"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                        {copy.serviceEnd}
                      </span>
                      <input
                        type="datetime-local"
                        value={serviceEnd}
                        onChange={(event) =>
                          setServiceEnd(event.target.value)
                        }
                        className="min-h-12 rounded-xl border border-[#dfe3f1] bg-white px-4 text-[14px] text-[#1a1d2e]"
                      />
                    </label>
                  </div>
                  <p className="-mt-2 text-[12px] leading-5 text-[#7c8099]">
                    {copy.exactSlotHint}
                  </p>
                </>
              ) : null}

              <fieldset className="grid gap-3">
                <legend className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                  {copy.coverageMode}
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["percentage", copy.percentage],
                      ["provider_currency_amount", copy.amount],
                    ] as const
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setCoverageMode(mode);
                        setCoverageValue(
                          mode === "percentage"
                            ? "100"
                            : valueObject.ordinaryPrice.toFixed(2),
                        );
                      }}
                      className={
                        coverageMode === mode
                          ? "rounded-2xl border border-[#3b6ef8] bg-[#eef2ff] p-4 text-left text-[14px] font-bold text-[#315bd0]"
                          : "rounded-2xl border border-[#e4e7f0] bg-white p-4 text-left text-[14px] font-bold text-[#4a4f6a]"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="grid gap-2">
                <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                  {copy.coverageValue}
                </span>
                <div className="flex min-h-12 items-center rounded-xl border border-[#dfe3f1] bg-white">
                  <input
                    inputMode="decimal"
                    value={coverageValue}
                    onChange={(event) =>
                      setCoverageValue(event.target.value)
                    }
                    className="min-h-11 min-w-0 flex-1 rounded-xl px-4 text-[14px] text-[#1a1d2e] outline-none"
                  />
                  <span className="px-4 font-mono text-[13px] font-bold text-[#7c8099]">
                    {coverageMode === "percentage"
                      ? "%"
                      : valueObject.currency}
                  </span>
                </div>
              </label>

              {valueObject.currency !== "EUR" ? (
                <label className="grid gap-2">
                  <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                    {copy.exchangeRate}
                  </span>
                  <input
                    inputMode="decimal"
                    value={exchangeRate}
                    onChange={(event) =>
                      setExchangeRate(event.target.value)
                    }
                    className="min-h-12 rounded-xl border border-[#dfe3f1] bg-white px-4 text-[14px] text-[#1a1d2e]"
                  />
                  <span className="text-[12px] leading-5 text-[#7c8099]">
                    {copy.exchangeRateHint}
                  </span>
                </label>
              ) : null}

              <label className="grid gap-2">
                <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                  {copy.terms}
                </span>
                <textarea
                  value={termsText}
                  onChange={(event) =>
                    setTermsText(event.target.value)
                  }
                  maxLength={4000}
                  rows={4}
                  className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e]"
                />
                <span className="text-[12px] leading-5 text-[#7c8099]">
                  {copy.termsHint}
                </span>
              </label>

              <button
                type="button"
                onClick={() => void submit()}
                disabled={pending}
                className="min-h-12 rounded-xl bg-[#3b6ef8] px-5 text-[14px] font-bold text-white shadow-[0_10px_22px_rgba(59,110,248,0.22)] transition hover:bg-[#315bd0] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? copy.creating : copy.create}
              </button>
            </div>
          </article>

          <aside className="grid content-start gap-5">
            <section className="rounded-[24px] border border-black/[0.07] bg-white p-6 shadow-sm">
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#3b6ef8]">
                {copy.preview}
              </div>
              <div className="mt-4 grid gap-3">
                {[
                  [
                    copy.covered,
                    calculation.valid
                      ? `${calculation.coveredProviderAmount.toFixed(2)} ${valueObject.currency}`
                      : "—",
                  ],
                  [
                    copy.points,
                    calculation.valid
                      ? formatLocalizedPoints(calculation.pointsPrice, locale)
                      : "—",
                  ],
                  [
                    copy.remainder,
                    calculation.valid
                      ? `${calculation.remainder.toFixed(2)} ${valueObject.currency}`
                      : "—",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-[#e7eaf2] bg-[#f8fafc] p-4"
                  >
                    <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7c8099]">
                      {label}
                    </div>
                    <div className="mt-2 font-mono text-[16px] font-bold text-[#111827]">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 rounded-2xl border border-[#ffe6b5] bg-[#fffaf0] p-4 text-[12px] leading-5 text-[#7a5d1d]">
                {copy.externalPayment}
              </p>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
