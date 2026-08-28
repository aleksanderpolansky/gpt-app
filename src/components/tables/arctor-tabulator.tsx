"use client";

import "tabulator-tables/dist/css/tabulator.min.css";
import "./arctor-tabulator.css";

import { useEffect, useRef } from "react";

type TablePrimitive = string | number | boolean | null | undefined;

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
  visible?: boolean;
  tooltip?: boolean | string;
  editor?: boolean | false | "input" | "textarea";
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

export type ArctorTableCellEditedEvent<T extends object> = {
  row: T;
  field: keyof T & string;
  value: unknown;
  oldValue: unknown;
  restoreOldValue: () => void;
};

export type ArctorTableOptions = Record<string, TablePrimitive | object>;

type ArctorTabulatorProps<T extends object> = {
  data: T[];
  columns: ArctorTableColumn<T>[];
  rowKey?: keyof T & string;
  emptyLabel?: string;
  height?: string;
  options?: ArctorTableOptions;
  onRowClick?: (row: T) => void;
  onCellEdited?: (event: ArctorTableCellEditedEvent<T>) => void | Promise<void>;
};

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      "a,button,input,select,textarea,label,[role='button'],.tabulator-data-tree-control",
    ),
  );
}

export function ArctorTabulator<T extends object>({
  data,
  columns,
  rowKey = "id" as keyof T & string,
  emptyLabel = "No rows",
  height = "62vh",
  options,
  onRowClick,
  onCellEdited,
}: ArctorTabulatorProps<T>) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onRowClickRef = useRef(onRowClick);
  const onCellEditedRef = useRef(onCellEdited);

  useEffect(() => {
    onRowClickRef.current = onRowClick;
  }, [onRowClick]);

  useEffect(() => {
    onCellEditedRef.current = onCellEdited;
  }, [onCellEdited]);

  useEffect(() => {
    let disposed = false;
    let table: { destroy: () => void } | null = null;

    async function mountTable() {
      const host = hostRef.current;
      if (!host) {
        return;
      }

      const { TabulatorFull } = await import("tabulator-tables");
      if (disposed || !hostRef.current) {
        return;
      }

      const instance = new TabulatorFull(host, {
        data,
        columns,
        index: rowKey,
        layout: "fitColumns",
        height,
        rowHeight: 32,
        placeholder: emptyLabel,
        movableColumns: true,
        resizableColumnFit: true,
        responsiveLayout: "hide",
        ...options,
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

      table = instance;
    }

    void mountTable();

    return () => {
      disposed = true;
      table?.destroy();
    };
  }, [columns, data, emptyLabel, height, options, rowKey]);

  return <div ref={hostRef} className="arctor-tabulator" />;
}
