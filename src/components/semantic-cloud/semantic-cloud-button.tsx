"use client";

export type SemanticCloudButtonProps = {
  readonly isOpen: boolean;
  readonly isLoading?: boolean;
  readonly onClick: () => void;
};

export function SemanticCloudButton({
  isOpen,
  isLoading = false,
  onClick,
}: SemanticCloudButtonProps) {
  return (
    <button
      type="button"
      aria-label="Open public semantic category cloud"
      aria-expanded={isOpen}
      disabled={isLoading}
      onClick={onClick}
      className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-[rgba(59,110,248,0.18)] bg-[#eef2ff] px-3 text-xs font-semibold text-[#3b6ef8] shadow-sm transition hover:bg-[#e4eaff] disabled:cursor-not-allowed disabled:opacity-70"
    >
      <span aria-hidden="true" className="text-sm leading-none">
        ☁
      </span>
      <span className="hidden whitespace-nowrap xl:inline">
        Облако категорий
      </span>
      <span className="whitespace-nowrap xl:hidden">Cloud</span>
    </button>
  );
}
