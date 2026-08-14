export const QUICK_CAPTURE_SOURCE_TEXT_CONTRACT =
  "P5C_QUICK_CAPTURE_SOURCE_TEXT_V1" as const;

type SourceFact = {
  rawFragment?: string | null;
};

type SourceRow = {
  sourceFragment?: string | null;
  temporal?: {
    occurredAtRaw?: string | null;
  } | null;
  facts?: SourceFact[] | null;
};

function compact(value: string | null | undefined) {
  return (value ?? "").normalize("NFKC").replace(/\s+/gu, " ").trim();
}

function comparable(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[–—−]/gu, "-")
    .replace(/\s+/gu, " ")
    .trim();
}

function appendIfMissing(base: string, fragment: string | null | undefined) {
  const next = compact(fragment);
  if (!next) {
    return base;
  }

  const baseComparable = comparable(base);
  const nextComparable = comparable(next);
  if (baseComparable.includes(nextComparable)) {
    return base;
  }

  return compact(`${base} ${next}`);
}

export function buildAiLabQuickCaptureSourceTexts(input: {
  rows: SourceRow[];
  sourceMessageText: string;
}) {
  const sourceMessageText = compact(input.sourceMessageText);

  if (input.rows.length === 1 && sourceMessageText) {
    return [sourceMessageText];
  }

  return input.rows.map((row) => {
    let sourceText = compact(row.sourceFragment);
    sourceText = appendIfMissing(sourceText, row.temporal?.occurredAtRaw);

    for (const fact of row.facts ?? []) {
      sourceText = appendIfMissing(sourceText, fact.rawFragment);
    }

    return sourceText || sourceMessageText;
  });
}
