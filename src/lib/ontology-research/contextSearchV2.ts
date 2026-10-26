/** Pure, deterministic multilingual search scoring for the ONTO-AI research context. */
export function normalizeContextQuery(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

export function scoreContextCandidate(input: {
  query: string;
  titles: string[];
  paths?: string[];
  extra?: string[];
}): number {
  const query = normalizeContextQuery(input.query);
  if (!query) return 0;
  const tokens = query.split(/[\s,.;/]+/).filter(Boolean).slice(0, 8);
  const titles = input.titles.map(normalizeContextQuery);
  const paths = (input.paths ?? []).map(normalizeContextQuery);
  const extra = (input.extra ?? []).map(normalizeContextQuery);
  let result = 0;
  for (const title of titles) {
    if (!title) continue;
    if (title === query) return 120;
    if (title.startsWith(query)) result = Math.max(result, 105);
    if (title.includes(query)) result = Math.max(result, 75);
    result = Math.max(result, tokens.reduce((s, word) => s + (title.startsWith(word) ? 18 : title.includes(word) ? 12 : 0), 0));
  }
  for (const path of paths) {
    if (path.includes(query)) result = Math.max(result, 18);
    else result = Math.max(result, tokens.reduce((s, word) => s + (path.includes(word) ? 4 : 0), 0));
  }
  for (const field of extra) {
    if (field.includes(query)) result = Math.max(result, 8);
    else result = Math.max(result, tokens.reduce((s, word) => s + (field.includes(word) ? 2 : 0), 0));
  }
  return result;
}
