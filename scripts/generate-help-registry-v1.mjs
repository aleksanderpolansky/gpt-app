import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const APP = path.join(ROOT, "src", "app");
const NAV = path.join(ROOT, "src", "components", "app-shell", "global-navigation.tsx");
const OUT = path.join(ROOT, "src", "data", "help", "helpRegistry.generated.ts");

const EXCLUDED_PREFIXES = [
  "/admin",
  "/api",
  "/activity/debug",
  "/project-knowledge",
  "/m",
];

function posix(value) {
  return value.split(path.sep).join("/");
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function routeFromPage(file) {
  const rel = posix(path.relative(APP, path.dirname(file)));
  if (!rel || rel === ".") return "/";
  const parts = rel.split("/").filter(Boolean).filter((part) => !part.startsWith("("));
  return "/" + parts.join("/");
}

function isUserRoute(route) {
  return !EXCLUDED_PREFIXES.some((prefix) => route === prefix || route.startsWith(prefix + "/"));
}

function compactLabel(value) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[^{}]{0,300}\}/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function stableFingerprint(value) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex").slice(0, 12);
}

function safeKeyPart(value) {
  return value
    .replace(/^https?:\/\/[^/]+/i, "")
    .split("?")[0]
    .split("#")[0]
    .replace(/\/+/g, "/") || "/";
}

function extractPageEntries(file) {
  const route = routeFromPage(file);
  if (!isUserRoute(route)) return [];
  const source = fs.readFileSync(file, "utf8");
  const sourceFile = posix(path.relative(ROOT, file));
  const entries = [{
    helpKey: `page:${route}`,
    route,
    kind: "page",
    labelHint: route === "/" ? "Dashboard" : route,
    sourceFile,
    domSelector: "main",
    hrefPath: null,
    ordinal: 1,
  }];

  const headingCounts = new Map();
  const headingFingerprintCounts = new Map();
  const headingRe = /<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match;
  while ((match = headingRe.exec(source))) {
    const tag = `h${match[1]}`;
    const ordinal = (headingCounts.get(tag) ?? 0) + 1;
    headingCounts.set(tag, ordinal);
    const rawHeading = match[2] ?? "";
    const fingerprint = stableFingerprint(rawHeading);
    const fingerprintKey = `${tag}:${fingerprint}`;
    const fingerprintOrdinal = (headingFingerprintCounts.get(fingerprintKey) ?? 0) + 1;
    headingFingerprintCounts.set(fingerprintKey, fingerprintOrdinal);
    entries.push({
      // The content fingerprint keeps the persisted help key stable when an
      // unrelated heading is inserted before this one. A suffix is used only
      // when the same heading source occurs more than once on the same route.
      helpKey: `heading:${route}:${tag}:${fingerprint}:${fingerprintOrdinal}`,
      route,
      kind: "heading",
      labelHint: compactLabel(rawHeading) || `${tag.toUpperCase()} ${ordinal}`,
      sourceFile,
      domSelector: tag,
      hrefPath: null,
      ordinal,
    });
  }

  const hrefCounts = new Map();
  const hrefPatterns = [
    /href\s*=\s*["']([^"'#][^"']*)["']/g,
    /href\s*=\s*\{\s*localeHref\(\s*["']([^"']+)["']\s*\)\s*\}/g,
  ];
  for (const hrefRe of hrefPatterns) {
    while ((match = hrefRe.exec(source))) {
      const href = safeKeyPart(match[1]);
      if (!href.startsWith("/")) continue;
      const ordinal = (hrefCounts.get(href) ?? 0) + 1;
      hrefCounts.set(href, ordinal);
      entries.push({
        helpKey: `link:${route}:${href}:${ordinal}`,
        route,
        kind: "link",
        labelHint: href,
        sourceFile,
        domSelector: "a",
        hrefPath: href,
        ordinal,
      });
    }
  }

  return entries;
}

function extractNavigationEntries() {
  if (!fs.existsSync(NAV)) return [];
  const source = fs.readFileSync(NAV, "utf8");
  const sourceFile = posix(path.relative(ROOT, NAV));
  const hrefs = [];
  const re = /localeHref\(\s*["']([^"']+)["']\s*\)/g;
  let match;
  const seen = new Set();
  while ((match = re.exec(source))) {
    const href = safeKeyPart(match[1]);
    if (!href.startsWith("/") || seen.has(href)) continue;
    seen.add(href);
    hrefs.push({
      helpKey: `nav:${href}`,
      route: "*",
      kind: "navigation",
      labelHint: href,
      sourceFile,
      domSelector: null,
      hrefPath: href,
      ordinal: 1,
    });
  }
  return hrefs;
}

const pageFiles = walk(APP).filter((file) => file.endsWith(`${path.sep}page.tsx`));
const entries = [
  ...pageFiles.flatMap(extractPageEntries),
  ...extractNavigationEntries(),
].sort((a, b) =>
  a.route.localeCompare(b.route) ||
  a.kind.localeCompare(b.kind) ||
  a.helpKey.localeCompare(b.helpKey)
);

const duplicateKeys = entries
  .map((entry) => entry.helpKey)
  .filter((key, index, all) => all.indexOf(key) !== index);
if (duplicateKeys.length > 0) {
  throw new Error(`HELP_REGISTRY_DUPLICATE_KEYS:${[...new Set(duplicateKeys)].join(",")}`);
}

const body = `// GENERATED FILE. DO NOT EDIT BY HAND.
// Source: scripts/generate-help-registry-v1.mjs
import type { HelpRegistryEntry } from "@/lib/help/helpTypes";

export const ARCTOR_HELP_REGISTRY_V1 = "ARCTOR_HELP_REGISTRY_V1" as const;

export const HELP_REGISTRY: readonly HelpRegistryEntry[] = ${JSON.stringify(entries, null, 2)} as const;

export const HELP_REGISTRY_GENERATED_COUNTS = ${JSON.stringify({
  total: entries.length,
  pages: entries.filter((entry) => entry.kind === "page").length,
  headings: entries.filter((entry) => entry.kind === "heading").length,
  links: entries.filter((entry) => entry.kind === "link").length,
  navigation: entries.filter((entry) => entry.kind === "navigation").length,
}, null, 2)} as const;
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, body, "utf8");
console.log(`HELP_REGISTRY_GENERATED=${entries.length}`);
