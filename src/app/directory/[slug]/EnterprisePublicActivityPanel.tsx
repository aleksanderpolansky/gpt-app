"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

import type { PublicEnterpriseMessage } from "@/lib/messages/enterpriseMessages.server";

type LocaleKey = "en" | "pl" | "uk" | "ru" | "de" | "es" | "cs";

type Copy = {
  composerTitle: string;
  placeholder: string;
  publish: string;
  publishing: string;
  published: string;
  empty: string;
  loadError: string;
  sourceLabel: string;
};

const COPY: Record<LocaleKey, Copy> = {
  en: {
    composerTitle: "New publication",
    placeholder: "Write an update for your public profile...",
    publish: "Publish",
    publishing: "Publishing...",
    published: "Published.",
    empty: "No public activity yet.",
    loadError: "Public activity could not be loaded.",
    sourceLabel: "ARCTor",
  },
  pl: {
    composerTitle: "Nowa publikacja",
    placeholder: "Napisz aktualizację do profilu publicznego...",
    publish: "Opublikuj",
    publishing: "Publikowanie...",
    published: "Opublikowano.",
    empty: "Brak publicznej aktywności.",
    loadError: "Nie udało się wczytać aktywności publicznej.",
    sourceLabel: "ARCTor",
  },
  uk: {
    composerTitle: "Нова публікація",
    placeholder: "Напишіть оновлення для публічного профілю...",
    publish: "Опублікувати",
    publishing: "Публікація...",
    published: "Опубліковано.",
    empty: "Публічної активності ще немає.",
    loadError: "Не вдалося завантажити публічну активність.",
    sourceLabel: "ARCTor",
  },
  ru: {
    composerTitle: "Новая публикация",
    placeholder: "Напишите обновление для публичного профиля...",
    publish: "Опубликовать",
    publishing: "Публикация...",
    published: "Опубликовано.",
    empty: "Публичной активности пока нет.",
    loadError: "Не удалось загрузить публичную активность.",
    sourceLabel: "ARCTor",
  },
  de: {
    composerTitle: "Neue Veröffentlichung",
    placeholder: "Schreiben Sie ein Update für das öffentliche Profil...",
    publish: "Veröffentlichen",
    publishing: "Wird veröffentlicht...",
    published: "Veröffentlicht.",
    empty: "Noch keine öffentliche Aktivität.",
    loadError: "Öffentliche Aktivität konnte nicht geladen werden.",
    sourceLabel: "ARCTor",
  },
  es: {
    composerTitle: "Nueva publicación",
    placeholder: "Escribe una actualización para el perfil público...",
    publish: "Publicar",
    publishing: "Publicando...",
    published: "Publicado.",
    empty: "Todavía no hay actividad pública.",
    loadError: "No se pudo cargar la actividad pública.",
    sourceLabel: "ARCTor",
  },
  cs: {
    composerTitle: "Nová publikace",
    placeholder: "Napište aktualizaci pro veřejný profil...",
    publish: "Publikovat",
    publishing: "Publikování...",
    published: "Publikováno.",
    empty: "Zatím žádná veřejná aktivita.",
    loadError: "Veřejnou aktivitu se nepodařilo načíst.",
    sourceLabel: "ARCTor",
  },
};

function getLocale(value: string | undefined): LocaleKey {
  if (
    value === "pl" ||
    value === "uk" ||
    value === "ru" ||
    value === "de" ||
    value === "es" ||
    value === "cs"
  ) {
    return value;
  }

  return "en";
}

function getIntlLocale(locale: LocaleKey) {
  const map: Record<LocaleKey, string> = {
    en: "en-GB",
    pl: "pl-PL",
    uk: "uk-UA",
    ru: "ru-RU",
    de: "de-DE",
    es: "es-ES",
    cs: "cs-CZ",
  };

  return map[locale];
}

function formatPublishedAt(value: string, locale: LocaleKey) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

type Props = {
  organizationId: string;
  organizationName: string;
  locale?: string;
  canPublish: boolean;
  messages: PublicEnterpriseMessage[];
  errorMessage: string | null;
};

export default function EnterprisePublicActivityPanel({
  organizationId,
  organizationName,
  locale,
  canPublish,
  messages,
  errorMessage,
}: Props) {
  const router = useRouter();
  const normalizedLocale = getLocale(locale);
  const copy = COPY[normalizedLocale];

  const [contentText, setContentText] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const trimmedText = contentText.trim();

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedText || busy) {
      return;
    }

    setBusy(true);
    setSubmitError(null);
    setNotice(null);

    try {
      const response = await fetch(
        `/api/organizations/${encodeURIComponent(organizationId)}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contentText: trimmedText,
            locale: normalizedLocale,
          }),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
          }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.error ?? `Publication failed with HTTP ${response.status}.`,
        );
      }

      setContentText("");
      setNotice(copy.published);
      router.refresh();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Publication failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[140px]">
      {canPublish ? (
        <form
          onSubmit={publish}
          className="mb-4 rounded-xl border border-[#e2e6f3] bg-[#f8f9fd] p-3"
        >
          <div className="mb-2 text-[11px] font-semibold text-[#4a4f6a]">
            {copy.composerTitle}
          </div>

          <textarea
            value={contentText}
            onChange={(event) => setContentText(event.target.value)}
            maxLength={5000}
            rows={3}
            placeholder={copy.placeholder}
            className="w-full resize-y rounded-xl border border-[#dfe3f1] bg-white px-3 py-2 text-[12px] leading-5 text-[#33384f] outline-none transition placeholder:text-[#a4a9bd] focus:border-[#9db3ff] focus:ring-2 focus:ring-[#e7edff]"
          />

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[10px] text-[#9ca3b8]">
              {contentText.length}/5000
            </div>

            <button
              type="submit"
              disabled={!trimmedText || busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#3b6ef8] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#315fd8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {busy ? copy.publishing : copy.publish}
            </button>
          </div>

          {submitError ? (
            <p className="mt-2 text-[11px] leading-4 text-[#b42318]">
              {submitError}
            </p>
          ) : null}

          {notice ? (
            <p className="mt-2 text-[11px] leading-4 text-[#16803a]">
              {notice}
            </p>
          ) : null}
        </form>
      ) : null}

      {errorMessage ? (
        <p className="mb-3 rounded-lg bg-[#fff5f5] px-3 py-2 text-[11px] leading-4 text-[#b42318]">
          {copy.loadError}
        </p>
      ) : null}

      {messages.length === 0 ? (
        <div className="flex min-h-[96px] items-center justify-center rounded-xl bg-[#f8f9fd] px-4 text-center text-[12px] text-[#9ca3b8]">
          {copy.empty}
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((message) => (
            <article
              key={message.id}
              className="rounded-xl border border-[#e7eaf4] bg-white px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-[11px] font-semibold text-[#30354d]">
                  {organizationName}
                </span>
                <span className="text-[10px] text-[#9ca3b8]">
                  {copy.sourceLabel}
                </span>
                <span className="text-[10px] text-[#b0b4c5]">
                  {formatPublishedAt(message.publishedAt, normalizedLocale)}
                </span>
              </div>

              {message.title ? (
                <div className="mt-1.5 text-[12px] font-semibold text-[#30354d]">
                  {message.title}
                </div>
              ) : null}

              {message.contentText ? (
                <p className="mt-1 whitespace-pre-wrap break-words text-[12px] leading-5 text-[#5a5f7a]">
                  {message.contentText}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
