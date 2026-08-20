"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  ExternalLink,
  FileImage,
  Loader2,
  Paperclip,
} from "lucide-react";

import { getLocaleSearchParam, type LocaleCode } from "@/i18n";

type UploadedFileItem = {
  id: string;
  kind: "image";
  sourceCode: "ai_navigator_activity_evidence";
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  previewHref: string;
  downloadHref: string;
  relatedActivityEventId: string | null;
  relatedActivityTitle: string | null;
  relatedHref: string | null;
};

type ResponsePayload = {
  ok?: boolean;
  error?: string;
  files?: UploadedFileItem[];
};

const COPY: Record<LocaleCode, {
  eyebrow: string;
  title: string;
  subtitle: string;
  empty: string;
  source: string;
  aiNavigator: string;
  related: string;
  open: string;
  download: string;
  loading: string;
  error: string;
}> = {
  ru: { eyebrow: "МОЙ КАБИНЕТ", title: "Загруженные файлы", subtitle: "Ваши исходные материалы и вложения. Приватные файлы открываются только после проверки доступа.", empty: "Загруженных файлов пока нет.", source: "Источник", aiNavigator: "AI-Navigator · активность", related: "Связано", open: "Открыть", download: "Скачать", loading: "Загружаем список…", error: "Не удалось загрузить список файлов." },
  pl: { eyebrow: "MÓJ PANEL", title: "Przesłane pliki", subtitle: "Twoje materiały źródłowe i załączniki. Prywatne pliki są otwierane dopiero po sprawdzeniu dostępu.", empty: "Nie ma jeszcze przesłanych plików.", source: "Źródło", aiNavigator: "AI-Navigator · aktywność", related: "Powiązane", open: "Otwórz", download: "Pobierz", loading: "Ładowanie listy…", error: "Nie udało się wczytać listy plików." },
  en: { eyebrow: "DASHBOARD", title: "Uploaded files", subtitle: "Your source materials and attachments. Private files open only after an access check.", empty: "No uploaded files yet.", source: "Source", aiNavigator: "AI-Navigator · activity", related: "Related", open: "Open", download: "Download", loading: "Loading files…", error: "Could not load uploaded files." },
  es: { eyebrow: "MI PANEL", title: "Archivos subidos", subtitle: "Tus materiales fuente y adjuntos. Los archivos privados solo se abren tras verificar el acceso.", empty: "Todavía no hay archivos subidos.", source: "Fuente", aiNavigator: "AI-Navigator · actividad", related: "Relacionado", open: "Abrir", download: "Descargar", loading: "Cargando archivos…", error: "No se pudo cargar la lista de archivos." },
  uk: { eyebrow: "МІЙ КАБІНЕТ", title: "Завантажені файли", subtitle: "Ваші вихідні матеріали та вкладення. Приватні файли відкриваються лише після перевірки доступу.", empty: "Завантажених файлів поки немає.", source: "Джерело", aiNavigator: "AI-Navigator · активність", related: "Пов’язано", open: "Відкрити", download: "Завантажити", loading: "Завантажуємо список…", error: "Не вдалося завантажити список файлів." },
  de: { eyebrow: "MEIN DASHBOARD", title: "Hochgeladene Dateien", subtitle: "Ihre Quelldateien und Anhänge. Private Dateien werden erst nach einer Zugriffsprüfung geöffnet.", empty: "Noch keine Dateien hochgeladen.", source: "Quelle", aiNavigator: "AI-Navigator · Aktivität", related: "Verknüpft", open: "Öffnen", download: "Herunterladen", loading: "Dateien werden geladen…", error: "Die Dateiliste konnte nicht geladen werden." },
  cs: { eyebrow: "MŮJ PANEL", title: "Nahrané soubory", subtitle: "Vaše zdrojové materiály a přílohy. Soukromé soubory se otevřou až po ověření přístupu.", empty: "Zatím nejsou nahrané žádné soubory.", source: "Zdroj", aiNavigator: "AI-Navigator · aktivita", related: "Propojeno", open: "Otevřít", download: "Stáhnout", loading: "Načítáme soubory…", error: "Seznam souborů se nepodařilo načíst." },
};

function readLocale() {
  if (typeof window === "undefined") return "en" as LocaleCode;
  return getLocaleSearchParam(new URLSearchParams(window.location.search));
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadedFilesClient() {
  const [locale, setLocale] = useState<LocaleCode>("en");
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function syncLocale() {
      setLocale(readLocale());
    }
    const timer = window.setTimeout(syncLocale, 0);
    window.addEventListener("popstate", syncLocale);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("popstate", syncLocale);
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/uploaded-files", {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as ResponsePayload;
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || `HTTP_${response.status}`);
        }
        if (active) setFiles(Array.isArray(payload.files) ? payload.files : []);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "UNKNOWN");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const copy = COPY[locale] ?? COPY.en;
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }),
    [locale],
  );

  return (
    <div className="mx-auto w-full max-w-[1220px] space-y-5 p-5 lg:p-7">
      <section className="rounded-[22px] border border-[rgba(0,0,0,0.07)] bg-white p-6 shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
        <div className="text-[11px] font-bold tracking-[0.22em] text-[#3b6ef8]">{copy.eyebrow}</div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-[#111827]">{copy.title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#7c8099]">{copy.subtitle}</p>
      </section>

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-[#dbe4ff] bg-white p-5 text-sm text-[#5a5f7a]">
          <Loader2 size={17} className="animate-spin text-[#3b6ef8]" />
          {copy.loading}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {copy.error}
        </div>
      ) : null}

      {!loading && !error && files.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[#cfd8ef] bg-white p-10 text-center text-sm text-[#7c8099]">
          <Paperclip className="mx-auto mb-3 text-[#3b6ef8]" size={28} />
          {copy.empty}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {files.map((file) => (
          <article
            key={file.id}
            className="overflow-hidden rounded-[20px] border border-[rgba(0,0,0,0.07)] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.06)]"
          >
            <a
              href={file.previewHref}
              target="_blank"
              rel="noreferrer"
              className="block aspect-[16/10] bg-[#f5f6fb]"
            >
              {/* Authenticated private image: browser request must carry the user's cookie. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={file.previewHref}
                alt=""
                className="h-full w-full object-contain"
              />
            </a>
            <div className="space-y-3 p-4">
              <div className="flex min-w-0 items-start gap-2">
                <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-xl bg-[#eef2ff] text-[#3b6ef8]">
                  <FileImage size={16} />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-[#1a1d2e]" title={file.originalName}>
                    {file.originalName}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#9ca3b8]">
                    {formatBytes(file.sizeBytes)} · {file.createdAt ? dateFormatter.format(new Date(file.createdAt)) : "—"}
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-[#f8f9fc] p-3 text-[11px] leading-5 text-[#6b7280]">
                <div><span className="font-semibold">{copy.source}:</span> {copy.aiNavigator}</div>
                {file.relatedActivityTitle ? (
                  <div className="mt-1 truncate"><span className="font-semibold">{copy.related}:</span> {file.relatedActivityTitle}</div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <a href={file.previewHref} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#cbd7ff] px-3 text-xs font-semibold text-[#3b6ef8] hover:bg-[#eef2ff]">
                  <ExternalLink size={14} /> {copy.open}
                </a>
                <a href={file.downloadHref} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#e5e7eb] px-3 text-xs font-semibold text-[#5a5f7a] hover:bg-[#f8f9fc]">
                  <Download size={14} /> {copy.download}
                </a>
                {file.relatedHref ? (
                  <a href={file.relatedHref} className="inline-flex h-9 items-center rounded-xl bg-[#3b6ef8] px-3 text-xs font-semibold text-white hover:bg-[#315ed8]">
                    {copy.related}
                  </a>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
