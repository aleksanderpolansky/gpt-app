declare module "tabulator-tables" {
  export type ColumnDefinition = Record<string, unknown>;
  export type Options = Record<string, unknown>;

  export interface RowComponent {
    getData(): unknown;
    getElement(): HTMLElement;
  }

  export class TabulatorFull {
    constructor(element: HTMLElement, options?: Options);
    destroy(): void;
    on(
      event: "rowClick",
      callback: (event: MouseEvent, row: RowComponent) => void,
    ): void;
  }
}
