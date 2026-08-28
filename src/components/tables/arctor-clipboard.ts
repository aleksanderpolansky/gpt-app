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
