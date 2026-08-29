"use client";

type StandaloneWorkspaceCloseButtonProps = {
  readonly label: string;
  readonly fallbackHref: string;
};

function isSafeInternalReturnTo(value: string | null) {
  return Boolean(
    value &&
      value.startsWith("/") &&
      !value.startsWith("//") &&
      !value.includes("\0"),
  );
}

export function StandaloneWorkspaceCloseButton({
  label,
  fallbackHref,
}: StandaloneWorkspaceCloseButtonProps) {
  function closeWorkspace() {
    const currentUrl = new URL(window.location.href);
    const requestedReturnTo = currentUrl.searchParams.get("returnTo");
    const returnTo = isSafeInternalReturnTo(requestedReturnTo)
      ? requestedReturnTo!
      : fallbackHref;

    window.close();

    window.setTimeout(() => {
      if (!window.closed) {
        window.location.assign(returnTo);
      }
    }, 120);
  }

  return (
    <button
      type="button"
      onClick={closeWorkspace}
      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#dfe3f1] bg-white px-3 py-2 text-[11px] font-semibold text-[#4a4f6a] transition hover:bg-[#f8fafc]"
    >
      {label}
    </button>
  );
}
