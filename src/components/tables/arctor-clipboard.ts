function serializeClipboardCell(value: unknown) {
  const text = value == null ? "" : String(value);
  if (!/["\t\r\n]/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

export function serializeArctorClipboardMatrix(
  matrix: readonly (readonly unknown[])[],
) {
  return matrix
    .map((row) => row.map((value) => serializeClipboardCell(value)).join("\t"))
    .join("\r\n");
}

export type ArctorRangeCopySelectionBoundary = {
  hasNativeSelection: boolean;
  anchorInsideTable: boolean;
  focusInsideTable: boolean;
  selectionInsideEditor: boolean;
};

export function shouldBypassArctorRangeCopyForNativeSelection(
  boundary: ArctorRangeCopySelectionBoundary,
) {
  if (!boundary.hasNativeSelection) {
    return false;
  }

  return (
    boundary.selectionInsideEditor ||
    !boundary.anchorInsideTable ||
    !boundary.focusInsideTable
  );
}
