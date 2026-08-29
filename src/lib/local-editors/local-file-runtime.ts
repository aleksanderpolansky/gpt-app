import {
  assertLocalEditorFile,
  buildLocalEditorAccept,
  getLocalEditorPolicy,
  type LocalEditorKind,
} from "./local-editor-policy";

type LocalWritable = {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
  abort?(): Promise<void>;
};

type LocalFileHandle = {
  createWritable(): Promise<LocalWritable>;
};

type LocalSavePickerOptions = {
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
};

type WindowWithLocalSavePicker = Window & {
  showSaveFilePicker?: (options?: LocalSavePickerOptions) => Promise<LocalFileHandle>;
};

export type LocalSaveResult =
  | { readonly status: "saved"; readonly method: "file-system-access" | "download" }
  | { readonly status: "cancelled"; readonly method: "file-system-access" };

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function openLocalEditorFile(kind: LocalEditorKind): Promise<File | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = buildLocalEditorAccept(kind);
    input.multiple = false;
    input.tabIndex = -1;
    input.style.position = "fixed";
    input.style.left = "-10000px";
    input.style.width = "1px";
    input.style.height = "1px";

    let settled = false;
    const cleanup = () => {
      window.removeEventListener("focus", handleWindowFocus, true);
      input.remove();
    };
    const finish = (value: File | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const handleWindowFocus = () => {
      window.setTimeout(() => {
        if (!settled && (!input.files || input.files.length === 0)) {
          finish(null);
        }
      }, 0);
    };

    input.addEventListener("cancel", () => finish(null), { once: true });
    input.addEventListener(
      "change",
      () => {
        const file = input.files?.[0] ?? null;
        if (!file) {
          finish(null);
          return;
        }

        try {
          finish(assertLocalEditorFile(kind, file));
        } catch (error) {
          fail(error);
        }
      },
      { once: true },
    );

    document.body.appendChild(input);
    window.addEventListener("focus", handleWindowFocus, true);
    input.click();
  });
}

function getSuggestedName(kind: LocalEditorKind, fileName: string): string {
  const trimmed = fileName.trim();
  if (trimmed) return trimmed;
  return `arctor-local${getLocalEditorPolicy(kind).extensions[0]}`;
}

export async function saveLocalEditorBlob(input: {
  kind: LocalEditorKind;
  blob: Blob;
  suggestedName: string;
}): Promise<LocalSaveResult> {
  const policy = getLocalEditorPolicy(input.kind);
  const suggestedName = getSuggestedName(input.kind, input.suggestedName);
  const pickerWindow = window as WindowWithLocalSavePicker;

  if (typeof pickerWindow.showSaveFilePicker === "function") {
    try {
      const handle = await pickerWindow.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: policy.description,
            accept: {
              [policy.mimeTypes[0] || "application/octet-stream"]: [...policy.extensions],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      try {
        await writable.write(input.blob);
        await writable.close();
      } catch (error) {
        if (typeof writable.abort === "function") {
          await writable.abort().catch(() => undefined);
        }
        throw error;
      }
      return { status: "saved", method: "file-system-access" };
    } catch (error) {
      if (isAbortError(error)) {
        return { status: "cancelled", method: "file-system-access" };
      }
      throw error;
    }
  }

  const objectUrl = URL.createObjectURL(input.blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = suggestedName;
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }

  return { status: "saved", method: "download" };
}
