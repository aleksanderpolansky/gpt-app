"use client";

import { useEffect, useMemo, useState } from "react";

type ValueObjectDraftResponse = {
  ok?: boolean;
  error?: string;
  valueObject?: {
    id?: string | null;
    title?: string | null;
    usage_scope?: string | null;
    status?: string | null;
  } | null;
};

type PatchDraftResponse = {
  ok?: boolean;
  error?: string;
  valueObject?: {
    id?: string | null;
    title?: string | null;
    usage_scope?: string | null;
    status?: string | null;
  } | null;
};

type ValueObjectDraftTitleEditorProps = {
  readonly valueObjectId: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Неизвестная ошибка.";
}

export function ValueObjectDraftTitleEditor({
  valueObjectId,
}: ValueObjectDraftTitleEditorProps) {
  const [title, setTitle] = useState("");
  const [initialTitle, setInitialTitle] = useState("");
  const [usageScope, setUsageScope] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const trimmedTitle = useMemo(() => title.trim(), [title]);
  const hasTitleChanged = trimmedTitle !== initialTitle.trim();

  useEffect(() => {
    let isMounted = true;

    async function loadDraft() {
      setIsLoading(true);
      setErrorMessage("");
      setMessage("");

      try {
        const response = await fetch(`/api/value-objects/${valueObjectId}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        });

        const data = (await response.json()) as ValueObjectDraftResponse;

        if (!response.ok || !data.ok || !data.valueObject) {
          throw new Error(data.error ?? "Не удалось загрузить черновик.");
        }

        const loadedTitle = data.valueObject.title ?? "";

        if (!isMounted) {
          return;
        }

        setTitle(loadedTitle);
        setInitialTitle(loadedTitle);
        setUsageScope(data.valueObject.usage_scope ?? null);
        setStatus(data.valueObject.status ?? null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(getErrorMessage(error));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDraft();

    return () => {
      isMounted = false;
    };
  }, [valueObjectId]);

  async function saveTitle() {
    setErrorMessage("");
    setMessage("");

    if (!trimmedTitle) {
      setErrorMessage("Введите название ценного объекта.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/value-objects/${valueObjectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          title: trimmedTitle,
        }),
      });

      const data = (await response.json()) as PatchDraftResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Не удалось сохранить название.");
      }

      const savedTitle = data.valueObject?.title ?? trimmedTitle;

      setTitle(savedTitle);
      setInitialTitle(savedTitle);
      setMessage("Название сохранено.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-[18px] border border-[#dfe6ff] bg-white p-5 shadow-[0_8px_24px_rgba(59,110,248,0.07)]">
      <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#3b6ef8]">
        Edit draft title
      </div>

      <h2 className="mt-2 text-[22px] font-bold tracking-[-0.02em] text-[#111827]">
        Название ценного объекта
      </h2>

      <p className="mt-2 text-[14px] leading-6 text-[#5a5f7a]">
        После выбора частного или коммерческого объекта ты можешь сразу
        переименовать созданный черновик. Сохраняется только поле{" "}
        <span className="font-mono text-[#1a1d2e]">title</span>.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-[#edf0f7] bg-[#f8fafc] p-4">
          <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
            value_object_id
          </div>
          <div className="mt-1 break-all font-mono text-[13px] font-semibold text-[#1a1d2e]">
            {valueObjectId}
          </div>
        </div>

        <div className="rounded-2xl border border-[#edf0f7] bg-[#f8fafc] p-4">
          <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
            usage_scope
          </div>
          <div className="mt-1 font-mono text-[13px] font-semibold text-[#1a1d2e]">
            {usageScope ?? "loading"}
          </div>
        </div>

        <div className="rounded-2xl border border-[#edf0f7] bg-[#f8fafc] p-4">
          <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
            status
          </div>
          <div className="mt-1 font-mono text-[13px] font-semibold text-[#1a1d2e]">
            {status ?? "loading"}
          </div>
        </div>
      </div>

      <label className="mt-5 block text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c8099]">
        Название
      </label>

      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        disabled={isLoading || isSaving}
        placeholder="Например: Организм"
        className="mt-2 w-full rounded-xl border border-[#dfe3f1] bg-white px-4 py-3 text-[15px] font-semibold text-[#1a1d2e] outline-none transition placeholder:text-[#9aa1b8] focus:border-[#3b6ef8] focus:ring-4 focus:ring-[#3b6ef8]/10 disabled:cursor-not-allowed disabled:bg-[#f8fafc] disabled:text-[#7c8099]"
      />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[13px] leading-5 text-[#5a5f7a]">
          {isLoading
            ? "Загружаем черновик..."
            : hasTitleChanged
              ? "Есть несохранённое изменение названия."
              : "Название синхронизировано с черновиком."}
        </div>

        <button
          type="button"
          onClick={() => void saveTitle()}
          disabled={isLoading || isSaving || !hasTitleChanged}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#3b6ef8] px-5 py-3 text-[14px] font-bold text-white shadow-[0_10px_22px_rgba(59,110,248,0.22)] transition hover:bg-[#315bd0] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Сохраняем..." : "Сохранить название"}
        </button>
      </div>

      {(errorMessage || message) && (
        <div
          className={
            errorMessage
              ? "mt-4 rounded-2xl border border-[#ffd5d5] bg-[#fff7f7] p-4 text-[13px] font-semibold text-[#b42318]"
              : "mt-4 rounded-2xl border border-[#c9f2d4] bg-[#f4fff7] p-4 text-[13px] font-semibold text-[#16713b]"
          }
        >
          {errorMessage || message}
        </div>
      )}
    </section>
  );
}