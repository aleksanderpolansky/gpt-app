# ARCTor FEED F3.1B â€” local installation and checks

- Date: 2026-10-13
- Baseline Git: a16bb6b61f082338e82c3097541d078db41031c5
- Source: F3.0 intake at baseline cb57b645 (F3.1A changed SQL/docs only)
- Objective: connect deployed F3.1A RPC to /feed, with URL-only pilot filter
- Modified: src/app/feed/page.tsx; src/app/feed/GlobalFeedContent.tsx
- Added: src/lib/messages/semanticFeedSearchF31.server.ts
- Existing /feed path: preserved if semantic URL params are absent
- RPC credentials: service_role server-only; never exposed to browser
- Semantic mode: public native indexed publications only; AI feed skipped
- Search limit: latest 20 results; no pagination UI in this step
- Invalid filter / RPC failure: explicit error, never unfiltered fallback
- Shared fact writer, F1.2 triggers, Supabase schema: unchanged
- Automatic fact writing: OFF (unchanged)
- TypeScript: PASS
- Production build: PASS
- Global ESLint: known baseline FAIL; not claimed as passed
- Git commit / push / Vercel deploy: NOT DONE BY INSTALLER
- Original-source backup: C:\Users\Admin\Downloads\ARCTOR_FEED_F31B_BACKUP_20261013_153810

Next: review local report, approve guarded commit/push and verify Vercel Ready.