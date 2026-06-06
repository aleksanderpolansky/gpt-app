import { MobileShell } from "../../components/workspace/mobile-shell/mobile-shell";
import {
  mobileShellQueryParamName,
  selectMobileTabFromQuery,
} from "../../components/workspace/mobile-shell/mobile-route-registry";

export type MobileRouteSearchParams = Readonly<
  Record<string, string | readonly string[] | undefined>
>;

export type MobileRoutePageProps = {
  readonly searchParams?: Promise<MobileRouteSearchParams>;
};

function getSingleSearchParamValue(
  searchParams: MobileRouteSearchParams,
  key: string,
): string | null {
  const value = searchParams[key];

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "undefined") {
    return null;
  }

  return value[0] ?? null;
}

export default async function MobileRoutePage({ searchParams }: MobileRoutePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedTabKey = getSingleSearchParamValue(
    resolvedSearchParams,
    mobileShellQueryParamName,
  );
  const selectedTab = selectMobileTabFromQuery(requestedTabKey);

  return (
    <main
      className="min-h-dvh overflow-x-hidden bg-background text-foreground w-full"
      aria-label="AI-NAVIGATOR mobile shell /m route"
    >
      <p className="sr-only w-full">
        /m mobile shell route. The active tab is selected from the tab query parameter.
      </p>

      {selectedTab.fallbackUsed ? (
        <p className="sr-only w-full">
          Unknown mobile tab query value was replaced with the default mobile shell tab.
        </p>
      ) : null}

      <MobileShell activeTabKey={selectedTab.selectedTabKey} />
    </main>
  );
}
