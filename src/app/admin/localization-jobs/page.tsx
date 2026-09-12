"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getLocaleSearchParam, type LocaleCode } from "@/i18n";

type JobState = "pending" | "retrying" | "blocked" | "complete";

type LocalizationJob = {
  id: string;
  title: string;
  description: string;
  state: JobState;
  missingLocales: string[];
  attemptCount: number;
  lastAttemptAt: string | null;
  nextAttemptAt: string | null;
  lastError: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type QueueResponse = {
  ok?: boolean;
  pendingCount?: number;
  jobs?: LocalizationJob[];
  error?: string;
};

const COPY: Record<LocaleCode, {
  title: string;
  subtitle: string;
  pending: string;
  object: string;
  state: string;
  missing: string;
  attempts: string;
  next: string;
  error: string;
  retry: string;
  retryAll: string;
  refresh: string;
  empty: string;
  loading: string;
  states: Record<JobState, string>;
}> = {
  en: { title: "Translations", subtitle: "System observation objects waiting for localization. Pending jobs remain in the queue until all required languages are complete.", pending: "waiting", object: "Object", state: "State", missing: "Missing languages", attempts: "Attempts", next: "Next attempt", error: "Last error", retry: "Retry now", retryAll: "Retry all", refresh: "Refresh", empty: "No unfinished translations.", loading: "Loading…", states: { pending: "Waiting", retrying: "Retrying", blocked: "Blocked", complete: "Complete" } },
  ru: { title: "Переводы", subtitle: "Системные объекты наблюдения, для которых перевод ещё не завершён. Задание остаётся в очереди до заполнения всех обязательных языков.", pending: "ожидают", object: "Объект", state: "Состояние", missing: "Не хватает языков", attempts: "Попытки", next: "Следующая попытка", error: "Последняя ошибка", retry: "Повторить сейчас", retryAll: "Повторить все", refresh: "Обновить", empty: "Незавершённых переводов нет.", loading: "Загрузка…", states: { pending: "Ожидает", retrying: "Повтор", blocked: "Заблокировано", complete: "Готово" } },
  pl: { title: "Tłumaczenia", subtitle: "Systemowe obiekty obserwacji oczekujące na pełną lokalizację. Zadanie pozostaje w kolejce do ukończenia wszystkich wymaganych języków.", pending: "oczekuje", object: "Obiekt", state: "Stan", missing: "Brakujące języki", attempts: "Próby", next: "Następna próba", error: "Ostatni błąd", retry: "Ponów teraz", retryAll: "Ponów wszystkie", refresh: "Odśwież", empty: "Brak niedokończonych tłumaczeń.", loading: "Ładowanie…", states: { pending: "Oczekuje", retrying: "Ponawianie", blocked: "Zablokowane", complete: "Gotowe" } },
  uk: { title: "Переклади", subtitle: "Системні об’єкти спостереження, для яких переклад ще не завершено. Завдання залишається в черзі до заповнення всіх обов’язкових мов.", pending: "очікують", object: "Об’єкт", state: "Стан", missing: "Бракує мов", attempts: "Спроби", next: "Наступна спроба", error: "Остання помилка", retry: "Повторити зараз", retryAll: "Повторити всі", refresh: "Оновити", empty: "Незавершених перекладів немає.", loading: "Завантаження…", states: { pending: "Очікує", retrying: "Повтор", blocked: "Заблоковано", complete: "Готово" } },
  de: { title: "Übersetzungen", subtitle: "System-Beobachtungsobjekte mit noch unvollständiger Lokalisierung. Aufgaben bleiben bis zur vollständigen Übersetzung in der Warteschlange.", pending: "offen", object: "Objekt", state: "Status", missing: "Fehlende Sprachen", attempts: "Versuche", next: "Nächster Versuch", error: "Letzter Fehler", retry: "Jetzt erneut versuchen", retryAll: "Alle erneut versuchen", refresh: "Aktualisieren", empty: "Keine unvollständigen Übersetzungen.", loading: "Laden…", states: { pending: "Wartet", retrying: "Wiederholung", blocked: "Blockiert", complete: "Fertig" } },
  es: { title: "Traducciones", subtitle: "Objetos de observación del sistema cuya localización aún no está completa. Las tareas permanecen en la cola hasta completar todos los idiomas obligatorios.", pending: "pendientes", object: "Objeto", state: "Estado", missing: "Idiomas faltantes", attempts: "Intentos", next: "Próximo intento", error: "Último error", retry: "Reintentar ahora", retryAll: "Reintentar todos", refresh: "Actualizar", empty: "No hay traducciones incompletas.", loading: "Cargando…", states: { pending: "Pendiente", retrying: "Reintentando", blocked: "Bloqueado", complete: "Completo" } },
  cs: { title: "Překlady", subtitle: "Systémové objekty pozorování s nedokončenou lokalizací. Úloha zůstává ve frontě, dokud nejsou hotové všechny povinné jazyky.", pending: "čekají", object: "Objekt", state: "Stav", missing: "Chybějící jazyky", attempts: "Pokusy", next: "Další pokus", error: "Poslední chyba", retry: "Zkusit znovu", retryAll: "Zkusit vše znovu", refresh: "Obnovit", empty: "Žádné nedokončené překlady.", loading: "Načítání…", states: { pending: "Čeká", retrying: "Opakování", blocked: "Blokováno", complete: "Hotovo" } },
};

function formatDate(value: string | null, locale: LocaleCode) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale === "uk" ? "uk-UA" : locale === "cs" ? "cs-CZ" : locale);
}

export default function AdminLocalizationJobsPage() {
  const [locale] = useState<LocaleCode>(() =>
    typeof window === "undefined"
      ? "en"
      : getLocaleSearchParam(new URLSearchParams(window.location.search)),
  );
  const [jobs, setJobs] = useState<LocalizationJob[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);


  const copy = useMemo(() => COPY[locale] ?? COPY.en, [locale]);

  const fetchQueue = useCallback(async (): Promise<QueueResponse> => {
    const response = await fetch("/api/admin/localization-jobs", {
      cache: "no-store",
    });
    const payload = (await response.json()) as QueueResponse;
    if (!response.ok || payload.ok !== true) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }
    return payload;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchQueue();
      setJobs(payload.jobs ?? []);
      setPendingCount(payload.pendingCount ?? 0);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [fetchQueue]);

  useEffect(() => {
    let cancelled = false;

    void fetchQueue()
      .then((payload) => {
        if (cancelled) return;
        setJobs(payload.jobs ?? []);
        setPendingCount(payload.pendingCount ?? 0);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchQueue]);

  async function retry(action: "retry_all" | "retry_one", valueObjectId?: string) {
    setBusyId(valueObjectId ?? "all");
    setError(null);
    try {
      const response = await fetch("/api/admin/localization-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, valueObjectId }),
      });
      const payload = (await response.json()) as QueueResponse;
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      await load();
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : String(retryError));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-[#e5e7f1] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-[#1a1d2e]">{copy.title}</h1>
              <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-xs font-semibold text-[#3b6ef8]">
                {pendingCount} {copy.pending}
              </span>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b7280]">{copy.subtitle}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg border border-[#d8dced] px-3 py-2 text-sm font-medium text-[#4a4f6a] hover:bg-[#f8f9fc]"
            >
              {copy.refresh}
            </button>
            <button type="button" disabled={busyId !== null || pendingCount === 0} onClick={() => void retry("retry_all")} className="rounded-lg bg-[#3b6ef8] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
              {copy.retryAll}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        {loading ? <p className="mt-6 text-sm text-[#7c8099]">{copy.loading}</p> : null}
        {!loading && jobs.length === 0 ? <p className="mt-6 text-sm text-[#6b7280]">{copy.empty}</p> : null}

        {!loading && jobs.length > 0 ? (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-[#8a8fa8]">
                  <th className="border-b border-[#eceef5] px-3 py-2">{copy.object}</th>
                  <th className="border-b border-[#eceef5] px-3 py-2">{copy.state}</th>
                  <th className="border-b border-[#eceef5] px-3 py-2">{copy.missing}</th>
                  <th className="border-b border-[#eceef5] px-3 py-2">{copy.attempts}</th>
                  <th className="border-b border-[#eceef5] px-3 py-2">{copy.next}</th>
                  <th className="border-b border-[#eceef5] px-3 py-2">{copy.error}</th>
                  <th className="border-b border-[#eceef5] px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="align-top">
                    <td className="border-b border-[#f0f1f6] px-3 py-3">
                      <div className="font-medium text-[#23263a]">{job.title}</div>
                      <div className="mt-1 max-w-[360px] truncate text-xs text-[#8a8fa8]" title={job.id}>{job.id}</div>
                    </td>
                    <td className="border-b border-[#f0f1f6] px-3 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${job.state === "blocked" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                        {copy.states[job.state]}
                      </span>
                    </td>
                    <td className="border-b border-[#f0f1f6] px-3 py-3 text-[#4a4f6a]">{job.missingLocales.join(", ") || "—"}</td>
                    <td className="border-b border-[#f0f1f6] px-3 py-3 text-[#4a4f6a]">{job.attemptCount}</td>
                    <td className="border-b border-[#f0f1f6] px-3 py-3 text-[#4a4f6a]">{formatDate(job.nextAttemptAt, locale)}</td>
                    <td className="border-b border-[#f0f1f6] px-3 py-3">
                      <div className="max-w-[420px] break-words text-xs text-[#6b7280]">{job.lastError || "—"}</div>
                    </td>
                    <td className="border-b border-[#f0f1f6] px-3 py-3 text-right">
                      <button type="button" disabled={busyId !== null} onClick={() => void retry("retry_one", job.id)} className="whitespace-nowrap rounded-lg border border-[#cfd5ea] px-3 py-1.5 text-xs font-semibold text-[#3b6ef8] hover:bg-[#f4f6ff] disabled:cursor-not-allowed disabled:opacity-50">
                        {copy.retry}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </main>
  );
}
