"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";
type ProductServiceKind = "product_type" | "service_type";

type ActiveProfile = {
  actorId: string;
  displayName: string;
  profileKind: "personal" | "avatar";
  currency: "EUR";
};

type Organization = {
  id: string;
  organization_name: string;
  default_currency: string | null;
};

type ProductServiceItem = {
  id: string;
  title: string;
  description: string | null;
  object_kind: ProductServiceKind;
  default_price: number | null;
  default_currency: string | null;
  default_duration_minutes: number | null;
  organization_id: string | null;
  status: string;
  created_at: string;
  organizations:
    | {
        id: string;
        organization_name: string | null;
      }
    | {
        id: string;
        organization_name: string | null;
      }[]
    | null;
};

type ProductServiceCreateFormProps = {
  locale: LocaleCode;
  activeProfile: ActiveProfile;
  organizations: Organization[];
  existingItems: ProductServiceItem[];
};

type CreateResponse = {
  ok?: boolean;
  error?: string;
  redirectUrl?: string;
};

const COPY: Record<
  LocaleCode,
  {
    eyebrow: string;
    title: string;
    description: string;
    back: string;
    provider: string;
    activeProfile: string;
    organization: string;
    kind: string;
    product: string;
    service: string;
    itemTitle: string;
    itemDescription: string;
    price: string;
    currency: string;
    duration: string;
    durationHint: string;
    create: string;
    creating: string;
    existing: string;
    noExisting: string;
    draft: string;
    technicalNote: string;
    errorPrefix: string;
  }
> = {
  en: {
    eyebrow: "Products and services",
    title: "Add a product or service",
    description:
      "The system creates a draft leaf under a hidden “Products and services” root. Price and ordinary service duration belong to the leaf; the gift certificate will be a separate planned activity.",
    back: "Back to observation objects",
    provider: "Provider",
    activeProfile: "Active profile",
    organization: "Enterprise",
    kind: "Type",
    product: "Product",
    service: "Service",
    itemTitle: "Name",
    itemDescription: "Description",
    price: "Ordinary price",
    currency: "Currency",
    duration: "Ordinary duration, minutes",
    durationHint: "Optional for a service; not used for a product.",
    create: "Create draft",
    creating: "Creating…",
    existing: "Existing products and services",
    noExisting: "No products or services have been created in this provider context.",
    draft: "draft",
    technicalNote:
      "The hidden root is created automatically once per active profile or enterprise.",
    errorPrefix: "Could not create:",
  },
  pl: {
    eyebrow: "Produkty i usługi",
    title: "Dodaj produkt lub usługę",
    description:
      "System tworzy szkic liścia pod ukrytym korzeniem „Produkty i usługi”. Cena i zwykły czas usługi należą do liścia; bon podarunkowy będzie osobną planowaną aktywnością.",
    back: "Wróć do obiektów obserwacji",
    provider: "Dostawca",
    activeProfile: "Aktywny profil",
    organization: "Przedsiębiorstwo",
    kind: "Typ",
    product: "Produkt",
    service: "Usługa",
    itemTitle: "Nazwa",
    itemDescription: "Opis",
    price: "Zwykła cena",
    currency: "Waluta",
    duration: "Zwykły czas, minuty",
    durationHint: "Opcjonalnie dla usługi; nie dotyczy produktu.",
    create: "Utwórz szkic",
    creating: "Tworzenie…",
    existing: "Istniejące produkty i usługi",
    noExisting: "W tym kontekście dostawcy nie utworzono jeszcze produktów ani usług.",
    draft: "szkic",
    technicalNote:
      "Ukryty korzeń jest tworzony automatycznie raz dla profilu lub przedsiębiorstwa.",
    errorPrefix: "Nie udało się utworzyć:",
  },
  ru: {
    eyebrow: "Товары и услуги",
    title: "Добавить товар или услугу",
    description:
      "Система создаёт листовой черновик под скрытым корнем «Товары и услуги». Обычная цена и продолжительность услуги относятся к листу; подарочный сертификат будет отдельной плановой активностью.",
    back: "Назад к объектам наблюдения",
    provider: "Предоставляющий",
    activeProfile: "Активный профиль",
    organization: "Предприятие",
    kind: "Тип",
    product: "Товар",
    service: "Услуга",
    itemTitle: "Название",
    itemDescription: "Описание",
    price: "Обычная стоимость",
    currency: "Валюта",
    duration: "Обычная продолжительность, минуты",
    durationHint: "Необязательно для услуги; для товара не используется.",
    create: "Создать черновик",
    creating: "Создаётся…",
    existing: "Созданные товары и услуги",
    noExisting: "В этом контексте предоставляющего товары и услуги ещё не создавались.",
    draft: "черновик",
    technicalNote:
      "Скрытый корень автоматически создаётся один раз для профиля или предприятия.",
    errorPrefix: "Не удалось создать:",
  },
  uk: {
    eyebrow: "Товари та послуги",
    title: "Додати товар або послугу",
    description:
      "Система створює чернетку листа під прихованим коренем «Товари та послуги». Звичайна ціна й тривалість послуги належать листу; подарунковий сертифікат буде окремою запланованою активністю.",
    back: "Назад до об’єктів спостереження",
    provider: "Надавач",
    activeProfile: "Активний профіль",
    organization: "Підприємство",
    kind: "Тип",
    product: "Товар",
    service: "Послуга",
    itemTitle: "Назва",
    itemDescription: "Опис",
    price: "Звичайна вартість",
    currency: "Валюта",
    duration: "Звичайна тривалість, хвилини",
    durationHint: "Необов’язково для послуги; для товару не використовується.",
    create: "Створити чернетку",
    creating: "Створення…",
    existing: "Створені товари та послуги",
    noExisting: "У цьому контексті надавача товари й послуги ще не створювалися.",
    draft: "чернетка",
    technicalNote:
      "Прихований корінь автоматично створюється один раз для профілю або підприємства.",
    errorPrefix: "Не вдалося створити:",
  },
  de: {
    eyebrow: "Produkte und Dienstleistungen",
    title: "Produkt oder Dienstleistung hinzufügen",
    description:
      "Das System erstellt einen Blattentwurf unter der ausgeblendeten Wurzel „Produkte und Dienstleistungen“. Preis und übliche Leistungsdauer gehören zum Blatt; der Geschenkgutschein wird eine separate geplante Aktivität.",
    back: "Zurück zu Beobachtungsobjekten",
    provider: "Anbieter",
    activeProfile: "Aktives Profil",
    organization: "Unternehmen",
    kind: "Typ",
    product: "Produkt",
    service: "Dienstleistung",
    itemTitle: "Name",
    itemDescription: "Beschreibung",
    price: "Regulärer Preis",
    currency: "Währung",
    duration: "Übliche Dauer, Minuten",
    durationHint: "Optional für Dienstleistungen; bei Produkten nicht verwendet.",
    create: "Entwurf erstellen",
    creating: "Wird erstellt…",
    existing: "Vorhandene Produkte und Dienstleistungen",
    noExisting: "In diesem Anbieterkontext wurden noch keine Produkte oder Dienstleistungen erstellt.",
    draft: "Entwurf",
    technicalNote:
      "Die ausgeblendete Wurzel wird je Profil oder Unternehmen einmal automatisch erstellt.",
    errorPrefix: "Erstellung fehlgeschlagen:",
  },
  es: {
    eyebrow: "Productos y servicios",
    title: "Añadir producto o servicio",
    description:
      "El sistema crea un borrador de hoja bajo la raíz oculta «Productos y servicios». El precio y la duración habitual pertenecen a la hoja; el certificado regalo será una actividad planificada separada.",
    back: "Volver a objetos de observación",
    provider: "Proveedor",
    activeProfile: "Perfil activo",
    organization: "Empresa",
    kind: "Tipo",
    product: "Producto",
    service: "Servicio",
    itemTitle: "Nombre",
    itemDescription: "Descripción",
    price: "Precio habitual",
    currency: "Moneda",
    duration: "Duración habitual, minutos",
    durationHint: "Opcional para un servicio; no se usa para un producto.",
    create: "Crear borrador",
    creating: "Creando…",
    existing: "Productos y servicios existentes",
    noExisting: "Todavía no hay productos o servicios en este contexto de proveedor.",
    draft: "borrador",
    technicalNote:
      "La raíz oculta se crea automáticamente una vez por perfil o empresa.",
    errorPrefix: "No se pudo crear:",
  },
  cs: {
    eyebrow: "Produkty a služby",
    title: "Přidat produkt nebo službu",
    description:
      "Systém vytvoří koncept listu pod skrytým kořenem „Produkty a služby“. Cena a obvyklá délka služby patří listu; dárkový certifikát bude samostatná plánovaná aktivita.",
    back: "Zpět k objektům pozorování",
    provider: "Poskytovatel",
    activeProfile: "Aktivní profil",
    organization: "Podnik",
    kind: "Typ",
    product: "Produkt",
    service: "Služba",
    itemTitle: "Název",
    itemDescription: "Popis",
    price: "Obvyklá cena",
    currency: "Měna",
    duration: "Obvyklá délka, minuty",
    durationHint: "Volitelné pro službu; u produktu se nepoužívá.",
    create: "Vytvořit koncept",
    creating: "Vytváření…",
    existing: "Existující produkty a služby",
    noExisting: "V tomto kontextu poskytovatele ještě nejsou žádné produkty ani služby.",
    draft: "koncept",
    technicalNote:
      "Skrytý kořen se automaticky vytvoří jednou pro profil nebo podnik.",
    errorPrefix: "Nepodařilo se vytvořit:",
  },
};

function getOrganizationName(item: ProductServiceItem) {
  const organization = Array.isArray(item.organizations)
    ? item.organizations[0]
    : item.organizations;

  return organization?.organization_name ?? null;
}

function buildLocaleHref(pathname: string, locale: LocaleCode) {
  return locale === "en"
    ? pathname
    : `${pathname}?locale=${encodeURIComponent(locale)}`;
}

export function ProductServiceCreateForm({
  locale,
  activeProfile,
  organizations,
  existingItems,
}: ProductServiceCreateFormProps) {
  const router = useRouter();
  const copy = COPY[locale];
  const providerOptions = useMemo(
    () => [
      {
        key: "profile",
        organizationId: null,
        label: `${copy.activeProfile}: ${activeProfile.displayName}`,
        currency: "EUR",
      },
      ...organizations.map((organization) => ({
        key: `organization:${organization.id}`,
        organizationId: organization.id,
        label: `${copy.organization}: ${organization.organization_name}`,
        currency: organization.default_currency?.toUpperCase() || "—",
      })),
    ],
    [activeProfile.displayName, copy.activeProfile, copy.organization, organizations],
  );

  const [providerKey, setProviderKey] = useState(providerOptions[0]?.key ?? "profile");
  const [objectKind, setObjectKind] = useState<ProductServiceKind>("product_type");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [defaultDurationMinutes, setDefaultDurationMinutes] = useState("");
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedProvider =
    providerOptions.find((provider) => provider.key === providerKey) ??
    providerOptions[0];

  async function submit() {
    setErrorMessage("");

    if (!selectedProvider) {
      setErrorMessage(`${copy.errorPrefix} ${copy.provider}.`);
      return;
    }

    const normalizedTitle = title.trim();
    const normalizedPrice = Number(defaultPrice.replace(",", "."));

    if (!normalizedTitle) {
      setErrorMessage(`${copy.errorPrefix} ${copy.itemTitle}.`);
      return;
    }

    if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
      setErrorMessage(`${copy.errorPrefix} ${copy.price}.`);
      return;
    }

    const duration =
      objectKind === "service_type" && defaultDurationMinutes.trim()
        ? Number(defaultDurationMinutes)
        : null;

    if (
      duration !== null &&
      (!Number.isInteger(duration) || duration <= 0)
    ) {
      setErrorMessage(`${copy.errorPrefix} ${copy.duration}.`);
      return;
    }

    setPending(true);

    try {
      const response = await fetch("/api/value-objects/product-service", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          objectKind,
          organizationId: selectedProvider.organizationId,
          title: normalizedTitle,
          description: description.trim() || null,
          defaultPrice: normalizedPrice,
          defaultCurrency: selectedProvider.currency,
          defaultDurationMinutes: duration,
          locale,
        }),
      });

      const data = (await response.json()) as CreateResponse;

      if (!response.ok || !data.ok || !data.redirectUrl) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      router.push(data.redirectUrl);
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
            <div className="max-w-[780px]">
              <h1 className="text-[30px] font-bold tracking-[-0.03em] text-[#111827]">
                {copy.title}
              </h1>
              <p className="mt-3 text-[14px] leading-6 text-[#5a5f7a]">
                {copy.description}
              </p>
              <p className="mt-2 text-[12px] leading-5 text-[#7c8099]">
                {copy.technicalNote}
              </p>
            </div>

            <Link
              href={buildLocaleHref("/value-objects", locale)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-bold text-[#4a4f6a] transition hover:bg-gray-50"
            >
              {copy.back}
            </Link>
          </div>
        </header>

        {errorMessage && (
          <section className="rounded-[18px] border border-[#ffd5d5] bg-[#fff7f7] p-5 text-[14px] font-semibold text-[#b42318]">
            {errorMessage}
          </section>
        )}

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[24px] border border-black/[0.07] bg-white p-6 shadow-sm">
            <div className="grid gap-5">
              <label className="grid gap-2">
                <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                  {copy.provider}
                </span>
                <select
                  value={providerKey}
                  onChange={(event) => setProviderKey(event.target.value)}
                  className="min-h-12 rounded-xl border border-[#dfe3f1] bg-white px-4 text-[14px] font-semibold text-[#1a1d2e]"
                >
                  {providerOptions.map((provider) => (
                    <option key={provider.key} value={provider.key}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["product_type", copy.product],
                    ["service_type", copy.service],
                  ] as const
                ).map(([kind, label]) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setObjectKind(kind)}
                    className={
                      objectKind === kind
                        ? "rounded-2xl border border-[#3b6ef8] bg-[#eef2ff] p-4 text-left text-[14px] font-bold text-[#315bd0]"
                        : "rounded-2xl border border-[#e4e7f0] bg-white p-4 text-left text-[14px] font-bold text-[#4a4f6a]"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              <label className="grid gap-2">
                <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                  {copy.itemTitle}
                </span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={180}
                  className="min-h-12 rounded-xl border border-[#dfe3f1] bg-white px-4 text-[14px] text-[#1a1d2e]"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                  {copy.itemDescription}
                </span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={4000}
                  rows={5}
                  className="rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[14px] text-[#1a1d2e]"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                    {copy.price}
                  </span>
                  <input
                    inputMode="decimal"
                    value={defaultPrice}
                    onChange={(event) => setDefaultPrice(event.target.value)}
                    className="min-h-12 rounded-xl border border-[#dfe3f1] bg-white px-4 text-[14px] text-[#1a1d2e]"
                  />
                </label>

                <div className="grid gap-2">
                  <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                    {copy.currency}
                  </span>
                  <div className="flex min-h-12 items-center rounded-xl border border-[#dfe3f1] bg-[#f8fafc] px-4 font-mono text-[14px] font-bold text-[#1a1d2e]">
                    {selectedProvider?.currency ?? "—"}
                  </div>
                </div>
              </div>

              {objectKind === "service_type" && (
                <label className="grid gap-2">
                  <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                    {copy.duration}
                  </span>
                  <input
                    inputMode="numeric"
                    value={defaultDurationMinutes}
                    onChange={(event) =>
                      setDefaultDurationMinutes(event.target.value)
                    }
                    className="min-h-12 rounded-xl border border-[#dfe3f1] bg-white px-4 text-[14px] text-[#1a1d2e]"
                  />
                  <span className="text-[12px] text-[#7c8099]">
                    {copy.durationHint}
                  </span>
                </label>
              )}

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

          <aside className="rounded-[24px] border border-black/[0.07] bg-white p-6 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#3b6ef8]">
              {copy.existing}
            </div>

            <div className="mt-4 grid gap-3">
              {existingItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#dfe3f1] bg-[#f8fafc] p-4 text-[13px] leading-5 text-[#7c8099]">
                  {copy.noExisting}
                </div>
              ) : (
                existingItems.map((item) => (
                  <Link
                    key={item.id}
                    href={buildLocaleHref(`/value-objects/${item.id}`, locale)}
                    className="rounded-2xl border border-[#e7eaf2] bg-[#f8fafc] p-4 transition hover:border-[#c9d5ff] hover:bg-[#f3f6ff]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[14px] font-bold text-[#111827]">
                          {item.title}
                        </div>
                        <div className="mt-1 text-[12px] text-[#7c8099]">
                          {item.object_kind === "product_type"
                            ? copy.product
                            : copy.service}
                          {" · "}
                          {getOrganizationName(item) ??
                            activeProfile.displayName}
                        </div>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#7c8099]">
                        {copy.draft}
                      </span>
                    </div>

                    <div className="mt-3 font-mono text-[13px] font-semibold text-[#343854]">
                      {item.default_price ?? "—"}{" "}
                      {item.default_currency ?? "—"}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
