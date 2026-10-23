"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { LocaleCode } from "@/i18n";

type SavedProposal = {
  id: string;
  revision: number;
  status: string;
  created_at: string;
  linked_activities_at_request: number;
};
type LoadResponse = {
  ok?: boolean;
  error?: string;
  originalText?: string;
  languageCode?: string;
  updatedAt?: string;
  proposals?: SavedProposal[];
};
type Receipt = { id: string; revision: number; linked_activities: number; outcome: string };
const LABEL: Record<LocaleCode, {
  title: string; original: string; draft: string; save: string; warning: string; history: string; back: string; success: string; loading: string; apply: string; reviewImpact: string; applied: string;
}> = {
  ru: { title: "Редактор публикации", original: "Опубликованный оригинал", draft: "Предлагаемый текст", save: "Сохранить версию для проверки", warning: "Это предварительное изменение. Исходная публикация, связанные активности и факты не меняются. Применение после проверки зависимостей — отдельный шаг.", history: "Предложения и версии", back: "Вернуться в ленту", success: "Предложение сохранено. Исходная публикация не изменена.", loading: "Загрузка…", apply: "Применить эту ревизию", reviewImpact: "Понимаю: связанные коммерческие активности требуют проверки, старый сигнал нельзя повторно обработать", applied: "Публикация обновлена. Связанные активности ожидают проверки куратора." },
  pl: { title: "Edytor publikacji", original: "Oryginalna publikacja", draft: "Proponowany tekst", save: "Zapisz wersję do weryfikacji", warning: "To propozycja zmiany. Opublikowany tekst, powiązane aktywności i fakty pozostają bez zmian.", history: "Propozycje i wersje", back: "Powrót do aktualności", success: "Propozycja zapisana. Publikacja nie została zmieniona.", loading: "Ładowanie…", apply: "Zastosuj tę wersję", reviewImpact: "Rozumiem: powiązane aktywności wymagają ponownej kontroli; starego sygnału nie należy uruchamiać ponownie", applied: "Publikacja zmieniona. Powiązane aktywności wymagają kontroli." },
  uk: { title: "Редактор публікації", original: "Опублікований оригінал", draft: "Запропонований текст", save: "Зберегти версію для перевірки", warning: "Це пропозиція зміни. Оригінал, пов'язані активності та факти не змінюються.", history: "Пропозиції та версії", back: "До стрічки", success: "Пропозицію збережено. Публікацію не змінено.", loading: "Завантаження…", apply: "Застосувати цю версію", reviewImpact: "Розумію: пов'язані активності потребують перевірки, старий сигнал не можна повторно обробляти", applied: "Публікацію оновлено. Пов'язані активності потребують перевірки." },
  en: { title: "Publication editor", original: "Published original", draft: "Proposed text", save: "Save version for review", warning: "This is a proposed edit. The live publication, related activities and facts remain unchanged.", history: "Proposals and revisions", back: "Back to feed", success: "Proposal saved. Publication unchanged.", loading: "Loading…", apply: "Apply selected revision", reviewImpact: "I understand that linked commercial activities require review and old signal analysis must not be retried", applied: "Publication updated. Linked commercial activities require curator review." },
  de: { title: "Beitrag bearbeiten", original: "Veröffentlichter Originaltext", draft: "Vorgeschlagener Text", save: "Version zur Prüfung speichern", warning: "Dies ist ein Änderungsvorschlag. Beitrag, verknüpfte Aktivitäten und Fakten bleiben unverändert.", history: "Vorschläge und Versionen", back: "Zurück zum Feed", success: "Vorschlag gespeichert. Beitrag unverändert.", loading: "Laden…", apply: "Version übernehmen", reviewImpact: "Verstanden: verbundene Aktivitäten müssen geprüft werden; altes Signal nicht erneut verarbeiten", applied: "Beitrag aktualisiert. Verbundene Aktivitäten müssen geprüft werden." },
  es: { title: "Editar publicación", original: "Original publicado", draft: "Texto propuesto", save: "Guardar versión para revisión", warning: "Es una propuesta de cambio. La publicación, las actividades vinculadas y los hechos no cambian.", history: "Propuestas y versiones", back: "Volver al feed", success: "Propuesta guardada. Publicación sin cambios.", loading: "Cargando…", apply: "Aplicar esta versión", reviewImpact: "Entiendo: las actividades vinculadas requieren revisión y no se debe reprocesar la señal anterior", applied: "Publicación actualizada. Las actividades vinculadas requieren revisión." },
  cs: { title: "Editor příspěvku", original: "Publikovaný originál", draft: "Navržený text", save: "Uložit verzi ke kontrole", warning: "Toto je návrh změny. Původní příspěvek, související aktivity a fakta zůstávají beze změny.", history: "Návrhy a verze", back: "Zpět na příspěvky", success: "Návrh uložen. Příspěvek se nezměnil.", loading: "Načítání…", apply: "Použít tuto verzi", reviewImpact: "Rozumím: související aktivity vyžadují kontrolu; starý signál nelze znovu zpracovat", applied: "Příspěvek aktualizován. Související aktivity vyžadují kontrolu." },
};

export default function PublicationEditClient({ id, locale }: { id: string; locale: LocaleCode }) {
  const t = LABEL[locale];
  const [source, setSource] = useState<LoadResponse | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [confirmReview, setConfirmReview] = useState(false);
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyNotice, setApplyNotice] = useState("");
  const [rebuildState, setRebuildState] = useState<{ appliedEdits: { id: string; proposal_id: string; requires_commercial_rebuild: boolean }[]; jobs: { id: string; applied_edit_id: string; status: string; activity_event_id: string | null }[] } | null>(null);
  const [rebuildConfirm, setRebuildConfirm] = useState(false);
  const [rebuildBusy, setRebuildBusy] = useState(false);
  const [rebuildNotice, setRebuildNotice] = useState("");
  useEffect(() => {
    let alive = true;
    fetch(`/api/publications/${encodeURIComponent(id)}/edit`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as LoadResponse;
        if (!response.ok || !result.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
        return result;
      })
      .then((result) => { if (alive) { setSource(result); setDraft(result.originalText ?? ""); } })
      .catch((error: unknown) => { if (alive) setLoadError(error instanceof Error ? error.message : "LOAD_FAILED"); });
    fetch(`/api/publications/${encodeURIComponent(id)}/rebuild`, { cache: "no-store" })
      .then(async response => { const payload = await response.json(); return response.ok && payload.ok ? payload : null; })
      .then(payload => { if (alive && payload) setRebuildState(payload); })
      .catch(() => null);
    return () => { alive = false; };
  }, [id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !source?.updatedAt) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/publications/${encodeURIComponent(id)}/edit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentText: draft, expectedUpdatedAt: source.updatedAt }),
      });
      const result = await response.json() as { ok?: boolean; error?: string; receipt?: Receipt };
      if (!response.ok || !result.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
      setReceipt(result.receipt ?? null);
      setNotice(t.success);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "SAVE_FAILED");
    } finally {
      setBusy(false);
    }
  }

  async function rebuildAppliedRevision(appliedEditId: string) {
    if (rebuildBusy || !rebuildConfirm) return;
    setRebuildBusy(true);
    setRebuildNotice("");
    try {
      const response = await fetch(`/api/publications/${encodeURIComponent(id)}/rebuild`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ appliedEditId, confirmRevisionRebuild: true }),
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
      setRebuildNotice(locale === "pl" ? "Nowy sygnał RAW i aktywność utworzone; analiza wymaga osobnej kontroli." : "Новые RAW-сигнал и активность созданы; анализ требует отдельного подтверждения.");
      setRebuildConfirm(false);
      const state = await fetch(`/api/publications/${encodeURIComponent(id)}/rebuild`, { cache: "no-store" });
      const payload = await state.json();
      if (state.ok && payload.ok) setRebuildState(payload);
    } catch (error) { setRebuildNotice(error instanceof Error ? error.message : "REBUILD_FAILED"); }
    finally { setRebuildBusy(false); }
  }

  async function applyRevision(proposalId: string) {
    if (applyBusy || !confirmReview) return;
    setApplyBusy(true);
    setApplyNotice("");
    try {
      const response = await fetch(`/api/publications/${encodeURIComponent(id)}/apply`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ proposalId, confirmCommercialReview: true }),
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
      setApplyNotice(t.applied);
      setConfirmReview(false);
      const fresh = await fetch(`/api/publications/${encodeURIComponent(id)}/edit`, { cache: "no-store" });
      const state = await fresh.json() as LoadResponse;
      if (fresh.ok && state.ok) { setSource(state); setDraft(state.originalText ?? ""); }
    } catch (error) { setApplyNotice(error instanceof Error ? error.message : "APPLY_FAILED"); }
    finally { setApplyBusy(false); }
  }

  return (
    <main className="mx-auto max-w-[780px] px-4 py-6 text-[#273047]">
      <Link href={`/feed?locale=${locale}`} className="text-sm text-blue-600 underline">← {t.back}</Link>
      <h1 className="mb-2 mt-4 text-2xl font-bold">{t.title}</h1>
      <p role="note" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">{t.warning}</p>
      {loadError ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{loadError}</p> : null}
      {!source && !loadError ? <p role="status">{t.loading}</p> : null}
      {source?.ok ? (
        <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-white p-5">
          <div><label className="mb-1 block text-sm font-semibold">{t.original}</label>
            <div className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">{source.originalText}</div></div>
          <div><label htmlFor="p36b2-proposed-text" className="mb-1 block text-sm font-semibold">{t.draft}</label>
            <textarea id="p36b2-proposed-text" value={draft} maxLength={5000} onChange={event => setDraft(event.target.value)} rows={8} className="w-full rounded-lg border p-3 text-sm" /></div>
          <button type="submit" disabled={busy || !draft.trim() || draft.trim() === source.originalText} className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{t.save}</button>
          {notice ? <p role="status" className="text-sm">{notice}</p> : null}
          {receipt ? <p className="text-xs">ID {receipt.id} · v{receipt.revision} · linked activities: {receipt.linked_activities} · {receipt.outcome}</p> : null}
          <h2 className="pt-4 font-semibold">{t.history}</h2>
          <label className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm"><input type="checkbox" checked={confirmReview} onChange={event => setConfirmReview(event.target.checked)} />{t.reviewImpact}</label>
          {applyNotice ? <p role="status" className="text-sm">{applyNotice}</p> : null}
          <ul className="space-y-2 text-sm">{(source.proposals ?? []).map(p => <li key={p.id} className="rounded-lg border p-2">v{p.revision} · {p.status} · {new Date(p.created_at).toLocaleString(locale)} · {p.linked_activities_at_request}<button type="button" disabled={!confirmReview || applyBusy || p.status === "applied"} onClick={() => void applyRevision(p.id)} className="ml-3 rounded-md border border-blue-600 px-3 py-2 text-blue-700 disabled:opacity-40">{t.apply}</button></li>)}</ul>
          {rebuildState?.appliedEdits.filter(a => a.requires_commercial_rebuild).map(a => {
            const existing = rebuildState.jobs.find(j => j.applied_edit_id === a.id);
            return <div key={a.id} className="rounded-lg border border-amber-300 p-3 text-sm">
              <p className="font-semibold">{locale === "pl" ? "Odtworzenie z zatwierdzonej wersji" : "Пересоздание по применённой версии"} · {a.id.slice(0,8)}</p>
              {existing ? <p>RAW / activity: {existing.status} · {existing.activity_event_id ?? "—"}</p> : <>
                <label className="my-2 flex gap-2"><input type="checkbox" checked={rebuildConfirm} onChange={e => setRebuildConfirm(e.target.checked)} />{locale === "pl" ? "Potwierdzam utworzenie nowego sygnału RAW bez analizy i bez zapisu faktów." : "Подтверждаю создание нового RAW-сигнала без анализа и записи фактов."}</label>
                <button type="button" disabled={!rebuildConfirm || rebuildBusy} onClick={() => void rebuildAppliedRevision(a.id)} className="rounded border border-amber-600 px-3 py-2 disabled:opacity-40">{locale === "pl" ? "Utwórz nowy sygnał i aktywność" : "Создать новый RAW-сигнал и активность"}</button>
              </>}
            </div>;
          })}
          {rebuildNotice ? <p role="status">{rebuildNotice}</p> : null}
        </form>
      ) : null}
    </main>
  );
}
