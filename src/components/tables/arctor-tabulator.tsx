"use client";

import "tabulator-tables/dist/css/tabulator.min.css";
import "./arctor-tabulator.css";

import { useEffect, useRef } from "react";

type TablePrimitive = string | number | boolean | null | undefined;

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
}: ArctorTabulatorProps<T>) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onRowClickRef = useRef(onRowClick);

  useEffect(() => {
    onRowClickRef.current = onRowClick;
  }, [onRowClick]);

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
