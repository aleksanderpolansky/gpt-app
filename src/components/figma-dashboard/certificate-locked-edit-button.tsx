"use client";

export function CertificateLockedEditButton({
  label,
  message,
}: {
  readonly label: string;
  readonly message: string;
}) {
  function explainLockedEdit() {
    window.alert(message);
  }

  return (
    <button
      type="button"
      aria-disabled="true"
      aria-label={`${label}. ${message}`}
      title={message}
      onClick={explainLockedEdit}
      className="w-fit cursor-not-allowed rounded-full border border-[#dfe3f1] bg-[#f3f4f8] px-4 py-2 text-[12px] font-semibold text-[#9ca3b8] shadow-sm transition hover:bg-[#eceef4]"
    >
      {label}
    </button>
  );
}
