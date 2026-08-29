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
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import {
  activateLocalDocxPrivacyGuard,
  LocalDocxEditor,
  releaseLocalDocxPrivacyGuard,
} from "@/components/local-editors/local-docx-editor";
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

import { getLocaleSearchParam, type LocaleCode } from "@/i18n";

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
  openAnother: string;
  saveCopy: string;
  clear: string;
  noFile: string;
  selected: string;
  cancelled: string;
  saved: string;
  nextStep: string;
  runtimeReady: string;
  documentReady: string;
  discardWarning: string;
  unsaved: string;
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
  networkBlocked: "No ARCTor document-content API calls",
  document: "Document",
  spreadsheet: "Spreadsheet",
  mindmap: "Mind map",
  open: "Open local file",
  openAnother: "Open another file",
  saveCopy: "Save local copy",
  clear: "Clear from memory",
  noFile: "No file is held in browser memory.",
  selected: "Selected locally",
  cancelled: "File selection was cancelled.",
  saved: "Local copy saved.",
  nextStep: "Editor engine",
  runtimeReady: "Local file runtime ready; editing engine attaches in a later release.",
  documentReady: "DOCX editing engine active below.",
  discardWarning: "This document has unsaved changes. Discard them?",
  unsaved: "unsaved changes",
};

const PL_COPY: LocalCopy = {
  title: "Edytory lokalne",
  subtitle: "Dokumenty, arkusze i mapy myśli, które pozostają na tym urządzeniu.",
  localOnly: "Tylko lokalnie",
  privacyTitle: "Granica prywatności pliku",
  privacyBody:
    "Otwarte pliki pozostają w pamięci przeglądarki. ARCTor nie przesyła ani nie przechowuje ich zawartości. Zapis tworzy kopię na Twoim urządzeniu.",
  memoryOnly: "Tylko pamięć przeglądarki podczas otwarcia",
  noUpload: "Bez wysyłania dokumentu",
  noStorage: "Bez przechowywania na serwerze ani trwałego zapisu w przeglądarce",
  networkBlocked: "Bez wywołań API ARCTor z treścią dokumentu",
  document: "Dokument",
  spreadsheet: "Arkusz kalkulacyjny",
  mindmap: "Mapa myśli",
  open: "Otwórz plik lokalny",
  openAnother: "Otwórz inny plik",
  saveCopy: "Zapisz kopię lokalnie",
  clear: "Usuń z pamięci",
  noFile: "W pamięci przeglądarki nie ma teraz pliku.",
  selected: "Wybrano lokalnie",
  cancelled: "Anulowano wybór pliku.",
  saved: "Kopia lokalna została zapisana.",
  nextStep: "Silnik edytora",
  runtimeReady: "Lokalny moduł plików jest gotowy; silnik edycji zostanie podłączony w kolejnym wydaniu.",
  documentReady: "Edytor DOCX jest aktywny poniżej.",
  discardWarning: "Dokument zawiera niezapisane zmiany. Odrzucić je?",
  unsaved: "niezapisane zmiany",
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
  networkBlocked: "Без API-вызовов ARCTor с содержимым документа",
  document: "Документ",
  spreadsheet: "Электронная таблица",
  mindmap: "Мозговая карта",
  open: "Открыть локальный файл",
  openAnother: "Открыть другой файл",
  saveCopy: "Сохранить локальную копию",
  clear: "Удалить из памяти",
  noFile: "В памяти браузера сейчас нет файла.",
  selected: "Выбран локально",
  cancelled: "Выбор файла отменён.",
  saved: "Локальная копия сохранена.",
  nextStep: "Движок редактора",
  runtimeReady: "Локальный файловый runtime готов; движок редактирования подключается следующим релизом.",
  documentReady: "DOCX-редактор активен ниже.",
  discardWarning: "В документе есть несохранённые изменения. Отбросить их?",
  unsaved: "несохранённые изменения",
};

const UK_COPY: LocalCopy = {
  title: "Локальні редактори",
  subtitle: "Документи, таблиці та мапи думок, які залишаються на цьому пристрої.",
  localOnly: "Лише локально",
  privacyTitle: "Межа конфіденційності файла",
  privacyBody:
    "Відкриті файли залишаються в пам’яті браузера. ARCTor не завантажує і не зберігає їхній вміст. Збереження записує копію назад на пристрій користувача.",
  memoryOnly: "Лише пам’ять браузера, поки файл відкрито",
  noUpload: "Без завантаження документа",
  noStorage: "Без серверного та постійного браузерного зберігання",
  networkBlocked: "Без API-викликів ARCTor із вмістом документа",
  document: "Документ",
  spreadsheet: "Електронна таблиця",
  mindmap: "Мапа думок",
  open: "Відкрити локальний файл",
  openAnother: "Відкрити інший файл",
  saveCopy: "Зберегти локальну копію",
  clear: "Видалити з пам’яті",
  noFile: "У пам’яті браузера зараз немає файла.",
  selected: "Вибрано локально",
  cancelled: "Вибір файла скасовано.",
  saved: "Локальну копію збережено.",
  nextStep: "Рушій редактора",
  runtimeReady: "Локальний файловий runtime готовий; рушій редагування буде підключено в наступному релізі.",
  documentReady: "DOCX-редактор активний нижче.",
  discardWarning: "У документі є незбережені зміни. Відкинути їх?",
  unsaved: "незбережені зміни",
};

const DE_COPY: LocalCopy = {
  title: "Lokale Editoren",
  subtitle: "Dokumente, Tabellen und Mindmaps, die auf diesem Gerät bleiben.",
  localOnly: "Nur lokal",
  privacyTitle: "Datei-Datenschutzgrenze",
  privacyBody:
    "Geöffnete Dateien bleiben im Arbeitsspeicher des Browsers. ARCTor lädt ihren Inhalt nicht hoch und speichert ihn nicht. Beim Speichern wird eine Kopie auf Ihr Gerät geschrieben.",
  memoryOnly: "Nur Browserspeicher, solange die Datei geöffnet ist",
  noUpload: "Kein Dokument-Upload",
  noStorage: "Keine Server- oder dauerhafte Browserspeicherung",
  networkBlocked: "Keine ARCTor-API-Aufrufe mit Dokumentinhalt",
  document: "Dokument",
  spreadsheet: "Tabelle",
  mindmap: "Mindmap",
  open: "Lokale Datei öffnen",
  openAnother: "Andere Datei öffnen",
  saveCopy: "Lokale Kopie speichern",
  clear: "Aus dem Speicher entfernen",
  noFile: "Derzeit befindet sich keine Datei im Browserspeicher.",
  selected: "Lokal ausgewählt",
  cancelled: "Dateiauswahl wurde abgebrochen.",
  saved: "Lokale Kopie gespeichert.",
  nextStep: "Editor-Engine",
  runtimeReady: "Die lokale Dateilaufzeit ist bereit; die Bearbeitungs-Engine wird in einer späteren Version angebunden.",
  documentReady: "Der DOCX-Editor ist unten aktiv.",
  discardWarning: "Dieses Dokument enthält ungespeicherte Änderungen. Verwerfen?",
  unsaved: "ungespeicherte Änderungen",
};

const ES_COPY: LocalCopy = {
  title: "Editores locales",
  subtitle: "Documentos, hojas de cálculo y mapas mentales que permanecen en este dispositivo.",
  localOnly: "Solo local",
  privacyTitle: "Límite de privacidad del archivo",
  privacyBody:
    "Los archivos abiertos permanecen en la memoria del navegador. ARCTor no carga ni almacena su contenido. Al guardar se escribe una copia en tu dispositivo.",
  memoryOnly: "Solo memoria del navegador mientras el archivo está abierto",
  noUpload: "Sin carga del documento",
  noStorage: "Sin almacenamiento en servidor ni almacenamiento persistente del navegador",
  networkBlocked: "Sin llamadas a la API de ARCTor con contenido del documento",
  document: "Documento",
  spreadsheet: "Hoja de cálculo",
  mindmap: "Mapa mental",
  open: "Abrir archivo local",
  openAnother: "Abrir otro archivo",
  saveCopy: "Guardar copia local",
  clear: "Eliminar de la memoria",
  noFile: "No hay ningún archivo en la memoria del navegador.",
  selected: "Seleccionado localmente",
  cancelled: "Se canceló la selección del archivo.",
  saved: "Copia local guardada.",
  nextStep: "Motor del editor",
  runtimeReady: "El runtime local de archivos está listo; el motor de edición se conectará en una versión posterior.",
  documentReady: "El editor DOCX está activo abajo.",
  discardWarning: "Este documento tiene cambios sin guardar. ¿Descartarlos?",
  unsaved: "cambios sin guardar",
};

const CS_COPY: LocalCopy = {
  title: "Lokální editory",
  subtitle: "Dokumenty, tabulky a myšlenkové mapy, které zůstávají v tomto zařízení.",
  localOnly: "Pouze lokálně",
  privacyTitle: "Hranice soukromí souboru",
  privacyBody:
    "Otevřené soubory zůstávají v paměti prohlížeče. ARCTor jejich obsah nenahrává ani neukládá. Při uložení se kopie zapíše zpět do vašeho zařízení.",
  memoryOnly: "Pouze paměť prohlížeče po dobu otevření souboru",
  noUpload: "Bez nahrávání dokumentu",
  noStorage: "Bez serverového a trvalého úložiště prohlížeče",
  networkBlocked: "Bez volání API ARCTor s obsahem dokumentu",
  document: "Dokument",
  spreadsheet: "Tabulka",
  mindmap: "Myšlenková mapa",
  open: "Otevřít místní soubor",
  openAnother: "Otevřít jiný soubor",
  saveCopy: "Uložit místní kopii",
  clear: "Odstranit z paměti",
  noFile: "V paměti prohlížeče nyní není žádný soubor.",
  selected: "Vybráno lokálně",
  cancelled: "Výběr souboru byl zrušen.",
  saved: "Místní kopie byla uložena.",
  nextStep: "Jádro editoru",
  runtimeReady: "Lokální souborový runtime je připraven; editační jádro bude připojeno v některé z dalších verzí.",
  documentReady: "Editor DOCX je aktivní níže.",
  discardWarning: "Dokument obsahuje neuložené změny. Zahodit je?",
  unsaved: "neuložené změny",
};

const COPY: Record<LocaleCode, LocalCopy> = {
  en: EN_COPY,
  pl: PL_COPY,
  ru: RU_COPY,
  uk: UK_COPY,
  de: DE_COPY,
  es: ES_COPY,
  cs: CS_COPY,
};


const EDITORS: Array<{
  kind: LocalEditorKind;
  icon: typeof FileText;
}> = [
  { kind: "document", icon: FileText },
  { kind: "spreadsheet", icon: FileSpreadsheet },
  { kind: "mindmap", icon: Network },
];

function subscribeLocale(onStoreChange: () => void): () => void {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

function getLocaleSnapshot(): LocaleCode {
  return getLocaleSearchParam(new URLSearchParams(window.location.search));
}

function getServerLocaleSnapshot(): LocaleCode {
  return "en";
}

function editorLabel(kind: LocalEditorKind, copy: LocalCopy): string {
  if (kind === "document") return copy.document;
  if (kind === "spreadsheet") return copy.spreadsheet;
  return copy.mindmap;
}

export function LocalEditorPlatform() {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getLocaleSnapshot,
    getServerLocaleSnapshot,
  );
  const copy = COPY[locale] ?? COPY.en;
  const [files, setFiles] = useState<Partial<Record<LocalEditorKind, File>>>({});
  const [busyKind, setBusyKind] = useState<LocalEditorKind | null>(null);
  const [documentDirty, setDocumentDirty] = useState(false);
  const [documentRevision, setDocumentRevision] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const privacyItems = useMemo(
    () => [copy.memoryOnly, copy.noUpload, copy.noStorage, copy.networkBlocked],
    [copy],
  );

  function canDiscardDocument(): boolean {
    if (!documentDirty) return true;
    return window.confirm(copy.discardWarning);
  }

  async function openFile(kind: LocalEditorKind) {
    if (kind === "document" && files.document && !canDiscardDocument()) return;

    setBusyKind(kind);
    setMessage(null);
    setError(null);
    try {
      const file = await openLocalEditorFile(kind);
      if (!file) {
        setMessage(copy.cancelled);
        return;
      }
      if (kind === "document") {
        activateLocalDocxPrivacyGuard();
        setDocumentDirty(false);
        setDocumentRevision((current) => current + 1);
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
    if (kind === "document") return;
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
    if (kind === "document" && !canDiscardDocument()) return;
    setFiles((current) => {
      const next = { ...current };
      delete next[kind];
      return next;
    });
    if (kind === "document") setDocumentDirty(false);
    setMessage(null);
    setError(null);
  }

  const documentFile = files.document;

  useEffect(() => {
    if (!documentFile) releaseLocalDocxPrivacyGuard();
  }, [documentFile]);

  useEffect(
    () => () => {
      releaseLocalDocxPrivacyGuard();
    },
    [],
  );

  return (
    <main className="min-h-screen bg-[#f5f6fb] px-3 py-5 text-[#1a1d2e] sm:px-5">
      <div className="mx-auto grid w-full max-w-[1540px] gap-5">
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

        {documentFile ? (
          <LocalDocxEditor
            key={`docx:${documentRevision}`}
            file={documentFile}
            locale={locale}
            onDirtyChange={setDocumentDirty}
          />
        ) : null}

        <section className="grid gap-4 lg:grid-cols-3">
          {EDITORS.map(({ kind, icon: Icon }) => {
            const policy = getLocalEditorPolicy(kind);
            const file = files[kind];
            const busy = busyKind === kind;
            const documentActive = kind === "document" && Boolean(file);
            return (
              <article
                key={kind}
                className="flex min-h-[300px] flex-col rounded-[26px] border border-black/[0.07] bg-white p-5 shadow-sm"
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
                  {kind === "document" ? copy.documentReady : `${copy.nextStep}: ${copy.runtimeReady}`}
                </p>

                <div className="mt-5 flex-1 rounded-2xl border border-dashed border-[#d9deec] bg-[#fafbfe] p-4">
                  {file ? (
                    <>
                      <div className="truncate text-[13px] font-bold text-[#252b42]" title={file.name}>
                        {file.name}
                      </div>
                      <div className="mt-1 text-[12px] text-[#767d97]">
                        {formatLocalFileSize(file.size)} · {copy.selected}
                        {documentActive && documentDirty ? ` · ${copy.unsaved}` : ""}
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
                    {file ? copy.openAnother : copy.open}
                  </button>
                  {file ? (
                    kind === "document" ? (
                      <button
                        type="button"
                        onClick={() => clearFile(kind)}
                        disabled={busy}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#e6e7ed] bg-white px-3 py-2 text-[12px] font-bold text-[#626983] disabled:opacity-50"
                      >
                        <X size={15} aria-hidden="true" />
                        {copy.clear}
                      </button>
                    ) : (
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
                    )
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>

        <div className="text-center text-[11px] text-[#8a90a8]">
          serverUpload={String(LOCAL_EDITOR_PRIVACY_CONTRACT.serverUpload)} · serverStorage={String(LOCAL_EDITOR_PRIVACY_CONTRACT.serverStorage)} · browserPersistentStorage={String(LOCAL_EDITOR_PRIVACY_CONTRACT.browserPersistentStorage)} · contentAiCalls={String(LOCAL_EDITOR_PRIVACY_CONTRACT.contentAiCalls)}
        </div>
      </div>
    </main>
  );
}
