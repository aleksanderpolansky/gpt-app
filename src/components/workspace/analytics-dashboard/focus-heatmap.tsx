import type {
  AnalyticsSignalStatus,
  FocusHeatmapCell,
  FocusHeatmapRow,
} from "./analytics-dashboard.types";
import {
  getAnalyticsStatusDescription,
  getAnalyticsStatusLabel,
} from "./analytics-dashboard.utils";

const heatmapCellClassNameByStatus: Record<AnalyticsSignalStatus, string> = {
  low: "border-border bg-background text-foreground",
  optimal: "border-primary/20 bg-secondary text-secondary-foreground",
  excess: "border-border bg-background text-foreground",
  blocked: "border-border bg-muted text-muted-foreground",
  unknown: "border-border bg-muted text-muted-foreground",
};

const heatmapDotClassNameByStatus: Record<AnalyticsSignalStatus, string> = {
  low: "bg-orange-500",
  optimal: "bg-primary",
  excess: "bg-violet-500",
  blocked: "bg-muted-foreground",
  unknown: "bg-muted-foreground",
};

export interface FocusHeatmapProps {
  readonly rows: readonly FocusHeatmapRow[];
  readonly days: readonly string[];
  readonly lowCellCount: number;
  readonly excessCellCount: number;
}

interface FocusHeatmapCellViewProps {
  readonly cell: FocusHeatmapCell | undefined;
  readonly rowLabel: string;
  readonly day: string;
}

function createMissingCellLabel(rowLabel: string, day: string): string {
  return `${rowLabel} on ${day}: no preview signal available.`;
}

function FocusHeatmapCellView({
  cell,
  rowLabel,
  day,
}: FocusHeatmapCellViewProps) {
  if (!cell) {
    return (
      <div
        className="rounded-lg border bg-muted px-3 py-2 text-center text-xs text-muted-foreground"
        aria-label={createMissingCellLabel(rowLabel, day)}
        title={createMissingCellLabel(rowLabel, day)}
      >
        <span className="block font-medium">No data</span>
        <span className="mt-1 block">Unknown</span>
      </div>
    );
  }

  const statusLabel = getAnalyticsStatusLabel(cell.status);
  const statusDescription = getAnalyticsStatusDescription(cell.status);

  return (
    <div
      className={[
        "rounded-lg border px-3 py-2 text-center",
        heatmapCellClassNameByStatus[cell.status],
      ].join(" ")}
      aria-label={`${cell.accessibleLabel} ${statusDescription}`}
      title={`${cell.accessibleLabel} ${statusDescription}`}
    >
      <div className="flex items-center justify-center gap-2">
        <span
          className={[
            "size-2 rounded-full",
            heatmapDotClassNameByStatus[cell.status],
          ].join(" ")}
          aria-hidden="true"
        />
        <span className="text-sm font-semibold">{cell.label}</span>
      </div>

      <p className="mt-1 text-xs">{statusLabel}</p>
      <p className="mt-1 text-xs text-muted-foreground">Score {cell.score}/9</p>
    </div>
  );
}

export function FocusHeatmap({
  rows,
  days,
  lowCellCount,
  excessCellCount,
}: FocusHeatmapProps) {
  return (
    <section
      aria-label="Focus heatmap"
      className="rounded-xl border bg-card p-6 shadow-sm"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Focus heatmap
          </p>
          <h2 className="text-xl font-semibold">Domain x day signals</h2>
        </div>

        <div className="rounded-xl border bg-background px-4 py-3 text-sm">
          <p className="font-medium">Signal summary</p>
          <p className="text-muted-foreground">
            Low cells: {lowCellCount} · Excess cells: {excessCellCount}
          </p>
        </div>
      </div>

      <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
        The heatmap explains where attention appears low, optimal, or excessive.
        Color is never the only meaning: every cell includes a text label and an
        accessible description.
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-2 text-sm">
          <caption className="sr-only">
            Read-only focus heatmap by domain and day. Values are planning
            signals, not final actions.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="px-2 py-1 text-left font-medium text-muted-foreground">
                Domain
              </th>
              {days.map((day) => (
                <th scope="col"
                  key={day}
                  className="px-2 py-1 text-center font-medium text-muted-foreground"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.domainId}>
                <th scope="row" className="px-2 py-2 text-left align-middle font-semibold">
                  {row.label}
                </th>

                {days.map((day) => {
                  const cell = row.cells.find((item) => item.day === day);

                  return (
                    <td key={`${row.domainId}-${day}`} className="px-1 py-1">
                      <FocusHeatmapCellView
                        cell={cell}
                        rowLabel={row.label}
                        day={day}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-3">
        <div className="rounded-xl border bg-background p-4">
          <p className="font-medium">Low</p>
          <p className="mt-1 text-muted-foreground">
            Candidate area for review. Not an automatic instruction.
          </p>
        </div>

        <div className="rounded-xl border bg-background p-4">
          <p className="font-medium">Optimal</p>
          <p className="mt-1 text-muted-foreground">
            Appears inside the current planning range.
          </p>
        </div>

        <div className="rounded-xl border bg-background p-4">
          <p className="font-medium">Excess</p>
          <p className="mt-1 text-muted-foreground">
            Possible overfocus that may reduce balance elsewhere.
          </p>
        </div>
      </div>
    </section>
  );
}


