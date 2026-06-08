"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useUserSessionClient } from "../auth/user-session-client";

export type AiNavigatorMessageRole =
  | "ai"
  | "user"
  | "insight"
  | "rec"
  | "activity"
  | "error";

export type AiNavigatorMessage = {
  id: number;
  role: AiNavigatorMessageRole;
  text: string;
  createdAt: string;
};

type ApiTestResponse = {
  reply?: string;
  error?: string;
};

type AiNavigatorContextValue = {
  messages: AiNavigatorMessage[];
  input: string;
  isSending: boolean;
  setInput: (value: string) => void;
  sendMessage: (message?: string) => Promise<void>;
  addActivityPreview: (text: string) => void;
  clearHistory: () => void;
};

const AiNavigatorContext = createContext<AiNavigatorContextValue | null>(null);

const DEFAULT_MESSAGES: AiNavigatorMessage[] = [
  {
    id: 1,
    role: "ai",
    text: "Привет! Я AI-Навигатор. Могу помочь разобрать активность, подсказать следующий шаг или объяснить текущую страницу.",
    createdAt: new Date(0).toISOString(),
  },
];

export const UI_MINI_FIX_AI_NAVIGATOR_COMPACT_INITIAL_STATE =
  "UI_MINI_FIX_AI_NAVIGATOR_COMPACT_INITIAL_STATE" as const;

function safeStorageKey(email: string | null) {
  return `gpt-app:ai-navigator:v2-compact:${email || "guest"}`;
}

function readMessagesFromLocalStorage(storageKey: string): AiNavigatorMessage[] {
  try {
    const rawValue = window.localStorage.getItem(storageKey);

    if (!rawValue) {
      return DEFAULT_MESSAGES;
    }

    const parsed = JSON.parse(rawValue) as AiNavigatorMessage[];

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }

    return DEFAULT_MESSAGES;
  } catch {
    return DEFAULT_MESSAGES;
  }
}

async function askLegacyAi(message: string): Promise<string> {
  const response = await fetch("/api/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  let data: ApiTestResponse = {};

  try {
    data = (await response.json()) as ApiTestResponse;
  } catch {
    throw new Error("Сервер вернул ответ не в JSON-формате.");
  }

  if (!response.ok) {
    if (data.error === "Not authenticated") {
      throw new Error("Нужно войти в аккаунт, чтобы получить ответ ИИ.");
    }

    throw new Error(data.error || "Ошибка ответа сервера.");
  }

  return data.reply || data.error || "Ответ пустой.";
}

export function AiNavigatorProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const session = useUserSessionClient();
  const storageKey = safeStorageKey(session.email);
  const storageReadyRef = useRef(false);

  const [messages, setMessages] = useState<AiNavigatorMessage[]>(DEFAULT_MESSAGES);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (session.isLoading) {
      return;
    }

    storageReadyRef.current = false;

    const timeoutId = window.setTimeout(() => {
      setMessages(readMessagesFromLocalStorage(storageKey));
      storageReadyRef.current = true;
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [session.isLoading, storageKey]);

  useEffect(() => {
    if (!storageReadyRef.current) {
      return;
    }

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(messages.slice(-80)),
      );
    } catch {
      // localStorage may be unavailable. The in-memory session history remains active.
    }
  }, [messages, storageKey]);

  const addActivityPreview = useCallback((text: string) => {
    const trimmedText = text.trim();

    if (!trimmedText) {
      return;
    }

    const now = new Date().toISOString();
    const baseId = Date.now();

    setMessages((previousMessages) => [
      ...previousMessages,
      {
        id: baseId,
        role: "activity",
        text: trimmedText,
        createdAt: now,
      },
      {
        id: baseId + 1,
        role: "ai",
        text: "Активность принята как local preview. Следующий gate — подключение к Activity Capture review-flow.",
        createdAt: now,
      },
    ]);
  }, []);

  const sendMessage = useCallback(
    async (message?: string) => {
      const trimmedInput = (message ?? input).trim();

      if (!trimmedInput || isSending) {
        return;
      }

      const now = new Date().toISOString();
      const userMessageId = Date.now();
      const assistantMessageId = userMessageId + 1;

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          id: userMessageId,
          role: "user",
          text: trimmedInput,
          createdAt: now,
        },
        {
          id: assistantMessageId,
          role: "ai",
          text: "Анализирую запрос...",
          createdAt: now,
        },
      ]);

      setInput("");
      setIsSending(true);

      try {
        const reply = await askLegacyAi(trimmedInput);

        setMessages((previousMessages) =>
          previousMessages.map((messageItem) =>
            messageItem.id === assistantMessageId
              ? {
                  ...messageItem,
                  role: "ai",
                  text: reply,
                  createdAt: new Date().toISOString(),
                }
              : messageItem,
          ),
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Не удалось получить ответ ИИ.";

        setMessages((previousMessages) =>
          previousMessages.map((messageItem) =>
            messageItem.id === assistantMessageId
              ? {
                  ...messageItem,
                  role: "error",
                  text: errorMessage,
                  createdAt: new Date().toISOString(),
                }
              : messageItem,
          ),
        );
      } finally {
        setIsSending(false);
      }
    },
    [input, isSending],
  );

  const clearHistory = useCallback(() => {
    setMessages(DEFAULT_MESSAGES);

    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // localStorage may be unavailable.
    }
  }, [storageKey]);

  const value = useMemo<AiNavigatorContextValue>(
    () => ({
      messages,
      input,
      isSending,
      setInput,
      sendMessage,
      addActivityPreview,
      clearHistory,
    }),
    [
      addActivityPreview,
      clearHistory,
      input,
      isSending,
      messages,
      sendMessage,
      setInput,
    ],
  );

  return (
    <AiNavigatorContext.Provider value={value}>
      {children}
    </AiNavigatorContext.Provider>
  );
}

export function useAiNavigator() {
  const context = useContext(AiNavigatorContext);

  if (!context) {
    throw new Error("useAiNavigator must be used inside AiNavigatorProvider.");
  }

  return context;
}

