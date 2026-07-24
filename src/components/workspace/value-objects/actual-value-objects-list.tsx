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
  organization_type?: string | null;
  status?: string | null;
};

type ActualValueObjectPayload = {
  id?: string | null;
  owner_actor_id?: string | null;
  created_by_actor_id?: string | null;
  actor_id?: string | null;
  app_user_id?: string | null;
  owner_user_id?: string | null;
  organization_id?: string | null;
  usage_scope?: string | null;
  value_type?: string | null;
  title?: string | null;
  description?: string | null;
  unit_type?: string | null;
  default_price?: number | null;
  default_currency?: string | null;
  default_duration_minutes?: number | null;
  is_marketplace_sellable?: boolean | null;
  is_free_possible?: boolean | null;
  commercial_usage?: string | null;
  visibility?: string | null;
  source?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
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

const SECTION_CLASSES =
  "rounded-[18px] border border-[#dfe6ff] bg-white p-5 shadow-[0_8px_24px_rgba(59,110,248,0.07)]";

const HEADER_LABEL_CLASSES =
  "text-[11px] font-bold uppercase tracking-[0.22em] text-[#3b6ef8]";

const TITLE_CLASSES =
  "mt-2 text-[22px] font-bold tracking-[-0.02em] text-[#111827]";

const TEXT_CLASSES = "mt-2 text-[14px] leading-6 text-[#5a5f7a]";

const CARD_CLASSES =
  "rounded-2xl border border-[#edf0f7] bg-[#f8fafc] p-4";

const FIELD_LABEL_CLASSES =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c8099]";

const FIELD_VALUE_CLASSES =
  "mt-1 break-all font-mono text-[13px] font-semibold text-[#1a1d2e]";

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

  if (status === "success") {
    return t("valueObjects.actual.success");
  }

  if (status === "not_authenticated") {
    return t("valueObjects.actual.notAuthenticated");
  }

  if (status === "forbidden") {
    return t("valueObjects.actual.forbidden");
  }

  return t("valueObjects.actual.error");
}

function formatValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

function formatDate(value: string | null | undefined, locale: LocaleCode) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(getDateLocale(locale));
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

  const draftCount = useMemo(
    () =>
      valueObjects.filter((valueObject) => valueObject.status === "draft")
        .length,
    [valueObjects],
  );

  const privateCount = useMemo(
    () =>
      valueObjects.filter((valueObject) => valueObject.usage_scope === "private")
        .length,
    [valueObjects],
  );

  const commercialCount = useMemo(
    () =>
      valueObjects.filter(
        (valueObject) => valueObject.usage_scope === "commercial",
      ).length,
    [valueObjects],
  );

  return (
    <section
      className={SECTION_CLASSES}
      aria-label={t("valueObjects.actual.title")}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className={HEADER_LABEL_CLASSES}>
              {t("valueObjects.actual.eyebrow")}
            </div>

            <h2 className={TITLE_CLASSES}>
              {t("valueObjects.actual.title")}
            </h2>

            <p className={TEXT_CLASSES}>
              {t("valueObjects.actual.description")}
            </p>
          </div>

          <div className="rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-right">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2563eb]">
              {t("valueObjects.actual.currentStatus")}
            </div>
            <div className="mt-1 font-mono text-[13px] font-semibold text-[#1e3a8a]">
              {status}
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className={CARD_CLASSES}>
            <div className={FIELD_LABEL_CLASSES}>
              {t("valueObjects.actual.total")}
            </div>
            <div className={FIELD_VALUE_CLASSES}>{totalCount}</div>
          </div>

          <div className={CARD_CLASSES}>
            <div className={FIELD_LABEL_CLASSES}>
              {t("valueObjects.actual.draft")}
            </div>
            <div className={FIELD_VALUE_CLASSES}>{draftCount}</div>
          </div>

          <div className={CARD_CLASSES}>
            <div className={FIELD_LABEL_CLASSES}>
              {t("valueObjects.actual.private")}
            </div>
            <div className={FIELD_VALUE_CLASSES}>{privateCount}</div>
          </div>

          <div className={CARD_CLASSES}>
            <div className={FIELD_LABEL_CLASSES}>
              {t("valueObjects.actual.commercial")}
            </div>
            <div className={FIELD_VALUE_CLASSES}>{commercialCount}</div>
          </div>
        </div>

        {status !== "success" && (
          <div className="rounded-2xl border border-[#fed7aa] bg-[#fff7ed] p-4 text-[13px] font-semibold text-[#9a3412]">
            {getStatusText(status, t)}
            {errorMessage ? ` ${errorMessage}` : ""}
          </div>
        )}

        {status === "success" && valueObjects.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#c9d5ff] bg-[#f7f9ff] p-5 text-[14px] leading-6 text-[#4a4f6a]">
            {t("valueObjects.actual.empty")}{" "}
            <Link
              href={buildLocaleAwareHref("/value-objects/new/root", locale)}
              className="font-bold text-[#3b6ef8] hover:underline"
            >
              /value-objects/new
            </Link>
          </div>
        )}

        {status === "success" && valueObjects.length > 0 && (
          <div className="grid gap-3">
            {valueObjects.map((valueObject) => {
              const title =
                valueObject.title?.trim() || t("valueObjects.actual.noTitle");

              return (
                <article
                  key={valueObject.id ?? title}
                  className="rounded-2xl border border-[#dfe3f1] bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                        {formatValue(valueObject.usage_scope)} /{" "}
                        {formatValue(valueObject.status)}
                      </div>

                      <h3 className="mt-1 text-[18px] font-bold tracking-[-0.02em] text-[#111827]">
                        {title}
                      </h3>

                      <p className="mt-2 text-[13px] leading-5 text-[#5a5f7a]">
                        {formatValue(valueObject.description)}
                      </p>
                    </div>

                    <Link
                      href={buildLocaleAwareHref(getObjectDetailHref(valueObject), locale)}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#dfe4ff] bg-[#eef2ff] px-4 py-2 text-[13px] font-bold text-[#3b6ef8] transition hover:bg-[#e4eaff]"
                    >
                      {t("valueObjects.actual.openEdit")}
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-4">
                    <div className={CARD_CLASSES}>
                      <div className={FIELD_LABEL_CLASSES}>id</div>
                      <div className={FIELD_VALUE_CLASSES}>
                        {formatValue(valueObject.id)}
                      </div>
                    </div>

                    <div className={CARD_CLASSES}>
                      <div className={FIELD_LABEL_CLASSES}>value_type</div>
                      <div className={FIELD_VALUE_CLASSES}>
                        {formatValue(valueObject.value_type)}
                      </div>
                    </div>

                    <div className={CARD_CLASSES}>
                      <div className={FIELD_LABEL_CLASSES}>source</div>
                      <div className={FIELD_VALUE_CLASSES}>
                        {formatValue(valueObject.source)}
                      </div>
                    </div>

                    <div className={CARD_CLASSES}>
                      <div className={FIELD_LABEL_CLASSES}>visibility</div>
                      <div className={FIELD_VALUE_CLASSES}>
                        {formatValue(valueObject.visibility)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    <div className={CARD_CLASSES}>
                      <div className={FIELD_LABEL_CLASSES}>organization_id</div>
                      <div className={FIELD_VALUE_CLASSES}>
                        {formatValue(valueObject.organization_id)}
                      </div>
                    </div>

                    <div className={CARD_CLASSES}>
                      <div className={FIELD_LABEL_CLASSES}>
                        {t("valueObjects.actual.createdAt")}
                      </div>
                      <div className={FIELD_VALUE_CLASSES}>
                        {formatDate(valueObject.created_at, locale)}
                      </div>
                    </div>

                    <div className={CARD_CLASSES}>
                      <div className={FIELD_LABEL_CLASSES}>
                        {t("valueObjects.actual.organization")}
                      </div>
                      <div className={FIELD_VALUE_CLASSES}>
                        {formatValue(valueObject.organizations?.organization_name)}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
