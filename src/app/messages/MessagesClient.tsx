"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, Send } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

type LocaleKey = "en" | "pl" | "uk" | "ru" | "de" | "es" | "cs";

type Conversation = {
  counterpart_actor_id: string;
  counterpart_profile_id: string | null;
  counterpart_public_slug: string | null;
  counterpart_display_name: string | null;
  counterpart_image_url: string | null;
  counterpart_profile_updated_at: string | null;
  last_message_id: string;
  last_message_text: string | null;
  last_message_at: string;
  last_message_is_outgoing: boolean;
};

type ThreadMessage = {
  message_object_id: string;
  author_actor_id: string;
  content_text: string | null;
  language_code: string | null;
  activated_at: string | null;
  created_at: string;
  is_outgoing: boolean;
};

type Counterpart = {
  actorId: string;
  profileId: string;
  publicSlug: string;
  displayName: string;
  imageUrl: string | null;
  updatedAt: string;
};

type Copy = {
  title: string;
  subtitle: string;
  conversations: string;
  empty: string;
  select: string;
  loading: string;
  loadError: string;
  placeholder: string;
  send: string;
  sending: string;
  signIn: string;
  outgoingPrefix: string;
  openProfile: string;
};

const COPY: Record<LocaleKey, Copy> = {
  en: {
    title: "Messages",
    subtitle: "Private conversations between ARCTor profiles.",
    conversations: "Conversations",
    empty: "No private conversations yet.",
    select: "Select a conversation or write from a public profile.",
    loading: "Loading…",
    loadError: "Messages could not be loaded.",
    placeholder: "Write a private message…",
    send: "Send",
    sending: "Sending…",
    signIn: "Sign in to send messages.",
    outgoingPrefix: "You: ",
    openProfile: "Open profile",
  },
  pl: {
    title: "Wiadomości",
    subtitle: "Prywatne rozmowy między profilami ARCTor.",
    conversations: "Rozmowy",
    empty: "Nie masz jeszcze prywatnych rozmów.",
    select: "Wybierz rozmowę albo napisz z profilu publicznego.",
    loading: "Ładowanie…",
    loadError: "Nie udało się wczytać wiadomości.",
    placeholder: "Napisz prywatną wiadomość…",
    send: "Wyślij",
    sending: "Wysyłanie…",
    signIn: "Zaloguj się, aby wysyłać wiadomości.",
    outgoingPrefix: "Ty: ",
    openProfile: "Otwórz profil",
  },
  uk: {
    title: "Повідомлення",
    subtitle: "Приватні розмови між профілями ARCTor.",
    conversations: "Розмови",
    empty: "Приватних розмов поки немає.",
    select: "Виберіть розмову або напишіть із публічного профілю.",
    loading: "Завантаження…",
    loadError: "Не вдалося завантажити повідомлення.",
    placeholder: "Напишіть приватне повідомлення…",
    send: "Надіслати",
    sending: "Надсилання…",
    signIn: "Увійдіть, щоб надсилати повідомлення.",
    outgoingPrefix: "Ви: ",
    openProfile: "Відкрити профіль",
  },
  ru: {
    title: "Сообщения",
    subtitle: "Личные диалоги между профилями ARCTor.",
    conversations: "Диалоги",
    empty: "Личных диалогов пока нет.",
    select: "Выберите диалог или напишите с публичного профиля.",
    loading: "Загрузка…",
    loadError: "Не удалось загрузить сообщения.",
    placeholder: "Напишите личное сообщение…",
    send: "Отправить",
    sending: "Отправка…",
    signIn: "Войдите, чтобы отправлять сообщения.",
    outgoingPrefix: "Вы: ",
    openProfile: "Открыть профиль",
  },
  de: {
    title: "Nachrichten",
    subtitle: "Private Gespräche zwischen ARCTor-Profilen.",
    conversations: "Unterhaltungen",
    empty: "Noch keine privaten Unterhaltungen.",
    select: "Wähle eine Unterhaltung oder schreibe von einem öffentlichen Profil.",
    loading: "Laden…",
    loadError: "Nachrichten konnten nicht geladen werden.",
    placeholder: "Private Nachricht schreiben…",
    send: "Senden",
    sending: "Wird gesendet…",
    signIn: "Melde dich an, um Nachrichten zu senden.",
    outgoingPrefix: "Du: ",
    openProfile: "Profil öffnen",
  },
  es: {
    title: "Mensajes",
    subtitle: "Conversaciones privadas entre perfiles de ARCTor.",
    conversations: "Conversaciones",
    empty: "Todavía no hay conversaciones privadas.",
    select: "Selecciona una conversación o escribe desde un perfil público.",
    loading: "Cargando…",
    loadError: "No se pudieron cargar los mensajes.",
    placeholder: "Escribe un mensaje privado…",
    send: "Enviar",
    sending: "Enviando…",
    signIn: "Inicia sesión para enviar mensajes.",
    outgoingPrefix: "Tú: ",
    openProfile: "Abrir perfil",
  },
  cs: {
    title: "Zprávy",
    subtitle: "Soukromé konverzace mezi profily ARCTor.",
    conversations: "Konverzace",
    empty: "Zatím žádné soukromé konverzace.",
    select: "Vyberte konverzaci nebo napište z veřejného profilu.",
    loading: "Načítání…",
    loadError: "Zprávy se nepodařilo načíst.",
    placeholder: "Napište soukromou zprávu…",
    send: "Odeslat",
    sending: "Odesílání…",
    signIn: "Přihlaste se pro odesílání zpráv.",
    outgoingPrefix: "Vy: ",
    openProfile: "Otevřít profil",
  },
};

function getLocale(value: string): LocaleKey {
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

function withLocale(pathname: string, locale: LocaleKey) {
  return locale === "en"
    ? pathname
    : `${pathname}${pathname.includes("?") ? "&" : "?"}locale=${encodeURIComponent(locale)}`;
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

function initials(value: string | null) {
  const text = value?.trim() ?? "";

  if (!text) return "?";

  const words = text.split(/\s+/).filter(Boolean);

  return (
    words.length >= 2
      ? `${words[0][0] ?? ""}${words[1][0] ?? ""}`
      : text.slice(0, 2)
  ).toUpperCase();
}

async function requestConversations(): Promise<Conversation[]> {
  const response = await fetch("/api/direct-messages", {
    method: "GET",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; conversations?: Conversation[]; error?: string }
    | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error ?? `HTTP_${response.status}`);
  }

  return Array.isArray(payload.conversations) ? payload.conversations : [];
}

async function requestThread(actorId: string): Promise<{
  counterpart: Counterpart;
  messages: ThreadMessage[];
}> {
  const response = await fetch(
    `/api/direct-messages?counterpartActorId=${encodeURIComponent(actorId)}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
  const payload = (await response.json().catch(() => null)) as
    | {
        ok?: boolean;
        counterpart?: Counterpart;
        messages?: ThreadMessage[];
        error?: string;
      }
    | null;

  if (!response.ok || !payload?.ok || !payload.counterpart) {
    throw new Error(payload?.error ?? `HTTP_${response.status}`);
  }

  return {
    counterpart: payload.counterpart,
    messages: Array.isArray(payload.messages) ? payload.messages : [],
  };
}

export default function MessagesClient({ locale }: { locale: string }) {
  const normalizedLocale = getLocale(locale);
  const copy = COPY[normalizedLocale];
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedActorId = searchParams.get("to");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedActorId, setSelectedActorId] = useState<string | null>(
    requestedActorId,
  );
  const [counterpart, setCounterpart] = useState<Counterpart | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [contentText, setContentText] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(
    Boolean(requestedActorId),
  );
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void requestConversations()
      .then((items) => {
        if (cancelled) return;
        setConversations(items);
        setLoadingList(false);
      })
      .catch(() => {
        if (cancelled) return;
        setErrorMessage(copy.loadError);
        setLoadingList(false);
      });

    return () => {
      cancelled = true;
    };
  }, [copy.loadError]);

  useEffect(() => {
    if (!selectedActorId) return;

    let cancelled = false;
    const actorId = selectedActorId;

    void requestThread(actorId)
      .then((payload) => {
        if (cancelled) return;
        setCounterpart(payload.counterpart);
        setMessages(payload.messages);
        setLoadingThread(false);
      })
      .catch(() => {
        if (cancelled) return;
        setCounterpart(null);
        setMessages([]);
        setErrorMessage(copy.loadError);
        setLoadingThread(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedActorId, copy.loadError]);

  function selectConversation(actorId: string) {
    if (actorId === selectedActorId) return;

    setErrorMessage(null);
    setLoadingThread(true);
    setCounterpart(null);
    setMessages([]);
    setSelectedActorId(actorId);

    router.replace(
      withLocale(`/messages?to=${encodeURIComponent(actorId)}`, normalizedLocale),
      { scroll: false },
    );
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = contentText.trim();

    if (!selectedActorId || !text || sending) return;

    setSending(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/direct-messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          recipientActorId: selectedActorId,
          contentText: text,
          locale: normalizedLocale,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: ThreadMessage; error?: string }
        | null;

      if (!response.ok || !payload?.ok || !payload.message) {
        throw new Error(payload?.error ?? `HTTP_${response.status}`);
      }

      setMessages((current) => [...current, payload.message as ThreadMessage]);
      setContentText("");

      try {
        const refreshedConversations = await requestConversations();
        setConversations(refreshedConversations);
      } catch {
        // Message was sent successfully; the list can recover on page reload.
      }
    } catch {
      setErrorMessage(copy.loadError);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] p-4 sm:p-5">
      <div className="mb-4">
        <h1 className="text-[20px] font-bold text-[#1a1d2e]">{copy.title}</h1>
        <p className="mt-1 text-[12px] text-[#7c8099]">{copy.subtitle}</p>
      </div>

      {errorMessage ? (
        <div className="mb-3 rounded-xl border border-[#f3c7c7] bg-[#fff7f7] px-3 py-2 text-[11px] text-[#b42318]">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid min-h-[560px] grid-cols-1 overflow-hidden rounded-2xl border border-[#e1e5f0] bg-white shadow-sm lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-[#e7eaf4] lg:border-b-0 lg:border-r">
          <div className="border-b border-[#edf0f6] px-4 py-3 text-[12px] font-semibold text-[#4a4f6a]">
            {copy.conversations}
          </div>

          <div className="max-h-[300px] overflow-y-auto lg:max-h-[620px]">
            {loadingList ? (
              <div className="px-4 py-6 text-[12px] text-[#9ca3b8]">
                {copy.loading}
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-4 py-6 text-[12px] leading-5 text-[#9ca3b8]">
                {copy.empty}
              </div>
            ) : (
              conversations.map((conversation) => {
                const active =
                  conversation.counterpart_actor_id === selectedActorId;
                const name =
                  conversation.counterpart_display_name ?? "ARCTor";

                return (
                  <button
                    key={conversation.counterpart_actor_id}
                    type="button"
                    onClick={() =>
                      selectConversation(conversation.counterpart_actor_id)
                    }
                    className={`flex w-full items-start gap-3 border-b border-[#f1f2f6] px-3 py-3 text-left transition ${
                      active
                        ? "bg-[#eef2ff]"
                        : "bg-white hover:bg-[#f8f9fd]"
                    }`}
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#eef2ff] text-[10px] font-bold text-[#3b6ef8]">
                      {conversation.counterpart_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={conversation.counterpart_image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials(name)
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-semibold text-[#30354d]">
                        {name}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-[#7c8099]">
                        {conversation.last_message_is_outgoing
                          ? copy.outgoingPrefix
                          : ""}
                        {conversation.last_message_text ?? ""}
                      </div>
                      <div className="mt-1 text-[9.5px] text-[#b0b4c5]">
                        {formatTime(
                          conversation.last_message_at,
                          normalizedLocale,
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="flex min-h-[430px] min-w-0 flex-col">
          {!selectedActorId ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-[12px] text-[#9ca3b8]">
              <div>
                <MessageCircle
                  size={28}
                  className="mx-auto mb-3 text-[#c4cada]"
                />
                {copy.select}
              </div>
            </div>
          ) : loadingThread ? (
            <div className="flex flex-1 items-center justify-center text-[12px] text-[#9ca3b8]">
              {copy.loading}
            </div>
          ) : counterpart ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-[#edf0f6] px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-[#30354d]">
                    {counterpart.displayName}
                  </div>
                </div>
                {counterpart.publicSlug ? (
                  <Link
                    href={withLocale(
                      `/people/${encodeURIComponent(counterpart.publicSlug)}`,
                      normalizedLocale,
                    )}
                    className="flex-shrink-0 rounded-lg border border-[#dfe3f1] bg-white px-3 py-1.5 text-[10.5px] font-semibold text-[#5a5f7a] hover:bg-[#f8f9fd]"
                  >
                    {copy.openProfile}
                  </Link>
                ) : null}
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto bg-[#f8f9fd] px-3 py-4 sm:px-4">
                {messages.map((message) => (
                  <div
                    key={message.message_object_id}
                    className={`flex ${
                      message.is_outgoing ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[82%] rounded-2xl px-3 py-2 ${
                        message.is_outgoing
                          ? "bg-[#3b6ef8] text-white"
                          : "border border-[#e1e5f0] bg-white text-[#4a4f6a]"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words text-[12px] leading-5">
                        {message.content_text}
                      </p>
                      <div
                        className={`mt-1 text-[9px] ${
                          message.is_outgoing
                            ? "text-white/70"
                            : "text-[#a4a9b8]"
                        }`}
                      >
                        {formatTime(
                          message.activated_at ?? message.created_at,
                          normalizedLocale,
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <form
                onSubmit={sendMessage}
                className="border-t border-[#edf0f6] bg-white p-3"
              >
                <div className="flex items-end gap-2">
                  <textarea
                    value={contentText}
                    onChange={(event) => setContentText(event.target.value)}
                    rows={2}
                    maxLength={5000}
                    placeholder={copy.placeholder}
                    className="min-h-[52px] flex-1 resize-none rounded-xl border border-[#dfe3f1] bg-white px-3 py-2 text-[12px] leading-5 text-[#30354d] outline-none transition focus:border-[#9db3ff] focus:ring-2 focus:ring-[#eef2ff]"
                  />
                  <button
                    type="submit"
                    disabled={!contentText.trim() || sending}
                    className="flex h-[42px] items-center gap-1.5 rounded-xl bg-[#3b6ef8] px-3 text-[11px] font-semibold text-white transition hover:bg-[#315fd9] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send size={14} />
                    {sending ? copy.sending : copy.send}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-[12px] text-[#9ca3b8]">
              {copy.loadError}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
