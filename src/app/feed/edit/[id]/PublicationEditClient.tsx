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
  title: string; original: string; draft: string; save: string; warning: string; history: string; back: string; success: string; loading: string;
}> = {
  ru: { title: "Редактор публикации", original: "Опубликованный оригинал", draft: "Предлагаемый текст", save: "Сохранить версию для проверки", warning: "Это предварительное изменение. Исходная публикация, связанные активности и факты не меняются. Применение после проверки зависимостей — отдельный шаг.", history: "Предложения и версии", back: "Вернуться в ленту", success: "Предложение сохранено. Исходная публикация не изменена.", loading: "Загрузка…" },
  pl: { title: "Edytor publikacji", original: "Oryginalna publikacja", draft: "Proponowany tekst", save: "Zapisz wersję do weryfikacji", warning: "To propozycja zmiany. Opublikowany tekst, powiązane aktywności i fakty pozostają bez zmian.", history: "Propozycje i wersje", back: "Powrót do aktualności", success: "Propozycja zapisana. Publikacja nie została zmieniona.", loading: "Ładowanie…" },
  uk: { title: "Редактор публікації", original: "Опублікований оригінал", draft: "Запропонований текст", save: "Зберегти версію для перевірки", warning: "Це пропозиція зміни. Оригінал, пов'язані активності та факти не змінюються.", history: "Пропозиції та версії", back: "До стрічки", success: "Пропозицію збережено. Публікацію не змінено.", loading: "Завантаження…" },
  en: { title: "Publication editor", original: "Published original", draft: "Proposed text", save: "Save version for review", warning: "This is a proposed edit. The live publication, related activities and facts remain unchanged.", history: "Proposals and revisions", back: "Back to feed", success: "Proposal saved. Publication unchanged.", loading: "Loading…" },
  de: { title: "Beitrag bearbeiten", original: "Veröffentlichter Originaltext", draft: "Vorgeschlagener Text", save: "Version zur Prüfung speichern", warning: "Dies ist ein Änderungsvorschlag. Beitrag, verknüpfte Aktivitäten und Fakten bleiben unverändert.", history: "Vorschläge und Versionen", back: "Zurück zum Feed", success: "Vorschlag gespeichert. Beitrag unverändert.", loading: "Laden…" },
  es: { title: "Editar publicación", original: "Original publicado", draft: "Texto propuesto", save: "Guardar versión para revisión", warning: "Es una propuesta de cambio. La publicación, las actividades vinculadas y los hechos no cambian.", history: "Propuestas y versiones", back: "Volver al feed", success: "Propuesta guardada. Publicación sin cambios.", loading: "Cargando…" },
  cs: { title: "Editor příspěvku", original: "Publikovaný originál", draft: "Navržený text", save: "Uložit verzi ke kontrole", warning: "Toto je návrh změny. Původní příspěvek, související aktivity a fakta zůstávají beze změny.", history: "Návrhy a verze", back: "Zpět na příspěvky", success: "Návrh uložen. Příspěvek se nezměnil.", loading: "Načítání…" },
};

export default function PublicationEditClient({ id, locale }: { id: string; locale: LocaleCode }) {
  const t = LABEL[locale];
  const [source, setSource] = useState<LoadResponse | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
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
          <ul className="space-y-2 text-sm">{(source.proposals ?? []).map(p => <li key={p.id} className="rounded-lg border p-2">v{p.revision} · {p.status} · {new Date(p.created_at).toLocaleString(locale)} · {p.linked_activities_at_request}</li>)}</ul>
        </form>
      ) : null}
    </main>
  );
}
