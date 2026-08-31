"use client";

import "tabulator-tables/dist/css/tabulator.min.css";
import "./arctor-tabulator.css";

import { useEffect, useRef } from "react";

import { serializeArctorClipboardMatrix } from "./arctor-clipboard";
import { shouldBypassArctorRangeCopyForNativeSelection } from "./arctor-clipboard";

type TablePrimitive = string | number | boolean | null | undefined;

type ExpandedEditorKind =
  | "arctor-expanded-input"
  | "arctor-expanded-textarea";

export type ArctorTableCellApi<T extends object> = {
  getRow: () => { getData: () => T };
  getField: () => string;
  getValue: () => unknown;
};

export type ArctorTableColumn<T extends object> = {
  title: string;
  field: keyof T & string;
  width?: number;
  minWidth?: number;
  widthGrow?: number;
  widthShrink?: number;
  frozen?: boolean;
  hozAlign?: "left" | "center" | "right";
  headerHozAlign?: "left" | "center" | "right";
  cssClass?: string;
  formatter?: string;
  sorter?: string;
  responsive?: number;
  mobileMinWidth?: number;
  mobileWidth?: number;
  mobileFrozen?: boolean;
  visible?: boolean;
  tooltip?: boolean | string;
  editor?: boolean | false | "input" | "textarea" | ExpandedEditorKind;
  editable?: boolean | ((cell: ArctorTableCellApi<T>) => boolean);
  editorParams?: Record<string, unknown>;
};

type TabulatorEditedCellComponent = {
  getRow: () => { getData: () => unknown };
  getField: () => string;
  getValue: () => unknown;
  getOldValue: () => unknown;
  restoreOldValue: () => void;
};

type TabulatorCellEditedEmitter = {
  on: (
    event: "cellEdited",
    callback: (cell: TabulatorEditedCellComponent) => void,
  ) => void;
};

type TabulatorClipboardCopiedEmitter = {
  on: (event: "clipboardCopied", callback: (clipboard: string) => void) => void;
};

type TabulatorRangeColumnComponent = {
  isVisible: () => boolean;
};

type TabulatorRangeCellComponent = {
  getRow: () => TabulatorRangeRowComponent;
  getColumn: () => TabulatorRangeColumnComponent;
  getField: () => string;
  getValue: () => unknown;
};

type TabulatorRangeRowComponent = {
  getData: () => unknown;
  getCells: () => TabulatorRangeCellComponent[];
  getNextRow: () => TabulatorRangeRowComponent | false;
};

type TabulatorRangeComponent = {
  getBounds: () => {
    start: TabulatorRangeCellComponent;
    end: TabulatorRangeCellComponent;
  };
  getStructuredCells: () => TabulatorRangeCellComponent[][];
};

type TabulatorRangeTable = {
  getRanges: () => TabulatorRangeComponent[];
};

type TabulatorCellInteractionComponent = {
  getRow: () => { getData: () => unknown };
  getField: () => string;
  getValue: () => unknown;
  getElement: () => HTMLElement;
  setValue: (value: unknown, mutate?: boolean) => void;
};

type TabulatorCellClickEmitter = {
  on: (
    event: "cellClick",
    callback: (event: Event, cell: TabulatorCellInteractionComponent) => void,
  ) => void;
};

type TabulatorCellDblClickEmitter = {
  on: (
    event: "cellDblClick",
    callback: (event: Event, cell: TabulatorCellInteractionComponent) => void,
  ) => void;
};

type TabulatorEditorCellComponent = {
  getElement: () => HTMLElement;
  getValue: () => unknown;
};

type TabulatorEditor = (
  cell: TabulatorEditorCellComponent,
  onRendered: (callback: () => void) => void,
  success: (value: unknown) => void,
  cancel: () => void,
  editorParams?: Record<string, unknown>,
) => HTMLElement | false;

export type ArctorTableCellClickEvent<T extends object> = {
  row: T;
  field: keyof T & string;
  value: unknown;
};

export type ArctorTableCellEditedEvent<T extends object> = {
  row: T;
  field: keyof T & string;
  value: unknown;
  oldValue: unknown;
  restoreOldValue: () => void;
};

export type ArctorTableRangePasteCell<T extends object> = {
  row: T;
  field: keyof T & string;
  value: string;
  oldValue: unknown;
};

export type ArctorTableRangePasteEvent<T extends object> = {
  cells: ArctorTableRangePasteCell<T>[];
  sourceRows: number;
  sourceColumns: number;
  truncatedCells: number;
};

export type ArctorTableOptions = Record<string, TablePrimitive | object>;

type ArctorTabulatorProps<T extends object> = {
  data: T[];
  columns: ArctorTableColumn<T>[];
  rowKey?: keyof T & string;
  emptyLabel?: string;
  height?: string;
  options?: ArctorTableOptions;
  editMode?: boolean;
  adaptiveTouchEditing?: boolean;
  mobileHorizontalScroll?: boolean;
  allowNativePinchZoom?: boolean;
  rangeClipboard?: boolean;
  onRowClick?: (row: T) => void;
  onCellClick?: (event: ArctorTableCellClickEvent<T>) => void;
  onCellEdited?: (event: ArctorTableCellEditedEvent<T>) => void | Promise<void>;
  onRangeCopied?: (clipboard: string) => void;
  onRangePaste?: (event: ArctorTableRangePasteEvent<T>) => void | Promise<void>;
};

function getSelectionElement(node: Node | null) {
  if (!node) {
    return null;
  }

  return node instanceof Element ? node : node.parentElement;
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      "a,button,input,select,textarea,label,[role='button'],.tabulator-data-tree-control,.arctor-expanded-cell-editor",
    ),
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function readFiniteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function applyElementAttributes(
  element: HTMLInputElement | HTMLTextAreaElement,
  editorParams: Record<string, unknown> | undefined,
) {
  const rawAttributes = editorParams?.elementAttributes;
  if (
    !rawAttributes ||
    typeof rawAttributes !== "object" ||
    Array.isArray(rawAttributes)
  ) {
    return;
  }

  for (const [name, value] of Object.entries(rawAttributes)) {
    if (typeof value === "string" || typeof value === "number") {
      element.setAttribute(name, String(value));
    }
  }
}

function isCompactTouchEnvironment() {
  return (
    window.matchMedia?.("(pointer: coarse)").matches === true ||
    window.innerWidth <= 768
  );
}

type ArctorVirtualKeyboardApi = EventTarget & {
  readonly boundingRect?: {
    top: number;
    height: number;
  };
};

function getArctorVirtualKeyboard() {
  return (
    (navigator as Navigator & { virtualKeyboard?: ArctorVirtualKeyboardApi })
      .virtualKeyboard ?? null
  );
}

export function parseArctorClipboardMatrix(clipboard: string) {
  const source = clipboard.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"';
        index += 1;
        continue;
      }
      if (quoted) {
        quoted = false;
        continue;
      }
      if (cell.length === 0) {
        quoted = true;
        continue;
      }
      cell += character;
      continue;
    }

    if (!quoted && character === "\t") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && source[index + 1] === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += character;
  }

  row.push(cell);
  rows.push(row);

  while (rows.length > 1 && rows[rows.length - 1]?.length === 1 && rows[rows.length - 1]?.[0] === "") {
    rows.pop();
  }

  return rows.length > 0 ? rows : [[""]];
}

function collectRangePasteCells<T extends object>(
  instance: TabulatorRangeTable,
  matrix: string[][],
): ArctorTableRangePasteEvent<T> | null {
  const ranges = instance.getRanges();
  const activeRange = ranges[ranges.length - 1];
  if (!activeRange) {
    return null;
  }

  let startCell: TabulatorRangeCellComponent;
  try {
    const candidate = activeRange.getBounds().start;
    if (
      !candidate ||
      typeof candidate.getRow !== "function" ||
      typeof candidate.getField !== "function"
    ) {
      return null;
    }
    startCell = candidate;
  } catch {
    return null;
  }
  const startField = startCell.getField();
  let currentRow: TabulatorRangeRowComponent | false = startCell.getRow();
  let truncatedCells = 0;
  const cells: ArctorTableRangePasteCell<T>[] = [];
  const sourceColumns = matrix.reduce((maximum, sourceRow) => Math.max(maximum, sourceRow.length), 0);

  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    const sourceRow = matrix[rowIndex] ?? [];
    if (!currentRow) {
      truncatedCells += sourceRow.length;
      continue;
    }

    const visibleCells = currentRow
      .getCells()
      .filter((candidate) => candidate.getColumn().isVisible());
    const startColumnIndex = visibleCells.findIndex(
      (candidate) => candidate.getField() === startField,
    );

    if (startColumnIndex < 0) {
      truncatedCells += sourceRow.length;
      currentRow = currentRow.getNextRow();
      continue;
    }

    for (let columnIndex = 0; columnIndex < sourceRow.length; columnIndex += 1) {
      const targetCell = visibleCells[startColumnIndex + columnIndex];
      if (!targetCell) {
        truncatedCells += 1;
        continue;
      }

      cells.push({
        row: targetCell.getRow().getData() as T,
        field: targetCell.getField() as keyof T & string,
        value: sourceRow[columnIndex] ?? "",
        oldValue: targetCell.getValue(),
      });
    }

    currentRow = currentRow.getNextRow();
  }

  return {
    cells,
    sourceRows: matrix.length,
    sourceColumns,
    truncatedCells,
  };
}

function createExpandedEditor(kind: "input" | "textarea"): TabulatorEditor {
  return (cell, onRendered, success, cancel, editorParams) => {
    const anchor = document.createElement("span");
    anchor.className = "arctor-expanded-cell-editor-anchor";
    anchor.setAttribute("aria-hidden", "true");

    const shell = document.createElement("div");
    shell.className = "arctor-expanded-cell-editor-shell";
    shell.setAttribute("role", "dialog");
    shell.setAttribute("aria-modal", "false");

    const editorElement =
      kind === "textarea"
        ? document.createElement("textarea")
        : document.createElement("input");

    if (editorElement instanceof HTMLInputElement) {
      editorElement.type = "text";
      editorElement.enterKeyHint = "done";
    } else {
      editorElement.enterKeyHint = "enter";
    }

    editorElement.className = [
      "arctor-expanded-cell-editor",
      kind === "textarea"
        ? "arctor-expanded-cell-editor--textarea"
        : "arctor-expanded-cell-editor--input",
    ].join(" ");
    editorElement.value =
      cell.getValue() == null ? "" : String(cell.getValue());
    editorElement.autocomplete = "off";
    editorElement.spellcheck = kind === "textarea";
    editorElement.setAttribute("inputmode", "text");
    applyElementAttributes(editorElement, editorParams);

    const mobileActions = document.createElement("div");
    mobileActions.className = "arctor-expanded-cell-editor-actions";
    mobileActions.hidden = true;

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "arctor-expanded-cell-editor-action arctor-expanded-cell-editor-action--cancel";
    cancelButton.textContent =
      typeof editorParams?.cancelLabel === "string"
        ? editorParams.cancelLabel
        : "Cancel";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "arctor-expanded-cell-editor-action arctor-expanded-cell-editor-action--save";
    saveButton.textContent =
      typeof editorParams?.saveLabel === "string"
        ? editorParams.saveLabel
        : "Save";

    mobileActions.append(cancelButton, saveButton);
    shell.append(editorElement, mobileActions);

    let settled = false;
    let anchorObserver: MutationObserver | null = null;
    let viewportListenersAttached = false;
    let visualViewportListenersAttached = false;
    let virtualKeyboardListenerAttached = false;
    let compactKeyboardFallbackActive = false;
    const keyboardRepositionTimers = new Set<number>();
    const initialVisualViewportHeight = window.visualViewport?.height ?? null;
    const initialLayoutViewportHeight = Math.max(
      1,
      Math.min(
        document.documentElement.clientHeight || window.innerHeight || 1,
        window.innerHeight || document.documentElement.clientHeight || 1,
      ),
    );
    const handleVirtualKeyboardGeometryChange = () => sizeAndPosition();

    const minWidth = readFiniteNumber(
      editorParams?.expandedMinWidth,
      kind === "textarea" ? 620 : 420,
    );
    const maxWidth = readFiniteNumber(
      editorParams?.expandedMaxWidth,
      kind === "textarea" ? 760 : 620,
    );
    const minHeight = readFiniteNumber(
      editorParams?.expandedMinHeight,
      kind === "textarea" ? 120 : 40,
    );
    const maxHeight = readFiniteNumber(
      editorParams?.expandedMaxHeight,
      kind === "textarea" ? 240 : 44,
    );

    function removeOverlay() {
      anchorObserver?.disconnect();
      anchorObserver = null;
      if (viewportListenersAttached) {
        window.removeEventListener("resize", sizeAndPosition);
        window.removeEventListener("scroll", sizeAndPosition, true);
        viewportListenersAttached = false;
      }
      const visualViewport = window.visualViewport;
      if (visualViewport && visualViewportListenersAttached) {
        visualViewport.removeEventListener("resize", sizeAndPosition);
        visualViewport.removeEventListener("scroll", sizeAndPosition);
        visualViewportListenersAttached = false;
      }
      const virtualKeyboard = getArctorVirtualKeyboard();
      if (virtualKeyboard && virtualKeyboardListenerAttached) {
        virtualKeyboard.removeEventListener(
          "geometrychange",
          handleVirtualKeyboardGeometryChange,
        );
        virtualKeyboardListenerAttached = false;
      }
      for (const timer of keyboardRepositionTimers) {
        window.clearTimeout(timer);
      }
      keyboardRepositionTimers.clear();
      if (shell.isConnected) {
        shell.remove();
      }
    }

    function commit() {
      if (settled) {
        return;
      }
      settled = true;
      const nextValue = editorElement.value;
      removeOverlay();
      success(nextValue);
    }

    function abort() {
      if (settled) {
        return;
      }
      settled = true;
      removeOverlay();
      cancel();
    }

    function sizeAndPosition() {
      const cellRect = cell.getElement().getBoundingClientRect();
      const visualViewport = window.visualViewport;
      const viewportLeft = visualViewport?.offsetLeft ?? 0;
      const viewportTop = visualViewport?.offsetTop ?? 0;
      const layoutViewportWidth = Math.max(
        document.documentElement.clientWidth,
        window.innerWidth || 0,
      );
      const documentViewportHeight =
        document.documentElement.clientHeight || window.innerHeight || 1;
      const windowViewportHeight = window.innerHeight || documentViewportHeight;
      const layoutViewportHeight = Math.max(
        1,
        Math.min(documentViewportHeight, windowViewportHeight),
      );
      const viewportWidth = Math.min(
        visualViewport?.width ?? layoutViewportWidth,
        layoutViewportWidth,
      );
      const viewportHeight = Math.min(
        visualViewport?.height ?? layoutViewportHeight,
        layoutViewportHeight,
      );
      const compactTouch = isCompactTouchEnvironment();
      const margin = compactTouch ? 10 : 12;
      let visibleBottom = viewportTop + viewportHeight;
      let measuredKeyboardGeometry = false;

      if (compactTouch) {
        const keyboardRect = getArctorVirtualKeyboard()?.boundingRect;
        if (
          keyboardRect &&
          keyboardRect.height > 0 &&
          Number.isFinite(keyboardRect.top)
        ) {
          visibleBottom = Math.min(visibleBottom, keyboardRect.top);
          measuredKeyboardGeometry = true;
        }

        const currentVisualViewportHeight =
          visualViewport?.height ?? initialVisualViewportHeight;
        const visualViewportShrink =
          initialVisualViewportHeight != null && currentVisualViewportHeight != null
            ? initialVisualViewportHeight - currentVisualViewportHeight
            : 0;
        const layoutViewportShrink =
          initialLayoutViewportHeight - layoutViewportHeight;

        const keyboardShrinkThreshold = Math.max(
          120,
          initialLayoutViewportHeight * 0.2,
        );
        if (
          visualViewportShrink >= keyboardShrinkThreshold ||
          layoutViewportShrink >= keyboardShrinkThreshold
        ) {
          measuredKeyboardGeometry = true;
        }

        if (compactKeyboardFallbackActive && !measuredKeyboardGeometry) {
          const portrait = viewportHeight >= viewportWidth;
          const fallbackVisibleFraction = portrait ? 0.52 : 0.42;
          const fallbackBottom =
            viewportTop + viewportHeight * fallbackVisibleFraction;
          visibleBottom = Math.min(visibleBottom, fallbackBottom);
        }
      }

      const effectiveViewportHeight = Math.max(1, visibleBottom - viewportTop);

      shell.dataset.mobile = compactTouch ? "true" : "false";
      mobileActions.hidden = !compactTouch;

      if (compactTouch) {
        const width = Math.max(240, viewportWidth - margin * 2);
        shell.style.width = `${width}px`;
        editorElement.style.width = "100%";

        if (kind === "textarea") {
          const mobileMinHeight = Math.min(
            Math.max(150, minHeight),
            Math.max(150, effectiveViewportHeight * 0.34),
          );
          const mobileMaxHeight = Math.max(
            mobileMinHeight,
            Math.min(
              Math.max(maxHeight, 280),
              effectiveViewportHeight * 0.55,
            ),
          );
          editorElement.style.height = `${mobileMinHeight}px`;
          const naturalHeight = editorElement.scrollHeight + 4;
          editorElement.style.height = `${clamp(
            naturalHeight,
            mobileMinHeight,
            mobileMaxHeight,
          )}px`;
        } else {
          editorElement.style.height = "48px";
        }

        const shellRect = shell.getBoundingClientRect();
        const left = viewportLeft + margin;
        const top = Math.max(
          viewportTop + margin,
          visibleBottom - shellRect.height - margin,
        );
        shell.style.left = `${left}px`;
        shell.style.top = `${top}px`;
        return;
      }

      const availableWidth = Math.max(180, viewportWidth - margin * 2);
      const width = Math.min(
        Math.max(cellRect.width, minWidth),
        Math.max(minWidth, maxWidth),
        availableWidth,
      );
      shell.style.width = `${width}px`;
      editorElement.style.width = "100%";

      if (kind === "textarea") {
        editorElement.style.height = `${minHeight}px`;
        const naturalHeight = editorElement.scrollHeight + 4;
        editorElement.style.height = `${clamp(
          naturalHeight,
          minHeight,
          maxHeight,
        )}px`;
      } else {
        editorElement.style.height = `${clamp(
          Math.max(cellRect.height, minHeight),
          minHeight,
          maxHeight,
        )}px`;
      }

      const shellRect = shell.getBoundingClientRect();
      const left = clamp(
        cellRect.left,
        viewportLeft + margin,
        viewportLeft + viewportWidth - shellRect.width - margin,
      );
      const top = clamp(
        cellRect.top,
        viewportTop + margin,
        viewportTop + viewportHeight - shellRect.height - margin,
      );
      shell.style.left = `${left}px`;
      shell.style.top = `${top}px`;
    }

    function scheduleKeyboardReposition() {
      if (!isCompactTouchEnvironment()) return;

      const fallbackTimer = window.setTimeout(() => {
        keyboardRepositionTimers.delete(fallbackTimer);
        if (!settled && document.activeElement === editorElement) {
          compactKeyboardFallbackActive = true;
          sizeAndPosition();
        }
      }, 140);
      keyboardRepositionTimers.add(fallbackTimer);

      for (const delay of [0, 80, 180, 320, 520, 760]) {
        const timer = window.setTimeout(() => {
          keyboardRepositionTimers.delete(timer);
          if (!settled) sizeAndPosition();
        }, delay);
        keyboardRepositionTimers.add(timer);
      }
    }

    editorElement.addEventListener("focus", scheduleKeyboardReposition);
    editorElement.addEventListener("keydown", (event) => {
      const keyboardEvent = event as KeyboardEvent;
      keyboardEvent.stopPropagation();

      if (keyboardEvent.key === "Escape") {
        keyboardEvent.preventDefault();
        abort();
        return;
      }

      if (kind === "input" && keyboardEvent.key === "Enter") {
        keyboardEvent.preventDefault();
        commit();
        return;
      }

      if (
        kind === "textarea" &&
        keyboardEvent.key === "Enter" &&
        (keyboardEvent.ctrlKey || keyboardEvent.metaKey)
      ) {
        keyboardEvent.preventDefault();
        commit();
      }
    });

    editorElement.addEventListener("input", () => {
      if (kind === "textarea" && !settled) {
        sizeAndPosition();
      }
    });
    editorElement.addEventListener("blur", commit);
    editorElement.addEventListener("mousedown", (event) => event.stopPropagation());
    editorElement.addEventListener("click", (event) => event.stopPropagation());
    editorElement.addEventListener("dblclick", (event) => event.stopPropagation());

    for (const button of [cancelButton, saveButton]) {
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
    }
    cancelButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      abort();
    });
    saveButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      commit();
    });

    onRendered(() => {
      document.body.appendChild(shell);
      sizeAndPosition();
      window.addEventListener("resize", sizeAndPosition);
      window.addEventListener("scroll", sizeAndPosition, true);
      viewportListenersAttached = true;

      const visualViewport = window.visualViewport;
      if (visualViewport) {
        visualViewport.addEventListener("resize", sizeAndPosition);
        visualViewport.addEventListener("scroll", sizeAndPosition);
        visualViewportListenersAttached = true;
      }

      const virtualKeyboard = getArctorVirtualKeyboard();
      if (virtualKeyboard) {
        virtualKeyboard.addEventListener(
          "geometrychange",
          handleVirtualKeyboardGeometryChange,
        );
        virtualKeyboardListenerAttached = true;
      }

      anchorObserver = new MutationObserver(() => {
        if (!anchor.isConnected && !settled) {
          settled = true;
          removeOverlay();
        }
      });
      anchorObserver.observe(cell.getElement(), { childList: true });

      editorElement.focus();
      scheduleKeyboardReposition();
      const caretPosition = editorElement.value.length;
      editorElement.setSelectionRange(caretPosition, caretPosition);
    });

    return anchor;
  };
}

type ArctorExpandedEditorDescriptor<T extends object> = {
  kind: "input" | "textarea";
  editable: ArctorTableColumn<T>["editable"];
  editorParams?: Record<string, unknown>;
};

function openArctorExpandedEditor<T extends object>(
  cell: TabulatorCellInteractionComponent,
  descriptor: ArctorExpandedEditorDescriptor<T>,
) {
  const editable = descriptor.editable;
  if (
    editable === false ||
    (typeof editable === "function" &&
      !editable(cell as unknown as ArctorTableCellApi<T>))
  ) {
    return false;
  }

  const factory = createExpandedEditor(descriptor.kind);
  let rendered = () => {};
  let anchor: HTMLElement | null = null;
  const editor = factory(
    cell,
    (callback) => {
      rendered = callback;
    },
    (value) => {
      anchor?.remove();
      cell.setValue(value, true);
    },
    () => {
      anchor?.remove();
    },
    descriptor.editorParams,
  );

  if (editor === false) {
    return false;
  }

  anchor = editor;
  cell.getElement().appendChild(editor);
  rendered();
  return true;
}

function resolveEditorColumns<T extends object>(
  columns: ArctorTableColumn<T>[],
  compactTouchEditing: boolean,
  mobileHorizontalScrollActive: boolean,
) {
  return columns.map((column) => {
    const {
      mobileMinWidth,
      mobileWidth,
      mobileFrozen,
      ...columnWithoutMobileHints
    } = column;

    const mobileOverrides = mobileHorizontalScrollActive
      ? {
          ...(typeof mobileMinWidth === "number"
            ? { minWidth: mobileMinWidth }
            : {}),
          ...(typeof mobileWidth === "number" ? { width: mobileWidth } : {}),
          ...(typeof mobileFrozen === "boolean"
            ? { frozen: mobileFrozen }
            : {}),
          responsive: 0,
        }
      : {};

    if (column.editor === "arctor-expanded-input") {
      return {
        ...columnWithoutMobileHints,
        ...mobileOverrides,
        ...(compactTouchEditing && typeof mobileMinWidth !== "number"
          ? { minWidth: 180 }
          : {}),
        // ARCTor expanded editors are opened by the external cell bridge below.
        // Keeping Tabulator's own Edit module out of this path avoids its
        // classList lifecycle crash while preserving CellComponent.setValue().
        editor: false,
      };
    }

    if (column.editor === "arctor-expanded-textarea") {
      return {
        ...columnWithoutMobileHints,
        ...mobileOverrides,
        ...(compactTouchEditing && typeof mobileMinWidth !== "number"
          ? { minWidth: 180 }
          : {}),
        // ARCTor expanded editors are opened by the external cell bridge below.
        // Keeping Tabulator's own Edit module out of this path avoids its
        // classList lifecycle crash while preserving CellComponent.setValue().
        editor: false,
      };
    }

    return {
      ...columnWithoutMobileHints,
      ...mobileOverrides,
    };
  });
}

export function ArctorTabulator<T extends object>({
  data,
  columns,
  rowKey = "id" as keyof T & string,
  emptyLabel = "No rows",
  height = "62vh",
  options,
  editMode = false,
  adaptiveTouchEditing = false,
  mobileHorizontalScroll = false,
  allowNativePinchZoom = false,
  rangeClipboard = false,
  onRowClick,
  onCellClick,
  onCellEdited,
  onRangeCopied,
  onRangePaste,
}: ArctorTabulatorProps<T>) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onRowClickRef = useRef(onRowClick);
  const onCellClickRef = useRef(onCellClick);
  const onCellEditedRef = useRef(onCellEdited);
  const onRangeCopiedRef = useRef(onRangeCopied);
  const onRangePasteRef = useRef(onRangePaste);

  useEffect(() => {
    onRowClickRef.current = onRowClick;
  }, [onRowClick]);

  useEffect(() => {
    onCellClickRef.current = onCellClick;
  }, [onCellClick]);

  useEffect(() => {
    onCellEditedRef.current = onCellEdited;
  }, [onCellEdited]);

  useEffect(() => {
    onRangeCopiedRef.current = onRangeCopied;
  }, [onRangeCopied]);

  useEffect(() => {
    onRangePasteRef.current = onRangePaste;
  }, [onRangePaste]);

  useEffect(() => {
    let disposed = false;
    let table: { destroy: () => void } | null = null;
    let pasteHost: HTMLDivElement | null = null;
    let pasteListener: ((event: ClipboardEvent) => void) | null = null;
    let copyDocument: Document | null = null;
    let copyListener: ((event: ClipboardEvent) => void) | null = null;
    let copyPointerListener: ((event: PointerEvent) => void) | null = null;
    let rangeCopyArmed = false;

    async function mountTable() {
      const host = hostRef.current;
      if (!host) {
        return;
      }

      const { TabulatorFull } = await import("tabulator-tables");
      if (disposed || !hostRef.current) {
        return;
      }

      const compactTouchEnvironment = isCompactTouchEnvironment();
      const compactTouchEditing =
        adaptiveTouchEditing && editMode && compactTouchEnvironment;
      const mobileHorizontalScrollActive =
        mobileHorizontalScroll && compactTouchEnvironment;
      // Drag-range selection competes with horizontal swipe and single-tap editing on
      // coarse pointers. Keep multi-cell range clipboard desktop/fine-pointer only;
      // smartphone single-cell copy/paste remains available inside the expanded editor.
      const rangeClipboardActive =
        rangeClipboard && editMode && !compactTouchEnvironment;
      const expandedEditorColumns = new Map<
        string,
        ArctorExpandedEditorDescriptor<T>
      >();
      for (const column of columns) {
        if (
          column.editor === "arctor-expanded-input" ||
          column.editor === "arctor-expanded-textarea"
        ) {
          expandedEditorColumns.set(column.field, {
            kind:
              column.editor === "arctor-expanded-textarea" ? "textarea" : "input",
            editable: column.editable,
            editorParams: column.editorParams,
          });
        }
      }
      const resolvedColumns = resolveEditorColumns(
        columns,
        compactTouchEditing,
        mobileHorizontalScrollActive,
      );
      const resolvedOptions = {
        ...options,
        ...(compactTouchEditing ? { editTriggerEvent: "click" } : {}),
        ...(mobileHorizontalScrollActive
          ? { layout: "fitData", responsiveLayout: false }
          : {}),
        ...(rangeClipboardActive
          ? {
              selectableRange: 1,
              selectableRangeColumns: false,
              selectableRangeRows: false,
              selectableRangeClearCells: false,
              selectableRangeAutoFocus: true,
              selectableRangeInitializeDefault: false,
              selectableRangeBlurEditOnNavigate: false,
              clipboard: "copy",
              clipboardCopyStyled: false,
              clipboardCopyConfig: {
                rowHeaders: false,
                columnHeaders: false,
              },
              clipboardCopyRowRange: "range",
            }
          : {}),
      };
      const instance = new TabulatorFull(host, {
        data,
        // Tabulator 6.5.2 is JavaScript-first; special ARCTor editor markers
        // are converted to runtime editor functions at this boundary only.
        columns: resolvedColumns as unknown as ArctorTableColumn<T>[],
        index: rowKey,
        layout: "fitColumns",
        height,
        rowHeight: 32,
        placeholder: emptyLabel,
        movableColumns: true,
        resizableColumnFit: true,
        responsiveLayout: "hide",
        ...resolvedOptions,
      });

      if (onRowClickRef.current) {
        instance.on("rowClick", (event, row) => {
          if (isInteractiveTarget(event.target)) {
            return;
          }

          const callback = onRowClickRef.current;
          if (callback) {
            callback(row.getData() as T);
          }
        });
      }

      if (
        onCellClickRef.current ||
        (compactTouchEditing && expandedEditorColumns.size > 0)
      ) {
        const cellClickEmitter = instance as unknown as TabulatorCellClickEmitter;
        cellClickEmitter.on("cellClick", (event, cell) => {
          const callback = onCellClickRef.current;
          callback?.({
            row: cell.getRow().getData() as T,
            field: cell.getField() as keyof T & string,
            value: cell.getValue(),
          });

          if (compactTouchEditing) {
            const descriptor = expandedEditorColumns.get(cell.getField());
            if (descriptor) {
              event.stopPropagation();
              openArctorExpandedEditor<T>(cell, descriptor);
            }
          }
        });
      }

      if (!compactTouchEditing && expandedEditorColumns.size > 0) {
        const cellDblClickEmitter =
          instance as unknown as TabulatorCellDblClickEmitter;
        cellDblClickEmitter.on("cellDblClick", (event, cell) => {
          const descriptor = expandedEditorColumns.get(cell.getField());
          if (!descriptor) return;
          event.stopPropagation();
          openArctorExpandedEditor<T>(cell, descriptor);
        });
      }

      if (onCellEditedRef.current) {
        // Tabulator 6.5.2 ships JavaScript rather than a complete TypeScript event map.
        // With this project's allowJs inference, instance.on is narrowed to the
        // already-subscribed rowClick shape. Runtime Tabulator still exposes the
        // documented cellEdited event, so bridge only that event through a local
        // structural interface instead of weakening the whole table instance.
        const cellEditedEmitter = instance as unknown as TabulatorCellEditedEmitter;
        cellEditedEmitter.on("cellEdited", (cell) => {
          const callback = onCellEditedRef.current;
          if (!callback) {
            return;
          }

          const editEvent: ArctorTableCellEditedEvent<T> = {
            row: cell.getRow().getData() as T,
            field: cell.getField() as keyof T & string,
            value: cell.getValue(),
            oldValue: cell.getOldValue(),
            restoreOldValue: () => cell.restoreOldValue(),
          };

          void Promise.resolve(callback(editEvent)).catch(() => {
            editEvent.restoreOldValue();
          });
        });
      }

      if (rangeClipboardActive) {
        const rangeTable = instance as unknown as TabulatorRangeTable;

        // Range lifecycle events may fire before Tabulator has finalized the
        // bounds. Clipboard arming therefore follows pointer ownership only;
        // range bounds are inspected later, at copy/paste time.
        copyPointerListener = (event) => {
          const target = event.target;
          rangeCopyArmed =
            target instanceof Node &&
            host.contains(target) &&
            !isInteractiveTarget(target);
        };

        copyListener = (event) => {
          if (!rangeCopyArmed || isInteractiveTarget(event.target)) {
            return;
          }

          const selection = document.getSelection();
          const hasNativeSelection = Boolean(
            selection && !selection.isCollapsed,
          );
          const anchorElement = getSelectionElement(selection?.anchorNode ?? null);
          const focusElement = getSelectionElement(selection?.focusNode ?? null);
          const selectionInsideEditor = [anchorElement, focusElement].some(
            (element) =>
              Boolean(
                element?.closest(
                  "input,textarea,[contenteditable='true'],.arctor-expanded-cell-editor",
                ),
              ),
          );

          if (
            shouldBypassArctorRangeCopyForNativeSelection({
              hasNativeSelection,
              anchorInsideTable: Boolean(
                selection?.anchorNode && host.contains(selection.anchorNode),
              ),
              focusInsideTable: Boolean(
                selection?.focusNode && host.contains(selection.focusNode),
              ),
              selectionInsideEditor,
            })
          ) {
            return;
          }

          const ranges = rangeTable.getRanges();
          const activeRange = ranges[ranges.length - 1];
          const clipboardData = event.clipboardData;
          if (!activeRange || !clipboardData) {
            return;
          }

          let structuredCells: TabulatorRangeCellComponent[][];
          try {
            structuredCells = activeRange.getStructuredCells();
          } catch {
            rangeCopyArmed = false;
            return;
          }
          const matrix = structuredCells.map((row) =>
            row.map((cell) => cell.getValue()),
          );
          const clipboard = serializeArctorClipboardMatrix(matrix);

          clipboardData.setData("text/plain", clipboard);
          event.preventDefault();
          event.stopPropagation();
          onRangeCopiedRef.current?.(clipboard);
        };

        copyDocument = document;
        copyDocument.addEventListener("pointerdown", copyPointerListener, true);
        copyDocument.addEventListener("copy", copyListener, true);
      }

      // Keep Tabulator's clipboardCopied callback as a harmless fallback/feedback path.
      // The document capture listener above is authoritative for actual clipboard data.
      if (rangeClipboardActive && onRangeCopiedRef.current) {
        const clipboardEmitter = instance as unknown as TabulatorClipboardCopiedEmitter;
        clipboardEmitter.on("clipboardCopied", (clipboard) => {
          onRangeCopiedRef.current?.(clipboard);
        });
      }

      if (rangeClipboardActive && onRangePasteRef.current) {
        pasteHost = host;
        pasteListener = (event) => {
          if (isInteractiveTarget(event.target)) {
            return;
          }

          const clipboard = event.clipboardData?.getData("text/plain");
          if (clipboard == null) {
            return;
          }

          const matrix = parseArctorClipboardMatrix(clipboard);
          const pasteEvent = collectRangePasteCells<T>(
            instance as unknown as TabulatorRangeTable,
            matrix,
          );
          const callback = onRangePasteRef.current;
          if (!pasteEvent || !callback) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          void Promise.resolve(callback(pasteEvent)).catch(() => undefined);
        };
        pasteHost.addEventListener("paste", pasteListener);
      }

      table = instance;
    }

    void mountTable();

    return () => {
      disposed = true;
      if (pasteHost && pasteListener) {
        pasteHost.removeEventListener("paste", pasteListener);
      }
      if (copyDocument && copyPointerListener) {
        copyDocument.removeEventListener("pointerdown", copyPointerListener, true);
      }
      if (copyDocument && copyListener) {
        copyDocument.removeEventListener("copy", copyListener, true);
      }
      table?.destroy();
    };
  }, [
    adaptiveTouchEditing,
    columns,
    data,
    editMode,
    emptyLabel,
    height,
    mobileHorizontalScroll,
    options,
    rangeClipboard,
    rowKey,
  ]);

  return (
    <div
      ref={hostRef}
      className="arctor-tabulator"
      data-edit-mode={editMode ? "true" : undefined}
      data-mobile-horizontal-scroll={mobileHorizontalScroll ? "true" : undefined}
      data-native-pinch-zoom={allowNativePinchZoom ? "true" : undefined}
      data-range-clipboard={rangeClipboard && editMode ? "true" : undefined}
    />
  );
}
