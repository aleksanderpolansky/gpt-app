"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type UsageScope = "private" | "commercial";

type CreateDraftResponse = {
  ok?: boolean;
  error?: string;
  mode?: string;
  redirectUrl?: string;
  valueObject?: {
    id?: string;
    usage_scope?: string | null;
    title?: string | null;
    status?: string | null;
  };
};

type SelectorCard = {
  usageScope: UsageScope;
  eyebrow: string;
  title: string;
  description: string;
  contractLines: string[];
  examples: string[];
};

const SELECTOR_CARDS: SelectorCard[] = [
  {
    usageScope: "private",
    eyebrow: "ontology authoring",
    title: "Частный ценный объект",
    description:
      "Обычный объект наблюдения в современной структуре root → intermediate → leaf. Коммерческий контур товаров и услуг остаётся отдельным.",
    contractLines: [
      "scope = actor",
      "roles = root / intermediate / leaf",
      "create RPC = create_value_object_ontology_v1",
      "visibility = private",
      "redirect → /value-objects/new/root",
    ],
    examples: [
      "изучение немецкого",
      "микротренировки",
      "здоровье",
      "семейная обязанность",
      "личный проект",
    ],
  },
  {
    usageScope: "commercial",
    eyebrow: "usage_scope = commercial",
    title: "Коммерческий ценный объект",
    description:
      "Объект предприятия: товар, услуга, консультация, доступ, материал, offer или certificate-base сценарий.",
    contractLines: [
      "organization_id = required",
      "status = draft",
      "source = manual",
      "commercial_usage = none by default",
      "redirect → /value-objects/{id}/edit",
    ],
    examples: [
      "массаж",
      "консультация",
      "абонемент",
      "методичка",
      "сертификат",
    ],
  },
];

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Неизвестная ошибка.";
}

export default function NewValueObjectPage() {
  const router = useRouter();

  const [organizationId, setOrganizationId] = useState("");
  const [pendingScope, setPendingScope] = useState<UsageScope | null>(null);
  const [resultMessage, setResultMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const trimmedOrganizationId = useMemo(
    () => organizationId.trim(),
    [organizationId],
  );

  async function createDraft(usageScope: UsageScope) {
    setErrorMessage("");
    setResultMessage("");

    if (usageScope === "private") {
      router.push("/value-objects/new/root");
      return;
    }

    if (usageScope === "commercial" && !trimmedOrganizationId) {
      setErrorMessage(
        "Для коммерческого Value Object нужен organization_id. На следующем шаге мы заменим это поле выбором предприятия из списка.",
      );
      return;
    }

    setPendingScope(usageScope);

    try {
      const response = await fetch("/api/value-objects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creationMode: "draft_first",
          usageScope,
          organizationId:
            usageScope === "commercial" ? trimmedOrganizationId : undefined,
        }),
      });

      const data = (await response.json()) as CreateDraftResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Не удалось создать черновик.");
      }

      if (!data.redirectUrl) {
        throw new Error("API не вернул redirectUrl для черновика.");
      }

      setResultMessage(
        `Черновик создан. Переходим к редактированию: ${data.redirectUrl}`,
      );

      router.push(data.redirectUrl);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setPendingScope(null);
    }
  }

  return (
    <main className="min-h-full bg-[#f5f6fb] px-4 py-8 text-[#1a1d2e]">
      <div className="mx-auto grid w-full max-w-[1180px] gap-5">
        <header className="rounded-[18px] border border-[rgba(0,0,0,0.07)] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7c8099]">
            Draft-first Value Object / New selector
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[30px] font-bold tracking-[-0.03em] text-[#111827]">
                Создать ценный объект
              </h1>

              <p className="mt-2 max-w-[820px] text-[14px] leading-6 text-[#5a5f7a]">
                Сначала выбери характеристику объекта: частный или коммерческий.
                Система создаст минимальный черновик и переведёт тебя на страницу
                редактирования{" "}
                <span className="font-mono text-[#1a1d2e]">
                  /value-objects/{"{id}"}/edit
                </span>
                .
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link
                href="/value-objects"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[13px] font-bold text-[#4a4f6a] shadow-sm transition hover:bg-gray-50"
              >
                Все Value Objects
              </Link>
              <Link
                href="/workspace"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#eef2ff] px-4 py-3 text-[13px] font-bold text-[#3b6ef8] shadow-sm transition hover:bg-[#e2e8ff]"
              >
                Workspace
              </Link>
              <Link
                href="/value-objects/characteristics-rollup-preview"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#86efac] bg-[#dcfce7] px-4 py-3 text-[13px] font-bold text-[#047857] shadow-sm transition hover:bg-[#bbf7d0]"
              >
                Characteristics model
              </Link>
            </div>
          </div>
        </header>

        <section className="rounded-[18px] border border-[#dfe6ff] bg-[#f7f9ff] p-5 shadow-[0_8px_24px_rgba(59,110,248,0.07)]">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#3b6ef8]">
            Author-first contract
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-[#e3e8ff] bg-white p-4">
              <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                entity
              </div>
              <div className="mt-1 font-mono text-[13px] font-semibold text-[#1a1d2e]">
                one universal Value Object
              </div>
            </div>

            <div className="rounded-2xl border border-[#e3e8ff] bg-white p-4">
              <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                characteristic
              </div>
              <div className="mt-1 font-mono text-[13px] font-semibold text-[#1a1d2e]">
                usage_scope
              </div>
            </div>

            <div className="rounded-2xl border border-[#e3e8ff] bg-white p-4">
              <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                creator
              </div>
              <div className="mt-1 font-mono text-[13px] font-semibold text-[#1a1d2e]">
                created_by_actor_id
              </div>
            </div>

            <div className="rounded-2xl border border-[#e3e8ff] bg-white p-4">
              <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                first state
              </div>
              <div className="mt-1 font-mono text-[13px] font-semibold text-[#1a1d2e]">
                status = draft
              </div>
            </div>
          </div>
        </section>

        {(errorMessage || resultMessage) && (
          <section
            className={
              errorMessage
                ? "rounded-[18px] border border-[#ffd5d5] bg-[#fff7f7] p-5 text-[14px] font-semibold text-[#b42318]"
                : "rounded-[18px] border border-[#c9f2d4] bg-[#f4fff7] p-5 text-[14px] font-semibold text-[#16713b]"
            }
          >
            {errorMessage || resultMessage}
          </section>
        )}

        <section className="grid gap-5 lg:grid-cols-2">
          {SELECTOR_CARDS.map((card) => {
            const isPending = pendingScope === card.usageScope;

            return (
              <article
                key={card.usageScope}
                className="rounded-[18px] border border-[rgba(0,0,0,0.07)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
              >
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#7c8099]">
                  {card.eyebrow}
                </div>

                <h2 className="text-[22px] font-bold tracking-[-0.02em] text-[#111827]">
                  {card.title}
                </h2>

                <p className="mt-2 text-[14px] leading-6 text-[#5a5f7a]">
                  {card.description}
                </p>

                <div className="mt-4 grid gap-2">
                  {card.contractLines.map((line) => (
                    <div
                      key={line}
                      className="rounded-xl border border-[#edf0f7] bg-[#f8fafc] px-4 py-3 font-mono text-[13px] font-semibold text-[#343854]"
                    >
                      {line}
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                    Примеры
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {card.examples.map((example) => (
                      <span
                        key={example}
                        className="rounded-full bg-[#eef2ff] px-3 py-1 text-[12px] font-semibold text-[#3b6ef8]"
                      >
                        {example}
                      </span>
                    ))}
                  </div>
                </div>

                {card.usageScope === "commercial" && (
                  <div className="mt-4 rounded-2xl border border-dashed border-[#c9d5ff] bg-[#f7f9ff] p-4">
                    <label className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
                      organization_id для commercial draft
                    </label>
                    <input
                      value={organizationId}
                      onChange={(event) => setOrganizationId(event.target.value)}
                      placeholder="Вставь UUID предприятия"
                      className="mt-2 w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 font-mono text-[13px] text-[#1a1d2e] outline-none transition focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10"
                    />
                    <p className="mt-2 text-[12px] leading-5 text-[#7c8099]">
                      Это временное поле. Следующим слоем можно заменить его
                      выбором предприятия из списка после загрузки организаций.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void createDraft(card.usageScope)}
                  disabled={pendingScope !== null}
                  className="mt-5 w-full rounded-xl bg-[#3b6ef8] px-4 py-3 text-[14px] font-bold text-white shadow-[0_10px_22px_rgba(59,110,248,0.22)] transition hover:bg-[#315bd0] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending
                    ? "Создаю черновик..."
                    : card.usageScope === "private"
                      ? "Создать обычный ЦО"
                      : `Создать ${card.usageScope} draft`}
                </button>
              </article>
            );
          })}
        </section>

        <section className="rounded-[18px] border border-[rgba(0,0,0,0.07)] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#7c8099]">
            Safety notes
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-[#f5f6fb] p-4">
              <div className="font-mono text-[13px] font-semibold text-[#1a1d2e]">
                no hard subtype
              </div>
              <p className="mt-2 text-[13px] leading-5 text-[#5a5f7a]">
                Частный и коммерческий режим — это характеристика одного
                универсального объекта.
              </p>
            </div>

            <div className="rounded-2xl bg-[#f5f6fb] p-4">
              <div className="font-mono text-[13px] font-semibold text-[#1a1d2e]">
                no auto publish
              </div>
              <p className="mt-2 text-[13px] leading-5 text-[#5a5f7a]">
                Новый объект создаётся как draft, а не active.
              </p>
            </div>

            <div className="rounded-2xl bg-[#f5f6fb] p-4">
              <div className="font-mono text-[13px] font-semibold text-[#1a1d2e]">
                one edit path
              </div>
              <p className="mt-2 text-[13px] leading-5 text-[#5a5f7a]">
                После создания оба сценария идут на один маршрут редактирования.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
