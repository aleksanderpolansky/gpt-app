"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  getLocaleSearchParam,
  getValueObjectsMessage,
  type LocaleCode,
  type ValueObjectsMessageKey,
} from "@/i18n";

type OrganizationPayload = {
  id?: string;
  organization_name?: string | null;
};

type ActualValueObjectPayload = {
  id?: string | null;
  organization_id?: string | null;
  usage_scope?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  created_at?: string | null;
  organizations?: OrganizationPayload | null;
};

type ActualValueObjectsResponse = {
  ok?: boolean;
  error?: string;
  valueObjects?: ActualValueObjectPayload[];
};

type ActualListStatus =
  | "idle"
  | "loading"
  | "success"
  | "not_authenticated"
  | "forbidden"
  | "error";

type LocalCopy = {
  eyebrow: string;
  title: string;
  description: string;
  status: string;
  context: string;
  created: string;
  personal: string;
  commercial: string;
  draft: string;
  active: string;
};

const COPY: Record<LocaleCode, LocalCopy> = {
  en: {
    eyebrow: "Observation objects",
    title: "My observation objects",
    description:
      "Root, intermediate and leaf objects belonging to the current active profile.",
    status: "Status",
    context: "Context",
    created: "Created",
    personal: "Personal",
    commercial: "Commercial",
    draft: "Draft",
    active: "Active",
  },
  pl: {
    eyebrow: "Obiekty obserwacji",
    title: "Moje obiekty obserwacji",
    description:
      "Obiekty korzeniowe, pośrednie i liściowe aktualnie aktywnego profilu.",
    status: "Status",
    context: "Kontekst",
    created: "Utworzono",
    personal: "Osobisty",
    commercial: "Komercyjny",
    draft: "Szkic",
    active: "Aktywny",
  },
  ru: {
    eyebrow: "Объекты наблюдения",
    title: "Мои объекты наблюдения",
    description:
      "Корневые, промежуточные и листовые объекты текущего активного профиля.",
    status: "Состояние",
    context: "Контекст",
    created: "Создано",
    personal: "Личный",
    commercial: "Коммерческий",
    draft: "Черновик",
    active: "Активен",
  },
  uk: {
    eyebrow: "Об’єкти спостереження",
    title: "Мої об’єкти спостереження",
    description:
      "Кореневі, проміжні та листові об’єкти поточного активного профілю.",
    status: "Стан",
    context: "Контекст",
    created: "Створено",
    personal: "Особистий",
    commercial: "Комерційний",
    draft: "Чернетка",
    active: "Активний",
  },
  de: {
    eyebrow: "Beobachtungsobjekte",
    title: "Meine Beobachtungsobjekte",
    description:
      "Wurzel-, Zwischen- und Blattobjekte des aktuell aktiven Profils.",
    status: "Status",
    context: "Kontext",
    created: "Erstellt",
    personal: "Persönlich",
    commercial: "Kommerziell",
    draft: "Entwurf",
    active: "Aktiv",
  },
  es: {
    eyebrow: "Objetos de observación",
    title: "Mis objetos de observación",
    description:
      "Objetos raíz, intermedios y hoja del perfil activo actual.",
    status: "Estado",
    context: "Contexto",
    created: "Creado",
    personal: "Personal",
    commercial: "Comercial",
    draft: "Borrador",
    active: "Activo",
  },
  cs: {
    eyebrow: "Objekty pozorování",
    title: "Moje objekty pozorování",
    description:
      "Kořenové, mezilehlé a listové objekty aktuálně aktivního profilu.",
    status: "Stav",
    context: "Kontext",
    created: "Vytvořeno",
    personal: "Osobní",
    commercial: "Komerční",
    draft: "Koncept",
    active: "Aktivní",
  },
};

const SECTION_CLASSES =
  "rounded-[24px] border border-black/[0.07] bg-white p-5 shadow-sm";
const SUMMARY_CLASSES =
  "rounded-[18px] border border-[#edf0f7] bg-[#f8fafc] p-4";

function useInterfaceLocale(): LocaleCode {
  const [locale, setLocale] = useState<LocaleCode>("en");

  useEffect(() => {
    function readLocaleFromUrl() {
      if (typeof window === "undefined") {
        return;
      }

      setLocale(getLocaleSearchParam(new URLSearchParams(window.location.search)));
    }

    readLocaleFromUrl();
    window.addEventListener("popstate", readLocaleFromUrl);

    return () => {
      window.removeEventListener("popstate", readLocaleFromUrl);
    };
  }, []);

  return locale;
}

function getDateLocale(locale: LocaleCode) {
  const dateLocales: Record<LocaleCode, string> = {
    ru: "ru-RU",
    pl: "pl-PL",
    en: "en-US",
    es: "es-ES",
    uk: "uk-UA",
    de: "de-DE",
    cs: "cs-CZ",
  };

  return dateLocales[locale] ?? "en-US";
}

function getErrorStatus(statusCode: number): ActualListStatus {
  if (statusCode === 401) {
    return "not_authenticated";
  }

  if (statusCode === 403) {
    return "forbidden";
  }

  return "error";
}

function getStatusText(
  status: ActualListStatus,
  t: (key: ValueObjectsMessageKey) => string,
) {
  if (status === "idle" || status === "loading") {
    return t("valueObjects.actual.loading");
  }

  if (status === "not_authenticated") {
    return t("valueObjects.actual.notAuthenticated");
  }

  if (status === "forbidden") {
    return t("valueObjects.actual.forbidden");
  }

  return t("valueObjects.actual.error");
}

function formatDate(value: string | null | undefined, locale: LocaleCode) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(getDateLocale(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getObjectDetailHref(valueObject: ActualValueObjectPayload) {
  return valueObject.id ? `/value-objects/${valueObject.id}` : "#";
}

function buildLocaleAwareHref(pathname: string, locale: LocaleCode) {
  if (locale === "en") {
    return pathname;
  }

  return `${pathname}?locale=${encodeURIComponent(locale)}`;
}

export function ActualValueObjectsList() {
  const locale = useInterfaceLocale();
  const copy = COPY[locale] ?? COPY.en;
  const t = useMemo(
    () => (key: ValueObjectsMessageKey) => getValueObjectsMessage(key, locale),
    [locale],
  );

  const [status, setStatus] = useState<ActualListStatus>("idle");
  const [valueObjects, setValueObjects] = useState<ActualValueObjectPayload[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const abortController = new AbortController();

    async function loadValueObjects() {
      setStatus("loading");
      setErrorMessage("");

      try {
        const response = await fetch("/api/value-objects", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
          signal: abortController.signal,
        });

        const data = (await response
          .json()
          .catch(() => ({}))) as ActualValueObjectsResponse;

        if (!response.ok || !data.ok) {
          setValueObjects([]);
          setErrorMessage(data.error ?? `HTTP ${response.status}`);
          setStatus(getErrorStatus(response.status));
          return;
        }

        setValueObjects(Array.isArray(data.valueObjects) ? data.valueObjects : []);
        setStatus("success");
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setValueObjects([]);
        setErrorMessage(
          error instanceof Error ? error.message : "Unknown client read error",
        );
        setStatus("error");
      }
    }

    void loadValueObjects();

    return () => {
      abortController.abort();
    };
  }, []);

  const totalCount = valueObjects.length;
  const draftCount = valueObjects.filter(
    (valueObject) => valueObject.status === "draft",
  ).length;
  const privateCount = valueObjects.filter(
    (valueObject) => valueObject.usage_scope === "private",
  ).length;
  const commercialCount = valueObjects.filter(
    (valueObject) => valueObject.usage_scope === "commercial",
  ).length;

  return (
    <section className={SECTION_CLASSES} aria-label={copy.title}>
      <div className="flex flex-col gap-5">
        <header>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8099]">
            {copy.eyebrow}
          </div>
          <h1 className="mt-1 text-[20px] font-bold leading-tight text-[#111827]">
            {copy.title}
          </h1>
          <p className="mt-1 max-w-[850px] text-[13px] leading-5 text-[#7c8099]">
            {copy.description}
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [t("valueObjects.actual.total"), totalCount],
            [t("valueObjects.actual.draft"), draftCount],
            [t("valueObjects.actual.private"), privateCount],
            [t("valueObjects.actual.commercial"), commercialCount],
          ].map(([label, value]) => (
            <div key={String(label)} className={SUMMARY_CLASSES}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#7c8099]">
                {label}
              </div>
              <div className="mt-2 text-[22px] font-bold text-[#111827]">
                {value}
              </div>
            </div>
          ))}
        </div>

        {status !== "success" ? (
          <div className="rounded-[18px] border border-[#fed7aa] bg-[#fff7ed] p-4 text-[13px] font-semibold text-[#9a3412]">
            {getStatusText(status, t)}
            {errorMessage ? ` ${errorMessage}` : ""}
          </div>
        ) : null}

        {status === "success" && valueObjects.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-[#c9d5ff] bg-[#f7f9ff] p-5 text-[13px] leading-5 text-[#4a4f6a]">
            {t("valueObjects.actual.empty")}
          </div>
        ) : null}

        {status === "success" && valueObjects.length > 0 ? (
          <div className="grid gap-3">
            {valueObjects.map((valueObject) => {
              const title =
                valueObject.title?.trim() || t("valueObjects.actual.noTitle");
              const isCommercial = valueObject.usage_scope === "commercial";
              const isDraft = valueObject.status === "draft";

              return (
                <article
                  key={valueObject.id ?? title}
                  className="rounded-[20px] border border-[#dfe3f1] bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-[11px] font-semibold text-[#3b6ef8]">
                          {isCommercial ? copy.commercial : copy.personal}
                        </span>
                        <span className="rounded-full bg-[#f5f6fb] px-3 py-1 text-[11px] font-semibold text-[#6b7280]">
                          {isDraft ? copy.draft : copy.active}
                        </span>
                      </div>

                      <h2 className="mt-3 text-[16px] font-semibold text-[#111827]">
                        {title}
                      </h2>

                      {valueObject.description?.trim() ? (
                        <p className="mt-1 max-w-[760px] text-[13px] leading-5 text-[#5a5f7a]">
                          {valueObject.description.trim()}
                        </p>
                      ) : null}
                    </div>

                    <Link
                      href={buildLocaleAwareHref(
                        getObjectDetailHref(valueObject),
                        locale,
                      )}
                      className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-[#dfe3f1] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4f6a] shadow-sm transition hover:bg-gray-50"
                    >
                      {t("valueObjects.actual.openEdit")}
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <div className={SUMMARY_CLASSES}>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7c8099]">
                        {copy.status}
                      </div>
                      <div className="mt-1 text-[13px] font-semibold text-[#1a1d2e]">
                        {isDraft ? copy.draft : copy.active}
                      </div>
                    </div>

                    <div className={SUMMARY_CLASSES}>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7c8099]">
                        {copy.context}
                      </div>
                      <div className="mt-1 text-[13px] font-semibold text-[#1a1d2e]">
                        {valueObject.organizations?.organization_name?.trim() ||
                          (isCommercial ? copy.commercial : copy.personal)}
                      </div>
                    </div>

                    <div className={SUMMARY_CLASSES}>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7c8099]">
                        {copy.created}
                      </div>
                      <div className="mt-1 text-[13px] font-semibold text-[#1a1d2e]">
                        {formatDate(valueObject.created_at, locale)}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
