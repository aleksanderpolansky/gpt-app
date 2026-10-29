/** ARI-02.1 read-only diagnostic of the existing lexical scoring; not a ranking engine. */
import { scoreContextCandidate } from "@/lib/ontology-research/contextSearchV2";

export type Ari02Field = "title" | "path" | "canonical_key" | "definition";
export type Ari02SearchField = {
  field: Ari02Field;
  locale: string;
  value: string;
};
export type Ari02BestEvidence = {
  term: string;
  field: Ari02Field;
  locale: string;
  score: number;
  excerpt: string;
};

export function explainAri02LexicalMatch(
  terms: readonly string[],
  fields: readonly Ari02SearchField[],
): { score: number; bestEvidence: Ari02BestEvidence | null; topEvidence: Ari02BestEvidence[] } {
  const matches: Ari02BestEvidence[] = [];
  for (const term of terms.slice(0, 7)) {
    for (const candidate of fields) {
      if (!candidate.value.trim()) continue;
      const input = candidate.field === "title"
        ? { query: term, titles: [candidate.value] }
        : candidate.field === "path"
          ? { query: term, titles: [], paths: [candidate.value] }
          : { query: term, titles: [], extra: [candidate.value] };
      const score = scoreContextCandidate(input);
      if (score > 0) {
        matches.push({
          term,
          field: candidate.field,
          locale: candidate.locale,
          score,
          excerpt: candidate.value.slice(0, 180),
        });
      }
    }
  }
  // Sorting is deterministic. The first match of equal score is the primary evidence.
  matches.sort((a, b) => b.score - a.score ||
    a.field.localeCompare(b.field) || a.locale.localeCompare(b.locale) ||
    a.term.localeCompare(b.term) || a.excerpt.localeCompare(b.excerpt));
  return {
    score: matches[0]?.score ?? 0,
    bestEvidence: matches[0] ?? null,
    topEvidence: matches.slice(0, 3),
  };
}
