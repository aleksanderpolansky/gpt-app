import type { Metadata } from "next";

import CalendarRebuildClient from "../calendar-rebuild/CalendarRebuildClient";

export const metadata: Metadata = {
  title: "Calendar | ARCTor.app",
  description: "ARCTor calendar service.",
};

type CalendarPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const focusDate = getSearchParam(resolvedSearchParams, "focusDate") ?? null;
  const locale = getSearchParam(resolvedSearchParams, "locale") ?? null;

  return (
    <CalendarRebuildClient
      initialFocusDateKey={focusDate}
      initialLocale={locale}
      routeBasePath="/calendar"
      returnToTarget="calendar"
    />
  );
}
