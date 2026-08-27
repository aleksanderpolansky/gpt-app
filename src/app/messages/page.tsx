import { Suspense } from "react";
import Link from "next/link";

import { auth0 } from "../../../lib/auth0";
import { normalizeLocale } from "@/i18n";
import MessagesClient from "./MessagesClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSearchValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function MessagesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const locale = normalizeLocale(
    readSearchValue(resolvedSearchParams, "locale") ??
      readSearchValue(resolvedSearchParams, "lang"),
  );

  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return (
      <div className="mx-auto flex min-h-[420px] max-w-[760px] items-center justify-center p-5">
        <div className="w-full rounded-2xl border border-[#e1e5f0] bg-white p-6 text-center shadow-sm">
          <h1 className="text-[18px] font-bold text-[#1a1d2e]">
            {locale === "pl"
              ? "Wiadomości"
              : locale === "ru"
                ? "Сообщения"
                : locale === "uk"
                  ? "Повідомлення"
                  : locale === "de"
                    ? "Nachrichten"
                    : locale === "es"
                      ? "Mensajes"
                      : locale === "cs"
                        ? "Zprávy"
                        : "Messages"}
          </h1>
          <p className="mt-2 text-[12px] text-[#7c8099]">
            {locale === "pl"
              ? "Zaloguj się, aby korzystać z prywatnych wiadomości."
              : locale === "ru"
                ? "Войдите, чтобы пользоваться личными сообщениями."
                : "Sign in to use private messages."}
          </p>
          <Link
            href="/auth/login"
            className="mt-4 inline-flex rounded-xl bg-[#3b6ef8] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#315fd9]"
          >
            {locale === "pl"
              ? "Zaloguj się"
              : locale === "ru"
                ? "Войти"
                : "Sign in"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="p-5 text-[12px] text-[#9ca3b8]">Loading…</div>
      }
    >
      <MessagesClient locale={locale} />
    </Suspense>
  );
}
