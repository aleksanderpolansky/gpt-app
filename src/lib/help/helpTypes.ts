import type { LocaleCode } from "@/i18n";

export const HELP_BLOCK_KINDS = ["what", "why"] as const;
export type HelpBlockKind = (typeof HELP_BLOCK_KINDS)[number];

export type HelpRegistryEntryKind = "page" | "heading" | "link" | "navigation";

export type HelpRegistryEntry = {
  helpKey: string;
  route: string;
  kind: HelpRegistryEntryKind;
  labelHint: string;
  sourceFile: string;
  domSelector?: string | null;
  hrefPath?: string | null;
  ordinal?: number | null;
};

export type HelpTranslations = Record<LocaleCode, string>;

export type HelpContentRecord = {
  helpKey: string;
  blockKind: HelpBlockKind;
  sourceLocale: LocaleCode;
  sourceText: string;
  translations: HelpTranslations;
  revision: number;
  provider: string;
  modelName: string | null;
  reasoningEffort: string | null;
  responseId: string | null;
  updatedAt: string;
};
