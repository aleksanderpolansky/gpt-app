"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  Redo2,
  ShieldCheck,
  Trash2,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LocalEditorStandaloneFrame } from "@/components/local-editors/local-editor-standalone-frame";
import {
  ArctorTabulator,
  type ArctorTableCellClickEvent,
  type ArctorTableCellEditedEvent,
  type ArctorTableColumn,
  type ArctorTableRangePasteEvent,
} from "@/components/tables/arctor-tabulator";
import { type LocaleCode } from "@/i18n";
import { saveLocalEditorBlob } from "@/lib/local-editors/local-file-runtime";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const ARCTOR_BLANK_SPREADSHEET_MIME = "application/x-arctor-local-xlsx-template";
const MAX_VISIBLE_ROWS = 5000;
const MAX_VISIBLE_COLUMNS = 128;
const EXTRA_VISIBLE_ROWS = 20;
const EXTRA_VISIBLE_COLUMNS = 4;
const MAX_HISTORY_ENTRIES = 40;
const MAX_BULK_STRUCTURE_COUNT = 50;
const BULK_STRUCTURE_COUNTS = Array.from(
  { length: MAX_BULK_STRUCTURE_COUNT },
  (_, index) => index + 1,
);

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

type SpreadsheetSelection = {
  rowIndex: number;
  columnIndex: number;
};

type WorksheetHistoryEntry = {
  sheetName: string;
  before: XlsxWorksheet;
  after: XlsxWorksheet;
  beforeSelection: SpreadsheetSelection;
  afterSelection: SpreadsheetSelection;
};

type StructuralAction =
  | "rowAbove"
  | "rowBelow"
  | "deleteRow"
  | "columnLeft"
  | "columnRight"
  | "deleteColumn";

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
  selected: string;
  rowAbove: string;
  rowBelow: string;
  deleteRow: string;
  columnLeft: string;
  columnRight: string;
  deleteColumn: string;
  undo: string;
  redo: string;
  structuralBlocked: string;
  outsideUsedRange: string;
  newSheet: string;
  renameSheet: string;
  deleteSheet: string;
  structureCount: string;
  sheetNamePrompt: string;
  invalidSheetName: string;
  duplicateSheetName: string;
  cannotDeleteLastSheet: string;
  sheetHistoryReset: string;
  sheetStructureBlocked: string;
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
    selected: "Selected",
    rowAbove: "Insert row above",
    rowBelow: "Insert row below",
    deleteRow: "Delete row",
    columnLeft: "Insert column left",
    columnRight: "Insert column right",
    deleteColumn: "Delete column",
    undo: "Undo",
    redo: "Redo",
    structuralBlocked: "Row/column changes are disabled for workbooks containing formulas, merged cells, filters, or named ranges to avoid breaking references.",
    outsideUsedRange: "Choose a row or column inside the used sheet area.",
    newSheet: "New sheet",
    renameSheet: "Rename sheet",
    deleteSheet: "Delete sheet",
    structureCount: "Count",
    sheetNamePrompt: "Sheet name",
    invalidSheetName: "Use 1–31 characters and do not use : \\ / ? * [ ].",
    duplicateSheetName: "A sheet with that name already exists.",
    cannotDeleteLastSheet: "The last worksheet cannot be deleted.",
    sheetHistoryReset: "Sheet structure changed. Undo history was reset.",
    sheetStructureBlocked: "Rename/delete is disabled while the workbook contains formulas, merged cells, filters, or named ranges.",
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
    selected: "Wybrano",
    rowAbove: "Wstaw wiersz powyżej",
    rowBelow: "Wstaw wiersz poniżej",
    deleteRow: "Usuń wiersz",
    columnLeft: "Wstaw kolumnę po lewej",
    columnRight: "Wstaw kolumnę po prawej",
    deleteColumn: "Usuń kolumnę",
    undo: "Cofnij",
    redo: "Ponów",
    structuralBlocked: "Zmiany wierszy i kolumn są wyłączone dla skoroszytów z formułami, scalonymi komórkami, filtrami lub nazwanymi zakresami, aby nie uszkodzić odwołań.",
    outsideUsedRange: "Wybierz wiersz lub kolumnę w używanym obszarze arkusza.",
    newSheet: "Nowy arkusz",
    renameSheet: "Zmień nazwę",
    deleteSheet: "Usuń arkusz",
    structureCount: "Liczba",
    sheetNamePrompt: "Nazwa arkusza",
    invalidSheetName: "Użyj 1–31 znaków i nie używaj : \\ / ? * [ ].",
    duplicateSheetName: "Arkusz o tej nazwie już istnieje.",
    cannotDeleteLastSheet: "Nie można usunąć ostatniego arkusza.",
    sheetHistoryReset: "Zmieniono strukturę arkuszy. Historia cofania została wyzerowana.",
    sheetStructureBlocked: "Zmiana nazwy/usuwanie jest wyłączone, gdy skoroszyt zawiera formuły, scalone komórki, filtry lub nazwane zakresy.",
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
    selected: "Выбрано",
    rowAbove: "Вставить строку выше",
    rowBelow: "Вставить строку ниже",
    deleteRow: "Удалить строку",
    columnLeft: "Вставить столбец слева",
    columnRight: "Вставить столбец справа",
    deleteColumn: "Удалить столбец",
    undo: "Отменить",
    redo: "Повторить",
    structuralBlocked: "Изменение строк и столбцов отключено для книг с формулами, объединёнными ячейками, фильтрами или именованными диапазонами, чтобы не повредить ссылки.",
    outsideUsedRange: "Выберите строку или столбец внутри используемой области листа.",
    newSheet: "Новый лист",
    renameSheet: "Переименовать лист",
    deleteSheet: "Удалить лист",
    structureCount: "Количество",
    sheetNamePrompt: "Название листа",
    invalidSheetName: "Используйте 1–31 символ и не используйте : \\ / ? * [ ].",
    duplicateSheetName: "Лист с таким названием уже существует.",
    cannotDeleteLastSheet: "Нельзя удалить последний лист.",
    sheetHistoryReset: "Структура листов изменена. История отмены сброшена.",
    sheetStructureBlocked: "Переименование и удаление отключены, пока книга содержит формулы, объединённые ячейки, фильтры или именованные диапазоны.",
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
    selected: "Вибрано",
    rowAbove: "Вставити рядок вище",
    rowBelow: "Вставити рядок нижче",
    deleteRow: "Видалити рядок",
    columnLeft: "Вставити стовпець ліворуч",
    columnRight: "Вставити стовпець праворуч",
    deleteColumn: "Видалити стовпець",
    undo: "Скасувати",
    redo: "Повторити",
    structuralBlocked: "Зміни рядків і стовпців вимкнено для книг із формулами, об’єднаними клітинками, фільтрами або іменованими діапазонами, щоб не пошкодити посилання.",
    outsideUsedRange: "Виберіть рядок або стовпець у використаній області аркуша.",
    newSheet: "Новий аркуш",
    renameSheet: "Перейменувати аркуш",
    deleteSheet: "Видалити аркуш",
    structureCount: "Кількість",
    sheetNamePrompt: "Назва аркуша",
    invalidSheetName: "Використовуйте 1–31 символ і не використовуйте : \\ / ? * [ ].",
    duplicateSheetName: "Аркуш із такою назвою вже існує.",
    cannotDeleteLastSheet: "Не можна видалити останній аркуш.",
    sheetHistoryReset: "Структуру аркушів змінено. Історію скасування очищено.",
    sheetStructureBlocked: "Перейменування та видалення вимкнено, поки книга містить формули, об’єднані клітинки, фільтри або іменовані діапазони.",
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
    selected: "Ausgewählt",
    rowAbove: "Zeile oberhalb einfügen",
    rowBelow: "Zeile unterhalb einfügen",
    deleteRow: "Zeile löschen",
    columnLeft: "Spalte links einfügen",
    columnRight: "Spalte rechts einfügen",
    deleteColumn: "Spalte löschen",
    undo: "Rückgängig",
    redo: "Wiederholen",
    structuralBlocked: "Zeilen- und Spaltenänderungen sind bei Arbeitsmappen mit Formeln, verbundenen Zellen, Filtern oder benannten Bereichen deaktiviert, damit Verweise nicht beschädigt werden.",
    outsideUsedRange: "Wählen Sie eine Zeile oder Spalte innerhalb des verwendeten Blattbereichs.",
    newSheet: "Neues Blatt",
    renameSheet: "Blatt umbenennen",
    deleteSheet: "Blatt löschen",
    structureCount: "Anzahl",
    sheetNamePrompt: "Blattname",
    invalidSheetName: "Verwenden Sie 1–31 Zeichen und nicht : \\ / ? * [ ].",
    duplicateSheetName: "Ein Blatt mit diesem Namen existiert bereits.",
    cannotDeleteLastSheet: "Das letzte Arbeitsblatt kann nicht gelöscht werden.",
    sheetHistoryReset: "Die Blattstruktur wurde geändert. Der Rückgängig-Verlauf wurde zurückgesetzt.",
    sheetStructureBlocked: "Umbenennen/Löschen ist deaktiviert, solange die Arbeitsmappe Formeln, verbundene Zellen, Filter oder benannte Bereiche enthält.",
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
    selected: "Seleccionado",
    rowAbove: "Insertar fila arriba",
    rowBelow: "Insertar fila abajo",
    deleteRow: "Eliminar fila",
    columnLeft: "Insertar columna a la izquierda",
    columnRight: "Insertar columna a la derecha",
    deleteColumn: "Eliminar columna",
    undo: "Deshacer",
    redo: "Rehacer",
    structuralBlocked: "Los cambios de filas y columnas están desactivados en libros con fórmulas, celdas combinadas, filtros o rangos con nombre para no romper referencias.",
    outsideUsedRange: "Selecciona una fila o columna dentro del área utilizada de la hoja.",
    newSheet: "Nueva hoja",
    renameSheet: "Renombrar hoja",
    deleteSheet: "Eliminar hoja",
    structureCount: "Cantidad",
    sheetNamePrompt: "Nombre de la hoja",
    invalidSheetName: "Usa entre 1 y 31 caracteres y no uses : \\ / ? * [ ].",
    duplicateSheetName: "Ya existe una hoja con ese nombre.",
    cannotDeleteLastSheet: "No se puede eliminar la última hoja.",
    sheetHistoryReset: "Cambió la estructura de hojas. Se reinició el historial de deshacer.",
    sheetStructureBlocked: "Renombrar/eliminar está desactivado mientras el libro contenga fórmulas, celdas combinadas, filtros o rangos con nombre.",
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
    selected: "Vybráno",
    rowAbove: "Vložit řádek nad",
    rowBelow: "Vložit řádek pod",
    deleteRow: "Odstranit řádek",
    columnLeft: "Vložit sloupec vlevo",
    columnRight: "Vložit sloupec vpravo",
    deleteColumn: "Odstranit sloupec",
    undo: "Zpět",
    redo: "Znovu",
    structuralBlocked: "Změny řádků a sloupců jsou u sešitů se vzorci, sloučenými buňkami, filtry nebo pojmenovanými oblastmi vypnuté, aby se nepoškodily odkazy.",
    outsideUsedRange: "Vyberte řádek nebo sloupec v používané oblasti listu.",
    newSheet: "Nový list",
    renameSheet: "Přejmenovat list",
    deleteSheet: "Odstranit list",
    structureCount: "Počet",
    sheetNamePrompt: "Název listu",
    invalidSheetName: "Použijte 1–31 znaků a nepoužívejte : \\ / ? * [ ].",
    duplicateSheetName: "List s tímto názvem již existuje.",
    cannotDeleteLastSheet: "Poslední list nelze odstranit.",
    sheetHistoryReset: "Struktura listů se změnila. Historie zpět byla vymazána.",
    sheetStructureBlocked: "Přejmenování/odstranění je vypnuto, pokud sešit obsahuje vzorce, sloučené buňky, filtry nebo pojmenované oblasti.",
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

function cloneWorksheet(sheet: XlsxWorksheet): XlsxWorksheet {
  return structuredClone(sheet) as XlsxWorksheet;
}

function isArctorBlankWorkbookFile(file: File): boolean {
  return file.size === 0 && file.type === ARCTOR_BLANK_SPREADSHEET_MIME;
}

function createBlankWorkbook(xlsx: XlsxModule): XlsxWorkbook {
  const workbook = xlsx.utils.book_new();
  const sheet = xlsx.utils.aoa_to_sheet([[]]);
  xlsx.utils.book_append_sheet(workbook, sheet, "Sheet1");
  return workbook;
}

function isValidSheetName(name: string): boolean {
  return (
    name.length >= 1 &&
    name.length <= 31 &&
    !/[:\\/?*\[\]]/.test(name) &&
    !name.startsWith("'") &&
    !name.endsWith("'")
  );
}

function nextAvailableSheetName(sheetNames: string[]): string {
  const used = new Set(sheetNames.map((name) => name.toLocaleLowerCase()));
  for (let index = 1; index <= 9999; index += 1) {
    const candidate = `Sheet${index}`;
    if (!used.has(candidate.toLocaleLowerCase())) return candidate;
  }
  return `Sheet-${Date.now()}`;
}

function updateWorkbookSheetMetadataName(
  workbook: XlsxWorkbook,
  index: number,
  name: string,
) {
  const workbookMeta = workbook.Workbook as
    | { Sheets?: Array<Record<string, unknown> & { name?: string }> }
    | undefined;
  const sheets = workbookMeta?.Sheets;
  if (!Array.isArray(sheets) || !sheets[index]) return;
  sheets[index] = { ...sheets[index], name };
}

function removeWorkbookSheetMetadata(workbook: XlsxWorkbook, index: number) {
  const workbookMeta = workbook.Workbook as
    | { Sheets?: Array<Record<string, unknown> & { name?: string }> }
    | undefined;
  const sheets = workbookMeta?.Sheets;
  if (!Array.isArray(sheets) || index < 0 || index >= sheets.length) return;
  sheets.splice(index, 1);
}

function isWorksheetCellAddress(key: string): boolean {
  return /^[A-Z]{1,3}[1-9]\d*$/.test(key);
}

function workbookHasUnsafeStructuralReferences(workbook: XlsxWorkbook): boolean {
  const workbookMeta = workbook.Workbook as { Names?: unknown[] } | undefined;
  if (Array.isArray(workbookMeta?.Names) && workbookMeta.Names.length > 0) {
    return true;
  }

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    if (Array.isArray(sheet["!merges"]) && sheet["!merges"].length > 0) return true;
    if (sheet["!autofilter"]) return true;

    for (const [key, value] of Object.entries(sheet)) {
      if (!isWorksheetCellAddress(key) || !value || typeof value !== "object") continue;
      const cell = value as XlsxCell & { F?: string };
      if (typeof cell.f === "string" || typeof cell.F === "string") return true;
    }
  }

  return false;
}

function shiftWorksheetAxis(
  xlsx: XlsxModule,
  sheet: XlsxWorksheet,
  axis: "row" | "column",
  index: number,
  mode: "insert" | "delete",
): boolean {
  const range = safeSheetRange(xlsx, sheet);
  const end = axis === "row" ? range.e.r : range.e.c;
  const affectsUsedRange = mode === "insert" ? index <= end + 1 : index <= end;
  if (!affectsUsedRange) return false;

  const sheetRecord = sheet as unknown as Record<string, unknown>;
  const cells = Object.entries(sheetRecord).filter(([key]) => isWorksheetCellAddress(key));
  for (const [key] of cells) delete sheetRecord[key];

  for (const [key, value] of cells) {
    const address = xlsx.utils.decode_cell(key);
    const coordinate = axis === "row" ? address.r : address.c;
    if (mode === "delete" && coordinate === index) continue;

    const shifted =
      mode === "insert"
        ? coordinate >= index
          ? coordinate + 1
          : coordinate
        : coordinate > index
          ? coordinate - 1
          : coordinate;

    if (axis === "row") address.r = shifted;
    else address.c = shifted;
    sheetRecord[xlsx.utils.encode_cell(address)] = value;
  }

  const metadataKey = axis === "row" ? "!rows" : "!cols";
  const metadata = sheetRecord[metadataKey];
  if (Array.isArray(metadata)) {
    const next = [...metadata];
    if (mode === "insert") next.splice(index, 0, undefined);
    else next.splice(index, 1);
    sheetRecord[metadataKey] = next;
  }

  const nextRange = structuredClone(range);
  if (axis === "row") {
    if (mode === "insert") {
      if (index <= nextRange.s.r) {
        nextRange.s.r += 1;
        nextRange.e.r += 1;
      } else if (index <= nextRange.e.r + 1) {
        nextRange.e.r += 1;
      }
    } else if (index < nextRange.s.r) {
      nextRange.s.r = Math.max(0, nextRange.s.r - 1);
      nextRange.e.r = Math.max(nextRange.s.r, nextRange.e.r - 1);
    } else if (index <= nextRange.e.r) {
      nextRange.e.r = Math.max(nextRange.s.r, nextRange.e.r - 1);
    }
  } else if (mode === "insert") {
    if (index <= nextRange.s.c) {
      nextRange.s.c += 1;
      nextRange.e.c += 1;
    } else if (index <= nextRange.e.c + 1) {
      nextRange.e.c += 1;
    }
  } else if (index < nextRange.s.c) {
    nextRange.s.c = Math.max(0, nextRange.s.c - 1);
    nextRange.e.c = Math.max(nextRange.s.c, nextRange.e.c - 1);
  } else if (index <= nextRange.e.c) {
    nextRange.e.c = Math.max(nextRange.s.c, nextRange.e.c - 1);
  }

  sheet["!ref"] = xlsx.utils.encode_range(nextRange);
  return true;
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
  const undoHistoryRef = useRef<WorksheetHistoryEntry[]>([]);
  const redoHistoryRef = useRef<WorksheetHistoryEntry[]>([]);
  const historyBaseDirtyRef = useRef(false);
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);
  const [selection, setSelection] = useState<SpreadsheetSelection>({
    rowIndex: 0,
    columnIndex: 0,
  });
  const [structuralBlocked, setStructuralBlocked] = useState(false);
  const [structuralCount, setStructuralCount] = useState(1);

  const setDirtyState = useCallback(
    (next: boolean) => {
      setDirty(next);
      onDirtyChange?.(next);
    },
    [onDirtyChange],
  );

  const syncHistoryCounts = useCallback(() => {
    setUndoCount(undoHistoryRef.current.length);
    setRedoCount(redoHistoryRef.current.length);
  }, []);

  const pushHistory = useCallback(
    (entry: WorksheetHistoryEntry) => {
      undoHistoryRef.current.push(entry);
      if (undoHistoryRef.current.length > MAX_HISTORY_ENTRIES) {
        undoHistoryRef.current.shift();
      }
      redoHistoryRef.current = [];
      syncHistoryCounts();
    },
    [syncHistoryCounts],
  );

  const clearHistory = useCallback(
    (baseDirty = false) => {
      undoHistoryRef.current = [];
      redoHistoryRef.current = [];
      historyBaseDirtyRef.current = baseDirty;
      syncHistoryCounts();
    },
    [syncHistoryCounts],
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
        const blankWorkbook = isArctorBlankWorkbookFile(file);
        const workbook = blankWorkbook
          ? createBlankWorkbook(xlsx)
          : xlsx.read(await file.arrayBuffer(), {
              type: "array",
              cellDates: true,
              cellFormula: true,
              cellNF: true,
              cellStyles: true,
            });
        if (cancelled) return;

        xlsxRef.current = xlsx;
        workbookRef.current = workbook;
        setStructuralBlocked(workbookHasUnsafeStructuralReferences(workbook));
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
        historyBaseDirtyRef.current = blankWorkbook;
        if (blankWorkbook) setDirtyState(true);
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
      const before = cloneWorksheet(sheet);
      const previous = sheet[address] as XlsxCell | undefined;
      sheet[address] = normalizeEditedCellValue(event.value, previous);
      extendSheetReference(xlsx, sheet, rowIndex, columnIndex);
      const nextSelection = { rowIndex, columnIndex };
      setSelection(nextSelection);
      pushHistory({
        sheetName: activeSheetName,
        before,
        after: cloneWorksheet(sheet),
        beforeSelection: nextSelection,
        afterSelection: nextSelection,
      });
      setDirtyState(true);
      setMessage(null);
      setError(null);
    },
    [activeSheetName, pushHistory, setDirtyState],
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

      const before = cloneWorksheet(sheet);
      let nextSelection = selection;
      const firstCell = event.cells[0];
      if (firstCell?.field.startsWith("c")) {
        const firstColumn = Number(firstCell.field.slice(1));
        if (Number.isInteger(firstColumn) && firstColumn >= 0) {
          nextSelection = {
            rowIndex: firstCell.row.__rowNumber - 1,
            columnIndex: firstColumn,
          };
        }
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

      setSelection(nextSelection);
      pushHistory({
        sheetName: activeSheetName,
        before,
        after: cloneWorksheet(sheet),
        beforeSelection: nextSelection,
        afterSelection: nextSelection,
      });
      setDirtyState(true);
      setError(null);
      setMessage(null);
      setView(buildSpreadsheetView(xlsx, sheet));
    },
    [activeSheetName, copy.pasteBlocked, pushHistory, selection, setDirtyState],
  );

  const handleCellClick = useCallback(
    (event: ArctorTableCellClickEvent<SpreadsheetRow>) => {
      const rowIndex = event.row.__rowNumber - 1;
      if (event.field === "__rowNumber") {
        setSelection((current) => ({ ...current, rowIndex }));
        return;
      }
      if (!event.field.startsWith("c")) return;
      const columnIndex = Number(event.field.slice(1));
      if (!Number.isInteger(columnIndex) || columnIndex < 0) return;
      setSelection({ rowIndex, columnIndex });
    },
    [],
  );

  const applyStructuralOperation = useCallback(
    (action: StructuralAction) => {
      const xlsx = xlsxRef.current;
      const workbook = workbookRef.current;
      if (!xlsx || !workbook || !activeSheetName) return;
      if (structuralBlocked) {
        setError(copy.structuralBlocked);
        return;
      }
      const sheet = workbook.Sheets[activeSheetName];
      if (!sheet) return;

      const before = cloneWorksheet(sheet);
      const beforeSelection = selection;
      let nextSelection = selection;
      const count = Math.max(1, Math.min(MAX_BULK_STRUCTURE_COUNT, structuralCount));
      const repeatAxisShift = (
        axis: "row" | "column",
        index: number,
        mode: "insert" | "delete",
      ) => {
        for (let step = 0; step < count; step += 1) {
          if (!shiftWorksheetAxis(xlsx, sheet, axis, index, mode)) return false;
        }
        return true;
      };
      let changed = false;

      if (action === "rowAbove") {
        changed = repeatAxisShift("row", selection.rowIndex, "insert");
      } else if (action === "rowBelow") {
        const target = selection.rowIndex + 1;
        changed = repeatAxisShift("row", target, "insert");
        nextSelection = { ...selection, rowIndex: target };
      } else if (action === "deleteRow") {
        changed = repeatAxisShift("row", selection.rowIndex, "delete");
      } else if (action === "columnLeft") {
        changed = repeatAxisShift("column", selection.columnIndex, "insert");
      } else if (action === "columnRight") {
        const target = selection.columnIndex + 1;
        changed = repeatAxisShift("column", target, "insert");
        nextSelection = { ...selection, columnIndex: target };
      } else {
        changed = repeatAxisShift("column", selection.columnIndex, "delete");
      }

      if (!changed) {
        workbook.Sheets[activeSheetName] = before;
        setView(buildSpreadsheetView(xlsx, before));
        setError(copy.outsideUsedRange);
        return;
      }

      const nextView = buildSpreadsheetView(xlsx, sheet);
      if (action === "deleteRow") {
        nextSelection = {
          ...nextSelection,
          rowIndex: Math.min(nextSelection.rowIndex, Math.max(0, nextView.sourceRows - 1)),
        };
      } else if (action === "deleteColumn") {
        nextSelection = {
          ...nextSelection,
          columnIndex: Math.min(
            nextSelection.columnIndex,
            Math.max(0, nextView.sourceColumns - 1),
          ),
        };
      }

      pushHistory({
        sheetName: activeSheetName,
        before,
        after: cloneWorksheet(sheet),
        beforeSelection,
        afterSelection: nextSelection,
      });
      setSelection(nextSelection);
      setView(nextView);
      setDirtyState(true);
      setMessage(null);
      setError(null);
    },
    [
      activeSheetName,
      copy.outsideUsedRange,
      copy.structuralBlocked,
      pushHistory,
      selection,
      setDirtyState,
      structuralBlocked,
      structuralCount,
    ],
  );

  const addSheet = useCallback(() => {
    const xlsx = xlsxRef.current;
    const workbook = workbookRef.current;
    if (!xlsx || !workbook) return;

    const name = nextAvailableSheetName(workbook.SheetNames);
    const sheet = xlsx.utils.aoa_to_sheet([[]]);
    xlsx.utils.book_append_sheet(workbook, sheet, name);
    setSheetNames([...workbook.SheetNames]);
    setActiveSheetName(name);
    setSelection({ rowIndex: 0, columnIndex: 0 });
    setView(buildSpreadsheetView(xlsx, sheet));
    setStructuralBlocked(workbookHasUnsafeStructuralReferences(workbook));
    clearHistory(true);
    setDirtyState(true);
    setMessage(copy.sheetHistoryReset);
    setError(null);
  }, [clearHistory, copy.sheetHistoryReset, setDirtyState]);

  const renameActiveSheet = useCallback(() => {
    const workbook = workbookRef.current;
    if (!workbook || !activeSheetName) return;
    if (structuralBlocked) {
      setError(copy.sheetStructureBlocked);
      return;
    }

    const prompted = window.prompt(copy.sheetNamePrompt, activeSheetName);
    if (prompted == null) return;
    const nextName = prompted.trim();
    if (nextName === activeSheetName) return;
    if (!isValidSheetName(nextName)) {
      setError(copy.invalidSheetName);
      return;
    }
    if (
      workbook.SheetNames.some(
        (name) =>
          name !== activeSheetName &&
          name.toLocaleLowerCase() === nextName.toLocaleLowerCase(),
      )
    ) {
      setError(copy.duplicateSheetName);
      return;
    }

    const index = workbook.SheetNames.indexOf(activeSheetName);
    const sheet = workbook.Sheets[activeSheetName];
    if (index < 0 || !sheet) return;
    delete workbook.Sheets[activeSheetName];
    workbook.Sheets[nextName] = sheet;
    workbook.SheetNames[index] = nextName;
    updateWorkbookSheetMetadataName(workbook, index, nextName);
    setSheetNames([...workbook.SheetNames]);
    setActiveSheetName(nextName);
    clearHistory(true);
    setDirtyState(true);
    setMessage(copy.sheetHistoryReset);
    setError(null);
  }, [
    activeSheetName,
    clearHistory,
    copy.duplicateSheetName,
    copy.invalidSheetName,
    copy.sheetHistoryReset,
    copy.sheetNamePrompt,
    copy.sheetStructureBlocked,
    setDirtyState,
    structuralBlocked,
  ]);

  const deleteActiveSheet = useCallback(() => {
    const xlsx = xlsxRef.current;
    const workbook = workbookRef.current;
    if (!xlsx || !workbook || !activeSheetName) return;
    if (structuralBlocked) {
      setError(copy.sheetStructureBlocked);
      return;
    }
    if (workbook.SheetNames.length <= 1) {
      setError(copy.cannotDeleteLastSheet);
      return;
    }
    if (!window.confirm(`${copy.deleteSheet}: ${activeSheetName}?`)) return;

    const index = workbook.SheetNames.indexOf(activeSheetName);
    if (index < 0) return;
    delete workbook.Sheets[activeSheetName];
    workbook.SheetNames.splice(index, 1);
    removeWorkbookSheetMetadata(workbook, index);
    const nextName = workbook.SheetNames[Math.min(index, workbook.SheetNames.length - 1)];
    const nextSheet = nextName ? workbook.Sheets[nextName] : undefined;
    if (!nextName || !nextSheet) return;

    setSheetNames([...workbook.SheetNames]);
    setActiveSheetName(nextName);
    setSelection({ rowIndex: 0, columnIndex: 0 });
    setView(buildSpreadsheetView(xlsx, nextSheet));
    setStructuralBlocked(workbookHasUnsafeStructuralReferences(workbook));
    clearHistory(true);
    setDirtyState(true);
    setMessage(copy.sheetHistoryReset);
    setError(null);
  }, [
    activeSheetName,
    clearHistory,
    copy.cannotDeleteLastSheet,
    copy.deleteSheet,
    copy.sheetHistoryReset,
    copy.sheetStructureBlocked,
    setDirtyState,
    structuralBlocked,
  ]);

  const undoWorkbookChange = useCallback(() => {
    const xlsx = xlsxRef.current;
    const workbook = workbookRef.current;
    const entry = undoHistoryRef.current.pop();
    if (!xlsx || !workbook || !entry) return;

    const restored = cloneWorksheet(entry.before);
    workbook.Sheets[entry.sheetName] = restored;
    redoHistoryRef.current.push(entry);
    setActiveSheetName(entry.sheetName);
    setSelection(entry.beforeSelection);
    setView(buildSpreadsheetView(xlsx, restored));
    setStructuralBlocked(workbookHasUnsafeStructuralReferences(workbook));
    setDirtyState(historyBaseDirtyRef.current || undoHistoryRef.current.length > 0);
    setMessage(null);
    setError(null);
    syncHistoryCounts();
  }, [setDirtyState, syncHistoryCounts]);

  const redoWorkbookChange = useCallback(() => {
    const xlsx = xlsxRef.current;
    const workbook = workbookRef.current;
    const entry = redoHistoryRef.current.pop();
    if (!xlsx || !workbook || !entry) return;

    const restored = cloneWorksheet(entry.after);
    workbook.Sheets[entry.sheetName] = restored;
    undoHistoryRef.current.push(entry);
    setActiveSheetName(entry.sheetName);
    setSelection(entry.afterSelection);
    setView(buildSpreadsheetView(xlsx, restored));
    setStructuralBlocked(workbookHasUnsafeStructuralReferences(workbook));
    setDirtyState(true);
    setMessage(null);
    setError(null);
    syncHistoryCounts();
  }, [setDirtyState, syncHistoryCounts]);

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
        clearHistory(false);
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
  }, [clearHistory, copy.cancelled, copy.saved, file.name, setDirtyState]);

  const exitStandalone = useCallback(() => setStandalone(false), []);

  const content = (
    <section
      className={
        standalone
          ? "flex h-[100dvh] w-screen min-w-0 flex-col overflow-hidden bg-[#edf0f6]"
          : "w-full max-w-full min-w-0 overflow-hidden rounded-[26px] border border-black/[0.07] bg-white shadow-sm"
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
              onClick={() => {
                setSelection({ rowIndex: 0, columnIndex: 0 });
                setActiveSheetName(name);
              }}
              className={
                name === activeSheetName
                  ? "shrink-0 rounded-lg bg-[#3b6ef8] px-3 py-1.5 text-[12px] font-bold text-white"
                  : "shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-[#555f7c] hover:bg-[#f1f4fb]"
              }
            >
              {name}
            </button>
          ))}
          <span className="mx-1 h-6 w-px shrink-0 bg-[#e1e5ef]" />
          <button type="button" onClick={addSheet} title={copy.newSheet} className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg border border-[#dce2f2] px-2.5 text-[11px] font-bold text-[#3657b6]">
            {copy.newSheet}
          </button>
          <button type="button" onClick={renameActiveSheet} disabled={!activeSheetName || structuralBlocked} title={copy.renameSheet} className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg border border-[#dce2f2] px-2.5 text-[11px] font-bold text-[#445477] disabled:opacity-35">
            {copy.renameSheet}
          </button>
          <button type="button" onClick={deleteActiveSheet} disabled={sheetNames.length <= 1 || structuralBlocked} title={copy.deleteSheet} className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg border border-rose-200 px-2.5 text-[11px] font-bold text-rose-600 disabled:opacity-35">
            <Trash2 size={14} aria-hidden="true" /> {copy.deleteSheet}
          </button>
        </div>

        <div className="mb-2 flex min-h-10 items-center gap-1 overflow-x-auto rounded-xl border border-[#dfe4f1] bg-white p-1">
          <span className="shrink-0 px-2 text-[11px] font-bold text-[#69728d]">
            {copy.selected}: {columnLabel(selection.columnIndex)}{selection.rowIndex + 1}
          </span>
          <label className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg border border-[#dce2f2] px-2 text-[11px] font-bold text-[#69728d]">
            <span>{copy.structureCount}</span>
            <select
              value={structuralCount}
              onChange={(event) => setStructuralCount(Number(event.target.value))}
              className="bg-transparent text-[11px] font-bold text-[#3657b6] outline-none"
              aria-label={copy.structureCount}
            >
              {BULK_STRUCTURE_COUNTS.map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={undoWorkbookChange} disabled={undoCount === 0} title={copy.undo} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg border border-[#dce2f2] px-2.5 text-[11px] font-bold text-[#445477] disabled:opacity-35">
            <Undo2 size={14} aria-hidden="true" /> {copy.undo}
          </button>
          <button type="button" onClick={redoWorkbookChange} disabled={redoCount === 0} title={copy.redo} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg border border-[#dce2f2] px-2.5 text-[11px] font-bold text-[#445477] disabled:opacity-35">
            <Redo2 size={14} aria-hidden="true" /> {copy.redo}
          </button>
          <button type="button" onClick={() => applyStructuralOperation("rowAbove")} disabled={loading || structuralBlocked} title={copy.rowAbove} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg border border-[#dce2f2] px-2.5 text-[11px] font-bold text-[#3657b6] disabled:opacity-35">
            <ArrowUp size={14} aria-hidden="true" /> {copy.rowAbove}
          </button>
          <button type="button" onClick={() => applyStructuralOperation("rowBelow")} disabled={loading || structuralBlocked} title={copy.rowBelow} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg border border-[#dce2f2] px-2.5 text-[11px] font-bold text-[#3657b6] disabled:opacity-35">
            <ArrowDown size={14} aria-hidden="true" /> {copy.rowBelow}
          </button>
          <button type="button" onClick={() => applyStructuralOperation("deleteRow")} disabled={loading || structuralBlocked} title={copy.deleteRow} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg border border-rose-200 px-2.5 text-[11px] font-bold text-rose-600 disabled:opacity-35">
            <Trash2 size={14} aria-hidden="true" /> {copy.deleteRow}
          </button>
          <button type="button" onClick={() => applyStructuralOperation("columnLeft")} disabled={loading || structuralBlocked} title={copy.columnLeft} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg border border-[#dce2f2] px-2.5 text-[11px] font-bold text-[#3657b6] disabled:opacity-35">
            <ArrowLeft size={14} aria-hidden="true" /> {copy.columnLeft}
          </button>
          <button type="button" onClick={() => applyStructuralOperation("columnRight")} disabled={loading || structuralBlocked} title={copy.columnRight} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg border border-[#dce2f2] px-2.5 text-[11px] font-bold text-[#3657b6] disabled:opacity-35">
            <ArrowRight size={14} aria-hidden="true" /> {copy.columnRight}
          </button>
          <button type="button" onClick={() => applyStructuralOperation("deleteColumn")} disabled={loading || structuralBlocked} title={copy.deleteColumn} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg border border-rose-200 px-2.5 text-[11px] font-bold text-rose-600 disabled:opacity-35">
            <Trash2 size={14} aria-hidden="true" /> {copy.deleteColumn}
          </button>
        </div>

        {structuralBlocked ? (
          <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-5 text-amber-800">
            {copy.structuralBlocked}
          </div>
        ) : null}

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
              onCellClick={handleCellClick}
              onCellEdited={handleCellEdited}
              onRangePaste={handleRangePaste}
              options={{
                history: false,
                editTriggerEvent: "dblclick",
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
