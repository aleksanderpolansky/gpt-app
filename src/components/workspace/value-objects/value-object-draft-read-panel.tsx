"use client";

import { useEffect, useMemo, useState } from "react";

type DraftReadStatus =
  | "idle"
  | "loading"
  | "success"
  | "not_authenticated"
  | "forbidden"
  | "not_found"
  | "error";

type OrganizationPayload = {
  id?: string;
  organization_name?: string | null;
  organization_type?: string | null;
  status?: string | null;
};

type ValueObjectPayload = {
  id?: string;
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
  organizations?: OrganizationPayload | null;
};

type EditContractPayload = {
  getEnabled?: boolean;
  patchEnabled?: boolean;
  activateEnabled?: boolean;
  characteristicsPersistenceEnabled?: boolean;
  eventMeasuresPersistenceEnabled?: boolean;
  relationsPersistenceEnabled?: boolean;
  rollupPersistenceEnabled?: boolean;
  noWriteGuard?: boolean;
};

type DraftReadResponse = {
  ok?: boolean;
  mode?: string;
  error?: string;
  valueObject?: ValueObjectPayload;
  editContract?: EditContractPayload;
};

type ValueObjectDraftReadPanelProps = {
  valueObjectId: string;
};

const CONTRACT_FLAGS: Array<{
  key: keyof EditContractPayload;
  label: string;
  expected: boolean;
}> = [
  { key: "getEnabled", label: "GET draft enabled", expected: true },
  { key: "patchEnabled", label: "PATCH draft enabled", expected: false },
  { key: "activateEnabled", label: "activate enabled", expected: false },
  {
    key: "characteristicsPersistenceEnabled",
    label: "characteristics persistence",
    expected: false,
  },
  {
    key: "eventMeasuresPersistenceEnabled",
    label: "event measures persistence",
    expected: false,
  },
  {
    key: "relationsPersistenceEnabled",
    label: "relations persistence",
    expected: false,
  },
  {
    key: "rollupPersistenceEnabled",
    label: "rollup persistence",
    expected: false,
  },
  { key: "noWriteGuard", label: "no-write guard", expected: true },
];

function getErrorStatus(statusCode: number): DraftReadStatus {
  if (statusCode === 401) {
    return "not_authenticated";
  }

  if (statusCode === 403) {
    return "forbidden";
  }

  if (statusCode === 404) {
    return "not_found";
  }

  return "error";
}

function getStatusTitle(status: DraftReadStatus) {
  if (status === "idle" || status === "loading") {
    return "Загружаю черновик...";
  }

  if (status === "success") {
    return "Черновик загружен через read-only GET";
  }

  if (status === "not_authenticated") {
    return "Нужен вход в аккаунт";
  }

  if (status === "forbidden") {
    return "Нет доступа к этому Value Object";
  }

  if (status === "not_found") {
    return "Value Object не найден";
  }

  return "Не удалось загрузить черновик";
}

function getStatusDescription(status: DraftReadStatus, errorMessage: string) {
  if (status === "idle" || status === "loading") {
    return "Панель выполняет только GET-запрос и не сохраняет данные.";
  }

  if (status === "success") {
    return "Данные ниже получены из /api/value-objects/{id}. Изменение полей пока отключено.";
  }

  if (status === "not_authenticated") {
    return "Сервер вернул 401. Войди в аккаунт, чтобы увидеть свой черновик.";
  }

  if (status === "forbidden") {
    return "Сервер вернул 403. Черновик существует, но не принадлежит текущему actor/user контексту.";
  }

  if (status === "not_found") {
    return "Сервер вернул 404. Для этого id нет доступного Value Object.";
  }

  return errorMessage || "Проверь API route, авторизацию и доступ к таблице value_objects.";
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

function getFlagTone(value: boolean | undefined, expected: boolean) {
  if (value === expected) {
    return "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]";
  }

  return "border-[#fed7aa] bg-[#fff7ed] text-[#9a3412]";
}

export function ValueObjectDraftReadPanel({
  valueObjectId,
}: ValueObjectDraftReadPanelProps) {
  const apiPath = useMemo(
    () => `/api/value-objects/${encodeURIComponent(valueObjectId)}`,
    [valueObjectId],
  );

  const [status, setStatus] = useState<DraftReadStatus>("idle");
  const [valueObject, setValueObject] = useState<ValueObjectPayload | null>(null);
  const [editContract, setEditContract] =
    useState<EditContractPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const abortController = new AbortController();

    async function loadDraft() {
      setStatus("loading");
      setErrorMessage("");

      try {
        const response = await fetch(apiPath, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
          signal: abortController.signal,
        });

        const data = (await response
          .json()
          .catch(() => ({}))) as DraftReadResponse;

        if (!response.ok || !data.ok) {
          setValueObject(null);
          setEditContract(null);
          setErrorMessage(data.error ?? `HTTP ${response.status}`);
          setStatus(getErrorStatus(response.status));
          return;
        }

        setValueObject(data.valueObject ?? null);
        setEditContract(data.editContract ?? null);
        setStatus("success");
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setValueObject(null);
        setEditContract(null);
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Unknown client read error",
        );
      }
    }

    void loadDraft();

    return () => {
      abortController.abort();
    };
  }, [apiPath]);

  const fieldRows = [
    ["id", valueObject?.id],
    ["title", valueObject?.title],
    ["description", valueObject?.description],
    ["usage_scope", valueObject?.usage_scope],
    ["value_type", valueObject?.value_type],
    ["status", valueObject?.status],
    ["visibility", valueObject?.visibility],
    ["source", valueObject?.source],
    ["organization_id", valueObject?.organization_id],
    ["unit_type", valueObject?.unit_type],
    ["default_price", valueObject?.default_price],
    ["default_currency", valueObject?.default_currency],
    ["default_duration_minutes", valueObject?.default_duration_minutes],
    ["commercial_usage", valueObject?.commercial_usage],
    ["is_marketplace_sellable", valueObject?.is_marketplace_sellable],
    ["is_free_possible", valueObject?.is_free_possible],
  ] as const;

  return (
    <section className="rounded-[18px] border border-[#bfdbfe] bg-[#eff6ff] p-5 shadow-[0_8px_24px_rgba(37,99,235,0.08)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#2563eb]">
            Read-only GET draft loader
          </div>

          <h2 className="mt-2 text-[22px] font-bold tracking-[-0.02em] text-[#1e3a8a]">
            {getStatusTitle(status)}
          </h2>

          <p className="mt-2 max-w-[840px] text-[14px] leading-6 text-[#1d4ed8]">
            {getStatusDescription(status, errorMessage)}
          </p>
        </div>

        <div className="rounded-2xl border border-[#bfdbfe] bg-white px-4 py-3 font-mono text-[12px] font-semibold text-[#1e3a8a]">
          GET {apiPath}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-[#bfdbfe] bg-white p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2563eb]">
            request mode
          </div>
          <div className="mt-2 font-mono text-[13px] font-semibold text-[#1e3a8a]">
            read-only GET
          </div>
          <p className="mt-2 text-[13px] leading-5 text-[#1d4ed8]">
            This panel fetches draft data only after hydration via{" "}
            <span className="font-mono">GET /api/value-objects/[id]</span>.
          </p>
        </div>

        <div className="rounded-2xl border border-[#bbf7d0] bg-white p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#047857]">
            no-write boundary
          </div>
          <div className="mt-2 font-mono text-[13px] font-semibold text-[#064e3b]">
            PATCH / activate disabled
          </div>
          <p className="mt-2 text-[13px] leading-5 text-[#166534]">
            No save button, no status change, no hidden persistence.
          </p>
        </div>

        <div className="rounded-2xl border border-[#fed7aa] bg-white p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c2410c]">
            current client status
          </div>
          <div className="mt-2 font-mono text-[13px] font-semibold text-[#7c2d12]">
            {status}
          </div>
          <p className="mt-2 text-[13px] leading-5 text-[#9a3412]">
            401/403/404 are shown as safe guarded states, not bypassed.
          </p>
        </div>
      </div>

      {status === "not_authenticated" && (
        <div className="mt-4 rounded-2xl border border-[#bfdbfe] bg-white p-4">
          <div className="text-[13px] font-bold text-[#1e3a8a]">
            Auth boundary is working
          </div>
          <p className="mt-2 text-[13px] leading-5 text-[#1d4ed8]">
            The API refused anonymous access. Use login to check the owner-bound
            draft data.
          </p>
          <a
            href="/auth/login?connection=google-oauth2&prompt=select_account"
            className="mt-3 inline-flex rounded-xl bg-[#3b6ef8] px-4 py-2 text-[13px] font-bold text-white transition hover:bg-[#315bd0]"
          >
            Войти
          </a>
        </div>
      )}

      {status === "success" && valueObject && (
        <div className="mt-5 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-[#bfdbfe] bg-white p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2563eb]">
              Current draft data
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {fieldRows.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-[#e0edff] bg-[#f8fbff] px-4 py-3"
                >
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#64748b]">
                    {label}
                  </div>
                  <div className="mt-1 break-words font-mono text-[13px] font-semibold text-[#1e3a8a]">
                    {formatValue(value)}
                  </div>
                </div>
              ))}
            </div>

            {valueObject.organizations && (
              <div className="mt-3 rounded-xl border border-[#e0edff] bg-[#f8fbff] px-4 py-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#64748b]">
                  organization
                </div>
                <div className="mt-1 font-mono text-[13px] font-semibold text-[#1e3a8a]">
                  {formatValue(valueObject.organizations.organization_name)} /{" "}
                  {formatValue(valueObject.organizations.status)}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#bbf7d0] bg-white p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#047857]">
              editContract flags
            </div>

            <div className="mt-3 grid gap-2">
              {CONTRACT_FLAGS.map((flag) => {
                const value = editContract?.[flag.key];

                return (
                  <div
                    key={flag.key}
                    className={`rounded-xl border px-4 py-3 ${getFlagTone(
                      value,
                      flag.expected,
                    )}`}
                  >
                    <div className="text-[12px] font-bold">
                      {flag.label}
                    </div>
                    <div className="mt-1 font-mono text-[13px] font-semibold">
                      actual: {formatValue(value)} / expected:{" "}
                      {formatValue(flag.expected)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
