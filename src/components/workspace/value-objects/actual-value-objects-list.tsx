"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

function getErrorStatus(statusCode: number): ActualListStatus {
  if (statusCode === 401) {
    return "not_authenticated";
  }

  if (statusCode === 403) {
    return "forbidden";
  }

  return "error";
}

function getStatusText(status: ActualListStatus) {
  if (status === "idle" || status === "loading") {
    return "Загружаю фактически созданные объекты...";
  }

  if (status === "success") {
    return "Фактически созданные объекты загружены.";
  }

  if (status === "not_authenticated") {
    return "Нужен вход в аккаунт.";
  }

  if (status === "forbidden") {
    return "Нет доступа к списку объектов.";
  }

  return "Не удалось загрузить фактически созданные объекты.";
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

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("ru-RU");
}

function getObjectTitle(valueObject: ActualValueObjectPayload) {
  return valueObject.title?.trim() || "Без названия";
}

function getObjectEditHref(valueObject: ActualValueObjectPayload) {
  return valueObject.id ? `/value-objects/${valueObject.id}/edit` : "#";
}

export function ActualValueObjectsList() {
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
    <section className={SECTION_CLASSES} aria-label="Фактически созданные Value Objects">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className={HEADER_LABEL_CLASSES}>
              Real database objects
            </div>

            <h2 className={TITLE_CLASSES}>
              Фактически созданные Value Objects
            </h2>

            <p className={TEXT_CLASSES}>
              Этот блок читает реальные записи через{" "}
              <span className="font-mono text-[#1a1d2e]">
                GET /api/value-objects
              </span>
              . Старый fixture/read-only блок ниже остаётся без изменений.
            </p>
          </div>

          <div className="rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-right">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2563eb]">
              Current status
            </div>
            <div className="mt-1 font-mono text-[13px] font-semibold text-[#1e3a8a]">
              {status}
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className={CARD_CLASSES}>
            <div className={FIELD_LABEL_CLASSES}>total</div>
            <div className={FIELD_VALUE_CLASSES}>{totalCount}</div>
          </div>

          <div className={CARD_CLASSES}>
            <div className={FIELD_LABEL_CLASSES}>draft</div>
            <div className={FIELD_VALUE_CLASSES}>{draftCount}</div>
          </div>

          <div className={CARD_CLASSES}>
            <div className={FIELD_LABEL_CLASSES}>private</div>
            <div className={FIELD_VALUE_CLASSES}>{privateCount}</div>
          </div>

          <div className={CARD_CLASSES}>
            <div className={FIELD_LABEL_CLASSES}>commercial</div>
            <div className={FIELD_VALUE_CLASSES}>{commercialCount}</div>
          </div>
        </div>

        {status !== "success" && (
          <div className="rounded-2xl border border-[#fed7aa] bg-[#fff7ed] p-4 text-[13px] font-semibold text-[#9a3412]">
            {getStatusText(status)}
            {errorMessage ? ` ${errorMessage}` : ""}
          </div>
        )}

        {status === "success" && valueObjects.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#c9d5ff] bg-[#f7f9ff] p-5 text-[14px] leading-6 text-[#4a4f6a]">
            Пока нет фактически созданных объектов. Создай частный Value Object
            через{" "}
            <Link
              href="/value-objects/new"
              className="font-bold text-[#3b6ef8] hover:underline"
            >
              /value-objects/new
            </Link>
            , затем он появится здесь.
          </div>
        )}

        {status === "success" && valueObjects.length > 0 && (
          <div className="grid gap-3">
            {valueObjects.map((valueObject) => (
              <article
                key={valueObject.id ?? getObjectTitle(valueObject)}
                className="rounded-2xl border border-[#dfe3f1] bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                      {formatValue(valueObject.usage_scope)} / {formatValue(valueObject.status)}
                    </div>

                    <h3 className="mt-1 text-[18px] font-bold tracking-[-0.02em] text-[#111827]">
                      {getObjectTitle(valueObject)}
                    </h3>

                    <p className="mt-2 text-[13px] leading-5 text-[#5a5f7a]">
                      {formatValue(valueObject.description)}
                    </p>
                  </div>

                  <Link
                    href={getObjectEditHref(valueObject)}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#dfe4ff] bg-[#eef2ff] px-4 py-2 text-[13px] font-bold text-[#3b6ef8] transition hover:bg-[#e4eaff]"
                  >
                    Открыть / редактировать
                  </Link>
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-4">
                  <div className={CARD_CLASSES}>
                    <div className={FIELD_LABEL_CLASSES}>id</div>
                    <div className={FIELD_VALUE_CLASSES}>{formatValue(valueObject.id)}</div>
                  </div>

                  <div className={CARD_CLASSES}>
                    <div className={FIELD_LABEL_CLASSES}>value_type</div>
                    <div className={FIELD_VALUE_CLASSES}>{formatValue(valueObject.value_type)}</div>
                  </div>

                  <div className={CARD_CLASSES}>
                    <div className={FIELD_LABEL_CLASSES}>source</div>
                    <div className={FIELD_VALUE_CLASSES}>{formatValue(valueObject.source)}</div>
                  </div>

                  <div className={CARD_CLASSES}>
                    <div className={FIELD_LABEL_CLASSES}>visibility</div>
                    <div className={FIELD_VALUE_CLASSES}>{formatValue(valueObject.visibility)}</div>
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
                    <div className={FIELD_LABEL_CLASSES}>created_at</div>
                    <div className={FIELD_VALUE_CLASSES}>{formatDate(valueObject.created_at)}</div>
                  </div>

                  <div className={CARD_CLASSES}>
                    <div className={FIELD_LABEL_CLASSES}>organization</div>
                    <div className={FIELD_VALUE_CLASSES}>
                      {formatValue(valueObject.organizations?.organization_name)}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}