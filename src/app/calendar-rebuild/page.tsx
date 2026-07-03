import type { Metadata } from "next";

import CalendarRebuildClient from "./CalendarRebuildClient";

export const metadata: Metadata = {
  title: "Calendar Rebuild | ARCTor.app",
  description: "New ARCTor calendar service preview.",
};

type CalendarRebuildPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
}

export default async function CalendarRebuildPage({
  searchParams,
}: CalendarRebuildPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const focusDate = getSearchParam(resolvedSearchParams, "focusDate") ?? null;

  return <CalendarRebuildClient initialFocusDateKey={focusDate} />;
}
