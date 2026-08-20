import { HELP_REGISTRY } from "@/data/help/helpRegistry.generated";
import type { HelpRegistryEntry } from "./helpTypes";

function normalizePathname(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "/";
  const withoutQuery = trimmed.split("?")[0]?.split("#")[0] ?? "/";
  return withoutQuery === "/" ? "/" : withoutQuery.replace(/\/+$/, "") || "/";
}

export function getHelpRegistry() {
  return HELP_REGISTRY;
}

export function findHelpRegistryEntry(helpKey: string) {
  return HELP_REGISTRY.find((entry) => entry.helpKey === helpKey) ?? null;
}

function routePatternMatches(pattern: string, pathname: string) {
  if (pattern === pathname) return true;
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);

  let pathIndex = 0;
  for (let patternIndex = 0; patternIndex < patternParts.length; patternIndex += 1) {
    const part = patternParts[patternIndex] ?? "";
    if (part.startsWith("[[...") && part.endsWith("]]")) {
      return true;
    }
    if (part.startsWith("[...") && part.endsWith("]")) {
      return pathIndex < pathParts.length;
    }
    if (pathIndex >= pathParts.length) return false;
    if (!(part.startsWith("[") && part.endsWith("]")) && part !== pathParts[pathIndex]) {
      return false;
    }
    pathIndex += 1;
  }

  return pathIndex === pathParts.length;
}

export function getHelpEntriesForRoute(pathname: string): HelpRegistryEntry[] {
  const route = normalizePathname(pathname);
  return HELP_REGISTRY.filter(
    (entry) => entry.kind === "navigation" || routePatternMatches(entry.route, route),
  );
}

export function getHelpRegistryRouteGroups() {
  const grouped = new Map<string, HelpRegistryEntry[]>();
  for (const entry of HELP_REGISTRY) {
    if (entry.kind === "navigation") continue;
    const items = grouped.get(entry.route) ?? [];
    items.push(entry);
    grouped.set(entry.route, items);
  }
  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([route, entries]) => ({ route, entries }));
}
