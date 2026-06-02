import type { PrivacyHint } from "./activity-capture-types";

export const PRIVACY_HINTS_PANEL_CREATED =
  "PRIVACY_HINTS_PANEL_CREATED" as const;

export interface PrivacyHintsPanelProps {
  privacyHints: PrivacyHint[];
}

function getPrivacyLevelLabel(privacyLevel: PrivacyHint["privacyLevel"]): string {
  if (privacyLevel === "public-safe") {
    return "public-safe";
  }

  if (privacyLevel === "organization") {
    return "organization";
  }

  if (privacyLevel === "sensitive") {
    return "sensitive";
  }

  return "private";
}

function getPrivacyLevelDescription(
  privacyLevel: PrivacyHint["privacyLevel"],
): string {
  if (privacyLevel === "sensitive") {
    return "Требует осторожности: возможны health, symptom или другие чувствительные сигналы.";
  }

  if (privacyLevel === "organization") {
    return "Может относиться к рабочему, коммерческому или организационному контексту.";
  }

  if (privacyLevel === "public-safe") {
    return "Обычно безопасно для публичного summary, если в тексте нет личных деталей.";
  }

  return "Личный контекст. Для MVP его лучше считать private.";
}

export function PrivacyHintsPanel({ privacyHints }: PrivacyHintsPanelProps) {
  const hasPrivacyHints = privacyHints.length > 0;

  return (
    <article
      aria-labelledby="privacy-hints-title"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Privacy hints
          </p>

          <h3
            id="privacy-hints-title"
            className="mt-2 text-lg font-semibold tracking-tight text-slate-950"
          >
            Privacy hints-кандидаты
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-600">
            Это локальные подсказки приватности. Они не являются privacy
            decision, не меняют доступы и не записываются в хранилище.
          </p>
        </div>

        <span className="w-fit rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          {privacyHints.length} hints
        </span>
      </div>

      {hasPrivacyHints ? (
        <div className="mt-4 grid gap-3">
          {privacyHints.map((hint) => (
            <div
              key={hint.id}
              className="rounded-xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {getPrivacyLevelLabel(hint.privacyLevel)}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {hint.reason}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {hint.domain}
                  </span>

                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {hint.privacyLevel}
                  </span>
                </div>
              </div>

              <div className="mt-3 rounded-lg bg-white px-3 py-2 text-xs leading-5 text-slate-500">
                {getPrivacyLevelDescription(hint.privacyLevel)}
              </div>

              <div className="mt-2 rounded-lg bg-white px-3 py-2 text-xs leading-5 text-slate-500">
                hintId: {hint.id}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">
            Privacy hints не найдены
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Локальные rules пока не предложили privacy hint. Это не означает,
            что данные можно публиковать автоматически.
          </p>
        </div>
      )}

      <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
        В UI-4 privacy output остаётся только hint. Реальные privacy decisions
        должны выполняться отдельным подтверждённым flow.
      </p>
    </article>
  );
}
