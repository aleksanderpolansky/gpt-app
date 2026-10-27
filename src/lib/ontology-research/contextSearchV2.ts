/**
 * Bounded lexical scoring for read-only ONTO-AI ON catalog searches.
 * High precision is preferred to accidental substring matches. This is NOT semantic search.
 */
export function normalizeContextQuery(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

// Common function words in the seven supported UI languages; not an exhaustive stemmer.
const STOP_WORDS = new Set([
  // ru
  "и", "или", "а", "но", "не", "на", "по", "под", "для", "из", "от", "до", "при", "без", "над", "об", "обо", "это", "что", "как", "его", "ее", "со", "во", "за", "же", "бы", "то", "ли", "мы", "вы",
  // uk
  "та", "або", "але", "не", "до", "від", "для", "під", "над", "при", "без", "що", "як", "це", "його", "вона",
  // pl / cs
  "oraz", "lub", "albo", "ale", "nie", "dla", "pod", "nad", "przez", "przy", "bez", "czy", "jako", "jest", "or", "jak", "bez", "od", "do", "se", "si", "ve", "ze", "pro", "podle", "aby", "co", "je", "jsou", "byl", "byla",
  // en
  "the", "and", "or", "with", "without", "from", "into", "over", "under", "for", "of", "at", "by", "is", "are", "was", "were", "this", "that", "to", "in", "on", "an", "as", "be",
  // de
  "der", "die", "das", "den", "dem", "des", "ein", "eine", "einer", "einem", "einen", "und", "oder", "mit", "ohne", "von", "zu", "zum", "zur", "im", "am", "auf", "ist", "sind", "als", "bei", "fur", "fuer",
  // es
  "el", "la", "los", "las", "un", "una", "unos", "unas", "del", "al", "y", "con", "sin", "desde", "para", "por", "de", "en", "es", "son", "como", "que", "su", "sus",
]);

function meaningfulWords(value: string): string[] {
  const words = normalizeContextQuery(value).match(/[\p{L}\p{N}]+/gu) ?? [];
  return [...new Set(words.filter(word => word.length >= 2 && !STOP_WORDS.has(word)))];
}

function lexicalMatch(queryWord: string, targetWords: readonly string[]): "exact" | "prefix" | null {
  if (targetWords.includes(queryWord)) return "exact";
  // Prefix matching for longer words only; no matching inside an unrelated word.
  if (queryWord.length >= 5 && targetWords.some(word => word.startsWith(queryWord))) return "prefix";
  return null;
}

export function scoreContextCandidate(input: {
  query: string;
  titles: string[];
  paths?: string[];
  extra?: string[];
}): number {
  const query = normalizeContextQuery(input.query);
  const tokens = meaningfulWords(query).slice(0, 8);
  if (!query || !tokens.length) return 0;

  let result = 0;
  for (const rawTitle of input.titles) {
    const title = normalizeContextQuery(rawTitle);
    if (!title) continue;
    if (title === query) return 120;
    const titleWords = meaningfulWords(title);
    const phrase = tokens.join(" ");
    const titlePhrase = titleWords.join(" ");
    if (titleWords.length >= tokens.length && tokens.every((word, i) => titleWords[i] === word))
      result = Math.max(result, 105);
    else if ((" " + titlePhrase + " ").includes(" " + phrase + " "))
      result = Math.max(result, 75);

    const matches = tokens.map(word => lexicalMatch(word, titleWords));
    const exact = matches.filter(match => match === "exact").length;
    const prefixes = matches.filter(match => match === "prefix").length;
    if (exact || prefixes) {
      const coverageBonus = tokens.length > 1 && matches.every(Boolean) ? 12 : 0;
      result = Math.max(result, exact * 18 + prefixes * 9 + coverageBonus);
    }
  }
  for (const rawPath of input.paths ?? []) {
    const path = normalizeContextQuery(rawPath);
    if (!path) continue;
    // A structural path is weak evidence: one shared ancestor must not dominate.
    const pathWords = meaningfulWords(path);
    if ((" " + pathWords.join(" ") + " ").includes(" " + tokens.join(" ") + " "))
      result = Math.max(result, 20);
    const hits = tokens.filter(word => lexicalMatch(word, pathWords)).length;
    if (hits) result = Math.max(result, Math.min(16, hits * 5));
  }
  for (const rawExtra of input.extra ?? []) {
    const field = normalizeContextQuery(rawExtra);
    if (!field) continue;
    const fieldWords = meaningfulWords(field);
    if ((" " + fieldWords.join(" ") + " ").includes(" " + tokens.join(" ") + " "))
      result = Math.max(result, 10);
    const hits = tokens.filter(word => lexicalMatch(word, fieldWords)).length;
    if (hits) result = Math.max(result, Math.min(9, hits * 3));
  }
  return result;
}
