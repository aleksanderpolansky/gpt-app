"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Send } from "lucide-react";

type LocaleKey = "en" | "pl" | "uk" | "ru" | "de" | "es" | "cs";

type Comment = {
  messageObjectId: string;
  authorActorId: string;
  author: {
    publicSlug: string | null;
    displayName: string;
    imageUrl: string | null;
    updatedAt: string | null;
  };
  contentText: string | null;
  languageCode: string | null;
  activatedAt: string | null;
  createdAt: string;
};

type Copy = {
  comments: string;
  hide: string;
  empty: string;
  placeholder: string;
  send: string;
  sending: string;
  loadError: string;
  signIn: string;
};

const COPY: Record<LocaleKey, Copy> = {
  en: {
    comments: "Comments",
    hide: "Hide comments",
    empty: "No comments yet.",
    placeholder: "Write a comment…",
    send: "Send",
    sending: "Sending…",
    loadError: "Comments could not be loaded.",
    signIn: "Sign in to comment.",
  },
  pl: {
    comments: "Komentarze",
    hide: "Ukryj komentarze",
    empty: "Brak komentarzy.",
    placeholder: "Napisz komentarz…",
    send: "Wyślij",
    sending: "Wysyłanie…",
    loadError: "Nie udało się wczytać komentarzy.",
    signIn: "Zaloguj się, aby komentować.",
  },
  uk: {
    comments: "Коментарі",
    hide: "Сховати коментарі",
    empty: "Коментарів ще немає.",
    placeholder: "Напишіть коментар…",
    send: "Надіслати",
    sending: "Надсилання…",
    loadError: "Не вдалося завантажити коментарі.",
    signIn: "Увійдіть, щоб коментувати.",
  },
  ru: {
    comments: "Комментарии",
    hide: "Скрыть комментарии",
    empty: "Комментариев пока нет.",
    placeholder: "Напишите комментарий…",
    send: "Отправить",
    sending: "Отправка…",
    loadError: "Не удалось загрузить комментарии.",
    signIn: "Войдите, чтобы комментировать.",
  },
  de: {
    comments: "Kommentare",
    hide: "Kommentare ausblenden",
    empty: "Noch keine Kommentare.",
    placeholder: "Kommentar schreiben…",
    send: "Senden",
    sending: "Wird gesendet…",
    loadError: "Kommentare konnten nicht geladen werden.",
    signIn: "Melde dich an, um zu kommentieren.",
  },
  es: {
    comments: "Comentarios",
    hide: "Ocultar comentarios",
    empty: "Todavía no hay comentarios.",
    placeholder: "Escribe un comentario…",
    send: "Enviar",
    sending: "Enviando…",
    loadError: "No se pudieron cargar los comentarios.",
    signIn: "Inicia sesión para comentar.",
  },
  cs: {
    comments: "Komentáře",
    hide: "Skrýt komentáře",
    empty: "Zatím žádné komentáře.",
    placeholder: "Napište komentář…",
    send: "Odeslat",
    sending: "Odesílání…",
    loadError: "Komentáře se nepodařilo načíst.",
    signIn: "Přihlaste se pro komentování.",
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

function formatTime(value: string, locale: LocaleKey) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(
    locale === "uk" ? "uk-UA" : locale === "en" ? "en-GB" : locale,
    {
      dateStyle: "short",
      timeStyle: "short",
    },
  ).format(date);
}

function withLocale(pathname: string, locale: LocaleKey) {
  return locale === "en"
    ? pathname
    : `${pathname}?locale=${encodeURIComponent(locale)}`;
}

function initials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }

  return (value.trim().slice(0, 2) || "?").toUpperCase();
}

export default function PublicationComments({
  messageObjectId,
  locale,
}: {
  messageObjectId: string;
  locale?: string;
}) {
  const normalizedLocale = getLocale(locale);
  const copy = COPY[normalizedLocale];

  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [contentText, setContentText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadComments() {
    if (loaded || loading) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/publications/${encodeURIComponent(messageObjectId)}/comments`,
        {
          method: "GET",
          cache: "no-store",
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; comments?: Comment[]; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? `HTTP_${response.status}`);
      }

      setComments(Array.isArray(payload.comments) ? payload.comments : []);
      setLoaded(true);
    } catch {
      setErrorMessage(copy.loadError);
    } finally {
      setLoading(false);
    }
  }

  async function toggleComments() {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (nextOpen) {
      await loadComments();
    }
  }

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = contentText.trim();

    if (!text || sending) return;

    setSending(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/publications/${encodeURIComponent(messageObjectId)}/comments`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            contentText: text,
            locale: normalizedLocale,
          }),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (response.status === 401) {
        setErrorMessage(copy.signIn);
        return;
      }

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? `HTTP_${response.status}`);
      }

      setContentText("");
      setLoaded(false);

      const refreshed = await fetch(
        `/api/publications/${encodeURIComponent(messageObjectId)}/comments`,
        {
          method: "GET",
          cache: "no-store",
        },
      );
      const refreshedPayload = (await refreshed.json().catch(() => null)) as
        | { ok?: boolean; comments?: Comment[] }
        | null;

      if (refreshed.ok && refreshedPayload?.ok) {
        setComments(
          Array.isArray(refreshedPayload.comments)
            ? refreshedPayload.comments
            : [],
        );
        setLoaded(true);
      }
    } catch {
      setErrorMessage(copy.loadError);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-3 border-t border-[#edf0f6] pt-2">
      <button
        type="button"
        onClick={() => void toggleComments()}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10.5px] font-semibold text-[#6f7690] transition hover:bg-[#f5f6fb] hover:text-[#3b6ef8]"
      >
        <MessageCircle size={13} />
        {open
          ? copy.hide
          : `${copy.comments}${loaded ? ` (${comments.length})` : ""}`}
      </button>

      {open ? (
        <div className="mt-2 space-y-2">
          {loading ? (
            <div className="px-1 py-2 text-[10.5px] text-[#9ca3b8]">…</div>
          ) : comments.length === 0 ? (
            <div className="px-1 py-1 text-[10.5px] text-[#9ca3b8]">
              {copy.empty}
            </div>
          ) : (
            comments.map((comment) => {
              const authorName = comment.author.displayName || "ARCTor";
              const authorBody = (
                <>
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#eef2ff] text-[9px] font-bold text-[#3b6ef8]">
                    {comment.author.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={comment.author.imageUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials(authorName)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-[10.5px] font-semibold text-[#3d435b]">
                        {authorName}
                      </span>
                      <span className="text-[9px] text-[#b0b4c5]">
                        {formatTime(
                          comment.activatedAt ?? comment.createdAt,
                          normalizedLocale,
                        )}
                      </span>
                    </div>
                    {comment.contentText ? (
                      <p className="mt-0.5 whitespace-pre-wrap break-words text-[11px] leading-5 text-[#60667d]">
                        {comment.contentText}
                      </p>
                    ) : null}
                  </div>
                </>
              );

              return comment.author.publicSlug ? (
                <Link
                  key={comment.messageObjectId}
                  href={withLocale(
                    `/people/${encodeURIComponent(comment.author.publicSlug)}`,
                    normalizedLocale,
                  )}
                  className="flex items-start gap-2 rounded-xl bg-[#f8f9fd] px-2.5 py-2 transition hover:bg-[#f3f5fb]"
                >
                  {authorBody}
                </Link>
              ) : (
                <div
                  key={comment.messageObjectId}
                  className="flex items-start gap-2 rounded-xl bg-[#f8f9fd] px-2.5 py-2"
                >
                  {authorBody}
                </div>
              );
            })
          )}

          <form onSubmit={submitComment} className="flex items-end gap-2 pt-1">
            <textarea
              value={contentText}
              onChange={(event) => setContentText(event.target.value)}
              maxLength={3000}
              rows={1}
              placeholder={copy.placeholder}
              className="min-h-[38px] flex-1 resize-none rounded-xl border border-[#dfe3f1] bg-white px-3 py-2 text-[11px] leading-5 text-[#30354d] outline-none transition focus:border-[#9db3ff] focus:ring-2 focus:ring-[#eef2ff]"
            />
            <button
              type="submit"
              disabled={!contentText.trim() || sending}
              className="flex h-[36px] items-center gap-1 rounded-xl bg-[#3b6ef8] px-2.5 text-[10.5px] font-semibold text-white transition hover:bg-[#315fd9] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={12} />
              {sending ? copy.sending : copy.send}
            </button>
          </form>

          {errorMessage ? (
            <div className="px-1 text-[10px] leading-4 text-[#b42318]">
              {errorMessage}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
