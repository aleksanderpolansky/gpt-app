/**
 * UI-3.25 — Accessibility landmarks / labels.
 *
 * This component is fixture-only and local to UI-3.
 * It does not call network, database, auth, environment variables or server routes.
 *
 * Result marker: WORKSPACE_A11Y_LANDMARKS_ADDED
 */

export const WORKSPACE_A11Y_LANDMARKS_RESULT =
  "WORKSPACE_A11Y_LANDMARKS_ADDED" as const;

const SKIP_LINKS = [
  {
    href: "#workspace-main",
    label: "Skip to workspace",
  },
  {
    href: "#workspace-actions-region",
    label: "Skip to quick actions",
  },
  {
    href: "#workspace-mobile-tabs-region",
    label: "Skip to mobile tabs",
  },
] as const;

export function WorkspaceA11yLandmarks() {
  return (
    <>
      <h1 id="workspace-main-heading" className="sr-only">
        AI Navigator master workspace
      </h1>

      <nav
        aria-label="Workspace accessibility skip links"
        className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:left-4 focus-within:top-4 focus-within:z-50 focus-within:flex focus-within:gap-2 focus-within:rounded-xl focus-within:border focus-within:border-black/10 focus-within:bg-white focus-within:p-3 focus-within:shadow-lg"
      >
        {SKIP_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="rounded-lg border border-black/10 bg-[#eef2ff] px-3 py-2 text-sm font-semibold text-[#3b6ef8]"
          >
            {link.label}
          </a>
        ))}
      </nav>

      <p className="sr-only">
        WORKSPACE_A11Y_LANDMARKS_ADDED · skip links · aria-label ·
        aria-labelledby · role banner · role main · done 25/32 · left 7
      </p>
    </>
  );
}
