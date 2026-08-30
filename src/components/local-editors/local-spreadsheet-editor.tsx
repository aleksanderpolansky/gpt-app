"use client";

import {
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LocalEditorStandaloneFrame } from "@/components/local-editors/local-editor-standalone-frame";
import {
  ArctorTabulator,
  type ArctorTableCellEditedEvent,
  type ArctorTableColumn,
  type ArctorTableRangePasteEvent,
} from "@/components/tables/arctor-tabulator";
import { type LocaleCode } from "@/i18n";
import { saveLocalEditorBlob } from "@/lib/local-editors/local-file-runtime";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MAX_VISIBLE_ROWS = 5000;
const MAX_VISIBLE_COLUMNS = 128;
const EXTRA_VISIBLE_ROWS = 20;
const EXTRA_VISIBLE_COLUMNS = 4;

type XlsxModule = typeof import("xlsx");
type XlsxWorkbook = import("xlsx").WorkBook;
type XlsxWorksheet = import("xlsx").WorkSheet;
type XlsxCell = import("xlsx").CellObject;

type SpreadsheetRow = Record<string, unknown> & {
  __rowId: string;
  __rowNumber: number;
  __formulaFields: Record<string, true>;
};

type SpreadsheetView = {
  rows: SpreadsheetRow[];
  columnCount: number;
  sourceRows: number;
  sourceColumns: number;
  truncated: boolean;
};

type LocalSpreadsheetEditorProps = {
  file: File;
  locale: LocaleCode;
  onDirtyChange?: (dirty: boolean) => void;
};

type SpreadsheetCopy = {
  localBadge: string;
  loading: string;
  save: string;
  saved: string;
  cancelled: string;
  expand: string;
  finish: string;
  unsaved: string;
  sheet: string;
  formulasReadOnly: string;
  localOnlyHint: string;
  truncated: string;
  pasteBlocked: string;
  emptyWorkbook: string;
};

const COPY: Record<LocaleCode, SpreadsheetCopy> = {
  en: {
    localBadge: "Local XLSX editor · no server spreadsheet storage",
    loading: "Opening workbook locally…",
    save: "Save XLSX locally",
    saved: "Local XLSX copy saved.",
    cancelled: "Saving was cancelled.",
    expand: "Expand editor",
    finish: "Finish editing",
    unsaved: "unsaved changes",
    sheet: "Sheet",
    formulasReadOnly: "Formula cells are read-only in this first XLSX editor version and are preserved when saving.",
    localOnlyHint: "The workbook stays in browser memory and is saved only back to your device.",
    truncated: "The sheet is larger than the current safe editing window. Hidden cells are kept in the workbook but are not shown here.",
    pasteBlocked: "Paste was cancelled because the selected range contains a formula cell.",
    emptyWorkbook: "The workbook has no worksheets.",
  },
  pl: {
    localBadge: "Lokalny edytor XLSX · bez przechowywania arkusza na serwerze",
    loading: "Otwieranie skoroszytu lokalnie…",
    save: "Zapisz XLSX lokalnie",
    saved: "Lokalna kopia XLSX została zapisana.",
    cancelled: "Zapisywanie zostało anulowane.",
    expand: "Rozwiń edytor",
    finish: "Zakończ edycję",
    unsaved: "niezapisane zmiany",
    sheet: "Arkusz",
    formulasReadOnly: "Komórki z formułami są tylko do odczytu w tej pierwszej wersji edytora XLSX i są zachowywane przy zapisie.",
    localOnlyHint: "Skoroszyt pozostaje w pamięci przeglądarki i jest zapisywany wyłącznie z powrotem na urządzeniu.",
    truncated: "Arkusz jest większy niż bieżące bezpieczne okno edycji. Ukryte komórki pozostają w skoroszycie, ale nie są tutaj wyświetlane.",
    pasteBlocked: "Wklejanie anulowano, ponieważ zaznaczony zakres zawiera komórkę z formułą.",
    emptyWorkbook: "Skoroszyt nie zawiera arkuszy.",
  },
  ru: {
    localBadge: "Локальный XLSX-редактор · без хранения таблицы на сервере",
    loading: "Книга открывается локально…",
    save: "Сохранить XLSX локально",
    saved: "Локальная копия XLSX сохранена.",
    cancelled: "Сохранение отменено.",
    expand: "Развернуть редактор",
    finish: "Завершить редактирование",
    unsaved: "несохранённые изменения",
    sheet: "Лист",
    formulasReadOnly: "Ячейки с формулами в первой версии XLSX-редактора доступны только для чтения и сохраняются при записи файла.",
    localOnlyHint: "Книга остаётся в памяти браузера и сохраняется только обратно на ваше устройство.",
    truncated: "Лист больше текущего безопасного окна редактирования. Невидимые ячейки остаются в книге, но здесь не показываются.",
    pasteBlocked: "Вставка отменена: выбранный диапазон содержит ячейку с формулой.",
    emptyWorkbook: "В книге нет листов.",
  },
  uk: {
    localBadge: "Локальний XLSX-редактор · без зберігання таблиці на сервері",
    loading: "Книга відкривається локально…",
    save: "Зберегти XLSX локально",
    saved: "Локальну копію XLSX збережено.",
    cancelled: "Збереження скасовано.",
    expand: "Розгорнути редактор",
    finish: "Завершити редагування",
    unsaved: "незбережені зміни",
    sheet: "Аркуш",
    formulasReadOnly: "Клітинки з формулами в першій версії XLSX-редактора доступні лише для читання і зберігаються під час запису файла.",
    localOnlyHint: "Книга залишається в пам’яті браузера і зберігається лише назад на ваш пристрій.",
    truncated: "Аркуш більший за поточне безпечне вікно редагування. Невидимі клітинки залишаються в книзі, але тут не показуються.",
    pasteBlocked: "Вставлення скасовано: вибраний діапазон містить клітинку з формулою.",
    emptyWorkbook: "У книзі немає аркушів.",
  },
  de: {
    localBadge: "Lokaler XLSX-Editor · keine Tabellenspeicherung auf dem Server",
    loading: "Arbeitsmappe wird lokal geöffnet…",
    save: "XLSX lokal speichern",
    saved: "Lokale XLSX-Kopie gespeichert.",
    cancelled: "Speichern wurde abgebrochen.",
    expand: "Editor maximieren",
    finish: "Bearbeitung beenden",
    unsaved: "ungespeicherte Änderungen",
    sheet: "Tabelle",
    formulasReadOnly: "Formelzellen sind in dieser ersten XLSX-Editor-Version schreibgeschützt und bleiben beim Speichern erhalten.",
    localOnlyHint: "Die Arbeitsmappe bleibt im Browserspeicher und wird nur zurück auf Ihr Gerät gespeichert.",
    truncated: "Das Blatt ist größer als das aktuelle sichere Bearbeitungsfenster. Nicht sichtbare Zellen bleiben in der Arbeitsmappe erhalten.",
    pasteBlocked: "Einfügen wurde abgebrochen, weil der ausgewählte Bereich eine Formelzelle enthält.",
    emptyWorkbook: "Die Arbeitsmappe enthält keine Tabellenblätter.",
  },
  es: {
    localBadge: "Editor XLSX local · sin almacenamiento de la hoja en el servidor",
    loading: "Abriendo el libro localmente…",
    save: "Guardar XLSX localmente",
    saved: "Copia XLSX local guardada.",
    cancelled: "Se canceló el guardado.",
    expand: "Ampliar editor",
    finish: "Finalizar edición",
    unsaved: "cambios sin guardar",
    sheet: "Hoja",
    formulasReadOnly: "Las celdas con fórmulas son de solo lectura en esta primera versión del editor XLSX y se conservan al guardar.",
    localOnlyHint: "El libro permanece en la memoria del navegador y solo se guarda de nuevo en tu dispositivo.",
    truncated: "La hoja supera la ventana segura de edición actual. Las celdas no visibles se conservan en el libro, pero no se muestran aquí.",
    pasteBlocked: "Se canceló el pegado porque el rango seleccionado contiene una celda con fórmula.",
    emptyWorkbook: "El libro no contiene hojas.",
  },
  cs: {
    localBadge: "Lokální editor XLSX · bez ukládání tabulky na server",
    loading: "Sešit se otevírá lokálně…",
    save: "Uložit XLSX lokálně",
    saved: "Místní kopie XLSX byla uložena.",
    cancelled: "Ukládání bylo zrušeno.",
    expand: "Rozšířit editor",
    finish: "Dokončit úpravy",
    unsaved: "neuložené změny",
    sheet: "List",
    formulasReadOnly: "Buňky se vzorci jsou v této první verzi editoru XLSX pouze pro čtení a při uložení se zachovají.",
    localOnlyHint: "Sešit zůstává v paměti prohlížeče a ukládá se pouze zpět do vašeho zařízení.",
    truncated: "List je větší než aktuální bezpečné editační okno. Skryté buňky zůstávají v sešitu, ale zde se nezobrazují.",
    pasteBlocked: "Vložení bylo zrušeno, protože vybraný rozsah obsahuje buňku se vzorcem.",
    emptyWorkbook: "Sešit neobsahuje žádné listy.",
  },
};

function fieldForColumn(index: number): string {
  return `c${index}`;
}

function columnLabel(index: number): string {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

function sourceCellDisplayValue(cell: XlsxCell | undefined): unknown {
  if (!cell) return "";
  if (cell.w != null) return cell.w;
  if (cell.v instanceof Date) return cell.v.toISOString();
  return cell.v ?? "";
}

function safeSheetRange(xlsx: XlsxModule, sheet: XlsxWorksheet) {
  const reference = typeof sheet["!ref"] === "string" ? sheet["!ref"] : "A1:A1";
  try {
    return xlsx.utils.decode_range(reference);
  } catch {
    return { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
  }
}

function buildSpreadsheetView(xlsx: XlsxModule, sheet: XlsxWorksheet): SpreadsheetView {
  const range = safeSheetRange(xlsx, sheet);
  const sourceRows = Math.max(1, range.e.r + 1);
  const sourceColumns = Math.max(1, range.e.c + 1);
  const visibleRows = Math.min(MAX_VISIBLE_ROWS, Math.max(30, sourceRows + EXTRA_VISIBLE_ROWS));
  const visibleColumns = Math.min(
    MAX_VISIBLE_COLUMNS,
    Math.max(12, sourceColumns + EXTRA_VISIBLE_COLUMNS),
  );
  const rows: SpreadsheetRow[] = [];

  for (let rowIndex = 0; rowIndex < visibleRows; rowIndex += 1) {
    const row: SpreadsheetRow = {
      __rowId: `r${rowIndex + 1}`,
      __rowNumber: rowIndex + 1,
      __formulaFields: {},
    };

    for (let columnIndex = 0; columnIndex < visibleColumns; columnIndex += 1) {
      const field = fieldForColumn(columnIndex);
      const address = xlsx.utils.encode_cell({ r: rowIndex, c: columnIndex });
      const cell = sheet[address] as XlsxCell | undefined;
      row[field] = sourceCellDisplayValue(cell);
      if (cell?.f) row.__formulaFields[field] = true;
    }
    rows.push(row);
  }

  return {
    rows,
    columnCount: visibleColumns,
    sourceRows,
    sourceColumns,
    truncated: sourceRows > MAX_VISIBLE_ROWS || sourceColumns > MAX_VISIBLE_COLUMNS,
  };
}

function normalizeEditedCellValue(value: unknown, previous: XlsxCell | undefined): XlsxCell {
  const base = previous ? { ...previous } : ({} as XlsxCell);
  delete base.f;
  delete base.w;

  const raw = value == null ? "" : String(value);
  const trimmed = raw.trim();

  if (previous?.t === "n") {
    const numeric = Number(trimmed.replace(",", "."));
    if (trimmed !== "" && Number.isFinite(numeric)) {
      return { ...base, t: "n", v: numeric } as XlsxCell;
    }
  }

  if (previous?.t === "b") {
    if (/^(true|false)$/i.test(trimmed)) {
      return { ...base, t: "b", v: trimmed.toLowerCase() === "true" } as XlsxCell;
    }
  }

  if (previous?.t === "d") {
    const parsed = new Date(trimmed);
    if (trimmed !== "" && !Number.isNaN(parsed.getTime())) {
      return { ...base, t: "d", v: parsed } as XlsxCell;
    }
  }

  if (/^-?(?:0|[1-9]\d*)(?:[.,]\d+)?$/.test(trimmed) && !/^[-+]?0\d+/.test(trimmed)) {
    const numeric = Number(trimmed.replace(",", "."));
    if (Number.isFinite(numeric)) {
      return { ...base, t: "n", v: numeric } as XlsxCell;
    }
  }

  if (/^(true|false)$/i.test(trimmed)) {
    return { ...base, t: "b", v: trimmed.toLowerCase() === "true" } as XlsxCell;
  }

  return { ...base, t: "s", v: raw } as XlsxCell;
}

function extendSheetReference(
  xlsx: XlsxModule,
  sheet: XlsxWorksheet,
  rowIndex: number,
  columnIndex: number,
) {
  const current = safeSheetRange(xlsx, sheet);
  const next = {
    s: { r: Math.min(current.s.r, rowIndex), c: Math.min(current.s.c, columnIndex) },
    e: { r: Math.max(current.e.r, rowIndex), c: Math.max(current.e.c, columnIndex) },
  };
  sheet["!ref"] = xlsx.utils.encode_range(next);
}

function isFormulaField(row: SpreadsheetRow, field: string): boolean {
  return row.__formulaFields[field] === true;
}

export function LocalSpreadsheetEditor({
  file,
  locale,
  onDirtyChange,
}: LocalSpreadsheetEditorProps) {
  const copy = COPY[locale] ?? COPY.en;
  const workbookRef = useRef<XlsxWorkbook | null>(null);
  const xlsxRef = useRef<XlsxModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [workbookReady, setWorkbookReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheetName, setActiveSheetName] = useState<string>("");
  const [view, setView] = useState<SpreadsheetView>({
    rows: [],
    columnCount: 12,
    sourceRows: 0,
    sourceColumns: 0,
    truncated: false,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setDirtyState = useCallback(
    (next: boolean) => {
      setDirty(next);
      onDirtyChange?.(next);
    },
    [onDirtyChange],
  );

  const refreshActiveSheet = useCallback(() => {
    const xlsx = xlsxRef.current;
    const workbook = workbookRef.current;
    if (!xlsx || !workbook || !activeSheetName) return;
    const sheet = workbook.Sheets[activeSheetName];
    if (!sheet) return;
    setView(buildSpreadsheetView(xlsx, sheet));
  }, [activeSheetName]);

  useEffect(() => {
    let cancelled = false;

    async function openWorkbook() {
      try {
        const xlsx = await import("xlsx");
        const bytes = await file.arrayBuffer();
        const workbook = xlsx.read(bytes, {
          type: "array",
          cellDates: true,
          cellFormula: true,
          cellNF: true,
          cellStyles: true,
        });
        if (cancelled) return;

        xlsxRef.current = xlsx;
        workbookRef.current = workbook;
        const names = [...workbook.SheetNames];
        setSheetNames(names);
        if (!names.length) {
          setActiveSheetName("");
          setView((current) => ({ ...current, rows: [] }));
          setError(copy.emptyWorkbook);
          return;
        }
        setWorkbookReady(true);
        setActiveSheetName(names[0]);
        const firstSheet = workbook.Sheets[names[0]];
        if (firstSheet) setView(buildSpreadsheetView(xlsx, firstSheet));
      } catch (openError) {
        if (!cancelled) {
          setError(openError instanceof Error ? openError.message : String(openError));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void openWorkbook();
    return () => {
      cancelled = true;
    };
  }, [copy.emptyWorkbook, file, setDirtyState]);

  useEffect(() => {
    if (!activeSheetName) return;
    refreshActiveSheet();
  }, [activeSheetName, refreshActiveSheet]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const columns = useMemo<ArctorTableColumn<SpreadsheetRow>[]>(() => {
    const next: ArctorTableColumn<SpreadsheetRow>[] = [
      {
        title: "#",
        field: "__rowNumber",
        width: 58,
        minWidth: 58,
        frozen: true,
        hozAlign: "right",
        headerHozAlign: "center",
        editable: false,
      },
    ];

    for (let index = 0; index < view.columnCount; index += 1) {
      const field = fieldForColumn(index);
      next.push({
        title: columnLabel(index),
        field,
        minWidth: 118,
        width: 138,
        mobileMinWidth: 150,
        editor: "arctor-expanded-input",
        editable: (cell) => !isFormulaField(cell.getRow().getData(), field),
        tooltip: true,
      });
    }
    return next;
  }, [view.columnCount]);

  const handleCellEdited = useCallback(
    (event: ArctorTableCellEditedEvent<SpreadsheetRow>) => {
      const xlsx = xlsxRef.current;
      const workbook = workbookRef.current;
      if (!xlsx || !workbook || !activeSheetName) return;
      const sheet = workbook.Sheets[activeSheetName];
      if (!sheet || !event.field.startsWith("c")) return;
      if (isFormulaField(event.row, event.field)) {
        event.restoreOldValue();
        return;
      }

      const columnIndex = Number(event.field.slice(1));
      if (!Number.isInteger(columnIndex) || columnIndex < 0) return;
      const rowIndex = event.row.__rowNumber - 1;
      const address = xlsx.utils.encode_cell({ r: rowIndex, c: columnIndex });
      const previous = sheet[address] as XlsxCell | undefined;
      sheet[address] = normalizeEditedCellValue(event.value, previous);
      extendSheetReference(xlsx, sheet, rowIndex, columnIndex);
      setDirtyState(true);
      setMessage(null);
      setError(null);
    },
    [activeSheetName, setDirtyState],
  );

  const handleRangePaste = useCallback(
    (event: ArctorTableRangePasteEvent<SpreadsheetRow>) => {
      const xlsx = xlsxRef.current;
      const workbook = workbookRef.current;
      if (!xlsx || !workbook || !activeSheetName) return;
      const sheet = workbook.Sheets[activeSheetName];
      if (!sheet) return;

      if (event.cells.some((cell) => isFormulaField(cell.row, cell.field))) {
        setError(copy.pasteBlocked);
        return;
      }

      for (const cell of event.cells) {
        if (!cell.field.startsWith("c")) continue;
        const columnIndex = Number(cell.field.slice(1));
        if (!Number.isInteger(columnIndex) || columnIndex < 0) continue;
        const rowIndex = cell.row.__rowNumber - 1;
        const address = xlsx.utils.encode_cell({ r: rowIndex, c: columnIndex });
        const previous = sheet[address] as XlsxCell | undefined;
        sheet[address] = normalizeEditedCellValue(cell.value, previous);
        extendSheetReference(xlsx, sheet, rowIndex, columnIndex);
      }

      setDirtyState(true);
      setError(null);
      setMessage(null);
      setView(buildSpreadsheetView(xlsx, sheet));
    },
    [activeSheetName, copy.pasteBlocked, setDirtyState],
  );

  const saveWorkbook = useCallback(async () => {
    const xlsx = xlsxRef.current;
    const workbook = workbookRef.current;
    if (!xlsx || !workbook) return;

    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const bytes = xlsx.write(workbook, {
        bookType: "xlsx",
        type: "array",
        cellStyles: true,
      });
      const result = await saveLocalEditorBlob({
        kind: "spreadsheet",
        blob: new Blob([bytes], { type: XLSX_MIME }),
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
  }, [copy.cancelled, copy.saved, file.name, setDirtyState]);

  const exitStandalone = useCallback(() => setStandalone(false), []);

  const content = (
    <section
      className={
        standalone
          ? "flex h-[100dvh] w-screen min-w-0 flex-col overflow-hidden bg-[#edf0f6]"
          : "min-w-0 overflow-hidden rounded-[26px] border border-black/[0.07] bg-white shadow-sm"
      }
    >
      <div className="flex flex-col gap-3 border-b border-[#dde2ee] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] font-bold text-emerald-700">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>{copy.localBadge}</span>
          </div>
          <div className="mt-1 truncate text-[13px] font-bold text-[#1b2138]" title={file.name}>
            {file.name}
            {dirty ? <span className="ml-2 text-amber-600">· {copy.unsaved}</span> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStandalone((current) => !current)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#dce2f2] bg-white px-3 py-2 text-[12px] font-bold text-[#3657b6]"
          >
            {standalone ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
            {standalone ? copy.finish : copy.expand}
          </button>
          <button
            type="button"
            onClick={() => void saveWorkbook()}
            disabled={loading || saving || !workbookReady}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#3b6ef8] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[#315fdc] disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
            {copy.save}
          </button>
        </div>
      </div>

      <div className="border-b border-[#dde2ee] bg-[#f8faff] px-4 py-2 text-[11px] leading-5 text-[#66708d]">
        {copy.localOnlyHint} {copy.formulasReadOnly}
      </div>

      {message ? (
        <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-[12px] font-semibold text-emerald-700">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-[12px] font-semibold text-rose-700">
          {error}
        </div>
      ) : null}
      {view.truncated ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-[12px] font-semibold text-amber-800">
          {copy.truncated}
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-2 sm:p-3">
        <div className="mb-2 flex min-h-10 items-center gap-1 overflow-x-auto rounded-xl border border-[#dfe4f1] bg-white p-1">
          <span className="shrink-0 px-2 text-[11px] font-bold uppercase tracking-wide text-[#7b839d]">
            {copy.sheet}
          </span>
          {sheetNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setActiveSheetName(name)}
              className={
                name === activeSheetName
                  ? "shrink-0 rounded-lg bg-[#3b6ef8] px-3 py-1.5 text-[12px] font-bold text-white"
                  : "shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-[#555f7c] hover:bg-[#f1f4fb]"
              }
            >
              {name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#dfe4f1] bg-white text-[13px] font-semibold text-[#69728d]">
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            {copy.loading}
          </div>
        ) : activeSheetName ? (
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl border border-[#dfe4f1] bg-white">
            <ArctorTabulator
              data={view.rows}
              columns={columns}
              rowKey="__rowId"
              height={standalone ? "calc(100dvh - 190px)" : "62vh"}
              editMode
              adaptiveTouchEditing
              mobileHorizontalScroll
              allowNativePinchZoom
              rangeClipboard
              onCellEdited={handleCellEdited}
              onRangePaste={handleRangePaste}
              options={{
                history: true,
                columnHeaderVertAlign: "middle",
              }}
            />
          </div>
        ) : null}
      </div>
    </section>
  );

  return (
    <LocalEditorStandaloneFrame active={standalone} onExit={exitStandalone}>
      {content}
    </LocalEditorStandaloneFrame>
  );
}
