export type CasualCoreFormat = "docx" | "odt" | "pdf" | "md" | "txt";
export type Format = CasualCoreFormat;

const DISABLED_MESSAGE =
  "ARCTor local DOCX mode disables CasualOffice foreign-format conversion.";

function foreignConversionDisabled(): never {
  throw new Error(DISABLED_MESSAGE);
}

export async function init(): Promise<void> {
  foreignConversionDisabled();
}

export async function convert(): Promise<Uint8Array> {
  return foreignConversionDisabled();
}

export async function convertToString(): Promise<string> {
  return foreignConversionDisabled();
}

export async function detectFormat(): Promise<{ format: CasualCoreFormat | null }> {
  return foreignConversionDisabled();
}

export async function extractText(): Promise<string> {
  return foreignConversionDisabled();
}
