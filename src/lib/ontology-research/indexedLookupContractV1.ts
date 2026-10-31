/** ARCTor experimental indexed ON lookup, read-only. Not an absence/identity proof. */
import { createHash } from "node:crypto";

export type IndexedLookupInput = {
  term: string;
  limit: number;
  branch: string | null;
  locale: "ru" | "en" | "pl" | "es" | "de" | "cs" | "uk";
  cursor: string | null;
};
export type ParsedIndexedLookup = { ok: true; value: IndexedLookupInput } | { ok: false; reason: string };
export const INDEXED_LOOKUP_CONTRACT = "ARCTOR_ON_INDEXED_LOOKUP_EXPERIMENT_V1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCALES = new Set(["ru", "en", "pl", "es", "de", "cs", "uk"]);
const BRANCH = /^[a-z][a-z0-9_]{1,79}$/;

export function parseIndexedLookupInput(raw: unknown): ParsedIndexedLookup {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, reason: "JSON_OBJECT_REQUIRED" };
  const x = raw as Record<string, unknown>;
  if (typeof x.query !== "string") return { ok: false, reason: "QUERY_REQUIRED" };
  const term = x.query.normalize("NFKC").replace(/\s+/g, " ").trim();
  // Reject SQL LIKE pattern characters. The RPC treats this value as a literal search term.
  if (term.length < 3 || term.length > 80 || /[%_\\\x00-\x1F\x7F]/u.test(term))
    return { ok: false, reason: "INVALID_SEARCH_TERM_3_TO_80" };
  const limit = x.limit === undefined ? 20 : x.limit;
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 50)
    return { ok: false, reason: "INVALID_LIMIT_1_TO_50" };
  const branch = x.branch === undefined || x.branch === null ? null : x.branch;
  if (branch !== null && (typeof branch !== "string" || !BRANCH.test(branch)))
    return { ok: false, reason: "INVALID_BRANCH_CODE" };
  const locale = x.locale === undefined ? "ru" : x.locale;
  if (typeof locale !== "string" || !LOCALES.has(locale))
    return { ok: false, reason: "INVALID_LOCALE" };
  const cursor = x.cursor === undefined || x.cursor === null ? null : x.cursor;
  if (cursor !== null && (typeof cursor !== "string" || cursor.length > 512 || !/^[\w-]+$/.test(cursor)))
    return { ok: false, reason: "INVALID_CURSOR" };
  return { ok: true, value: { term, limit: limit as number, branch: branch as string | null,
    locale: locale as IndexedLookupInput["locale"], cursor: cursor as string | null } };
}
function fingerprint(term: string, branch: string | null, actorId: string): string {
  return createHash("sha256").update(JSON.stringify([term, branch, actorId])).digest("hex").slice(0, 24);
}
export function encodeLookupCursor(id: string, input: IndexedLookupInput, actorId: string): string {
  if (!UUID.test(id)) throw new Error("BAD_RESULT_UUID");
  return Buffer.from(JSON.stringify([id.toLowerCase(), fingerprint(input.term, input.branch, actorId)])).toString("base64url");
}
export function decodeLookupCursor(input: IndexedLookupInput, actorId: string): string | null {
  if (!input.cursor) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(input.cursor, "base64url").toString("utf8"));
    if (!Array.isArray(parsed) || parsed.length !== 2 || typeof parsed[0] !== "string" || !UUID.test(parsed[0]) ||
      parsed[1] !== fingerprint(input.term, input.branch, actorId)) throw new Error("INVALID_CURSOR_SCOPE");
    return parsed[0];
  } catch { throw new Error("INVALID_CURSOR_SCOPE"); }
}
