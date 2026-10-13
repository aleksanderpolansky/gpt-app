# ARCTor FEED F3.2.1: compact semantic search UX

Baseline: fe9553ca6e77e0112740b10f216609327f921229
Implementation: UI-only and public minimal ontology index facet.
- Inline removable ON chips in search box, continuous selection.
- Semantic navigation progress indicator and Suspense fallback spinner.
- Applied conditions summarized above results.
- Two-stage geography icon; other icons disabled pending backend facets.
- Broader publication/search prompt localized in 7 languages.
- No changes to F3.1A RPC, the fact executor, RLS, or automatic facts.
- Saved-search account tabs: planned next migration; not present in F3.2.1.

F321_SCOPED_ESLINT_PASS
F321_TYPESCRIPT_PASS
F321_BUILD_PASS
No SQL, commit, push, or deploy performed by installer.

Note: Global project ESLint has known pre-existing failures. Only changed files were linted.