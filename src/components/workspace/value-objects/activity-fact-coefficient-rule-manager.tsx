"use client";

import { useEffect, useMemo, useState } from "react";

type Rule = {
  id: string;
  targetParameterCode: string;
  sourceValueObjectId: string;
  sourceValueObjectTitle: string;
  sourceParameterCode: string;
  conditionOperator: string;
  conditionNumericValue: number | null;
  conditionTextValue: string | null;
  conditionBooleanValue: boolean | null;
  multiplier: number;
  priority: number;
  status: string;
};

type SelectorItem = {
  id: string;
  title: string;
  pathText?: string;
  level?: string;
};

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  throw new Error("Secure UUID generation is unavailable.");
}

function ruleCondition(rule: Rule) {
  if (rule.conditionOperator === "text_eq") {
    return `= “${rule.conditionTextValue ?? ""}”`;
  }
  if (rule.conditionOperator === "boolean_eq") {
    return `= ${String(rule.conditionBooleanValue)}`;
  }

  const operators: Record<string, string> = {
    lt: "<",
    lte: "≤",
    numeric_eq: "=",
    gte: "≥",
    gt: ">",
  };

  return `${operators[rule.conditionOperator] ?? rule.conditionOperator} ${
    rule.conditionNumericValue ?? "?"
  }`;
}

export function ActivityFactCoefficientRuleManager({
  valueObjectId,
}: {
  readonly valueObjectId: string;
}) {
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState<Rule[]>([]);
  const [query, setQuery] = useState("");
  const [sourceObjects, setSourceObjects] = useState<SelectorItem[]>([]);
  const [sourceObjectsQuery, setSourceObjectsQuery] = useState("");
  const [sourceObject, setSourceObject] = useState<SelectorItem | null>(null);

  const [targetParameterCode, setTargetParameterCode] = useState("duration");
  const [sourceParameterCode, setSourceParameterCode] = useState("");
  const [conditionOperator, setConditionOperator] = useState("lt");
  const [conditionNumericValue, setConditionNumericValue] = useState("");
  const [conditionTextValue, setConditionTextValue] = useState("");
  const [conditionBooleanValue, setConditionBooleanValue] = useState("true");
  const [multiplier, setMultiplier] = useState("1");
  const [priority, setPriority] = useState("1000");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadRules() {
    const params = new URLSearchParams({
      targetValueObjectId: valueObjectId,
    });

    const response = await fetch(
      `/api/activity-fact-coefficient-rules?${params.toString()}`,
      {
        credentials: "same-origin",
        cache: "no-store",
      },
    );

    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; rules?: Rule[]; error?: string }
      | null;

    if (!response.ok || payload?.ok !== true) {
      throw new Error(
        payload?.error || `Coefficient rule read failed: ${response.status}`,
      );
    }

    setRules(payload.rules ?? []);
  }

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (!open || normalizedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setError(null);

      try {
        const params = new URLSearchParams({
          q: normalizedQuery,
          level: "leaf",
          limit: "30",
          includeGlobal: "1",
        });

        const response = await fetch(
          `/api/value-objects/selector?${params.toString()}`,
          {
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const payload = (await response.json().catch(() => null)) as
          | {
              ok?: boolean;
              valueObjects?: SelectorItem[];
              error?: string;
            }
          | null;

        if (!response.ok || payload?.ok !== true) {
          throw new Error(
            payload?.error || `Value Object search failed: ${response.status}`,
          );
        }

        setSourceObjects(
          (payload.valueObjects ?? []).filter(
            (item) =>
              item.level === "leaf" && item.id !== valueObjectId,
          ),
        );
        setSourceObjectsQuery(normalizedQuery);
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Value Object search failed.",
          );
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, valueObjectId]);

  const visibleSourceObjects =
    open &&
    sourceObjectsQuery === query.trim() &&
    query.trim().length >= 2
      ? sourceObjects
      : [];

  const activeRules = useMemo(
    () => rules.filter((rule) => rule.status === "active"),
    [rules],
  );

  async function saveRule() {
    const targetCode = targetParameterCode.trim().toLowerCase();
    const sourceCode = sourceParameterCode.trim().toLowerCase();
    const multiplierValue = Number(multiplier);
    const priorityValue = Number(priority);

    if (!/^[a-z][a-z0-9_]{0,79}$/.test(targetCode)) {
      setError(
        "Target parameter code must use lowercase Latin letters, digits and underscores.",
      );
      return;
    }

    if (!/^[a-z][a-z0-9_]{0,79}$/.test(sourceCode)) {
      setError(
        "Source parameter code must use lowercase Latin letters, digits and underscores.",
      );
      return;
    }

    if (!sourceObject) {
      setError("Choose a source leaf Object.");
      return;
    }

    if (!Number.isFinite(multiplierValue)) {
      setError("Multiplier must be numeric.");
      return;
    }

    if (!Number.isInteger(priorityValue) || priorityValue < 1) {
      setError("Priority must be a positive integer.");
      return;
    }

    const isNumeric = [
      "lt",
      "lte",
      "numeric_eq",
      "gte",
      "gt",
    ].includes(conditionOperator);

    const numericCondition = isNumeric
      ? Number(conditionNumericValue)
      : null;

    if (isNumeric && !Number.isFinite(numericCondition)) {
      setError("Numeric condition value is required.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/activity-fact-coefficient-rules",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            clientRuleId: uuid(),
            targetValueObjectId: valueObjectId,
            targetParameterCode: targetCode,
            sourceValueObjectId: sourceObject.id,
            sourceParameterCode: sourceCode,
            conditionOperator,
            conditionNumericValue: isNumeric
              ? numericCondition
              : null,
            conditionTextValue:
              conditionOperator === "text_eq"
                ? conditionTextValue.trim()
                : null,
            conditionBooleanValue:
              conditionOperator === "boolean_eq"
                ? conditionBooleanValue === "true"
                : null,
            multiplier: multiplierValue,
            priority: priorityValue,
          }),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || payload?.ok !== true) {
        throw new Error(
          payload?.error || `Coefficient rule save failed: ${response.status}`,
        );
      }

      setMessage(
        "Rule saved. If the source context is missing or the condition does not match, the multiplier is 1. Matching rules multiply.",
      );
      await loadRules();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save rule.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function retireRule(ruleId: string) {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/activity-fact-coefficient-rules",
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ ruleId }),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || payload?.ok !== true) {
        throw new Error(
          payload?.error || `Coefficient rule retire failed: ${response.status}`,
        );
      }

      await loadRules();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not retire rule.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }

          setOpen(true);
          void loadRules().catch((caught) =>
            setError(
              caught instanceof Error ? caught.message : "Could not load rules.",
            ),
          );
        }}
      >
        <span>
          <span className="block text-sm font-bold text-violet-950">
            Коэффициенты фактов этого листа
          </span>
          <span className="mt-1 block text-xs leading-5 text-violet-800">
            Здесь нет списка «разрешённых фактических параметров». Любой
            выявленный показатель может получить тег этого листа. Эти правила
            только изменяют его числовое значение перед записью факта.
          </span>
        </span>
        <span className="text-lg text-violet-700">
          {open ? "−" : "+"}
        </span>
      </button>

      {open ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-violet-200 bg-white p-3 text-xs leading-5 text-slate-600">
            Нет правила → ×1. Контекст не найден → ×1. Условие не
            сработало → ×1. Если одновременно сработало несколько правил,
            коэффициенты перемножаются.
          </div>

          {activeRules.length > 0 ? (
            <div className="space-y-2">
              {activeRules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <p className="text-sm font-semibold text-slate-950">
                    {rule.targetParameterCode}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    if {rule.sourceValueObjectTitle} →{" "}
                    {rule.sourceParameterCode} {ruleCondition(rule)} then ×
                    {rule.multiplier}
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    className="mt-2 text-xs font-semibold text-red-700 disabled:opacity-50"
                    onClick={() => void retireRule(rule.id)}
                  >
                    Удалить правило
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Активных коэффициентов пока нет.
            </p>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs font-semibold text-slate-700">
              Параметр факта, который пересчитываем
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                value={targetParameterCode}
                onChange={(event) =>
                  setTargetParameterCode(event.target.value)
                }
                placeholder="duration"
              />
            </label>

            <label className="text-xs font-semibold text-slate-700">
              Найти контекстный лист
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Сон, Термическая обработка, Погода…"
              />
            </label>
          </div>

          {visibleSourceObjects.length > 0 ? (
            <div className="max-h-48 overflow-auto rounded-xl border border-slate-200 bg-white p-1">
              {visibleSourceObjects.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-slate-100"
                  onClick={() => {
                    setSourceObject(item);
                    setQuery("");
                    setSourceObjects([]);
                  }}
                >
                  <b>{item.title}</b>
                  {item.pathText ? (
                    <span className="block text-slate-500">
                      {item.pathText}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}

          {sourceObject ? (
            <p className="text-xs text-violet-800">
              Контекст: {sourceObject.title}
            </p>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs font-semibold text-slate-700">
              Параметр контекстного факта
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                value={sourceParameterCode}
                onChange={(event) =>
                  setSourceParameterCode(event.target.value)
                }
                placeholder="duration, temperature, vitamin_c…"
              />
            </label>

            <label className="text-xs font-semibold text-slate-700">
              Условие
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                value={conditionOperator}
                onChange={(event) =>
                  setConditionOperator(event.target.value)
                }
              >
                <option value="lt">&lt;</option>
                <option value="lte">≤</option>
                <option value="numeric_eq">= число</option>
                <option value="gte">≥</option>
                <option value="gt">&gt;</option>
                <option value="text_eq">= текст</option>
                <option value="boolean_eq">= да/нет</option>
              </select>
            </label>

            {[
              "lt",
              "lte",
              "numeric_eq",
              "gte",
              "gt",
            ].includes(conditionOperator) ? (
              <label className="text-xs font-semibold text-slate-700">
                Значение условия
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  value={conditionNumericValue}
                  onChange={(event) =>
                    setConditionNumericValue(event.target.value)
                  }
                />
              </label>
            ) : null}

            {conditionOperator === "text_eq" ? (
              <label className="text-xs font-semibold text-slate-700">
                Текст условия
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  value={conditionTextValue}
                  onChange={(event) =>
                    setConditionTextValue(event.target.value)
                  }
                />
              </label>
            ) : null}

            {conditionOperator === "boolean_eq" ? (
              <label className="text-xs font-semibold text-slate-700">
                Логическое значение
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  value={conditionBooleanValue}
                  onChange={(event) =>
                    setConditionBooleanValue(event.target.value)
                  }
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              </label>
            ) : null}

            <label className="text-xs font-semibold text-slate-700">
              Коэффициент
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                value={multiplier}
                onChange={(event) => setMultiplier(event.target.value)}
                placeholder="3"
              />
            </label>

            <label className="text-xs font-semibold text-slate-700">
              Приоритет
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
              />
            </label>
          </div>

          {error ? (
            <p className="text-xs text-red-700">{error}</p>
          ) : null}

          {message ? (
            <p className="text-xs text-emerald-700">{message}</p>
          ) : null}

          <button
            type="button"
            disabled={busy || !sourceObject}
            className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            onClick={() => void saveRule()}
          >
            {busy ? "Сохраняю…" : "Добавить коэффициент"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
