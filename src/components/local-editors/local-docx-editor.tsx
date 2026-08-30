"use client";

import "@casualoffice/docs/styles.css";

import casualDe from "@casualoffice/docs/i18n/de.json";
import casualEn from "@casualoffice/docs/i18n/en.json";
import casualPl from "@casualoffice/docs/i18n/pl.json";
import {
  DocxEditor,
  type DocxEditorProps,
  type DocxEditorRef,
} from "@casualoffice/docs/react";
import {
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { LocalEditorStandaloneFrame } from "@/components/local-editors/local-editor-standalone-frame";
import { type LocaleCode } from "@/i18n";
import { saveLocalEditorBlob } from "@/lib/local-editors/local-file-runtime";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const MOBILE_DOCX_VIEWPORT_QUERY = "(max-width: 720px)";
const MOBILE_DOCX_REFERENCE_WIDTH_PX = 900;
const MOBILE_DOCX_HORIZONTAL_GUTTER_PX = 20;
const MOBILE_DOCX_MIN_ZOOM = 0.25;
const MOBILE_DOCX_MAX_ZOOM = 0.75;
const DOCX_MAX_ZOOM = 4;

export function getLocalDocxFitZoom(containerWidth: number): number {
  const safeWidth = Number.isFinite(containerWidth) && containerWidth > 0
    ? containerWidth
    : MOBILE_DOCX_REFERENCE_WIDTH_PX;
  const availableWidth = Math.max(1, safeWidth - MOBILE_DOCX_HORIZONTAL_GUTTER_PX);
  const rawZoom = availableWidth / MOBILE_DOCX_REFERENCE_WIDTH_PX;
  const clamped = Math.max(MOBILE_DOCX_MIN_ZOOM, Math.min(DOCX_MAX_ZOOM, rawZoom));
  return Math.floor(clamped * 100) / 100;
}

export function getLocalDocxMobileFitZoom(containerWidth: number): number {
  const safeWidth = Number.isFinite(containerWidth) && containerWidth > 0
    ? containerWidth
    : 360;
  const availableWidth = Math.max(1, safeWidth - MOBILE_DOCX_HORIZONTAL_GUTTER_PX);
  const rawZoom = availableWidth / MOBILE_DOCX_REFERENCE_WIDTH_PX;
  const clamped = Math.max(MOBILE_DOCX_MIN_ZOOM, Math.min(MOBILE_DOCX_MAX_ZOOM, rawZoom));
  return Math.floor(clamped * 100) / 100;
}

type LocalDocxEditorProps = {
  file: File;
  locale: LocaleCode;
  onDirtyChange?: (dirty: boolean) => void;
};

type DocxCopy = {
  localBadge: string;
  unsaved: string;
  save: string;
  notReady: string;
  saved: string;
  cancelled: string;
  fit: string;
  expand: string;
  finish: string;
  mobileHint: string;
};

const DOCX_COPY: Record<LocaleCode, DocxCopy> = {
  en: {
    localBadge: "Local DOCX editor · no server document storage",
    unsaved: "unsaved changes",
    save: "Save DOCX locally",
    notReady: "DOCX editor is not ready yet.",
    saved: "Local DOCX copy saved.",
    cancelled: "Saving was cancelled.",
    fit: "Fit page",
    expand: "Expand editor",
    finish: "Finish editing",
    mobileHint: "The document is fitted to the phone width. Use the zoom control to enlarge it when needed.",
  },
  pl: {
    localBadge: "Lokalny edytor DOCX · bez przechowywania dokumentu na serwerze",
    unsaved: "niezapisane zmiany",
    save: "Zapisz DOCX lokalnie",
    notReady: "Edytor DOCX nie jest jeszcze gotowy.",
    saved: "Lokalna kopia DOCX została zapisana.",
    cancelled: "Zapisywanie zostało anulowane.",
    fit: "Dopasuj stronę",
    expand: "Rozwiń edytor",
    finish: "Zakończ edycję",
    mobileHint: "Dokument jest dopasowany do szerokości telefonu. W razie potrzeby powiększ go kontrolką zoomu.",
  },
  ru: {
    localBadge: "Локальный DOCX-редактор · без хранения документа на сервере",
    unsaved: "несохранённые изменения",
    save: "Сохранить DOCX локально",
    notReady: "DOCX-редактор ещё не готов.",
    saved: "Локальная копия DOCX сохранена.",
    cancelled: "Сохранение отменено.",
    fit: "По ширине",
    expand: "Развернуть редактор",
    finish: "Завершить редактирование",
    mobileHint: "Документ подогнан по ширине телефона. При необходимости увеличьте его через масштаб редактора.",
  },
  uk: {
    localBadge: "Локальний DOCX-редактор · без зберігання документа на сервері",
    unsaved: "незбережені зміни",
    save: "Зберегти DOCX локально",
    notReady: "DOCX-редактор ще не готовий.",
    saved: "Локальну копію DOCX збережено.",
    cancelled: "Збереження скасовано.",
    fit: "За шириною",
    expand: "Розгорнути редактор",
    finish: "Завершити редагування",
    mobileHint: "Документ підігнано під ширину телефона. За потреби збільште його через масштаб редактора.",
  },
  de: {
    localBadge: "Lokaler DOCX-Editor · keine Dokumentspeicherung auf dem Server",
    unsaved: "ungespeicherte Änderungen",
    save: "DOCX lokal speichern",
    notReady: "Der DOCX-Editor ist noch nicht bereit.",
    saved: "Lokale DOCX-Kopie gespeichert.",
    cancelled: "Speichern wurde abgebrochen.",
    fit: "Seite einpassen",
    expand: "Editor maximieren",
    finish: "Bearbeitung beenden",
    mobileHint: "Das Dokument wird an die Telefonbreite angepasst. Bei Bedarf können Sie es über die Zoomsteuerung vergrößern.",
  },
  es: {
    localBadge: "Editor DOCX local · sin almacenamiento del documento en el servidor",
    unsaved: "cambios sin guardar",
    save: "Guardar DOCX localmente",
    notReady: "El editor DOCX aún no está listo.",
    saved: "Copia DOCX local guardada.",
    cancelled: "Se canceló el guardado.",
    fit: "Ajustar página",
    expand: "Ampliar editor",
    finish: "Finalizar edición",
    mobileHint: "El documento se ajusta al ancho del teléfono. Usa el control de zoom para ampliarlo cuando lo necesites.",
  },
  cs: {
    localBadge: "Lokální editor DOCX · bez ukládání dokumentu na server",
    unsaved: "neuložené změny",
    save: "Uložit DOCX lokálně",
    notReady: "Editor DOCX ještě není připraven.",
    saved: "Místní kopie DOCX byla uložena.",
    cancelled: "Ukládání bylo zrušeno.",
    fit: "Přizpůsobit stránku",
    expand: "Rozšířit editor",
    finish: "Dokončit úpravy",
    mobileHint: "Dokument je přizpůsoben šířce telefonu. V případě potřeby jej zvětšete ovládáním měřítka.",
  },
};

type DocxTranslations = NonNullable<DocxEditorProps["i18n"]>;

const DOCX_I18N: Partial<Record<LocaleCode, DocxTranslations>> = {
  en: casualEn as unknown as DocxTranslations,
  pl: casualPl as unknown as DocxTranslations,
  de: casualDe as unknown as DocxTranslations,
};

type DesktopGuardWindow = Window & {
  __deskApp__?: {
    isDesktop?: boolean;
    [key: string]: unknown;
  };
  __casualFeatures__?: {
    docops?: boolean;
    [key: string]: unknown;
  };
};

type PrivacyGuardSnapshot = {
  deskApp: DesktopGuardWindow["__deskApp__"];
  casualFeatures: DesktopGuardWindow["__casualFeatures__"];
};

let privacyGuardSnapshot: PrivacyGuardSnapshot | null = null;

export function activateLocalDocxPrivacyGuard(): void {
  if (typeof window === "undefined" || privacyGuardSnapshot) return;

  const guardedWindow = window as DesktopGuardWindow;
  privacyGuardSnapshot = {
    deskApp: guardedWindow.__deskApp__,
    casualFeatures: guardedWindow.__casualFeatures__,
  };

  // @casualoffice/docs skips IndexedDB autosave, recent-file persistence and
  // restore-banner reads in its desktop/local-only mode. ARCTor activates that
  // compatibility path synchronously in the user's Open-file event, before the
  // DocxEditor can mount. Tauri/native bridges are NOT enabled.
  guardedWindow.__deskApp__ = {
    ...(guardedWindow.__deskApp__ ?? {}),
    isDesktop: true,
  };
  guardedWindow.__casualFeatures__ = {
    ...(guardedWindow.__casualFeatures__ ?? {}),
    docops: false,
  };
}

export function releaseLocalDocxPrivacyGuard(): void {
  if (typeof window === "undefined" || !privacyGuardSnapshot) return;

  const guardedWindow = window as DesktopGuardWindow;
  const snapshot = privacyGuardSnapshot;
  privacyGuardSnapshot = null;

  if (snapshot.deskApp === undefined) {
    delete guardedWindow.__deskApp__;
  } else {
    guardedWindow.__deskApp__ = snapshot.deskApp;
  }

  if (snapshot.casualFeatures === undefined) {
    delete guardedWindow.__casualFeatures__;
  } else {
    guardedWindow.__casualFeatures__ = snapshot.casualFeatures;
  }
}

export function LocalDocxEditor({ file, locale, onDirtyChange }: LocalDocxEditorProps) {
  const copy = DOCX_COPY[locale] ?? DOCX_COPY.en;
  const editorI18n = DOCX_I18N[locale] ?? DOCX_I18N.en;
  const editorRef = useRef<DocxEditorRef | null>(null);
  const editorViewportRef = useRef<HTMLDivElement | null>(null);
  const readyRef = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editorGeometry, setEditorGeometry] = useState({ width: 0, zoom: 1 });
  const [standalone, setStandalone] = useState(false);
  const exitStandalone = useCallback(() => setStandalone(false), []);

  const setDirtyState = useCallback(
    (next: boolean) => {
      setDirty(next);
      onDirtyChange?.(next);
    },
    [onDirtyChange],
  );

  const syncEditorGeometry = useCallback(() => {
    const editor = editorRef.current;
    const viewport = editorViewportRef.current;
    if (!editor || !viewport) return;

    const width = viewport.clientWidth;
    const zoom = editor.getZoom();
    setEditorGeometry((current) =>
      current.width === width && Math.abs(current.zoom - zoom) < 0.001
        ? current
        : { width, zoom },
    );
  }, []);

  const fitDocumentToViewportWidth = useCallback(() => {
    if (typeof window === "undefined" || !editorRef.current) return false;
    const containerWidth = editorViewportRef.current?.clientWidth ?? window.innerWidth;
    editorRef.current.setZoom(getLocalDocxFitZoom(containerWidth));
    window.requestAnimationFrame(syncEditorGeometry);
    return true;
  }, [syncEditorGeometry]);

  const fitDocumentToMobileViewport = useCallback(() => {
    if (typeof window === "undefined" || !editorRef.current) return false;
    if (!window.matchMedia(MOBILE_DOCX_VIEWPORT_QUERY).matches) return false;

    const containerWidth = editorViewportRef.current?.clientWidth ?? window.innerWidth;
    editorRef.current.setZoom(getLocalDocxMobileFitZoom(containerWidth));
    window.requestAnimationFrame(syncEditorGeometry);
    return true;
  }, [syncEditorGeometry]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_DOCX_VIEWPORT_QUERY);
    const refitAfterViewportModeChange = () => {
      if (!readyRef.current || !mediaQuery.matches) return;
      window.requestAnimationFrame(() => {
        fitDocumentToMobileViewport();
      });
    };

    mediaQuery.addEventListener("change", refitAfterViewportModeChange);
    window.addEventListener("orientationchange", refitAfterViewportModeChange);
    return () => {
      mediaQuery.removeEventListener("change", refitAfterViewportModeChange);
      window.removeEventListener("orientationchange", refitAfterViewportModeChange);
    };
  }, [fitDocumentToMobileViewport]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    syncEditorGeometry();
    const viewport = editorViewportRef.current;
    const observer =
      typeof ResizeObserver !== "undefined" && viewport
        ? new ResizeObserver(syncEditorGeometry)
        : null;
    if (observer && viewport) observer.observe(viewport);
    const intervalId = window.setInterval(syncEditorGeometry, 200);

    return () => {
      observer?.disconnect();
      window.clearInterval(intervalId);
    };
  }, [syncEditorGeometry]);

  useEffect(() => {
    if (typeof window === "undefined" || !readyRef.current) return;

    const frameId = window.requestAnimationFrame(() => {
      fitDocumentToViewportWidth();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [fitDocumentToViewportWidth, standalone]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const saveEditedCopy = useCallback(async () => {
    if (!editorRef.current) {
      setError(copy.notReady);
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const buffer = await editorRef.current.export({ selective: false });
      if (!buffer) {
        throw new Error("DOCX export returned no data.");
      }
      const result = await saveLocalEditorBlob({
        kind: "document",
        blob: new Blob([buffer], { type: DOCX_MIME }),
        suggestedName: file.name,
      });
      if (result.status === "saved") {
        setDirtyState(false);
        setMessage(copy.saved);
      } else {
        setMessage(copy.cancelled);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  }, [copy.cancelled, copy.notReady, copy.saved, file.name, setDirtyState]);

  const fitZoom = editorGeometry.width > 0
    ? getLocalDocxFitZoom(editorGeometry.width)
    : 1;
  const hasHorizontalOverflow =
    editorGeometry.width > 0 && editorGeometry.zoom > fitZoom + 0.01;

  return (
    <LocalEditorStandaloneFrame active={standalone} onExit={exitStandalone}>
      <section
        className={
          standalone
            ? "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-white"
            : "min-w-0 max-w-full overflow-hidden rounded-[26px] border border-black/[0.07] bg-white shadow-sm"
        }
      >
      <div className="flex shrink-0 flex-col gap-3 border-b border-[#e8eaf2] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] font-bold text-emerald-700">
            <ShieldCheck size={16} aria-hidden="true" />
            {copy.localBadge}
          </div>
          <div className="mt-1 truncate text-[14px] font-bold text-[#20263b]" title={file.name}>
            {file.name}
            {dirty ? ` · ${copy.unsaved}` : ""}
          </div>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => fitDocumentToViewportWidth()}
            aria-label={copy.fit}
            title={copy.fit}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#dce2f2] bg-white text-[#3657b6] transition hover:bg-[#f5f7ff]"
          >
            <ScanLine size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setStandalone((current) => !current)}
            aria-pressed={standalone}
            aria-label={standalone ? copy.finish : copy.expand}
            title={standalone ? copy.finish : copy.expand}
            className={
              standalone
                ? "inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#dce2f2] bg-white px-3 py-2 text-[11px] font-bold text-[#3657b6] transition hover:bg-[#f5f7ff]"
                : "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#dce2f2] bg-white text-[#3657b6] transition hover:bg-[#f5f7ff] sm:w-auto sm:gap-2 sm:px-3"
            }
          >
            {standalone ? (
              <Minimize2 size={17} aria-hidden="true" />
            ) : (
              <Maximize2 size={17} aria-hidden="true" />
            )}
            <span
              className={standalone ? "whitespace-nowrap" : "hidden whitespace-nowrap sm:inline"}
            >
              {standalone ? copy.finish : copy.expand}
            </span>
          </button>
          <button
            type="button"
            onClick={() => void saveEditedCopy()}
            disabled={saving}
            className="inline-flex min-h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-[#3b6ef8] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[#315fdc] disabled:opacity-50 sm:flex-none"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={16} aria-hidden="true" />
            ) : (
              <Download size={16} aria-hidden="true" />
            )}
            <span className="truncate">{copy.save}</span>
          </button>
        </div>
      </div>

      {message ? (
        <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-2 text-[12px] font-semibold text-emerald-700">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="border-b border-rose-100 bg-rose-50 px-5 py-2 text-[12px] font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="border-b border-[#e8eaf2] bg-[#f8faff] px-4 py-2 text-[11px] leading-4 text-[#66708f] sm:hidden">
        {copy.mobileHint}
      </div>

      <div
        ref={editorViewportRef}
        className={
          standalone
            ? "min-h-0 w-full min-w-0 flex-1 overflow-hidden bg-[#edf0f6]"
            : "h-[72dvh] min-h-[480px] max-h-[820px] w-full min-w-0 overflow-hidden bg-[#edf0f6] sm:h-[78vh] sm:min-h-[680px] sm:max-h-none"
        }
      >
        <style>{`
          .arctor-local-docx-editor-engine.arctor-local-docx-editor--horizontal-overflow
            div:has(> .paged-editor__pages),
          .arctor-local-docx-editor-engine.arctor-local-docx-editor--horizontal-overflow
            .paged-editor__pages {
            transform-origin: top left !important;
          }
        `}</style>
        <DocxEditor
          ref={editorRef}
          className={`arctor-local-docx-editor-engine${
            hasHorizontalOverflow ? " arctor-local-docx-editor--horizontal-overflow" : ""
          }`}
          documentBuffer={file}
          documentName={file.name}
          chrome="embedded"
          i18n={editorI18n}
          ai={{ enabled: false }}
          onReady={() => {
            readyRef.current = true;
            setDirtyState(false);
            if (typeof window !== "undefined") {
              window.requestAnimationFrame(() => {
                if (!fitDocumentToMobileViewport()) syncEditorGeometry();
              });
            }
          }}
          onChange={() => {
            if (readyRef.current) setDirtyState(true);
          }}
          onError={(editorError) => {
            setError(editorError.message);
          }}
        />
      </div>
      </section>
    </LocalEditorStandaloneFrame>
  );
}
