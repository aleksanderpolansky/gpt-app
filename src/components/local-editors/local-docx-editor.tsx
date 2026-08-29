"use client";

import "@casualoffice/docs/styles.css";

import {
  DocxEditor,
  type DocxEditorRef,
} from "@casualoffice/docs/react";
import { Download, Loader2, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { saveLocalEditorBlob } from "@/lib/local-editors/local-file-runtime";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type LocalDocxEditorProps = {
  file: File;
  onDirtyChange?: (dirty: boolean) => void;
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

export function LocalDocxEditor({ file, onDirtyChange }: LocalDocxEditorProps) {
  const editorRef = useRef<DocxEditorRef | null>(null);
  const readyRef = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setDirtyState = useCallback(
    (next: boolean) => {
      setDirty(next);
      onDirtyChange?.(next);
    },
    [onDirtyChange],
  );

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
      setError("DOCX editor is not ready yet.");
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
        setMessage("Local DOCX copy saved.");
      } else {
        setMessage("Saving was cancelled.");
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  }, [file.name, setDirtyState]);

  return (
    <section className="overflow-hidden rounded-[26px] border border-black/[0.07] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#e8eaf2] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] font-bold text-emerald-700">
            <ShieldCheck size={16} aria-hidden="true" />
            Local DOCX editor · no server document storage
          </div>
          <div className="mt-1 truncate text-[14px] font-bold text-[#20263b]" title={file.name}>
            {file.name}
            {dirty ? " · unsaved changes" : ""}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void saveEditedCopy()}
          disabled={saving}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#3b6ef8] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[#315fdc] disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="animate-spin" size={16} aria-hidden="true" />
          ) : (
            <Download size={16} aria-hidden="true" />
          )}
          Save DOCX locally
        </button>
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

      <div className="h-[78vh] min-h-[680px] w-full bg-[#edf0f6]">
        <DocxEditor
          ref={editorRef}
          documentBuffer={file}
          documentName={file.name}
          chrome="embedded"
          ai={{ enabled: false }}
          onReady={() => {
            readyRef.current = true;
            setDirtyState(false);
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
  );
}
