import type { ReactNode } from "react";

import type { CommercialCoreAccessState } from "./commercial-core.types";

type CommercialCoreShellProps = {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly accessState: CommercialCoreAccessState;
  readonly children: ReactNode;
  readonly aside?: ReactNode;
  readonly accessStateLabel?: string;
  readonly notice?: string;
};

const accessStateLabelByState: Record<CommercialCoreAccessState, string> = {
  preview: "Preview only",
  "read-only": "Read-only",
  "future-gated": "Future gate required",
  "no-rights": "No commercial rights",
};

const defaultCommercialCoreShellNotice =
  "UI-14 commercial core is fixture-first and read-only. Commercial write actions remain disabled until a future approved gate.";

export function CommercialCoreShell({
  eyebrow,
  title,
  description,
  accessState,
  children,
  aside,
  accessStateLabel,
  notice = defaultCommercialCoreShellNotice,
}: CommercialCoreShellProps) {
  const resolvedAccessStateLabel =
    accessStateLabel ?? accessStateLabelByState[accessState];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-medium text-muted-foreground">
                {eyebrow}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </div>
            <div className="rounded-full border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground">
              {resolvedAccessStateLabel}
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-dashed border-border bg-secondary/40 p-4 text-sm leading-6 text-muted-foreground">
            {notice}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex min-w-0 flex-col gap-6">{children}</div>
          {aside ? (
            <aside className="flex min-w-0 flex-col gap-6">{aside}</aside>
          ) : null}
        </div>
      </section>
    </main>
  );
}
