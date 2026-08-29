export type LocalEditorKind = "document" | "spreadsheet" | "mindmap";

export type LocalEditorPolicy = {
  readonly kind: LocalEditorKind;
  readonly title: string;
  readonly description: string;
  readonly extensions: readonly string[];
  readonly mimeTypes: readonly string[];
  readonly maxBytes: number;
};

export const LOCAL_EDITOR_PRIVACY_CONTRACT = Object.freeze({
  fileDataResidence: ["browser_memory", "user_filesystem"] as const,
  serverUpload: false,
  serverStorage: false,
  browserPersistentStorage: false,
  documentNetworkConnections: false,
  cloudAutosave: false,
  contentAnalytics: false,
  contentAiCalls: false,
});

const MIB = 1024 * 1024;

export const LOCAL_EDITOR_POLICIES: Readonly<Record<LocalEditorKind, LocalEditorPolicy>> =
  Object.freeze({
    document: Object.freeze({
      kind: "document",
      title: "Document",
      description: "Local DOCX document",
      extensions: [".docx"] as const,
      mimeTypes: [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ] as const,
      maxBytes: 256 * MIB,
    }),
    spreadsheet: Object.freeze({
      kind: "spreadsheet",
      title: "Spreadsheet",
      description: "Local XLSX workbook",
      extensions: [".xlsx"] as const,
      mimeTypes: [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ] as const,
      maxBytes: 256 * MIB,
    }),
    mindmap: Object.freeze({
      kind: "mindmap",
      title: "Mind map",
      description: "Local ARCTor mind map",
      extensions: [".arctormap", ".json"] as const,
      mimeTypes: ["application/json"] as const,
      maxBytes: 32 * MIB,
    }),
  });

export class LocalEditorFileError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "LocalEditorFileError";
    this.code = code;
  }
}

export function getLocalEditorPolicy(kind: LocalEditorKind): LocalEditorPolicy {
  return LOCAL_EDITOR_POLICIES[kind];
}

export function getFileExtension(fileName: string): string {
  const normalized = fileName.trim().toLowerCase();
  const lastDot = normalized.lastIndexOf(".");
  return lastDot >= 0 ? normalized.slice(lastDot) : "";
}

export function assertLocalEditorFile(kind: LocalEditorKind, file: File): File {
  const policy = getLocalEditorPolicy(kind);
  const extension = getFileExtension(file.name);

  if (!policy.extensions.includes(extension)) {
    throw new LocalEditorFileError(
      "LOCAL_EDITOR_FILE_EXTENSION_NOT_ALLOWED",
      `Expected ${policy.extensions.join(" or ")}, received ${extension || "no extension"}.`,
    );
  }

  if (file.size <= 0) {
    throw new LocalEditorFileError(
      "LOCAL_EDITOR_FILE_EMPTY",
      "The selected file is empty.",
    );
  }

  if (file.size > policy.maxBytes) {
    throw new LocalEditorFileError(
      "LOCAL_EDITOR_FILE_TOO_LARGE",
      `The selected file exceeds the local safety limit of ${formatLocalFileSize(policy.maxBytes)}.`,
    );
  }

  return file;
}

export function formatLocalFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < MIB) return `${(bytes / 1024).toFixed(1)} KiB`;
  if (bytes < 1024 * MIB) return `${(bytes / MIB).toFixed(1)} MiB`;
  return `${(bytes / (1024 * MIB)).toFixed(1)} GiB`;
}

export function buildLocalEditorAccept(kind: LocalEditorKind): string {
  return getLocalEditorPolicy(kind).extensions.join(",");
}
