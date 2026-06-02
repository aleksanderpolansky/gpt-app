export const ACTIVITY_CAPTURE_VALIDATION_CREATED =
  "ACTIVITY_CAPTURE_VALIDATION_CREATED" as const;

export interface ActivityValidationMessagesProps {
  inputValue: string;
  hasPreview: boolean;
  categoryCount: number;
  valueObjectCount: number;
  privacyHintCount: number;
}

interface ValidationMessageItem {
  id: string;
  title: string;
  description: string;
  status: "ok" | "warning" | "info";
}

function createValidationMessages({
  inputValue,
  hasPreview,
  categoryCount,
  valueObjectCount,
  privacyHintCount,
}: ActivityValidationMessagesProps): ValidationMessageItem[] {
  const trimmedInput = inputValue.trim();
  const validationMessages: ValidationMessageItem[] = [
    {
      id: "minimum-length",
      title: "Minimum length",
      description:
        trimmedInput.length >= 3
          ? "Текст достаточно длинный для local preview."
          : "Нужно минимум 3 символа, чтобы создать local preview.",
      status: trimmedInput.length >= 3 ? "ok" : "warning",
    },
    {
      id: "local-only-boundary",
      title: "Local-only boundary",
      description:
        "Preview собирается только в React state. Activity Event ещё не создаётся.",
      status: "info",
    },
    {
      id: "no-persistence",
      title: "No persistence",
      description:
        "No persistence: данные не сохраняются, не отправляются и не пишутся в хранилище.",
      status: "info",
    },
    {
      id: "candidate-only-warning",
      title: "Candidate-only warning",
      description:
        hasPreview
          ? `Candidates ready: categories ${categoryCount}, Value Objects ${valueObjectCount}, privacy hints ${privacyHintCount}.`
          : "Candidates появятся только после local preview.",
      status: hasPreview ? "ok" : "info",
    },
    {
      id: "privacy-review",
      title: "Privacy review",
      description:
        privacyHintCount > 0
          ? "Privacy review needed: privacy hints найдены и требуют будущего подтверждения."
          : "Privacy review still required before any future save flow.",
      status: privacyHintCount > 0 ? "warning" : "info",
    },
  ];

  return validationMessages;
}

function getStatusLabel(status: ValidationMessageItem["status"]): string {
  if (status === "ok") {
    return "ok";
  }

  if (status === "warning") {
    return "warning";
  }

  return "info";
}

export function ActivityValidationMessages({
  inputValue,
  hasPreview,
  categoryCount,
  valueObjectCount,
  privacyHintCount,
}: ActivityValidationMessagesProps) {
  const validationMessages = createValidationMessages({
    inputValue,
    hasPreview,
    categoryCount,
    valueObjectCount,
    privacyHintCount,
  });

  return (
    <aside
      aria-labelledby="activity-validation-messages-title"
      className="rounded-xl border border-slate-200 bg-white p-4"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Validation and safety messages
          </p>

          <h3
            id="activity-validation-messages-title"
            className="mt-2 text-sm font-semibold text-slate-900"
          >
            Validation / safety
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Эти сообщения проверяют только локальный UI state. Они не являются
            серверной валидацией, privacy decision или разрешением на запись.
          </p>
        </div>

        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {validationMessages.length} checks
        </span>
      </div>

      <div className="mt-4 grid gap-2">
        {validationMessages.map((message) => (
          <div
            key={message.id}
            className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-900">
                {message.title}
              </p>

              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                {getStatusLabel(message.status)}
              </span>
            </div>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              {message.description}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
        Safety messages are local-only. Future save, review, privacy decision
        and Activity Event creation must stay behind separate explicit gates.
      </p>
    </aside>
  );
}
