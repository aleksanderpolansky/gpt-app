import { notFound } from "next/navigation";

import {
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";

import {
  ActivityTemplateImpactProfileEditor,
} from "./activity-template-impact-profile-editor";

import {
  SystemActivityTemplateCatalog,
} from "./system-activity-template-catalog";

type LocaleCode =
  | "en"
  | "pl"
  | "ru"
  | "uk"
  | "de"
  | "es"
  | "cs";

type ScopeCode =
  | "user"
  | "system";

function normalizeLocale(
  value:
    | string
    | string[]
    | undefined,
): LocaleCode {
  const raw =
    Array.isArray(value)
      ? value[0]
      : value;

  return raw === "pl" ||
    raw === "ru" ||
    raw === "uk" ||
    raw === "de" ||
    raw === "es" ||
    raw === "cs"
    ? raw
    : "en";
}

function normalizeScope(
  value:
    | string
    | string[]
    | undefined,
): ScopeCode {
  const raw =
    Array.isArray(value)
      ? value[0]
      : value;

  return raw === "system"
    ? "system"
    : "user";
}

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

export default async function
ActivityTemplatesPage({
  searchParams,
}: {
  searchParams:
    Promise<
      Record<
        string,
        | string
        | string[]
        | undefined
      >
    >;
}) {
  const guard =
    await requirePlatformAdmin();

  if (!guard.ok) {
    notFound();
  }

  const params =
    await searchParams;

  const locale =
    normalizeLocale(
      params.locale,
    );

  const scope =
    normalizeScope(
      params.scope,
    );

  return scope === "system"
    ? (
        <SystemActivityTemplateCatalog
          locale={locale}
        />
      )
    : (
        <ActivityTemplateImpactProfileEditor
          locale={locale}
        />
      );
}