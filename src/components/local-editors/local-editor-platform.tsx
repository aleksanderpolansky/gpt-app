"use client";

import {
  Download,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Network,
  ShieldCheck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  formatLocalFileSize,
  getLocalEditorPolicy,
  LOCAL_EDITOR_PRIVACY_CONTRACT,
  type LocalEditorKind,
} from "@/lib/local-editors/local-editor-policy";
import {
  openLocalEditorFile,
  saveLocalEditorBlob,
} from "@/lib/local-editors/local-file-runtime";

type LocaleCode = "en" | "pl" | "ru" | "uk" | "de" | "es" | "cs";

type LocalCopy = {
  title: string;
  subtitle: string;
  localOnly: string;
  privacyTitle: string;
  privacyBody: string;
  memoryOnly: string;
  noUpload: string;
  noStorage: string;
  networkBlocked: string;
  document: string;
  spreadsheet: string;
  mindmap: string;
  open: string;
  saveCopy: string;
  clear: string;
  noFile: string;
  selected: string;
  cancelled: string;
  saved: string;
  nextStep: string;
  runtimeReady: string;
};

const EN_COPY: LocalCopy = {
  title: "Local editors",
  subtitle: "Documents, spreadsheets and mind maps that stay on this device.",
  localOnly: "Local only",
  privacyTitle: "File privacy boundary",
  privacyBody:
    "Opened files remain in browser memory. ARCTor does not upload or store their contents. Saving writes a copy back to your device.",
  memoryOnly: "Browser memory only while open",
  noUpload: "No document upload",
  noStorage: "No server or persistent browser storage",
  networkBlocked: "Document network connections blocked on this workspace",
  document: "Document",
  spreadsheet: "Spreadsheet",
  mindmap: "Mind map",
  open: "Open local file",
  saveCopy: "Save local copy",
  clear: "Clear from memory",
  noFile: "No file is held in browser memory.",
  selected: "Selected locally",
  cancelled: "File selection was cancelled.",
  saved: "Local copy saved.",
  nextStep: "Editor engine",
  runtimeReady: "Local file runtime ready; editing engine attaches in the next release.",
};

const RU_COPY: LocalCopy = {
  title: "Локальные редакторы",
  subtitle: "Документы, таблицы и мозговые карты, которые остаются на этом устройстве.",
  localOnly: "Только локально",
  privacyTitle: "Граница конфиденциальности файла",
  privacyBody:
    "Открытые файлы остаются в памяти браузера. ARCTor не загружает и не хранит их содержимое. Сохранение записывает копию обратно на устройство пользователя.",
  memoryOnly: "Только память браузера, пока файл открыт",
  noUpload: "Без загрузки документа",
  noStorage: "Без серверного и постоянного браузерного хранения",
  networkBlocked: "Сетевые соединения документа в этом рабочем пространстве заблокированы",
  document: "Документ",
  spreadsheet: "Электронная таблица",
  mindmap: "Мозговая карта",
  open: "Открыть локальный файл",
  saveCopy: "Сохранить локальную копию",
  clear: "Удалить из памяти",
  noFile: "В памяти браузера сейчас нет файла.",
  selected: "Выбран локально",
  cancelled: "Выбор файла отменён.",
  saved: "Локальная копия сохранена.",
  nextStep: "Движок редактора",
  runtimeReady: "Локальный файловый runtime готов; движок редактирования подключается следующим релизом.",
};

const COPY: Record<LocaleCode, LocalCopy> = {
  en: EN_COPY,
  pl: EN_COPY,
  ru: RU_COPY,
  uk: RU_COPY,
  de: EN_COPY,
  es: EN_COPY,
  cs: EN_COPY,
};

const EDITORS: Array<{
  kind: LocalEditorKind;
  icon: typeof FileText;
}> = [
  { kind: "document", icon: FileText },
  { kind: "spreadsheet", icon: FileSpreadsheet },
  { kind: "mindmap", icon: Network },
];

function readLocale(): LocaleCode {
  if (typeof window === "undefined") return "en";
  const value = new URLSearchParams(window.location.search).get("locale")?.toLowerCase();
  if (value === "ru" || value === "pl" || value === "uk" || value === "de" || value === "es" || value === "cs") {
    return value;
  }
  return "en";
}

function editorLabel(kind: LocalEditorKind, copy: LocalCopy): string {
  if (kind === "document") return copy.document;
  if (kind === "spreadsheet") return copy.spreadsheet;
  return copy.mindmap;
}

export function LocalEditorPlatform() {
  const [locale] = useState<LocaleCode>(() => readLocale());
  const copy = COPY[locale] ?? COPY.en;
  const [files, setFiles] = useState<Partial<Record<LocalEditorKind, File>>>({});
  const [busyKind, setBusyKind] = useState<LocalEditorKind | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const privacyItems = useMemo(
    () => [copy.memoryOnly, copy.noUpload, copy.noStorage, copy.networkBlocked],
    [copy],
  );

  async function openFile(kind: LocalEditorKind) {
    setBusyKind(kind);
    setMessage(null);
    setError(null);
    try {
      const file = await openLocalEditorFile(kind);
      if (!file) {
        setMessage(copy.cancelled);
        return;
      }
      setFiles((current) => ({ ...current, [kind]: file }));
      setMessage(`${copy.selected}: ${file.name}`);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : String(openError));
    } finally {
      setBusyKind(null);
    }
  }

  async function saveCopy(kind: LocalEditorKind) {
    const file = files[kind];
    if (!file) return;
    setBusyKind(kind);
    setMessage(null);
    setError(null);
    try {
      const result = await saveLocalEditorBlob({
        kind,
        blob: file,
        suggestedName: file.name,
      });
      if (result.status === "saved") setMessage(copy.saved);
      else setMessage(copy.cancelled);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setBusyKind(null);
    }
  }

  function clearFile(kind: LocalEditorKind) {
    setFiles((current) => {
      const next = { ...current };
      delete next[kind];
      return next;
    });
    setMessage(null);
    setError(null);
  }

  return (
    <main className="min-h-screen bg-[#f5f6fb] px-3 py-5 text-[#1a1d2e] sm:px-5">
      <div className="mx-auto grid w-full max-w-[1440px] gap-5">
        <section className="rounded-[28px] border border-black/[0.07] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-emerald-700">
                <ShieldCheck size={16} aria-hidden="true" />
                {copy.localOnly}
              </div>
              <h1 className="mt-4 text-[30px] font-bold tracking-tight text-[#111827] sm:text-[36px]">
                {copy.title}
              </h1>
              <p className="mt-2 max-w-[760px] text-[14px] leading-6 text-[#676d89]">
                {copy.subtitle}
              </p>
            </div>

            <div className="max-w-[620px] rounded-2xl border border-[#dfe7ff] bg-[#f7f9ff] p-4">
              <div className="text-[13px] font-bold text-[#243b78]">{copy.privacyTitle}</div>
              <p className="mt-2 text-[12px] leading-5 text-[#5a6484]">{copy.privacyBody}</p>
              <div className="mt-3 grid gap-1.5 text-[12px] text-[#39425d] sm:grid-cols-2">
                {privacyItems.map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {message ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] font-semibold text-emerald-700">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-3">
          {EDITORS.map(({ kind, icon: Icon }) => {
            const policy = getLocalEditorPolicy(kind);
            const file = files[kind];
            const busy = busyKind === kind;
            return (
              <article
                key={kind}
                className="flex min-h-[320px] flex-col rounded-[26px] border border-black/[0.07] bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#3b6ef8]">
                    <Icon size={24} aria-hidden="true" />
                  </div>
                  <div className="rounded-full bg-[#f3f4f8] px-3 py-1 text-[11px] font-bold text-[#68708b]">
                    {policy.extensions.join(" / ")}
                  </div>
                </div>

                <h2 className="mt-5 text-[21px] font-bold text-[#111827]">
                  {editorLabel(kind, copy)}
                </h2>
                <p className="mt-1 text-[12px] text-[#7a8099]">
                  {copy.nextStep}: {copy.runtimeReady}
                </p>

                <div className="mt-5 flex-1 rounded-2xl border border-dashed border-[#d9deec] bg-[#fafbfe] p-4">
                  {file ? (
                    <>
                      <div className="truncate text-[13px] font-bold text-[#252b42]" title={file.name}>
                        {file.name}
                      </div>
                      <div className="mt-1 text-[12px] text-[#767d97]">
                        {formatLocalFileSize(file.size)} · {copy.selected}
                      </div>
                    </>
                  ) : (
                    <div className="text-[12px] leading-5 text-[#7a8099]">{copy.noFile}</div>
                  )}
                </div>

                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    onClick={() => void openFile(kind)}
                    disabled={busy}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#3b6ef8] px-4 py-2 text-[13px] font-bold text-white transition hover:bg-[#315fdc] disabled:opacity-50"
                  >
                    <FolderOpen size={17} aria-hidden="true" />
                    {copy.open}
                  </button>
                  {file ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void saveCopy(kind)}
                        disabled={busy}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#dce2f2] bg-white px-3 py-2 text-[12px] font-bold text-[#3657b6] disabled:opacity-50"
                      >
                        <Download size={15} aria-hidden="true" />
                        {copy.saveCopy}
                      </button>
                      <button
                        type="button"
                        onClick={() => clearFile(kind)}
                        disabled={busy}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#e6e7ed] bg-white px-3 py-2 text-[12px] font-bold text-[#626983] disabled:opacity-50"
                      >
                        <X size={15} aria-hidden="true" />
                        {copy.clear}
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>

        <div className="text-center text-[11px] text-[#8a90a8]">
          serverUpload={String(LOCAL_EDITOR_PRIVACY_CONTRACT.serverUpload)} · serverStorage={String(LOCAL_EDITOR_PRIVACY_CONTRACT.serverStorage)} · browserPersistentStorage={String(LOCAL_EDITOR_PRIVACY_CONTRACT.browserPersistentStorage)}
        </div>
      </div>
    </main>
  );
}
