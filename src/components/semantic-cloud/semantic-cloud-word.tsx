import type { SemanticCloudWord as SemanticCloudWordType } from "../../types/semantic-cloud";

export type SemanticCloudWordProps = {
  readonly word: SemanticCloudWordType;
};

function clampWeight(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

export function SemanticCloudWord({ word }: SemanticCloudWordProps) {
  const weight = clampWeight(word.weight);
  const fontSizePx =
    word.minFontSizePx +
    (word.maxFontSizePx - word.minFontSizePx) * weight;

  return (
    <a
      href={word.href}
      title={`${word.label}: ${word.publicObjectCount} public objects`}
      className="inline-flex max-w-full items-center rounded-full border border-[rgba(59,110,248,0.16)] bg-white/90 px-3 py-1.5 font-semibold text-[#3b6ef8] shadow-sm transition hover:-translate-y-0.5 hover:border-[#3b6ef8] hover:bg-[#eef2ff]"
      style={{
        fontSize: fontSizePx,
        lineHeight: 1.1,
      }}
    >
      <span className="max-w-[220px] truncate">{word.label}</span>
      <span className="ml-2 rounded-full bg-[#eef2ff] px-1.5 py-0.5 text-[10px] font-bold text-[#7c8099]">
        {word.publicObjectCount}
      </span>
    </a>
  );
}
