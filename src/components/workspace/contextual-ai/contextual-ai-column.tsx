"use client";

import { useState, type FormEvent } from "react";
import {
  Activity,
  HelpCircle,
  Plus,
  Send,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

import { UserSessionMiniStatus } from "../../auth/user-session-client";
import type { ContextualAIColumnProps } from "./contextual-ai.types";

type WorkspaceMessage = {
  id: number;
  role: "ai" | "user" | "insight" | "rec" | "activity" | "error";
  text: string;
};

type ApiTestResponse = {
  reply?: string;
  error?: string;
};

const INITIAL_WORKSPACE_MESSAGES: WorkspaceMessage[] = [
  { id: 1, role: "ai", text: "Привет! 👋" },
  {
    id: 2,
    role: "insight",
    text: "Workspace сейчас работает как pilot shell: данные только preview, без скрытых записей.",
  },
  {
    id: 3,
    role: "rec",
    text: "Начните с ввода одной реальной активности. После проверки preview можно будет подключать gated save-flow.",
  },
];

const QUICK_COMMANDS = [
  { label: "Записать активность", icon: Activity },
  { label: "Слабое направление", icon: Target },
  { label: "Добавить метрику", icon: Plus },
  { label: "Открыть аналитику", icon: TrendingUp },
];

const ACTIVITY_EXAMPLES = [
  "25 минут немецкий: упражнения по B2B-переговорам",
  "8 подтягиваний и 8 отжиманий на брусьях",
  "40 минут анализировал продажи одноразовой посуды",
];

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
    throw new Error("Нужно войти в аккаунт, чтобы получить ответ ИИ. Откройте /auth/login.");
  }

  throw new Error(data.error || "Ошибка ответа сервера.");
  }

  return data.reply || data.error || "Ответ пустой.";
}

function ActivityComposer({
  onSubmit,
}: {
  readonly onSubmit: (text: string) => void;
}) {
  const [activityText, setActivityText] = useState("");

  function submitActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedText = activityText.trim();

    if (!trimmedText) {
      return;
    }

    onSubmit(trimmedText);
    setActivityText("");
  }

  return (
    <section className="rounded-xl border border-[#3b6ef8]/15 bg-gradient-to-br from-[#eef2ff] to-[#f5f0ff] p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Activity size={12} className="text-[#3b6ef8]" />
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#3b6ef8]">
          Ввод активности
        </span>
      </div>

      <p className="mb-2 text-[12px] leading-relaxed text-[#3d3657]">
        Пилотное поле в AI-полосе. Пока это local preview: без DB write, без
        OpenAI call и без создания Activity Event.
      </p>

      <form onSubmit={submitActivity} className="space-y-2">
        <textarea
          value={activityText}
          onChange={(event) => setActivityText(event.target.value)}
          placeholder="Например: 25 минут немецкий, 8 подтягиваний, звонок клиенту..."
          className="min-h-[84px] w-full resize-none rounded-xl border border-[rgba(0,0,0,0.07)] bg-white px-3 py-2 text-[12.5px] leading-relaxed text-[#1a1d2e] placeholder-[#b0b4c8] transition-all focus:border-[#3b6ef8] focus:outline-none"
        />

        <div className="flex gap-1.5">
          <button
            type="submit"
            className="flex-1 rounded-lg bg-[#3b6ef8] px-3 py-2 text-[11.5px] font-semibold text-white transition-colors hover:bg-[#2c5df0]"
          >
            Разобрать
          </button>
          <button
            type="button"
            onClick={() => setActivityText("")}
            className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-2 text-[11.5px] font-semibold text-[#5a5f7a] transition-colors hover:bg-[#f5f6fb]"
          >
            Очистить
          </button>
        </div>
      </form>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {ACTIVITY_EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setActivityText(example)}
            className="rounded-full border border-[#3b6ef8]/15 bg-white px-2 py-1 text-[10px] font-medium text-[#5a5f7a] transition-all hover:border-[#3b6ef8]/30 hover:text-[#3b6ef8]"
          >
            {example}
          </button>
        ))}
      </div>
    </section>
  );
}

export function ContextualAIColumn({ className }: ContextualAIColumnProps) {
  const [messages, setMessages] = useState<WorkspaceMessage[]>(
    INITIAL_WORKSPACE_MESSAGES,
  );
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const rootClassName = className
    ? `min-h-0 flex-col overflow-hidden border border-[rgba(0,0,0,0.07)] bg-white ${className}`
    : "flex min-h-0 flex-col overflow-hidden border border-[rgba(0,0,0,0.07)] bg-white";

  function addActivityPreview(activityText: string) {
    setMessages((previousMessages) => [
      ...previousMessages,
      { id: Date.now(), role: "activity", text: activityText },
      {
        id: Date.now() + 1,
        role: "ai",
        text: "Активность принята как local preview. Следующий gate — подключение к Activity Capture review-flow.",
      },
    ]);
  }

  async function sendMessage() {
    const trimmedInput = input.trim();

    if (!trimmedInput || isSending) {
      return;
    }

    const userMessageId = Date.now();
    const assistantMessageId = userMessageId + 1;

    setMessages((previousMessages) => [
      ...previousMessages,
      { id: userMessageId, role: "user", text: trimmedInput },
      { id: assistantMessageId, role: "ai", text: "Анализирую запрос в pilot mode..." },
    ]);
    setInput("");
    setIsSending(true);

    try {
      const reply = await askLegacyAi(trimmedInput);

      setMessages((previousMessages) =>
        previousMessages.map((message) =>
          message.id === assistantMessageId
            ? { ...message, role: "ai", text: reply }
            : message,
        ),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Не удалось получить ответ ИИ.";

      setMessages((previousMessages) =>
        previousMessages.map((message) =>
          message.id === assistantMessageId
            ? { ...message, role: "error", text: errorMessage }
            : message,
        ),
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <aside className={rootClassName} aria-label="Workspace AI navigator">
      <div className="border-b border-[rgba(0,0,0,0.06)] px-4 pb-3 pt-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#3b6ef8]">
            <Sparkles size={14} className="text-white" />
          </div>

          <div>
            <div className="text-[14px] font-bold leading-none text-[#1a1d2e]">
              AI-Навигатор
            </div>
            <div className="mt-0.5 text-[10.5px] leading-none text-[#9ca3b8]">
              Workspace pilot assistant
            </div>
            <UserSessionMiniStatus className="mt-1" />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
            <span className="text-[10px] font-medium text-[#22c55e]">Онлайн</span>
          </div>
        </div>
      </div>

      <div className="scrollbar-hide flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
        <ActivityComposer onSubmit={addActivityPreview} />

        {messages.map((message) => {
          if (message.role === "user") {
            return (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#3b6ef8] px-3 py-2 text-[12px] leading-relaxed text-white">
                  {message.text}
                </div>
              </div>
            );
          }

          if (message.role === "error") {
            return (
              <div key={message.id} className="rounded-xl border border-red-200 bg-red-50 p-3">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <HelpCircle size={11} className="text-red-600" />
                  <span className="text-[10.5px] font-semibold uppercase tracking-wide text-red-600">
                    Ошибка ИИ
                  </span>
                </div>
                <p className="text-[12px] leading-relaxed text-red-700">
                  {message.text}
                </p>
                {message.text.includes("Нужно войти") ? (
                  <a
                    href="/auth/login"
                    className="mt-2 inline-flex rounded-lg bg-red-600 px-3 py-1.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-red-700"
                  >
                    Войти
                  </a>
                ) : null}
              </div>
            );
          }

          if (message.role === "activity") {
            return (
              <div
                key={message.id}
                className="rounded-xl border border-[#3b6ef8]/15 bg-[#eef2ff] p-3"
              >
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Activity size={11} className="text-[#3b6ef8]" />
                  <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#3b6ef8]">
                    Activity preview
                  </span>
                </div>
                <p className="text-[12px] leading-relaxed text-[#2d3047]">
                  {message.text}
                </p>
              </div>
            );
          }

          if (message.role === "insight") {
            return (
              <div
                key={message.id}
                className="rounded-xl border border-[#8b5cf6]/15 bg-gradient-to-br from-[#eef2ff] to-[#f5f0ff] p-3"
              >
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Sparkles size={11} className="text-[#8b5cf6]" />
                  <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#8b5cf6]">
                    Контекст
                  </span>
                </div>
                <p className="text-[12px] leading-relaxed text-[#3d3657]">
                  {message.text}
                </p>
              </div>
            );
          }

          if (message.role === "rec") {
            return (
              <div
                key={message.id}
                className="rounded-xl border border-[#22c55e]/20 bg-gradient-to-br from-[#f0fff4] to-[#f0fdf9] p-3"
              >
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Target size={11} className="text-[#22c55e]" />
                  <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#22c55e]">
                    Рекомендация
                  </span>
                </div>
                <p className="text-[12px] leading-relaxed text-[#1a3d2e]">
                  {message.text}
                </p>
              </div>
            );
          }

          return (
            <div key={message.id} className="flex gap-2">
              <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#3b6ef8]">
                <Sparkles size={9} className="text-white" />
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-[#f5f6fb] px-3 py-2 text-[12px] leading-relaxed text-[#2d3047]">
                {message.text}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-3 pb-2">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#b0b4c8]">
          Быстрые команды
        </p>

        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_COMMANDS.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-transparent bg-[#f5f6fb] px-2.5 py-2 text-left text-[11px] font-medium text-[#5a5f7a] transition-all hover:border-[#3b6ef8]/15 hover:bg-[#eef2ff] hover:text-[#3b6ef8]"
            >
              <Icon size={11} />
              <span className="leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 pb-4 pt-1">
        <div className="flex items-center gap-2 rounded-xl border border-[rgba(0,0,0,0.07)] bg-[#f5f6fb] px-3 py-2.5 transition-all focus-within:border-[#3b6ef8] focus-within:bg-white">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void sendMessage();
              }
            }}
            placeholder="Напишите сообщение..."
            className="flex-1 bg-transparent text-[12.5px] text-[#1a1d2e] placeholder-[#b0b4c8] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              void sendMessage();
            }}
            disabled={isSending}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-[#3b6ef8] transition-colors hover:bg-[#2c5df0] disabled:opacity-50"
          >
            <Send size={11} className="text-white" />
          </button>
        </div>
      </div>
    </aside>
  );
}




