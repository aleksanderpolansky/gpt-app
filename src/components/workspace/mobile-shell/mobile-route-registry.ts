import { mobileShellTabs } from "./mobile-shell.fixtures";
import type {
  MobileTabItem,
  MobileTabKey,
  MobileTabSelectionResult,
} from "./mobile-shell.types";

export const mobileShellRoutePath = "/m";

export const mobileShellDefaultTabKey: MobileTabKey = "ai";

export const mobileShellTabKeys = [
  "ai",
  "workspace",
  "objects",
  "calendar",
  "actions",
] as const satisfies readonly MobileTabKey[];

export const mobileShellQueryParamName = "tab";

export const mobileShellTabAliases = {
  ai: "ai",
  assistant: "ai",
  workspace: "workspace",
  work: "workspace",
  capture: "workspace",
  objects: "objects",
  object: "objects",
  valueObjects: "objects",
  calendar: "calendar",
  cal: "calendar",
  actions: "actions",
  action: "actions",
  next: "actions",
} as const satisfies Readonly<Record<string, MobileTabKey>>;

export const mobileShellRouteTargets = {
  ai: {
    href: "/m?tab=ai",
    label: "AI",
    description: "Mobile contextual AI tab.",
  },
  workspace: {
    href: "/m?tab=workspace",
    label: "Workspace",
    description: "Mobile workspace preview tab.",
  },
  objects: {
    href: "/m?tab=objects",
    label: "Objects",
    description: "Mobile objects preview tab.",
  },
  calendar: {
    href: "/m?tab=calendar",
    label: "Calendar",
    description: "Mobile calendar preview tab.",
  },
  actions: {
    href: "/m?tab=actions",
    label: "Actions",
    description: "Mobile preview action tab.",
  },
} as const satisfies Readonly<
  Record<
    MobileTabKey,
    {
      readonly href: string;
      readonly label: string;
      readonly description: string;
    }
  >
>;

export function isMobileTabKey(value: string | null | undefined): value is MobileTabKey {
  if (!value) {
    return false;
  }

  return (mobileShellTabKeys as readonly string[]).includes(value);
}

export function normalizeMobileTabKey(value: string | null | undefined): MobileTabKey | null {
  if (!value) {
    return null;
  }

  const directValue = value.trim();

  if (isMobileTabKey(directValue)) {
    return directValue;
  }

  const aliasValue = mobileShellTabAliases[directValue as keyof typeof mobileShellTabAliases];

  return aliasValue ?? null;
}

export function selectMobileTabFromQuery(
  requestedTabKey: string | null | undefined,
): MobileTabSelectionResult {
  const selectedTabKey = normalizeMobileTabKey(requestedTabKey) ?? mobileShellDefaultTabKey;

  return {
    requestedTabKey: requestedTabKey ?? null,
    selectedTabKey,
    fallbackUsed: selectedTabKey !== requestedTabKey,
  };
}

export function getMobileTabByKey(tabKey: MobileTabKey): MobileTabItem {
  const tabItem = mobileShellTabs.find((tab) => tab.key === tabKey);

  return tabItem ?? mobileShellTabs[0];
}

export function getMobileTabHref(tabKey: MobileTabKey): string {
  return mobileShellRouteTargets[tabKey].href;
}
