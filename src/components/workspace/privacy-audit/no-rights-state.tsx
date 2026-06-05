import type { NoRightsState } from "./privacy-audit.types";

interface NoRightsStatePanelProps {
  readonly noRightsState: NoRightsState;
}

export function NoRightsStatePanel({
  noRightsState,
}: NoRightsStatePanelProps) {
  return (
    <section className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-destructive">
            No rights state
          </p>
          <h2 className="text-lg font-semibold text-foreground">
            {noRightsState.title}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {noRightsState.description}
          </p>
        </div>

        <span className="w-fit rounded-full border border-destructive/30 bg-card px-3 py-1 text-xs font-medium text-destructive">
          {noRightsState.safeActionLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Visible when
          </p>
          <p className="mt-1 text-sm leading-6 text-foreground">
            {noRightsState.visibleWhen}
          </p>
        </div>

        <div className="rounded-lg border border-dashed border-border bg-card px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Blocked operations
          </p>
          <p className="mt-1 text-sm leading-6 text-foreground">
            Privacy policy changes, correction application, resolver learning,
            database writes, API writes, hidden persistence, and destructive
            history edits are outside UI-13.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-background/70 px-3 py-2 text-sm text-muted-foreground">
        This state is a visible safety boundary. It confirms that the page is
        for review, explanation, and transparency only.
      </div>
    </section>
  );
}
